# Data Aggregation Module

## Overview
This module enriches instruments using multiple free providers with strict rate limits,
provider-level caching, and per-field merge priorities.

## Setup
1. Add API keys and quotas in `.env` (see `.env.example`).
2. Run migrations after updating `prisma/schema.prisma`.
3. Seed instruments from existing stocks:
   ```bash
   npm run sync:instruments
   ```

## Endpoints
- `GET /api/instruments/search?q=...`
- `GET /api/instruments/:id` (auto-refresh if stale)
- `POST /api/admin/refresh` with JSON body:
  ```json
  { "instrumentIds": ["..."], "limit": 100 }
  ```

## Dashboard
- `GET /admin/aggregation` (quotas + jobs + cache + metrics)

## Refresh Strategy
- Quotes: short TTL (default 15 min)
- Overview: 7 days
- Financials: 30 days

## Providers (Free tiers)
- FMP
- Alpha Vantage
- Finnhub
- TwelveData

Adjust quotas with:
```
FMP_RPM / FMP_RPD / FMP_MAX_CONCURRENT
AV_RPM / AV_RPD / AV_MAX_CONCURRENT
FINNHUB_RPM / FINNHUB_RPD / FINNHUB_MAX_CONCURRENT
TWELVEDATA_RPM / TWELVEDATA_RPD / TWELVEDATA_MAX_CONCURRENT
```

## Merge Priorities
Set per-field priority order with:
```
MERGE_PRIORITY_PRICE=alphavantage,fmp,finnhub,twelvedata
MERGE_PRIORITY_MARKETCAP=fmp,alphavantage,finnhub
MERGE_PRIORITY_PE=fmp,alphavantage,finnhub
```
