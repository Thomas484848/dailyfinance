import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { prisma } from '../lib/prisma';
import { loadEnv } from './load-env';

const BATCH_SIZE = 500; // Taille de batch plus grande pour optimiser
const LOG_INTERVAL = 1000; // Afficher les progres tous les 1000 enregistrements

type WorldStockRow = {
  symbol: string;
  name: string;
  exchange_code: string;
  mic?: string | null;
  country?: string | null;
  currency?: string | null;
  isin?: string | null;
  type?: string | null;
  source?: string | null;
  key?: string | null;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseRow(fields: string[], headers: string[]): WorldStockRow | null {
  const getField = (name: string): string | null => {
    const idx = headers.indexOf(name);
    if (idx === -1) return null;
    const value = fields[idx];
    return value === undefined || value === '' ? null : value;
  };

  const symbol = getField('symbol');
  const name = getField('name');
  const exchange_code = getField('exchange_code');

  if (!symbol || !name) {
    return null;
  }

  return {
    symbol: symbol.trim(),
    name: name.trim(),
    exchange_code: exchange_code || 'UNKNOWN',
    mic: getField('mic'),
    country: getField('country'),
    currency: getField('currency'),
    isin: getField('isin'),
    type: getField('type'),
    source: getField('source'),
    key: getField('key'),
  };
}

async function importWorldStocks() {
  loadEnv();
  console.log('[import]  Starting world stocks import');

  const csvPath = path.join(process.cwd(), 'data', 'stocks_master_world.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`[import]  File not found: ${csvPath}`);
    process.exit(1);
  }

  const fileSize = fs.statSync(csvPath).size;
  console.log(`[import]  File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  const stream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let lineNumber = 0;
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let batch: StockData[] = [];

  const startTime = Date.now();

  for await (const line of rl) {
    lineNumber += 1;

    if (!line.trim()) continue;

    // Premiere ligne = en-tetes
    if (!headers) {
      headers = parseCsvLine(line);
      console.log(`[import]  Columns found: ${headers.join(', ')}`);
      continue;
    }

    try {
      const fields = parseCsvLine(line);
      const row = parseRow(fields, headers);

      if (!row) {
        skipped += 1;
        continue;
      }

      // Normaliser l'ISIN (peut etre null ou vide)
      const isin = row.isin && row.isin.trim().length > 0 ? row.isin.trim().toUpperCase() : null;

      // Normaliser le type
      const type = row.type && row.type.trim().length > 0 ? row.type.trim().toUpperCase() : null;

      // Preparer les donnees pour l'insertion
      batch.push({
        symbol: row.symbol.toUpperCase(),
        name: row.name,
        exchange: row.exchange_code || 'UNKNOWN',
        country: row.country || null,
        currency: row.currency || null,
        isin,
        type, // Type d'instrument (COMMON STOCK, ETF, FUND, etc.)
        sector: null, // Pas de secteur dans ce CSV
        industry: null, // Pas d'industrie dans ce CSV
        marketCap: null, // Pas de market cap dans ce CSV
        active: true,
      });

      // Inserer par batch pour optimiser les performances
      if (batch.length >= BATCH_SIZE) {
        await processBatch(batch);
        imported += batch.length;
        batch = [];

        if (imported % LOG_INTERVAL === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = Math.round(imported / elapsed);
          console.log(
            `[import]  Progress: ${imported.toLocaleString()} imported, ${skipped} skipped, ${errors} errors | ${rate} rows/sec`
          );
        }
      }
    } catch (error) {
      errors += 1;
      if (errors < 10) {
        console.error(`[import]   Error at line ${lineNumber}:`, error);
      }
    }
  }

  // Traiter le dernier batch
  if (batch.length > 0) {
    await processBatch(batch);
    imported += batch.length;
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const rate = Math.round(imported / elapsed);

  console.log('\n[import]  Import completed!');
  console.log(`[import]  Statistics:`);
  console.log(`  - Total imported: ${imported.toLocaleString()}`);
  console.log(`  - Skipped: ${skipped.toLocaleString()}`);
  console.log(`  - Errors: ${errors.toLocaleString()}`);
  console.log(`  - Time: ${elapsed.toFixed(1)}s`);
  console.log(`  - Rate: ${rate} rows/sec`);

  await prisma.$disconnect();
}

async function processBatch(batch: StockData[]) {
  // Inserer les stocks un par un avec upsert pour gerer les doublons
  for (const item of batch) {
    try {
      await prisma.stock.upsert({
        where: { symbol_exchange: { symbol: item.symbol, exchange: item.exchange } },
        update: {
          name: item.name,
          country: item.country,
          currency: item.currency,
          isin: item.isin,
          active: true,
        },
        create: item,
      });
    } catch (err) {
      // Ignorer les erreurs de doublons ISIN
      if (!(err instanceof Error && err.message.includes('Unique constraint'))) {
        console.error(`[import] Error with ${item.symbol}:`, err);
      }
    }
  }
}

importWorldStocks().catch((error) => {
  console.error('[import]  Fatal error:', error);
  process.exit(1);
});

