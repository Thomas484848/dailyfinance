import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enrichInstrument } from '@/lib/aggregation/orchestrator';
import { loadAggregatorConfig } from '@/lib/aggregation/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: params.id },
    include: {
      metrics: { orderBy: { asOfDate: 'desc' }, take: 1 },
    },
  });

  if (!instrument) {
    return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
  }

  const config = loadAggregatorConfig();
  const latest = instrument.metrics[0] ?? null;
  const shouldRefresh =
    !latest ||
    Date.now() - latest.asOfDate.getTime() > config.ttlSeconds.quote * 1000;

  if (shouldRefresh) {
    await enrichInstrument(instrument.id);
  }

  const refreshed = await prisma.instrument.findUnique({
    where: { id: params.id },
    include: { metrics: { orderBy: { asOfDate: 'desc' }, take: 1 } },
  });

  return NextResponse.json({
    instrument: refreshed,
    metrics: refreshed?.metrics[0] ?? null,
  });
}
