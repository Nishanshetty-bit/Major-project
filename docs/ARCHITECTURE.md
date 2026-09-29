# System Architecture

## 1. Data Sources

- Stock market API: prices, volume, historical data
- Financial news API: articles
- Behavioral simulations: user decisions
- User inputs: budget, risk tolerance, preferences, horizon

## 2. Backend

### Data ingestion
Collect, clean, normalize and cache market/news data.

### Analytics & AI
- Performance metrics
- Technical indicators
- News sentiment
- Explainable stock score
- Behavioral profiling

### Decision support
- Portfolio allocation
- Diversified recommendations
- Risk/regret estimation
- Warning nudges

### REST API
Authentication, profiles, stocks, recommendations, portfolio, simulations and alerts.

## 3. Frontend

- User Dashboard
- Stock Analysis
- Portfolio Planner
- Behavioral Alerts
- Simulation Center

## 4. Storage

Recommended collections:
- users
- stocks
- historical_prices
- news_articles
- sentiments
- portfolios
- portfolio_holdings
- behavioral_scenarios
- behavioral_responses
- behavioral_profiles
- recommendations
- alerts

## 5. External services

Optional:
- Email
- Push notifications
- Python ML service

## Security layer

- Authentication
- Authorization
- Password hashing
- Secure cookies/token handling
- Input validation
- Rate limiting
- API-key protection
- Audit logging
