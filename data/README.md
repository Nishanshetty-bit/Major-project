# Real dataset setup

## 1. Historical market data — required

Download **NSE India Stock Market Data (2015-2024)** from Kaggle:

https://www.kaggle.com/datasets/manavanghan/nse-india-stock-market-data-2015-2024

The dataset contains daily `Date, Symbol, Open, High, Low, Close, Adj Close, Volume` for 100+ NSE stocks. Put the downloaded `nifty500_stocks.csv` at:

```text
data/raw/stocks/nifty500_stocks.csv
```

Then run from the project root:

```bash
python ml/scripts/build_market_dataset.py --input data/raw/stocks/nifty500_stocks.csv
```

This creates:

```text
data/processed/stocks.json
data/processed/history.json
```

The application then uses real historical data instead of the demo fallback.

## 2. Financial sentiment training data — recommended

Download **Sentiment Analysis for Financial News (FinancialPhraseBank)** from Kaggle:

https://www.kaggle.com/ankurzing/sentiment-analysis-for-financial-news

Place the CSV at:

```text
data/raw/news/all-data.csv
```

Then train the local sentiment model:

```bash
python ml/scripts/train_sentiment.py --input data/raw/news/all-data.csv
```

This creates:

```text
ml/models/financial_sentiment.joblib
```

The ML service will use that model for financial-news sentiment classification.

## 3. Live stock-specific news

The web application can optionally fetch recent stock-related headlines through Google News RSS. If the feed is unavailable, the historical ranking still works and the sentiment component falls back to neutral.

## Important

Do not commit the Kaggle CSVs or trained model if your repository policy does not allow them. Keep large datasets outside Git and document the download/preprocessing steps in the final report.
