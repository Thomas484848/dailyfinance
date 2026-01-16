import { prisma } from '../lib/prisma';

async function analyzeData() {
  console.log(' Analyse detaillee du fichier CSV importe...\n');

  try {
    const total = await prisma.stock.count();
    console.log(` Total de stocks : ${total.toLocaleString()}\n`);

    // Compter les ISIN vides vs remplis
    const withIsin = await prisma.stock.count({
      where: { isin: { not: null } },
    });
    const withoutIsin = total - withIsin;

    console.log(' Repartition ISIN:');
    console.log(`   Avec ISIN    : ${withIsin.toLocaleString()} (${((withIsin / total) * 100).toFixed(2)}%)`);
    console.log(`   Sans ISIN    : ${withoutIsin.toLocaleString()} (${((withoutIsin / total) * 100).toFixed(2)}%)`);

    // Analyser les exchanges
    console.log('\n Top 15 Exchanges:');
    const exchanges = await prisma.stock.groupBy({
      by: ['exchange'],
      _count: { exchange: true },
      orderBy: { _count: { exchange: 'desc' } },
      take: 15,
    });

    exchanges.forEach((e, i) => {
      const pct = ((e._count.exchange / total) * 100).toFixed(1);
      console.log(`  ${i + 1}. ${e.exchange}: ${e._count.exchange.toLocaleString()} (${pct}%)`);
    });

    // Analyser les pays
    console.log('\n Top 15 Pays:');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    });

    countries.forEach((c, i) => {
      const pct = ((c._count.country / total) * 100).toFixed(1);
      console.log(`  ${i + 1}. ${c.country || 'null'}: ${c._count.country.toLocaleString()} (${pct}%)`);
    });

    // Quelques exemples AVEC ISIN
    console.log('\n Exemples avec ISIN:');
    const withIsinSamples = await prisma.stock.findMany({
      where: { isin: { not: null } },
      take: 10,
      select: {
        symbol: true,
        name: true,
        isin: true,
        exchange: true,
        country: true,
      },
    });

    withIsinSamples.forEach((s) => {
      console.log(`   ${s.symbol} - ${s.name} [${s.country}/${s.exchange}] ISIN: ${s.isin}`);
    });

    // Quelques exemples SANS ISIN
    console.log('\n Exemples SANS ISIN:');
    const withoutIsinSamples = await prisma.stock.findMany({
      where: { isin: null },
      take: 10,
      select: {
        symbol: true,
        name: true,
        exchange: true,
        country: true,
      },
    });

    withoutIsinSamples.forEach((s) => {
      console.log(`   ${s.symbol} - ${s.name} [${s.country}/${s.exchange}]`);
    });

    // Analyser les noms pour detecter les types
    console.log('\n Analyse des noms (detection de patterns):');

    const fundsCount = await prisma.stock.count({
      where: {
        OR: [
          { name: { contains: 'Fund' } },
          { name: { contains: 'ETF' } },
          { name: { contains: 'Trust' } },
          { name: { contains: 'Portfolio' } },
        ],
      },
    });

    const cryptoCount = await prisma.stock.count({
      where: {
        OR: [
          { name: { contains: 'Token' } },
          { name: { contains: 'Coin' } },
          { name: { contains: 'USD' } },
          { symbol: { contains: '-USD' } },
        ],
      },
    });

    console.log(`   Fonds/ETF detectes : ${fundsCount.toLocaleString()} (${((fundsCount / total) * 100).toFixed(1)}%)`);
    console.log(`   Crypto detectes    : ${cryptoCount.toLocaleString()} (${((cryptoCount / total) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeData();

