# Implemented REST API

Base URL: `/api`

## Auth
- POST `/auth/register`
- POST `/auth/login`
- GET `/auth/me`

## Stocks
- GET `/stocks` — processed historical analytics
- GET `/stocks/recommendations` — confidence ranking + recent news sentiment
- GET `/stocks/:symbol` — stock detail + news
- GET `/stocks/:symbol/history` — historical OHLCV chart data
- GET `/stocks/:symbol/metrics` — metrics/features
- GET `/stocks/:symbol/news` — recent headlines + sentiment
- GET `/stocks/:symbol/quote` — current provider-reported NSE quote and day statistics
- GET `/stocks/:symbol/candles?interval=5m|15m|1h|1d` — intraday/daily OHLCV candles

## Portfolio
- POST `/portfolio/plan`
- POST `/portfolio/save` — authenticated

## Behavior
- POST `/behavior/simulation/response`
- GET `/behavior/profile?sessionId=...`
- GET `/behavior/history?sessionId=...`

## Intervention
- POST `/intervention/check`

## ML service
- GET `/health`
- POST `/sentiment`
- POST `/score`

## Live market data

The quote and candle endpoints use Yahoo Finance's public chart endpoint through an isolated provider module. Supported candle intervals map to Yahoo Finance intervals and bounded ranges: `5m`/1 day, `15m`/5 days, `1h`/1 month, and `1d`/1 year. Responses are cached in process for 30 seconds (quotes) or 60 seconds (candles), duplicate in-flight requests are shared, and requests to the provider are spaced by 500 ms. A provider HTTP 429 is returned as HTTP 429 with `Retry-After`; recent cached data may be returned as explicitly stale only during other upstream failures.

No market ticks or candles are written to MongoDB. Historical analytics continue to use the processed Kaggle files. Yahoo Finance's NSE quotes may be delayed and its chart endpoint is unofficial and subject to change; the feature is informational and is not an exchange-authorized real-time feed or trading input.
