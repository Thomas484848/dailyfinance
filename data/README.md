Dataset for bulk import

Place one of the following files:
- data/stocks.csv
- data/stocks.json

Environment override:
STOCKS_DATASET_PATH=path/to/your/file.csv

CSV headers supported (case-insensitive):
symbol,ticker,name,company,exchange,exchangeShortName,country,currency,isin,sector,industry,marketCap,price,change,changePercent,pe

JSON format:
Array of objects using the same field names as above.
