import { NextRequest, NextResponse } from 'next/server';
import { computeValuation } from '@/lib/valuation';
import { enrichInstrument } from '@/lib/aggregation/orchestrator';

const EXCHANGE_PRIORITY: { [key: string]: number } = {
  'US': 80,
  'NYSE': 100,
  'NASDAQ': 95,
  'AMEX': 90,
  'LSE': 85,
  'PA': 80,
  'F': 75,
  'T': 70,
  'HK': 65,
  'TO': 60,
  'SW': 55,
  'MI': 50,
  'BE': 45,
  'AU': 40,
  'SS': 35,
  'SZ': 30,
};

function getExchangePriority(exchange: string | null): number {
  if (!exchange) return 0;
  return EXCHANGE_PRIORITY[exchange.toUpperCase()] || 10;
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

function extractDescription(payload: unknown): string | null {
  if (!payload) return null;
  if (Array.isArray(payload) && payload.length > 0) {
    const item = payload[0] as any;
    return item?.description ?? item?.Description ?? null;
  }
  if (typeof payload === 'object') {
    const data = payload as any;
    return data?.Description ?? data?.description ?? null;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const symbolUpper = symbol.toUpperCase();
    const exchangeParam = request.nextUrl.searchParams.get('exchange');
    const exchange = exchangeParam ? exchangeParam.toUpperCase() : null;

    const { prisma } = await import('@/lib/prisma');

    let stock = null;
    if (exchange) {
      stock = await prisma.stock.findUnique({
        where: { symbol_exchange: { symbol: symbolUpper, exchange } },
        include: {
          quotes: { orderBy: { timestamp: 'desc' }, take: 60 },
        },
      });
    } else {
      const matches = await prisma.stock.findMany({
        where: { symbol: symbolUpper },
        include: {
          quotes: { orderBy: { timestamp: 'desc' }, take: 60 },
        },
      });

      if (matches.length > 0) {
        stock = matches.sort((a, b) => {
          const aPriority = getExchangePriority(a.exchange);
          const bPriority = getExchangePriority(b.exchange);
          if (aPriority !== bPriority) return bPriority - aPriority;
          return a.exchange?.localeCompare(b.exchange ?? '') ?? 0;
        })[0];
      }
    }

    if (!stock) {
      return NextResponse.json({ error: 'Action non trouvee' }, { status: 404 });
    }

    let instrument = await prisma.instrument.findFirst({
      where: {
        symbol: stock.symbol,
        exchangeCode: stock.exchange ?? null,
      },
    });

    if (!instrument) {
      instrument = await prisma.instrument.create({
        data: {
          symbol: stock.symbol,
          exchangeCode: stock.exchange ?? null,
          name: stock.name,
          country: stock.country ?? null,
          currency: stock.currency ?? null,
          sector: stock.sector ?? null,
          industry: stock.industry ?? null,
          isin: stock.isin ?? null,
          active: true,
        },
      });
    }

    await enrichInstrument(instrument.id);

    const metricRows = await prisma.metrics.findMany({
      where: { instrumentId: instrument.id },
      orderBy: { asOfDate: 'desc' },
      take: 120,
    });

    const latestMetrics = metricRows[0] ?? null;
    const latestWithPrice = metricRows.find((row) => row.price !== null) ?? null;
    const latestWithPe = metricRows.find((row) => row.pe !== null) ?? null;

    const peCurrent = latestWithPe?.pe ?? null;
    const valuation = computeValuation(peCurrent, instrument.sector ?? stock.sector ?? null);

    const latestQuote = stock.quotes[0] || null;

    const cacheRowsForDescription = await prisma.providerCache.findMany({
      where: {
        instrumentId: instrument.id,
        endpoint: 'overview',
      },
      orderBy: { fetchedAt: 'desc' },
      take: 5,
    });

    let description: string | null = null;
    for (const row of cacheRowsForDescription) {
      try {
        const parsed = JSON.parse(row.payloadJson);
        const candidate = extractDescription(parsed);
        if (candidate) {
          description = candidate;
          break;
        }
      } catch {
        continue;
      }
    }

    const history = metricRows
      .filter((row) => row.price !== null)
      .slice()
      .reverse()
      .map((row) => ({
        price: row.price,
        timestamp: new Date(row.asOfDate).toISOString(),
      }));

    const cacheRowsForLogo = await prisma.providerCache.findMany({
      where: {
        instrumentId: instrument.id,
        endpoint: 'overview',
        provider: { in: ['fmp', 'finnhub'] },
      },
      orderBy: { fetchedAt: 'desc' },
      take: 10,
    });

    let logoUrl: string | null = null;
    for (const row of cacheRowsForLogo) {
      try {
        const parsed = JSON.parse(row.payloadJson);
        const candidate = extractLogoFromPayload(parsed);
        if (candidate) {
          logoUrl = candidate;
          break;
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      stock: {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        logoUrl,
        description,
        isin: stock.isin,
        exchange: stock.exchange,
        currency: stock.currency,
        country: stock.country,
        sector: stock.sector,
        industry: stock.industry,
        marketCap: latestMetrics?.marketCap ?? stock.marketCap,
      },
      quote: latestWithPrice?.price
        ? {
            price: latestWithPrice.price,
            change: latestQuote?.change ?? null,
            changePercent: latestQuote?.changePercent ?? null,
            timestamp: latestWithPrice.asOfDate,
          }
        : latestQuote
        ? {
            price: latestQuote.price,
            change: latestQuote.change,
            changePercent: latestQuote.changePercent,
            timestamp: latestQuote.timestamp,
          }
        : null,
      valuation: {
        peCurrent,
        peAvg: valuation.peAvg,
        status: valuation.status,
      },
      history,
    });
  } catch (error) {
    console.error('GET /api/stocks/[symbol] error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'action" },
      { status: 500 }
    );
  }
}

