import { prisma } from '../lib/prisma';

async function checkDatabase() {
  console.log(' Verification de la base de donnees...\n');

  try {
    // Compter les stocks
    const stockCount = await prisma.stock.count();
    console.log(` Nombre de stocks: ${stockCount.toLocaleString()}`);

    // Compter les quotes
    const quoteCount = await prisma.quote.count();
    console.log(` Nombre de cotations: ${quoteCount.toLocaleString()}`);

    // Compter les valuations
    const valuationCount = await prisma.valuation.count();
    console.log(` Nombre de valorisations: ${valuationCount.toLocaleString()}`);

    // Quelques exemples de stocks
    if (stockCount > 0) {
      console.log('\n Exemples de stocks:');
      const samples = await prisma.stock.findMany({
        take: 5,
        orderBy: { name: 'asc' },
        select: {
          symbol: true,
          name: true,
          exchange: true,
          country: true,
        },
      });

      samples.forEach((s) => {
        console.log(`  - ${s.symbol} (${s.exchange}): ${s.name} [${s.country}]`);
      });

      // Statistiques par pays
      console.log('\n Repartition par pays (top 5):');
      const countries = await prisma.stock.groupBy({
        by: ['country'],
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 5,
      });

      countries.forEach((c) => {
        console.log(`  - ${c.country}: ${c._count.country.toLocaleString()}`);
      });
    } else {
      console.log('\n  Aucun stock dans la base de donnees!');
      console.log(' Lancez: npm run import:world');
    }
  } catch (error) {
    console.error(' Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

