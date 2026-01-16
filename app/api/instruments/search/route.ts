import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.instrument.findMany({
    where: {
      OR: [
        { symbol: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { symbol: 'asc' },
  });

  return NextResponse.json({ results });
}
