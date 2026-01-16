import { prisma } from '../lib/prisma';
import { loadEnv } from './load-env';
import { FMPProvider } from '../lib/providers/fmp';
import { computeValuation } from '../lib/valuation';
import { chunk, sleep } from '../lib/utils';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 2000;

async function updateQuotes() {
  loadEnv();
  console.log(' Starting quote update...');

  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) {
    console.error(' FMP_API_KEY is not set');
    process.exit(1);
  }

  const fmp = new FMPProvider(apiKey);

  // Recupere tous les stocks actifs
  const stocks = await prisma.stock.findMany({
    where: { active: true },
    select: { id: true, symbol: true, sector: true },
  });

  console.log(` Updating quotes for ${stocks.length} stocks...`);

  const batches = chunk(stocks, BATCH_SIZE);
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(` Processing batch ${i + 1}/${batches.length}...`);

    // Recupere les profils en bulk
    const symbols = batch.map((s) => s.symbol);
    const profiles = await fmp.fetchBulkProfiles(symbols);
    const profileMap = new Map(profiles.map((p) => [p.symbol, p]));

    for (const stock of batch) {
      try {
        const profile = profileMap.get(stock.symbol);

        if (profile && profile.price) {
          // Cree une nouvelle quote
          await prisma.quote.create({
            data: {
              stockId: stock.id,
              price: profile.price,
              change: profile.change,
              changePercent: profile.changePercent,
            },
          });

          // Met a jour le market cap
          if (profile.marketCap) {
            await prisma.stock.update({
              where: { id: stock.id },
              data: { marketCap: profile.marketCap },
            });
          }

          // Met a jour la valorisation
          const valuation = computeValuation(profile.pe || null, stock.sector);
          await prisma.valuation.updateMany({
            where: { stockId: stock.id },
            data: {
              peCurrent: valuation.peCurrent,
              peAvg: valuation.peAvg,
              status: valuation.status,
            },
          });

          updated++;
        }
      } catch (error) {
        errors++;
        console.error(` Error updating ${stock.symbol}:`, error);
      }
    }

    if (i < batches.length - 1) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(' Update completed!');
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Errors: ${errors}`);

  await prisma.$disconnect();
}

updateQuotes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



