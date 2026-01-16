import { prisma } from '../lib/prisma';

async function testUltraFilter() {
  console.log(' Test du filtre ultra-strict (actions pures seulement)...\n');

  try {
    const total = await prisma.stock.count();

    const filtered = await prisma.stock.count({
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'ETP' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: '21Shares' } } },
          { name: { not: { contains: 'Shares' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { name: { not: { contains: 'Bitcoin' } } },
          { name: { not: { contains: 'Ethereum' } } },
          { name: { not: { contains: 'Crypto' } } },
          { name: { not: { contains: 'Blockchain' } } },
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
          { exchange: { in: ['NASDAQ', 'NYSE', 'XETRA', 'LSE', 'EURONEXT', 'TSX', 'ASX', 'SHG', 'SHE', 'F', 'US', 'PA', 'BE', 'STU', 'MU', 'DU', 'TO', 'AU', 'SA', 'TW', 'TWO'] } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan'] } },
        ],
      },
    });

    console.log(` Total de stocks      : ${total.toLocaleString()}`);
    console.log(` Actions pures        : ${filtered.toLocaleString()} (${((filtered / total) * 100).toFixed(1)}%)`);
    console.log(` Exclus (fonds/ETF/crypto): ${(total - filtered).toLocaleString()}`);

    // Par pays
    console.log('\n Repartition par pays:');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      where: {
        active: true,
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'ETP' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: '21Shares' } } },
          { name: { not: { contains: 'Shares' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { name: { not: { contains: 'Bitcoin' } } },
          { name: { not: { contains: 'Ethereum' } } },
          { name: { not: { contains: 'Crypto' } } },
          { name: { not: { contains: 'Blockchain' } } },
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
          { exchange: { in: ['NASDAQ', 'NYSE', 'XETRA', 'LSE', 'EURONEXT', 'TSX', 'ASX', 'SHG', 'SHE', 'F', 'US', 'PA', 'BE', 'STU', 'MU', 'DU', 'TO', 'AU', 'SA', 'TW', 'TWO'] } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan'] } },
        ],
      },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    });

    countries.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.country}: ${c._count.country.toLocaleString()}`);
    });

    // Exemples USA
    console.log('\n Exemples d\'actions USA (NASDAQ/NYSE):');
    const samplesUSA = await prisma.stock.findMany({
      where: {
        active: true,
        country: 'USA',
        exchange: { in: ['NASDAQ', 'NYSE'] },
        AND: [
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'ETP' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Shares' } } },
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

    // Avec ISIN
    const withIsin = await prisma.stock.count({
      where: {
        active: true,
        isin: { not: null },
        AND: [
          { exchange: { notIn: ['EUFUND', 'FUND', 'CC', 'CRYPTO', 'INDEX', 'KO', 'KQ', 'V'] } },
          { name: { not: { contains: 'ETF' } } },
          { name: { not: { contains: 'ETP' } } },
          { name: { not: { contains: 'Fund' } } },
          { name: { not: { contains: 'Trust' } } },
          { name: { not: { contains: 'Portfolio' } } },
          { name: { not: { contains: '21Shares' } } },
          { name: { not: { contains: 'Shares' } } },
          { name: { not: { contains: 'Token' } } },
          { name: { not: { contains: 'Coin' } } },
          { name: { not: { contains: 'Bitcoin' } } },
          { name: { not: { contains: 'Ethereum' } } },
          { name: { not: { contains: 'Crypto' } } },
          { name: { not: { contains: 'Blockchain' } } },
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
          { exchange: { in: ['NASDAQ', 'NYSE', 'XETRA', 'LSE', 'EURONEXT', 'TSX', 'ASX', 'SHG', 'SHE', 'F', 'US', 'PA', 'BE', 'STU', 'MU', 'DU', 'TO', 'AU', 'SA', 'TW', 'TWO'] } },
          { country: { in: ['USA', 'Germany', 'China', 'UK', 'Canada', 'France', 'Japan', 'Switzerland', 'Australia', 'Brazil', 'Taiwan'] } },
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

testUltraFilter();

