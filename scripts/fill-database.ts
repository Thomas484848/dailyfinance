import { prisma } from '../lib/prisma';
import { computeValuation } from '../lib/valuation';
import { REAL_COMPANIES } from '../lib/real-companies-data';

// Remplissage avec 500+ vraies entreprises
async function fillDatabase() {
  console.log(' Remplissage de la base de donnees...');
  console.log(' Import de 500+ vraies entreprises mondiales...\n');

  let imported = 0;

  for (const [market, companies] of Object.entries(REAL_COMPANIES)) {
    const [country, exchange] = market.split('-');

    console.log(` ${market}: ${companies.length} entreprises...`);

    for (const companyData of companies) {
      const [symbol, name, isin, priceStr, peStr, sector] = companyData.split('|');
      const price = parseFloat(priceStr);
      const pe = peStr ? parseFloat(peStr) : null;
      const change = (Math.random() - 0.5) * (price * 0.05);
      const changePercent = (change / price) * 100;

      try {
        // Creer l'action
        const stock = await prisma.stock.upsert({
          where: { symbol },
          update: {
            name,
            exchange,
            currency: country === 'US' ? 'USD' : country === 'FR' ? 'EUR' : country === 'GB' ? 'GBP' : country === 'DE' ? 'EUR' : country === 'CA' ? 'CAD' : country === 'JP' ? 'JPY' : 'USD',
            country,
            sector,
            industry: sector,
            active: true,
          },
          create: {
            symbol,
            name,
            isin,
            exchange,
            currency: country === 'US' ? 'USD' : country === 'FR' ? 'EUR' : country === 'GB' ? 'GBP' : country === 'DE' ? 'EUR' : country === 'CA' ? 'CAD' : country === 'JP' ? 'JPY' : 'USD',
            country,
            sector,
            industry: sector,
            active: true,
          },
        });

        // Creer la quote
        await prisma.quote.create({
          data: {
            stockId: stock.id,
            price,
            change,
            changePercent,
          },
        });

        // Creer la valorisation
        const valuation = computeValuation(pe, sector);
        await prisma.valuation.create({
          data: {
            stockId: stock.id,
            peCurrent: valuation.peCurrent,
            peAvg: valuation.peAvg,
            status: valuation.status,
          },
        });

        imported++;
        if (imported % 50 === 0) {
          console.log(`    ${imported} actions importees...`);
        }
      } catch (error) {
        console.error(`    Erreur pour ${symbol}`);
      }
    }
  }

  console.log('\n Remplissage termine !');
  console.log(`    Total : ${imported} actions importees`);
  console.log(`    Couverture : US, FR, GB, DE, CA, JP, CN`);
  console.log(`    Secteurs : Technology, Finance, Healthcare, Energy, Consumer, etc.`);

  await prisma.$disconnect();
}

fillDatabase().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

