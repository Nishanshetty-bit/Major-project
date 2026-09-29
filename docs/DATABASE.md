# Database Blueprint

## users

```text
_id
name
email
passwordHash
role
budget
riskTolerance
investmentHorizon
preferences
createdAt
updatedAt
```

## stocks

```text
_id
symbol
companyName
sector
currentPrice
marketCap
peRatio
volatility
cagr
sharpeRatio
maxDrawdown
updatedAt
```

## historical_prices

```text
_id
stockId
timestamp
open
high
low
close
volume
```

## news_articles

```text
_id
stockId
title
description
url
publishedAt
source
```

## sentiments

```text
_id
newsId
label
score
modelVersion
createdAt
```

## portfolios

```text
_id
userId
budget
riskTolerance
investmentHorizon
allocation
createdAt
updatedAt
```

## behavioral_scenarios

```text
_id
title
description
marketCondition
options
correctnessNotRequired
```

## behavioral_responses

```text
_id
userId
scenarioId
selectedOption
responseTimeMs
createdAt
```

## behavioral_profiles

```text
_id
userId
lossAversion
overconfidence
herdBehavior
fomo
panicSelling
confidence
updatedAt
```

## recommendations

```text
_id
stockId
confidenceScore
positiveDrivers
negativeDrivers
sentimentScore
modelVersion
createdAt
```

## alerts

```text
_id
userId
type
severity
message
triggerData
status
createdAt
```
