import { NextRequest, NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 50;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || '';
    const exchange = searchParams.get('exchange') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);

    //  UTILISATION DE LA BASE DE DONNEES (toutes les actions du monde!)
    const { prisma } = await import('@/lib/prisma');

    // Construire les filtres - UNIQUEMENT LES ACTIONS AVEC ISIN
    const where: Prisma.StockWhereInput = {
      active: true,
      // Filtrer uniquement les stocks avec ISIN valide
      isin: { not: null },
      // Pays valide
      country: { not: null },
      // Exchange valide (pas Unknown)
      exchange: { notIn: ['UNKNOWN', 'Unknown', ''] },
    };

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { symbol: { contains: query } },
        { isin: { contains: query } },
      ];
    }
    if (country) where.country = country;
    if (exchange) where.exchange = exchange;

    // Recuperer le total
    const total = await prisma.stock.count({ where });

    // Recuperer les stocks avec pagination
    const stocks = await prisma.stock.findMany({
      where,
      include: {
        quotes: { orderBy: { timestamp: 'desc' }, take: 1 },
        valuations: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      orderBy: { name: 'asc' },
    });

    // Filtrer par status si necessaire
    let filteredStocks = stocks;
    if (status) {
      filteredStocks = stocks.filter((s) => s.valuations[0]?.status === status);
    }

    // Formater les resultats
    const results = filteredStocks.map((stock) => ({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      isin: stock.isin,
      exchange: stock.exchange,
      country: stock.country,
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

