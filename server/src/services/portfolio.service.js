function riskLimits(riskTolerance) {
  if (riskTolerance === "conservative") return { maxVol: 22, maxSingle: 30 };
  if (riskTolerance === "aggressive") return { maxVol: 45, maxSingle: 40 };
  return { maxVol: 32, maxSingle: 35 };
}

function cappedPercentages(stocks, maxSingle) {
  const target = Math.min(100, stocks.length * maxSingle);
  const weights = stocks.map(s => Math.max(0, s.weight));
  const percentages = stocks.map(() => 0);
  let open = stocks.map((_, index) => index);
  let remaining = target;

  while (open.length && remaining > 0) {
    const totalWeight = open.reduce((sum, index) => sum + weights[index], 0);
    const proposals = open.map(index => ({
      index,
      value: totalWeight ? remaining * weights[index] / totalWeight : remaining / open.length
    }));
    const capped = proposals.filter(item => item.value > maxSingle);

    if (!capped.length) {
      for (const item of proposals) percentages[item.index] = item.value;
      break;
    }

    const cappedIndexes = new Set(capped.map(item => item.index));
    for (const item of capped) {
      percentages[item.index] = maxSingle;
      remaining -= maxSingle;
    }
    open = open.filter(index => !cappedIndexes.has(index));
  }

  return percentages;
}

export function buildPortfolio(stocks, budget, riskTolerance = "moderate", horizon = "medium") {
  const limits = riskLimits(riskTolerance);
  const eligible = stocks
    .filter(s => Number(s.currentPrice) > 0 && Number(s.volatility) <= limits.maxVol)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 8);

  if (!eligible.length) return { budget, riskTolerance, horizon, allocation: [], remainingCash: budget };

  const raw = eligible.map(s => ({ ...s, weight: 1 / Math.max(s.volatility, 5) * Math.max(s.confidenceScore, 1) }));
  const percentages = cappedPercentages(raw, limits.maxSingle);
  const weighted = raw.map((s, index) => ({ ...s, percentage: percentages[index] }));

  let remaining = Math.max(0, Number(budget));
  const allocation = weighted.map((s) => {
    const target = budget * s.percentage / 100;
    const shares = Math.floor(target / s.currentPrice);
    const amount = shares * s.currentPrice;
    remaining -= amount;
    return {
      symbol: s.symbol,
      name: s.name,
      percentage: Number((amount / budget * 100).toFixed(2)),
      targetPercentage: Number(s.percentage.toFixed(2)),
      amount: Number(amount.toFixed(2)),
      shares,
      price: s.currentPrice,
      volatility: s.volatility,
      riskLevel: s.volatility < 20 ? "Lower" : s.volatility < 35 ? "Moderate" : "Elevated",
      confidenceScore: s.confidenceScore,
      rationale: `${s.confidenceScore}/100 score, ${s.volatility}% volatility and ${s.sharpeRatio} Sharpe ratio`
    };
  }).filter(x => x.shares > 0);

  return {
    budget: Number(budget),
    riskTolerance,
    investmentHorizon: horizon,
    allocation,
    remainingCash: Number(Math.max(0, remaining).toFixed(2)),
    note: "Educational allocation based on historical metrics; not financial advice."
  };
}
