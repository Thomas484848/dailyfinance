import { NextRequest, NextResponse } from 'next/server';
import { computeValuation } from '@/lib/valuation';
import { chunk } from '@/lib/utils';
import { enrichInstrument } from '@/lib/aggregation/orchestrator';

export const revalidate = 60;

const ITEMS_PER_PAGE = 20;
const MIN_ITEMS_PER_PAGE = 10;
const MAX_ITEMS_PER_PAGE = 50;

// Marques d'ETF connues (mainstream)
const ETF_BRANDS = [
  'iShares', 'Vanguard', 'SPDR', 'Amundi', 'Lyxor',
  'Invesco', 'Xtrackers', 'Schwab', 'WisdomTree', 'UBS'
];

// WHITELIST STRICTE - Uniquement les grandes bourses mondiales (codes reels du CSV)
const EXCHANGE_WHITELIST = [
  // USA - Indices majeurs (S&P 500, Dow Jones, NASDAQ 100)
  'US',         // US exchanges (NASDAQ, NYSE, AMEX combines)
  'NASDAQ',
  'NYSE',
  'AMEX',

  // Europe
  'F',          // Frankfurt/XETRA (DAX 40)
  'LSE',        // London Stock Exchange (FTSE 100)
  'PA',         // Paris/EURONEXT (CAC 40)
  'BE',         // Bruxelles/EURONEXT
  'MI',         // Milan (FTSE MIB)
  'SW',         // Suisse (SMI)
  'ST',         // Stockholm (OMX)
  'CO',         // Copenhague
  'HE',         // Helsinki
  'VI',         // Vienne
  'LS',         // Lisbonne

  // Asie
  'T',          // Tokyo (Nikkei 225)
  'HK',         // Hong Kong (Hang Seng)
  'SS',         // Shanghai
  'SZ',         // Shenzhen

  // Autres marches majeurs
  'TO',         // Toronto (S&P/TSX) - On le garde car c'est le TSX principal
  'AU',         // Australie (ASX)
];

// Priorite des exchanges (plus le score est eleve, plus prioritaire)
const EXCHANGE_PRIORITY: { [key: string]: number } = {
  'US': 80,      // USA (generic)
  'NYSE': 100,
  'NASDAQ': 95,
  'AMEX': 90,
  'LSE': 90,      // London
  'PA': 85,       // Paris
  'F': 80,        // Frankfurt
  'T': 75,        // Tokyo
  'HK': 70,       // Hong Kong
  'TO': 65,       // Toronto
  'SW': 60,       // Suisse
  'MI': 55,       // Milan
  'BE': 50,       // Bruxelles
  'AU': 45,       // Australie
  'SS': 40,       // Shanghai
  'SZ': 35,       // Shenzhen
};


const EXCHANGE_GROUPS: Record<string, string[]> = {
  US: ['US', 'NASDAQ', 'NYSE', 'AMEX'],
};

function getExchangePriority(exchange: string | null): number {
  if (!exchange) return 0;
  return EXCHANGE_PRIORITY[exchange.toUpperCase()] || 10; // Score par defaut: 10
}

// Fonction pour normaliser le nom d'entreprise (pour detecter les doublons)
function normalizeCompanyName(name: string): string {
  let normalized = name.toUpperCase();

  // Retirer tous les suffixes legaux et types d'actions
  const suffixesToRemove = [
    // Suffixes legaux
    /\s+INC\.?$/i,
    /\s+INCORPORATED$/i,
    /\s+CORP\.?$/i,
    /\s+CORPORATION$/i,
    /\s+LTD\.?$/i,
    /\s+LIMITED$/i,
    /\s+PLC\.?$/i,
    /\s+SA\.?$/i,
    /\s+AG\.?$/i,
    /\s+NV\.?$/i,
    /\s+SE\.?$/i,
    /\s+CO\.?$/i,
    /\s+COMPANY$/i,
    /\s+GROUP$/i,
    /\s+HOLDING(S)?$/i,

    // Types d'actions et instruments
    /\s+COMMON\s+STOCK$/i,
    /\s+ORDINARY\s+SHARES?$/i,
    /\s+CLASS\s+[A-Z]$/i,
    /\s+CDR$/i,
    /\s+ADR$/i,
    /\s+GDR$/i,
    /\s+\(CAD\s+HEDGED\)$/i,
    /\s+\(USD\s+HEDGED\)$/i,
    /\s+\(HEDGED\)$/i,
  ];

  // Appliquer tous les remplacements
  for (const pattern of suffixesToRemove) {
    normalized = normalized.replace(pattern, '');
  }

  // Retirer la ponctuation et espaces multiples
  normalized = normalized
    .replace(/[.,\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

// Fonction pour dedoublonner les actions (garder la meilleure par entreprise)
function deduplicateStocks(stocks: any[]): any[] {
  const companyMap = new Map<string, any>();

  for (const stock of stocks) {
    const normalizedName = normalizeCompanyName(stock.name);
    const existing = companyMap.get(normalizedName);

    // Verifier si c'est un CDR/ADR (moins prioritaire)
    const isCDR = /CDR|ADR|GDR/i.test(stock.name);

    if (!existing) {
      // Premiere occurrence de cette entreprise
      companyMap.set(normalizedName, stock);
    } else {
      const existingIsCDR = /CDR|ADR|GDR/i.test(existing.name);
      const existingPriority = getExchangePriority(existing.exchange);
      const currentPriority = getExchangePriority(stock.exchange);

      // Toujours preferer les actions directes aux CDR/ADR
      if (!isCDR && existingIsCDR) {
        companyMap.set(normalizedName, stock);
        continue;
      }
      if (isCDR && !existingIsCDR) {
        continue; // Garder l'existant (action directe)
      }

      // Garder celui avec la bourse la plus prioritaire
      if (currentPriority > existingPriority) {
        companyMap.set(normalizedName, stock);
      }
      // Si meme priorite, garder celui avec ISIN (plus fiable)
      else if (currentPriority === existingPriority && stock.isin && !existing.isin) {
        companyMap.set(normalizedName, stock);
      }
    }
  }

  return Array.from(companyMap.values());
}

// Fonction pour detecter si c'est un symbole invalide (codes numeriques)
function isInvalidSymbol(symbol: string): boolean {
  if (!symbol) return true;

  // Exclure les symboles qui sont principalement des chiffres
  // Exemples: 0004Y0, 0041B0, 123ABC, 600000
  const numericPattern = /^[0-9]/; // Commence par un chiffre
  if (numericPattern.test(symbol)) {
    return true;
  }

  // Exclure les symboles trop courts (< 2 caracteres)
  if (symbol.length < 2) {
    return true;
  }

  // Exclure les symboles trop longs (> 6 caracteres, sauf exceptions)
  if (symbol.length > 6 && !symbol.includes('.')) {
    return true;
  }

  return false;
}

// Fonction pour detecter si c'est une action
function isStock(type: string | null, name: string): boolean {
  if (!type) return true;

  const typeUpper = type.toUpperCase();
  const stockKeywords = ['COMMON STOCK', 'ORDINARY', 'EQUITY', 'SHARE', 'STOCK'];

  return stockKeywords.some(keyword => typeUpper.includes(keyword));
}

// Fonction pour detecter si c'est un ETF mainstream
function isMainstreamETF(type: string | null, name: string): boolean {
  if (!type) return false;

  const typeUpper = type.toUpperCase();
  if (!typeUpper.includes('ETF') && !typeUpper.includes('ETN')) {
    return false;
  }

  // Verifier si le nom contient une marque connue
  return ETF_BRANDS.some(brand => name.toUpperCase().includes(brand.toUpperCase()));
}

// Fonction pour determiner si l'instrument doit etre exclu
function shouldExclude(type: string | null, name: string, symbol: string): boolean {
  const typeUpper = type ? type.toUpperCase() : '';
  const nameUpper = name.toUpperCase();
  const excludeKeywords = [
    'FUND', 'MUTUAL FUND', 'BOND', 'WARRANT', 'RIGHT',
    'INDEX', 'CFD', 'OPTION', 'FUTURE', 'PREFERRED',
    'NOTE', 'DEBENTURE', 'TRUST', 'UNIT', 'UNITS',
    'ACQUISITION', 'SPAC', 'SPECIAL PURPOSE', 'BLANK CHECK', 'SHELL'
  ];

  if (excludeKeywords.some(keyword => typeUpper.includes(keyword))) {
    return true;
  }

  if (excludeKeywords.some(keyword => nameUpper.includes(keyword))) {
    return true;
  }

  return false;
}

function getItemsPerPage(value: string | null): number {
  if (!value) return ITEMS_PER_PAGE;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return ITEMS_PER_PAGE;
  return Math.min(MAX_ITEMS_PER_PAGE, Math.max(MIN_ITEMS_PER_PAGE, parsed));
}

function resolveExchangeFilter(exchange: string): string[] {
  const normalized = exchange.toUpperCase();
  return EXCHANGE_GROUPS[normalized] ?? [normalized];
}

function extractLogoFromPayload(payload: unknown): string | null {
  if (!payload) return null;
  if (Array.isArray(payload) && payload.length > 0) {
    const item = payload[0] as any;
    return (
      item?.logo ??
      item?.image ??
      item?.logoUrl ??
      item?.logo_url ??
      item?.companyLogo ??
      item?.branding?.logo ??
      null
    );
  }
  if (typeof payload === 'object') {
    const data = payload as any;
    return (
      data?.logo ??
      data?.image ??
      data?.logoUrl ??
      data?.logo_url ??
      data?.companyLogo ??
      data?.branding?.logo ??
      null
    );
  }
  return null;
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || '';
    const exchange = searchParams.get('exchange') || '';
    const status = searchParams.get('status') || '';
    const reliableOnly = searchParams.get('reliableOnly') === '1';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const itemsPerPage = getItemsPerPage(searchParams.get('perPage'));

    const { prisma } = await import('@/lib/prisma');

    const where: any = {
      active: true,
      symbol: { not: '' },
      name: { not: '' },
      exchange: { in: EXCHANGE_WHITELIST },
    };

    if (country) where.country = country;
    if (exchange) {
      where.exchange = { in: resolveExchangeFilter(exchange) };
    }

    const allStocks = await prisma.stock.findMany({
      where,
      select: {
        id: true,
        symbol: true,
        name: true,
        isin: true,
        exchange: true,
        country: true,
        sector: true,
        industry: true,
        marketCap: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });

    let filteredStocks = allStocks.filter((stock) => {
      if (isInvalidSymbol(stock.symbol)) return false;
      if (shouldExclude(stock.type, stock.name, stock.symbol)) return false;
      return isStock(stock.type, stock.name);
    });

    filteredStocks = deduplicateStocks(filteredStocks);

    if (query) {
      const queryUpper = query.toUpperCase();
      filteredStocks = filteredStocks.filter((stock) => {
        const symbolUpper = stock.symbol.toUpperCase();
        const nameUpper = stock.name.toUpperCase();
        if (symbolUpper === queryUpper) return true;
        if (symbolUpper.startsWith(queryUpper)) return true;
        return nameUpper.includes(queryUpper);
      });

      filteredStocks.sort((a, b) => {
        const aSymbol = a.symbol.toUpperCase();
        const bSymbol = b.symbol.toUpperCase();
        const aName = a.name.toUpperCase();
        const bName = b.name.toUpperCase();
        if (aSymbol === queryUpper && bSymbol !== queryUpper) return -1;
        if (bSymbol === queryUpper && aSymbol !== queryUpper) return 1;
        if (aSymbol.startsWith(queryUpper) && !bSymbol.startsWith(queryUpper)) return -1;
        if (bSymbol.startsWith(queryUpper) && !aSymbol.startsWith(queryUpper)) return 1;
        return aName.localeCompare(bName);
      });
    }

    const symbols = Array.from(new Set(filteredStocks.map((stock) => stock.symbol)));
    const instruments = symbols.length
      ? await prisma.instrument.findMany({
          where: { symbol: { in: symbols } },
          select: {
            id: true,
            symbol: true,
            exchangeCode: true,
            sector: true,
            industry: true,
            country: true,
            currency: true,
            isin: true,
          },
        })
      : [];

    const instrumentByKey = new Map(
      instruments.map((instrument) => [
        `${instrument.symbol}|${instrument.exchangeCode ?? ''}`,
        instrument,
      ])
    );

    const instrumentIds = instruments.map((instrument) => instrument.id);
    const metricsByInstrument = new Map();
    const latestMetricsByInstrument = new Map();

    if (status) {
      const metricsRows = instrumentIds.length
        ? await prisma.metrics.findMany({
            where: { instrumentId: { in: instrumentIds } },
            orderBy: [{ instrumentId: 'asc' }, { asOfDate: 'desc' }],
            select: {
              instrumentId: true,
              asOfDate: true,
              price: true,
              marketCap: true,
              pe: true,
            },
          })
        : [];

      for (const row of metricsRows) {
        if (!metricsByInstrument.has(row.instrumentId)) {
          metricsByInstrument.set(row.instrumentId, row);
        }
      }
    }

    if (!query || reliableOnly) {
      const chunks = chunk(instrumentIds, 400);
      for (const ids of chunks) {
        const latestMetricsRows = ids.length
          ? await prisma.metrics.findMany({
              where: {
                instrumentId: { in: ids },
                marketCap: { not: null },
              },
              orderBy: [{ instrumentId: 'asc' }, { asOfDate: 'desc' }],
              select: {
                instrumentId: true,
                asOfDate: true,
                marketCap: true,
              },
            })
          : [];

        for (const row of latestMetricsRows) {
          if (!latestMetricsByInstrument.has(row.instrumentId)) {
            latestMetricsByInstrument.set(row.instrumentId, row);
          }
        }
      }
    }

    if (reliableOnly && !query) {
      const reliable = filteredStocks.filter((stock) => {
        const instrument = instrumentByKey.get(`${stock.symbol}|${stock.exchange ?? ''}`);
        const latestMetrics = instrument
          ? latestMetricsByInstrument.get(instrument.id)
          : null;
        const cap = latestMetrics?.marketCap ?? 0;
        return cap >= 1_000_000_000;
      });
      if (reliable.length > 0) {
        filteredStocks = reliable;
      }
    }

    if (status) {
      filteredStocks = filteredStocks.filter((stock) => {
        const instrument = instrumentByKey.get(`${stock.symbol}|${stock.exchange ?? ''}`);
        const metrics = instrument ? metricsByInstrument.get(instrument.id) : null;
        const pe = metrics?.pe ?? null;
        const sector = instrument?.sector ?? stock.sector ?? null;
        const valuation = computeValuation(pe, sector);
        return valuation.status === status;
      });
    }

    if (!query) {
      filteredStocks.sort((a, b) => {
        const aInstrument = instrumentByKey.get(`${a.symbol}|${a.exchange ?? ''}`);
        const bInstrument = instrumentByKey.get(`${b.symbol}|${b.exchange ?? ''}`);
        const aMetrics = aInstrument ? metricsByInstrument.get(aInstrument.id) : null;
        const bMetrics = bInstrument ? metricsByInstrument.get(bInstrument.id) : null;
        const aLatest = aInstrument ? latestMetricsByInstrument.get(aInstrument.id) : null;
        const bLatest = bInstrument ? latestMetricsByInstrument.get(bInstrument.id) : null;
        const aHasIsin = Boolean(a.isin || aInstrument?.isin);
        const bHasIsin = Boolean(b.isin || bInstrument?.isin);
        if (aHasIsin !== bHasIsin) {
          return aHasIsin ? -1 : 1;
        }
        const aCap = aMetrics?.marketCap ?? aLatest?.marketCap ?? a.marketCap ?? -1;
        const bCap = bMetrics?.marketCap ?? bLatest?.marketCap ?? b.marketCap ?? -1;
        if (aCap !== bCap) return bCap - aCap;
        return a.name.localeCompare(b.name);
      });
    }

    const total = filteredStocks.length;
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedStocks = filteredStocks.slice(startIndex, startIndex + itemsPerPage);

    for (const stock of paginatedStocks) {
      const key = `${stock.symbol}|${stock.exchange ?? ''}`;
      if (!instrumentByKey.has(key)) {
        const created = await prisma.instrument.create({
          data: {
            symbol: stock.symbol,
            exchangeCode: stock.exchange ?? null,
            name: stock.name,
            country: stock.country ?? null,
            sector: stock.sector ?? null,
            industry: stock.industry ?? null,
            isin: stock.isin ?? null,
            active: true,
          },
        });
        instrumentByKey.set(key, created);
      }
    }

    type InstrumentRow = (typeof instruments)[number];
    const paginatedInstruments = paginatedStocks
      .map((stock) => instrumentByKey.get(`${stock.symbol}|${stock.exchange ?? ''}`))
      .filter((instrument): instrument is InstrumentRow => instrument !== undefined);

    const paginatedInstrumentIds = Array.from(
      new Set(paginatedInstruments.map((instrument) => instrument.id))
    );

    for (const id of paginatedInstrumentIds) {
      enrichInstrument(id).catch((error) => {
        console.error('[stocks] enrich error:', error);
      });
    }

    const paginatedMetricsRows = paginatedInstrumentIds.length
      ? await prisma.metrics.findMany({
          where: { instrumentId: { in: paginatedInstrumentIds } },
          orderBy: [{ instrumentId: 'asc' }, { asOfDate: 'desc' }],
          select: {
            instrumentId: true,
            asOfDate: true,
            price: true,
            marketCap: true,
            pe: true,
          },
          take: 1000,
        })
      : [];

    const paginatedMetricsByInstrument = new Map();
    const paginatedPriceByInstrument = new Map();
    const paginatedPeByInstrument = new Map();

    for (const row of paginatedMetricsRows) {
      if (!paginatedMetricsByInstrument.has(row.instrumentId)) {
        paginatedMetricsByInstrument.set(row.instrumentId, row);
      }
      if (!paginatedPriceByInstrument.has(row.instrumentId) && row.price !== null) {
        paginatedPriceByInstrument.set(row.instrumentId, row);
      }
      if (!paginatedPeByInstrument.has(row.instrumentId) && row.pe !== null) {
        paginatedPeByInstrument.set(row.instrumentId, row);
      }
    }
    const cacheRows = paginatedInstrumentIds.length
      ? await prisma.providerCache.findMany({
          where: {
            instrumentId: { in: paginatedInstrumentIds },
            endpoint: 'overview',
            provider: { in: ['fmp', 'finnhub'] },
          },
          orderBy: { fetchedAt: 'desc' },
          select: {
            instrumentId: true,
            provider: true,
            payloadJson: true,
          },
        })
      : [];

    const logoByInstrument = new Map<string, string | null>();
    for (const row of cacheRows) {
      if (logoByInstrument.has(row.instrumentId)) continue;
      try {
        const payload = JSON.parse(row.payloadJson);
        const logo = extractLogoFromPayload(payload);
        if (logo) {
          logoByInstrument.set(row.instrumentId, logo);
        }
      } catch {
        continue;
      }
    }


    const results = paginatedStocks.map((stock) => {
      const instrument = instrumentByKey.get(`${stock.symbol}|${stock.exchange ?? ''}`);
      const metrics = instrument ? paginatedMetricsByInstrument.get(instrument.id) : null;
      const priceRow = instrument ? paginatedPriceByInstrument.get(instrument.id) : null;
      const peRow = instrument ? paginatedPeByInstrument.get(instrument.id) : null;
      const peCurrent = peRow?.pe ?? metrics?.pe ?? null;
      const sector = instrument?.sector ?? stock.sector ?? null;
      const valuation = computeValuation(peCurrent, sector);

      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        isin: stock.isin ?? instrument?.isin ?? null,
        exchange: stock.exchange ?? null,
        country: stock.country ?? instrument?.country ?? null,
        logoUrl: instrument ? logoByInstrument.get(instrument.id) ?? null : null,
        price: priceRow?.price ?? metrics?.price ?? null,
        marketCap: metrics?.marketCap ?? stock.marketCap ?? null,
        peCurrent,
        peAvg: valuation.peAvg,
        status: valuation.status,
      };
    });

    return NextResponse.json({
      stocks: results,
      pagination: {
        page,
        itemsPerPage,
        total,
        totalPages: Math.ceil(total / itemsPerPage),
      },
    });
  } catch (error) {
    console.error('GET /api/stocks error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des actions' },
      { status: 500 }
    );
  }
}

