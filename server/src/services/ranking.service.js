export function scoreStock(stock, sentimentScore = stock.sentimentScore ?? 50, sentimentLabel = stock.sentiment ?? "Neutral") {
  const value = stock.performanceScore * 0.30 + stock.riskScore * 0.20 + stock.technicalScore * 0.20 + sentimentScore * 0.20 + stock.stabilityScore * 0.10;
  const positiveDrivers = [...(stock.positiveDrivers || [])];
  const negativeDrivers = [...(stock.negativeDrivers || [])];
  if (sentimentLabel.toLowerCase() === "positive") positiveDrivers.push("Recent financial-news sentiment is positive");
  if (sentimentLabel.toLowerCase() === "negative") negativeDrivers.push("Recent financial-news sentiment is negative");
  return {
    ...stock,
    sentimentScore,
    sentiment: sentimentLabel,
    confidenceScore: Number(value.toFixed(2)),
    positiveDrivers: positiveDrivers.slice(0, 5),
    negativeDrivers: negativeDrivers.slice(0, 5)
  };
}
