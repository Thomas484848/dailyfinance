import { prisma } from '../lib/prisma';

async function showExchanges() {
  const exchanges = await prisma.stock.groupBy({
    by: ['exchange'],
    _count: { exchange: true },
    orderBy: { _count: { exchange: 'desc' } },
    take: 30,
  });

  console.log('Top 30 Exchanges:');
  exchanges.forEach(e => {
    console.log(`${e.exchange}: ${e._count.exchange}`);
  });

  await prisma.$disconnect();
}

showExchanges();

