# Final implemented modules

## 1. Budget-Aware Portfolio
Inputs: capital, risk tolerance, investment horizon.

Process: filter by volatility, rank by explainable confidence, weight using confidence and inverse volatility, cap single-stock exposure, convert target amounts into whole shares.

Output: symbol, shares, actual amount, percentage, rationale and remaining cash.

## 2. Explainable Stock Ranking
Historical inputs: CAGR, annualized volatility, Sharpe ratio, maximum drawdown.
Technical inputs: RSI, SMA20, SMA50, EMA20, MACD.
Sentiment input: recent financial-news sentiment.

Score:
- Performance 30%
- Risk 20%
- Technical 20%
- Sentiment 20%
- Stability 10%

Output: 0–100 score, component scores and positive/negative drivers.

## 3. Behavioral Fingerprinting
Synthetic market scenarios generate Buy/Hold/Sell decisions. The system stores action, price, market movement, response time and observed pattern. Profile indicators are derived from accumulated decisions.

## 4. Pre-Decision Intervention
Before a simulated Buy/Sell action, the engine checks stock volatility, historical drawdown, current scenario movement and observed FOMO/panic indicators. If the risk threshold is reached, a warning is shown with reasons and the user can cancel or continue the simulation.

## 5. Scope
Educational simulation only. No real brokerage order is executed.
