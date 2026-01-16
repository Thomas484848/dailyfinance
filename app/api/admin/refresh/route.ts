import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshBatch } from '@/lib/aggregation/orchestrator';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const instrumentIds: string[] | undefined = body.instrumentIds;
  const limit = Number(body.limit ?? 100);

  let ids = instrumentIds ?? [];
  if (ids.length === 0) {
    const instruments = await prisma.instrument.findMany({
      where: { active: true },
      take: Number.isFinite(limit) ? Math.max(1, limit) : 100,
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    ids = instruments.map((instrument) => instrument.id);
  }

  const jobId = await refreshBatch(ids, 'admin');
  return NextResponse.json({ jobId, count: ids.length });
}
