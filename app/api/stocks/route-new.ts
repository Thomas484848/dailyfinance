import { NextRequest, NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 50;

// Marques d'ETF connues (mainstream)
const ETF_BRANDS = [
  'iShares', 'Vanguard', 'SPDR', 'Amundi', 'Lyxor',
  'Invesco', 'Xtrackers', 'Schwab', 'WisdomTree', 'UBS'
];

// Exchanges blacklist
const EXCHANGE_BLACKLIST = ['EUFUND', 'OTC', 'PINK', 'GREY'];

// Fonction pour detecter si c'est une action
function isStock(type: string | null, name: string): boolean {
  if (!type) return false;

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
function shouldExclude(type: string | null): boolean {
  if (!type) return true;

  const typeUpper = type.toUpperCase();
  const excludeKeywords = [
    'FUND', 'MUTUAL FUND', 'BOND', 'WARRANT', 'RIGHT',
    'INDEX', 'CFD', 'OPTION', 'FUTURE'
  ];

  return excludeKeywords.some(keyword => typeUpper.includes(keyword));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || '';
    const exchange = searchParams.get('exchange') || '';
    const status = searchParams.get('status') || '';
    const instrumentType = searchParams.get('instrumentType') || 'stocks'; // 'stocks' ou 'etf'
    const page = parseInt(searchParams.get('page') || '1', 10);

    const { prisma } = await import('@/lib/prisma');

    // Construire le filtre de base
    const where: any = {
      active: true,
      // Symbol et name non vides
      symbol: { not: '' },
      name: { not: '' },
      // Exchange non blackliste
      exchange: { notIn: EXCHANGE_BLACKLIST },
    };

    // Filtrer par pays si specifie
    if (country) where.country = country;

    // Filtrer par exchange si specifie
    if (exchange) where.exchange = exchange;

    // Recuperer tous les stocks qui passent le filtre de base
    const allStocks = await prisma.stock.findMany({
      where,
      include: {
        quotes: { orderBy: { timestamp: 'desc' }, take: 1 },
        valuations: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    // Filtrer en memoire selon le type d'instrument
    let filteredStocks = allStocks.filter(stock => {
      // Exclure les instruments indesirables
      if (shouldExclude(stock.type)) return false;

      if (instrumentType === 'etf') {
        return isMainstreamETF(stock.type, stock.name);
      } else {
        // Par defaut, afficher les actions
        return isStock(stock.type, stock.name);
      }
    });

    // Appliquer la recherche si presente
    if (query) {
      const queryUpper = query.toUpperCase();
      filteredStocks = filteredStocks.filter(stock => {
        const symbolUpper = stock.symbol.toUpperCase();
        const nameUpper = stock.name.toUpperCase();

        // Priorite 1: symbol exact match
        if (symbolUpper === queryUpper) return true;

        // Priorite 2: symbol starts with
        if (symbolUpper.startsWith(queryUpper)) return true;

        // Priorite 3: name contains
        return nameUpper.includes(queryUpper);
      });

      // Trier par pertinence
      filteredStocks.sort((a, b) => {
        const aSymbol = a.symbol.toUpperCase();
        const bSymbol = b.symbol.toUpperCase();
        const aName = a.name.toUpperCase();
        const bName = b.name.toUpperCase();

        // Exact match en premier
        if (aSymbol === queryUpper && bSymbol !== queryUpper) return -1;
        if (bSymbol === queryUpper && aSymbol !== queryUpper) return 1;

        // Puis startsWith
        if (aSymbol.startsWith(queryUpper) && !bSymbol.startsWith(queryUpper)) return -1;
        if (bSymbol.startsWith(queryUpper) && !aSymbol.startsWith(queryUpper)) return 1;

        // Sinon ordre alphabetique
        return aName.localeCompare(bName);
      });
    }

    // Filtrer par status si necessaire
    if (status) {
      filteredStocks = filteredStocks.filter((s) => s.valuations[0]?.status === status);
    }

    // Pagination
    const total = filteredStocks.length;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedStocks = filteredStocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Formater les resultats
    const results = paginatedStocks.map((stock) => ({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      isin: stock.isin,
      exchange: stock.exchange,
      country: stock.country,
      type: stock.type,
      price: stock.quotes[0]?.price || null,
      change: stock.quotes[0]?.change || null,
      changePercent: stock.quotes[0]?.changePercent || null,
      peCurrent: stock.valuations[0]?.peCurrent || null,
      peAvg: stock.valuations[0]?.peAvg || null,
      status: stock.valuations[0]?.status || 'NA',
    }));

    return NextResponse.json({
      stocks: results,
      pagination: {
        page,
        itemsPerPage: ITEMS_PER_PAGE,
        total,
        totalPages: Math.ceil(total / ITEMS_PER_PAGE),
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

