import { prisma } from '../lib/prisma';

async function checkIsin() {
  console.log(' Analyse des ISIN...\n');

  try {
    const total = await prisma.stock.count();
    const withIsin = await prisma.stock.count({
      where: { isin: { not: null } },
    });
    const withoutIsin = total - withIsin;

    console.log(` Total de stocks : ${total.toLocaleString()}`);
    console.log(` Avec ISIN : ${withIsin.toLocaleString()} (${((withIsin / total) * 100).toFixed(1)}%)`);
    console.log(` Sans ISIN : ${withoutIsin.toLocaleString()} (${((withoutIsin / total) * 100).toFixed(1)}%)`);

    // Exemples de stocks avec ISIN
    console.log('\n Exemples de stocks AVEC ISIN:');
    const samplesWithIsin = await prisma.stock.findMany({
      where: { isin: { not: null } },
      take: 5,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        isin: true,
        exchange: true,
        country: true,
      },
    });

    samplesWithIsin.forEach((s) => {
      console.log(`  - ${s.isin} | ${s.symbol} (${s.exchange}): ${s.name} [${s.country}]`);
    });

    // Statistiques par pays (avec ISIN seulement)
    console.log('\n Repartition par pays (stocks AVEC ISIN - top 10):');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      where: { isin: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });

    countries.forEach((c) => {
      console.log(`  - ${c.country || 'Unknown'}: ${c._count.country.toLocaleString()}`);
    });
  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIsin();

