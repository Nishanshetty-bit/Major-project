# Data sources and provenance

## Historical market data
**NSE India Stock Market Data (2015–2024)** — Kaggle dataset by Manav Anghan.

Kaggle: https://www.kaggle.com/datasets/manavanghan/nse-india-stock-market-data-2015-2024

The dataset card describes daily OHLCV data for 100+ NSE-listed stocks from January 2015 to January 2024, including Date, Symbol, Open, High, Low, Close, Adj Close and Volume. It was generated from Yahoo Finance using yfinance.

## Current quote and intraday candles
The detail page optionally fetches quotes and candles from Yahoo Finance's public chart endpoint using NSE `.NS` symbols. This requires no API key, paid plan, or credit card. The endpoint is unofficial, can be rate-limited or changed without notice, and Yahoo's NSE quotes may be delayed. Yahoo states that its data is informational and must not be redistributed; use this only for the project's local educational demonstration, not a public/commercial redistribution or trade execution. NSE's own market-data policy describes subscriber agreements and fees for market data products, so the free Yahoo source is a pragmatic zero-budget source with material limitations rather than an NSE-licensed real-time feed.

## Sentiment training data
**Sentiment Analysis for Financial News / FinancialPhraseBank** — Kaggle dataset by Ankur Sinha.

Kaggle: https://www.kaggle.com/ankurzing/sentiment-analysis-for-financial-news

The dataset contains financial-news headlines labelled positive, neutral or negative. It is used to train the local TF-IDF + Logistic Regression classifier.

## News at runtime
Recent stock-specific headlines are optionally fetched from Google News RSS and passed through the locally trained sentiment model. This is separate from the historical Kaggle dataset and should be described as an optional live-data layer in the final report.
