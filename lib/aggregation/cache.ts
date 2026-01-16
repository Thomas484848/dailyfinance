import { prisma } from '../prisma';

export async function getCachedPayload(
  instrumentId: string,
  provider: string,
  endpoint: string
): Promise<{ payload: unknown; fetchedAt: Date; ttlSeconds: number } | null> {
  const cache = await prisma.providerCache.findFirst({
    where: { instrumentId, provider, endpoint },
    orderBy: { fetchedAt: 'desc' },
  });

  if (!cache) return null;

  const expiresAt = cache.fetchedAt.getTime() + cache.ttlSeconds * 1000;
  if (Date.now() > expiresAt) return null;

  try {
    const payload = JSON.parse(cache.payloadJson);
    if (
      payload &&
      typeof payload === 'object' &&
      ('Information' in payload || 'Note' in payload || 'Error Message' in payload)
    ) {
      return null;
    }
    return {
      payload,
      fetchedAt: cache.fetchedAt,
      ttlSeconds: cache.ttlSeconds,
    };
  } catch {
    return null;
  }
}

export async function saveCachedPayload(
  instrumentId: string,
  provider: string,
  endpoint: string,
  payload: unknown,
  ttlSeconds: number
) {
  await prisma.providerCache.create({
    data: {
      instrumentId,
      provider,
      endpoint,
      payloadJson: JSON.stringify(payload ?? null),
      ttlSeconds,
      fetchedAt: new Date(),
    },
  });
}
