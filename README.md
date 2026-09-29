# Personalized Stock Advisory for Smarter Retail Investing

Final-year project implementation of an educational, explainable investment decision-support system.

## What is implemented

- Real historical stock-data pipeline using the Kaggle NSE dataset
- CAGR, annualized volatility, Sharpe ratio and maximum drawdown
- RSI, SMA/EMA and MACD technical features
- Explainable 0–100 confidence score
- Positive and negative score drivers
- Financial-news sentiment through a local TF-IDF + Logistic Regression model
- Optional stock-specific recent news through Google News RSS
- Budget-aware portfolio allocation with risk tolerance and whole-share constraints
- JWT authentication and MongoDB persistence
- Behavioral simulation with real response storage
- Behavioral fingerprint calculation from observed actions
- Pre-decision intervention engine
- React dashboard integrating the modules

## Dataset setup

See `data/README.md`.

Primary market dataset:
https://www.kaggle.com/datasets/manavanghan/nse-india-stock-market-data-2015-2024

Financial sentiment dataset:
https://www.kaggle.com/ankurzing/sentiment-analysis-for-financial-news

## Run

### Backend

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

### Frontend

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

### ML service

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### MongoDB

Use MongoDB local or Atlas and set `MONGODB_URI` in `server/.env`.

## Final-year scope

This project is deliberately a decision-support and simulation system. It does not place real brokerage orders. Confidence scores describe historical/model evidence; they are not guaranteed future returns or financial advice.

## Suggested final demonstration

1. Register/login.
2. Show stock ranking from the processed Kaggle dataset.
3. Open a stock and explain CAGR, volatility, Sharpe, drawdown, RSI and the confidence-score drivers.
4. Show recent news and sentiment.
5. Enter a budget and risk preference; generate a whole-share portfolio.
6. Run 8–12 simulation decisions.
7. Show the resulting behavioral fingerprint.
8. Trigger a high-risk action and demonstrate the pre-decision intervention.
9. Return to Dashboard and show the integrated outputs.
