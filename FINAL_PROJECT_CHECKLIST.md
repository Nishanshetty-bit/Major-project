# Final-year project checklist

## Before demo
- [ ] MongoDB is running / Atlas URI is configured.
- [ ] Kaggle `nifty500_stocks.csv` is placed under `data/raw/stocks/`.
- [ ] `python ml/scripts/build_market_dataset.py --input data/raw/stocks/nifty500_stocks.csv` has been run.
- [ ] FinancialPhraseBank CSV is placed under `data/raw/news/`.
- [ ] `python ml/scripts/train_sentiment.py --input data/raw/news/all-data.csv` has been run.
- [ ] ML service is running on port 8000.
- [ ] Backend is running on port 5000.
- [ ] Frontend is running on port 5173.

## Demo sequence
1. Register a user.
2. Open Stocks and show that the list is loaded from processed Kaggle data.
3. Open TCS/INFY/RELIANCE/HDFCBANK and explain the historical metrics.
4. Explain the 30/20/20/20/10 confidence-score formula.
5. Open news and show sentiment classification.
6. Enter a budget and generate a portfolio with whole-share constraints.
7. Run the Simulation Center for at least 8 decisions.
8. Open Behavioral Fingerprint and explain the observed indicators.
9. Trigger Buy after a strong positive market move or Sell after a sharp negative move.
10. Show the pre-decision intervention warning.
11. Return to Dashboard and explain how all four modules connect.

## Viva points
- Why not only predict price? — The project is a decision-support system, so it prioritizes interpretable evidence and personalization.
- Why historical metrics? — CAGR, volatility, Sharpe and drawdown quantify the risk-return profile.
- Why sentiment? — It adds a textual market-perception signal to quantitative history.
- Why behavior simulation? — Real user trading history is unavailable, so the project observes controlled simulated decisions.
- Why rules for intervention? — They are transparent and auditable; ML can be added later without making the core decision logic a black box.
- Why no brokerage API? — The academic scope is an educational simulation and should not execute real trades.
