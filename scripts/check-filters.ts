import { prisma } from '../lib/prisma';

async function checkFilters() {
  console.log(' Test des filtres de qualite...\n');

  try {
    const total = await prisma.stock.count();

    const withIsin = await prisma.stock.count({
      where: { isin: { not: null } },
    });

    const qualityStocks = await prisma.stock.count({
      where: {
        active: true,
        AND: [
          { isin: { not: null } },
          { country: { not: null } },
          { exchange: { notIn: ['UNKNOWN', 'Unknown', ''] } },
        ],
      },
    });

    console.log(` Total de stocks : ${total.toLocaleString()}`);
    console.log(` Avec ISIN : ${withIsin.toLocaleString()}`);
    console.log(` Qualite (ISIN + pays + exchange valide) : ${qualityStocks.toLocaleString()}`);
    console.log(`\n Stocks filtres qui seront affiches : ${qualityStocks.toLocaleString()}`);

    // Exemples
    console.log('\n Exemples de stocks qui SERONT affiches:');
    const samples = await prisma.stock.findMany({
      where: {
        active: true,
        AND: [
          { isin: { not: null } },
          { country: { not: null } },
          { exchange: { notIn: ['UNKNOWN', 'Unknown', ''] } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        isin: true,
        exchange: true,
        country: true,
      },
    });

    samples.forEach((s) => {
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name} [${s.country}] - ISIN: ${s.isin}`);
    });
  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFilters();

