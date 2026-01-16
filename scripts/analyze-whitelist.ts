import { prisma } from '../lib/prisma';

const EXCHANGE_WHITELIST = [
  'US', 'F', 'LSE', 'PA', 'BE', 'MI', 'SW', 'ST', 'CO', 'HE', 'VI', 'LS',
  'T', 'HK', 'SS', 'SZ',
  'TO', 'AU',
];

async function analyzeWhitelist() {
  console.log(' Analyse avec WHITELIST stricte...\n');

  try {
    const total = await prisma.stock.count();

    // Compter avec whitelist
    const withWhitelist = await prisma.stock.count({
      where: {
        active: true,
        exchange: { in: EXCHANGE_WHITELIST },
      },
    });

    console.log(` Total de stocks : ${total.toLocaleString()}`);
    console.log(` Avec WHITELIST : ${withWhitelist.toLocaleString()} (${((withWhitelist / total) * 100).toFixed(1)}%)`);
    console.log(` Exclus : ${(total - withWhitelist).toLocaleString()}`);

    // Repartition par exchange
    console.log('\n Repartition par exchange (whitelist):');
    const exchanges = await prisma.stock.groupBy({
      by: ['exchange'],
      where: {
        active: true,
        exchange: { in: EXCHANGE_WHITELIST },
      },
      _count: { exchange: true },
      orderBy: { _count: { exchange: 'desc' } },
    });

    exchanges.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.exchange}: ${e._count.exchange.toLocaleString()}`);
    });

    // Repartition par pays
    console.log('\n Repartition par pays (whitelist):');
    const countries = await prisma.stock.groupBy({
      by: ['country'],
      where: {
        active: true,
        exchange: { in: EXCHANGE_WHITELIST },
      },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    });

    countries.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.country || 'Unknown'}: ${c._count.country.toLocaleString()}`);
    });

    // Exemples d'actions USA
    console.log('\n Exemples d\'actions (USA - US):');
    const samplesUS = await prisma.stock.findMany({
      where: {
        active: true,
        exchange: 'US',
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        exchange: true,
      },
    });

    samplesUS.forEach((s) => {
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name}`);
    });

    console.log('\n Exemples d\'actions (Europe - F/LSE/PA):');
    const samplesEU = await prisma.stock.findMany({
      where: {
        active: true,
        exchange: { in: ['F', 'LSE', 'PA'] },
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        symbol: true,
        name: true,
        exchange: true,
        country: true,
      },
    });

    samplesEU.forEach((s) => {
      console.log(`   ${s.symbol} (${s.exchange}) - ${s.name} [${s.country}]`);
    });

  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeWhitelist();

