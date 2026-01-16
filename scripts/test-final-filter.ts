import { prisma } from '../lib/prisma';

async function testFinalFilter() {
  console.log(' Test du filtre final optimise...\n');

  try {
    const total = await prisma.stock.count();

    // Filtre final
    const filtered = await prisma.stock.count({
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan', 'Korea', 'Malaysia', 'Indonesia', 'India', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Belgium'] } },
        ],
      },
    });

    console.log(` Total de stocks        : ${total.toLocaleString()}`);
    console.log(` Filtre final optimise : ${filtered.toLocaleString()} (${((filtered / total) * 100).toFixed(1)}%)`);
    console.log(` Exclus                 : ${(total - filtered).toLocaleString()}`);

    // Repartition par pays
    console.log('\n Repartition par pays (top 15):');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan', 'Korea', 'Malaysia', 'Indonesia', 'India', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Belgium'] } },
        ],
      },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    });

    countries.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.country}: ${c._count.country.toLocaleString()}`);
    });

    // Repartition par exchange
    console.log('\n Repartition par exchange (top 15):');
    const exchanges = await prisma.stock.groupBy({
      by: ['exchange'],
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan', 'Korea', 'Malaysia', 'Indonesia', 'India', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Belgium'] } },
        ],
      },
      _count: { exchange: true },
      orderBy: { _count: { exchange: 'desc' } },
      take: 15,
    });

    exchanges.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.exchange}: ${e._count.exchange.toLocaleString()}`);
    });

    // Exemples d'actions
    console.log('\n Exemples d\'actions (USA):');
    const samplesUSA = await prisma.stock.findMany({
      where: {
        active: true,
        country: 'USA',
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
        ],
      },
      take: 15,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        exchange: true,
        isin: true,
      },
    });

    samplesUSA.forEach((s) => {
      const isin = s.isin ? `ISIN: ${s.isin}` : '';
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name} ${isin}`);
    });

    console.log('\n Exemples d\'actions (France):');
    const samplesFR = await prisma.stock.findMany({
      where: {
        active: true,
        country: 'France',
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
        ],
      },
      take: 15,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        exchange: true,
        isin: true,
      },
    });

    samplesFR.forEach((s) => {
      const isin = s.isin ? `ISIN: ${s.isin}` : '';
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name} ${isin}`);
    });

    // Avec ISIN
    const withIsin = await prisma.stock.count({
      where: {
        active: true,
        isin: { not: null },
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { symbol: { not: { contains: '-USD' } } },
          { symbol: { not: { contains: '-EUR' } } },
          { symbol: { not: { startsWith: '0000' } } },
          { symbol: { not: { startsWith: '0001' } } },
          { symbol: { not: { startsWith: '0002' } } },
          { symbol: { not: { startsWith: '0003' } } },
          { symbol: { not: { startsWith: '0004' } } },
          { symbol: { not: { startsWith: '0005' } } },
          { symbol: { not: { startsWith: '0006' } } },
          { symbol: { not: { startsWith: '0007' } } },
          { symbol: { not: { startsWith: '0008' } } },
          { symbol: { not: { startsWith: '0009' } } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan', 'Korea', 'Malaysia', 'Indonesia', 'India', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Belgium'] } },
        ],
      },
    });

    console.log(`\n Actions avec ISIN : ${withIsin.toLocaleString()} (${((withIsin / filtered) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalFilter();

