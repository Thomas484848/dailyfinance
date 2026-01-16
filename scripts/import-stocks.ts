import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { prisma } from '../lib/prisma';
import { loadEnv } from './load-env';
import { computeValuation } from '../lib/valuation';
import { clearImportState, loadImportState, saveImportState } from './import-state';

const BATCH_SIZE = 200;

type ImportCandidate = {
  symbol: string;
  name: string;
  exchange: string;
  currency?: string | null;
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  isin?: string | null;
  marketCap?: number | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  pe?: number | null;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeExchange(exchange?: string | null): string {
  const cleaned = exchange?.trim().toUpperCase();
  return cleaned && cleaned.length > 0 ? cleaned : 'UNKNOWN';
}

function normalizeIsin(isin?: string | null): string | null {
  if (!isin) return null;
  const cleaned = isin.trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

function parseNumber(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

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

function getFieldIndexMap(header: string[]): Record<string, number> {
  const normalized = header.map((value) => value.toLowerCase());
  const indexOf = (...candidates: string[]) =>
    candidates.map((c) => normalized.indexOf(c)).find((idx) => idx !== -1) ?? -1;

  return {
    symbol: indexOf('symbol', 'ticker'),
    name: indexOf('name', 'company', 'companyname'),
    exchange: indexOf('exchange', 'exchangeshortname'),
    country: indexOf('country', 'countrycode'),
    currency: indexOf('currency'),
    isin: indexOf('isin'),
    sector: indexOf('sector'),
    industry: indexOf('industry'),
    marketCap: indexOf('marketcap', 'market_cap'),
    price: indexOf('price', 'last'),
    change: indexOf('change'),
    changePercent: indexOf('changepercent', 'changespercentage'),
    pe: indexOf('pe', 'peratio'),
  };
}

function getValue(fields: string[], idx: number): string | null {
  if (idx === -1) return null;
  const value = fields[idx];
  return value === undefined || value === '' ? null : value;
}

function buildCandidateFromFields(
  fields: string[],
  map: Record<string, number>
): ImportCandidate | null {
  const symbol = getValue(fields, map.symbol);
  const exchange = getValue(fields, map.exchange);
  const name = getValue(fields, map.name) || symbol;

  if (!symbol || !exchange) {
    return null;
  }

  return {
    symbol,
    exchange,
    name: name || symbol,
    country: getValue(fields, map.country),
    currency: getValue(fields, map.currency),
    isin: getValue(fields, map.isin),
    sector: getValue(fields, map.sector),
    industry: getValue(fields, map.industry),
    marketCap: parseNumber(getValue(fields, map.marketCap)),
    price: parseNumber(getValue(fields, map.price)),
    change: parseNumber(getValue(fields, map.change)),
    changePercent: parseNumber(getValue(fields, map.changePercent)),
    pe: parseNumber(getValue(fields, map.pe)),
  };
}

async function countCsvLines(filePath: string): Promise<number> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (line.trim()) count += 1;
  }
  return Math.max(count - 1, 0);
}

async function upsertStock(candidate: ImportCandidate) {
  const isin = normalizeIsin(candidate.isin);
  const symbol = normalizeSymbol(candidate.symbol);
  const exchange = normalizeExchange(candidate.exchange);

  const existingByIsin = isin
    ? await prisma.stock.findUnique({ where: { isin } })
    : null;

  if (existingByIsin) {
    return prisma.stock.update({
      where: { id: existingByIsin.id },
      data: {
        symbol,
        name: candidate.name,
        isin,
        exchange,
        currency: candidate.currency || null,
        country: candidate.country || null,
        sector: candidate.sector || null,
        industry: candidate.industry || null,
        marketCap: candidate.marketCap || null,
        active: true,
      },
    });
  }

  const existingBySymbol = await prisma.stock.findFirst({
    where: {
      symbol,
      OR: [{ exchange }, { exchange: null }],
    },
  });

  if (existingBySymbol) {
    return prisma.stock.update({
      where: { id: existingBySymbol.id },
      data: {
        name: candidate.name,
        isin,
        exchange,
        currency: candidate.currency || null,
        country: candidate.country || null,
        sector: candidate.sector || null,
        industry: candidate.industry || null,
        marketCap: candidate.marketCap || null,
        active: true,
      },
    });
  }

  return prisma.stock.upsert({
    where: { symbol_exchange: { symbol, exchange } },
    update: {
      name: candidate.name,
      isin,
      currency: candidate.currency || null,
      country: candidate.country || null,
      sector: candidate.sector || null,
      industry: candidate.industry || null,
      marketCap: candidate.marketCap || null,
      active: true,
    },
    create: {
      symbol,
      name: candidate.name,
      isin,
      exchange,
      currency: candidate.currency || null,
      country: candidate.country || null,
      sector: candidate.sector || null,
      industry: candidate.industry || null,
      marketCap: candidate.marketCap || null,
      active: true,
    },
  });
}

async function upsertValuation(stockId: string, pe: number | null, sector: string | null) {
  const valuation = computeValuation(pe, sector);
  const existing = await prisma.valuation.findFirst({ where: { stockId } });

  if (existing) {
    await prisma.valuation.update({
      where: { id: existing.id },
      data: {
        peCurrent: valuation.peCurrent,
        peAvg: valuation.peAvg,
        status: valuation.status,
      },
    });
    return;
  }

  await prisma.valuation.create({
    data: {
      stockId,
      peCurrent: valuation.peCurrent,
      peAvg: valuation.peAvg,
      status: valuation.status,
    },
  });
}

async function importStocks() {
  loadEnv();
  console.log('[import] Starting stock import');

  const datasetPath =
    process.env.STOCKS_DATASET_PATH ||
    path.join(process.cwd(), 'data', 'stocks_master.csv');

  if (!fs.existsSync(datasetPath)) {
    console.error(`[import] Dataset not found: ${datasetPath}`);
    process.exit(1);
  }

  const ext = path.extname(datasetPath).toLowerCase();
  const state = await loadImportState();
  let imported = 0;
  let errors = 0;

  if (ext === '.json') {
    const raw = fs.readFileSync(datasetPath, 'utf8');
    const records = JSON.parse(raw) as ImportCandidate[];
    const total = records.length;
    const startIndex = state?.cursor ?? 0;
    console.log(
      `[import] JSON dataset (${total}). Resuming from ${startIndex}/${total}.`
    );

    for (let i = startIndex; i < records.length; i += 1) {
      const candidate = records[i];
      try {
        const dbStock = await upsertStock(candidate);

        if (candidate.price !== null && candidate.price !== undefined) {
          await prisma.quote.create({
            data: {
              stockId: dbStock.id,
              price: candidate.price,
              change: candidate.change ?? null,
              changePercent: candidate.changePercent ?? null,
            },
          });
        }

        await upsertValuation(dbStock.id, candidate.pe ?? null, candidate.sector ?? null);
        imported += 1;
      } catch (error) {
        errors += 1;
        console.error(`[import] Error importing ${candidate.symbol}:`, error);
      }

      if ((i + 1) % BATCH_SIZE === 0) {
        await saveImportState({
          cursor: i + 1,
          total,
          updatedAt: new Date().toISOString(),
        });
        console.log(
          `[import] Progress ${i + 1}/${total} | imported=${imported} errors=${errors}`
        );
      }
    }
  } else {
    const total = await countCsvLines(datasetPath);
    const startIndex = state?.cursor ?? 0;
    console.log(
      `[import] CSV dataset (${total}). Resuming from ${startIndex}/${total}.`
    );

    const stream = fs.createReadStream(datasetPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let header: string[] | null = null;
    let map: Record<string, number> | null = null;
    let index = 0;
    let batchCount = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;

      if (!header) {
        header = parseCsvLine(line);
        map = getFieldIndexMap(header);
        continue;
      }

      if (index < startIndex) {
        index += 1;
        continue;
      }

      const fields = parseCsvLine(line);
      const candidate = buildCandidateFromFields(fields, map!);
      index += 1;

      if (!candidate) {
        continue;
      }

      try {
        const dbStock = await upsertStock(candidate);

        if (candidate.price !== null && candidate.price !== undefined) {
          await prisma.quote.create({
            data: {
              stockId: dbStock.id,
              price: candidate.price,
              change: candidate.change ?? null,
              changePercent: candidate.changePercent ?? null,
            },
          });
        }

        await upsertValuation(dbStock.id, candidate.pe ?? null, candidate.sector ?? null);
        imported += 1;
      } catch (error) {
        errors += 1;
        console.error(`[import] Error importing ${candidate.symbol}:`, error);
      }

      batchCount += 1;
      if (batchCount >= BATCH_SIZE) {
        await saveImportState({
          cursor: index,
          total,
          updatedAt: new Date().toISOString(),
        });
        console.log(
          `[import] Progress ${index}/${total} | imported=${imported} errors=${errors}`
        );
        batchCount = 0;
      }
    }
  }

  await clearImportState();
  console.log('[import] Import completed');
  console.log(`[import] Imported: ${imported}`);
  console.log(`[import] Errors: ${errors}`);

  await prisma.$disconnect();
}

importStocks().catch((error) => {
  console.error('[import] Fatal error:', error);
  process.exit(1);
});
