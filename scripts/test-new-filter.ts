import { prisma } from '../lib/prisma';

async function testNewFilter() {
  console.log(' Test du nouveau filtre intelligent...\n');

  try {
    const total = await prisma.stock.count();

    // Nouveau filtre
    const filtered = await prisma.stock.count({
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { country: { not: 'Unknown' } },
          { country: { not: null } },
        ],
      },
    });

    console.log(` Total de stocks       : ${total.toLocaleString()}`);
    console.log(` Apres filtre intelligent : ${filtered.toLocaleString()} (${((filtered / total) * 100).toFixed(1)}%)`);
    console.log(` Exclus (fonds/ETF/crypto) : ${(total - filtered).toLocaleString()}`);

    // Repartition par pays
    console.log('\n Repartition par pays (apres filtre - top 10):');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { country: { not: 'Unknown' } },
          { country: { not: null } },
        ],
      },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });

    countries.forEach((c) => {
      console.log(`  - ${c.country}: ${c._count.country.toLocaleString()}`);
    });

    // Repartition par exchange
    console.log('\n Repartition par exchange (apres filtre - top 10):');
    const exchanges = await prisma.stock.groupBy({
      by: ['exchange'],
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { country: { not: 'Unknown' } },
          { country: { not: null } },
        ],
      },
      _count: { exchange: true },
      orderBy: { _count: { exchange: 'desc' } },
      take: 10,
    });

    exchanges.forEach((e) => {
      console.log(`  - ${e.exchange}: ${e._count.exchange.toLocaleString()}`);
    });

    // Exemples
    console.log('\n Exemples d\'actions filtrees:');
    const samples = await prisma.stock.findMany({
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { country: { not: 'Unknown' } },
          { country: { not: null } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        exchange: true,
        country: true,
        isin: true,
      },
    });

    samples.forEach((s) => {
      const isin = s.isin ? `ISIN: ${s.isin}` : 'Pas d\'ISIN';
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name} [${s.country}] - ${isin}`);
    });

    // Compter ceux avec ISIN parmi les filtres
    const withIsin = await prisma.stock.count({
      where: {
        active: true,
        isin: { not: null },
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { country: { not: 'Unknown' } },
          { country: { not: null } },
        ],
      },
    });

    console.log(`\n Actions avec ISIN (parmi les filtrees) : ${withIsin.toLocaleString()} (${((withIsin / filtered) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewFilter();

