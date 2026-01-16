import { NextRequest, NextResponse } from 'next/server';
import { ValuationStatus } from '@/lib/types';

// Mock data pour tester sans base de donnees
const MOCK_STOCKS = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    isin: 'US0378331005',
    exchange: 'NASDAQ',
    country: 'US',
    price: 178.25,
    change: 2.45,
    changePercent: 1.39,
    peCurrent: 29.5,
    peAvg: 25.0,
    status: ValuationStatus.OVER,
  },
  {
    id: '2',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    isin: 'US5949181045',
    exchange: 'NASDAQ',
    country: 'US',
    price: 378.91,
    change: -1.23,
    changePercent: -0.32,
    peCurrent: 35.2,
    peAvg: 30.0,
    status: ValuationStatus.OVER,
  },
  {
    id: '3',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    isin: 'US02079K3059',
    exchange: 'NASDAQ',
    country: 'US',
    price: 140.93,
    change: 0.75,
    changePercent: 0.54,
    peCurrent: 24.8,
    peAvg: 26.0,
    status: ValuationStatus.FAIR,
  },
  {
    id: '4',
    symbol: 'MC.PA',
    name: 'LVMH Moet Hennessy',
    isin: 'FR0000121014',
    exchange: 'EURONEXT',
    country: 'FR',
    price: 745.50,
    change: -5.20,
    changePercent: -0.69,
    peCurrent: 22.3,
    peAvg: 28.0,
    status: ValuationStatus.UNDER,
  },
  {
    id: '5',
    symbol: 'OR.PA',
    name: 'L\'Oreal',
    isin: 'FR0000120321',
    exchange: 'EURONEXT',
    country: 'FR',
    price: 432.10,
    change: 3.80,
    changePercent: 0.89,
    peCurrent: 38.5,
    peAvg: 35.0,
    status: ValuationStatus.OVER,
  },
  {
    id: '6',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    isin: 'US88160R1014',
    exchange: 'NASDAQ',
    country: 'US',
    price: 242.84,
    change: 8.45,
    changePercent: 3.60,
    peCurrent: null,
    peAvg: null,
    status: ValuationStatus.NA,
  },
  {
    id: '7',
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    isin: 'US0231351067',
    exchange: 'NASDAQ',
    country: 'US',
    price: 156.78,
    change: -0.92,
    changePercent: -0.58,
    peCurrent: 52.1,
    peAvg: 45.0,
    status: ValuationStatus.OVER,
  },
  {
    id: '8',
    symbol: 'BNP.PA',
    name: 'BNP Paribas',
    isin: 'FR0000131104',
    exchange: 'EURONEXT',
    country: 'FR',
    price: 61.42,
    change: 0.38,
    changePercent: 0.62,
    peCurrent: 7.8,
    peAvg: 10.5,
    status: ValuationStatus.UNDER,
  },
];

const ITEMS_PER_PAGE = 50;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || '';
    const exchange = searchParams.get('exchange') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Filtrer les donnees mock
    let filtered = MOCK_STOCKS;

    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLower) ||
          s.symbol.toLowerCase().includes(queryLower) ||
          s.isin?.toLowerCase().includes(queryLower)
      );
    }

    if (country) {
      filtered = filtered.filter((s) => s.country === country);
    }

    if (exchange) {
      filtered = filtered.filter((s) => s.exchange === exchange);
    }

    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    const total = filtered.length;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const stocks = filtered.slice(start, end);

    return NextResponse.json({
      stocks,
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

