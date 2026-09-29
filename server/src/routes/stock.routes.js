import { Router } from "express";
import { getHistory, getStock, getStocks } from "../services/marketData.service.js";
import { scoreStock } from "../services/ranking.service.js";
import { getNewsForStock } from "../services/news.service.js";
import { analyzeHeadlines } from "../services/sentiment.service.js";
import { getLiveCandles, getLiveQuote } from "../services/liveMarketData.service.js";
import { MarketDataProviderError, supportedIntervals } from "../services/marketDataProviders/yahooFinanceChart.provider.js";

const router = Router();

function sendMarketDataError(error, res) {
  if (error instanceof MarketDataProviderError) {
    if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, retryAfter: error.retryAfter || undefined }
    });
  }
  return res.status(502).json({
    error: { code: "MARKET_DATA_UNAVAILABLE", message: "Live market data is temporarily unavailable." }
  });
}

router.get("/:symbol/quote", async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) return res.status(404).json({ error: { code: "UNKNOWN_SYMBOL", message: "Stock not found in the historical dataset." } });
  try {
    return res.json(await getLiveQuote(stock.symbol));
  } catch (error) {
    return sendMarketDataError(error, res);
  }
});

router.get("/:symbol/candles", async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) return res.status(404).json({ error: { code: "UNKNOWN_SYMBOL", message: "Stock not found in the historical dataset." } });
  const interval = String(req.query.interval || "5m");
  if (!supportedIntervals.includes(interval)) {
    return res.status(400).json({ error: { code: "INVALID_INTERVAL", message: `Use one of: ${supportedIntervals.join(", ")}.` } });
  }
  try {
    return res.json(await getLiveCandles(stock.symbol, interval));
  } catch (error) {
    return sendMarketDataError(error, res);
  }
});

router.get("/recommendations", async (_req, res) => {
  const stocks = getStocks().slice(0, 12);
  const scored = await Promise.all(stocks.map(async (stock) => {
    const news = await getNewsForStock(stock);
    const sentiment = await analyzeHeadlines(news);
    return { ...scoreStock(stock, sentiment.score, sentiment.label), newsArticleCount: sentiment.articles.length };
  }));
  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
  res.json({ source: "Kaggle historical data + financial news sentiment", data: scored });
});

router.get("/", (_req, res) => res.json({ source: "processed market dataset", data: getStocks() }));

router.get("/sparklines", (_req, res) => {
  const data = getStocks().map(stock => ({
    symbol: stock.symbol,
    prices: getHistory(stock.symbol).slice(-28).map(row => Number(row.adjClose ?? row.close)).filter(Number.isFinite)
  }));
  res.json({ source: "processed historical prices", data });
});

router.get("/market-overview", (_req, res) => {
  const changes = getStocks().flatMap(stock => {
    const rows = getHistory(stock.symbol).slice(-2);
    if (rows.length < 2 || !(rows[0].adjClose || rows[0].close)) return [];
    const previous = Number(rows[0].adjClose ?? rows[0].close);
    const current = Number(rows[1].adjClose ?? rows[1].close);
    if (!(previous > 0) || !Number.isFinite(current)) return [];
    return [{ symbol: stock.symbol, change: Number(((current - previous) / previous * 100).toFixed(2)), date: rows[1].date }];
  });
  const advancers = changes.filter(item => item.change > 0);
  const decliners = changes.filter(item => item.change < 0);
  const unchanged = changes.length - advancers.length - decliners.length;
  res.json({
    source: "processed NSE equities; latest recorded observation per symbol",
    coverage: changes.length,
    advancers: advancers.length,
    decliners: decliners.length,
    unchanged,
    dateRange: changes.length ? { earliest: changes.reduce((a, b) => a.date < b.date ? a : b).date, latest: changes.reduce((a, b) => a.date > b.date ? a : b).date } : null,
    leaders: [...changes].sort((a, b) => b.change - a.change).slice(0, 5),
    laggards: [...changes].sort((a, b) => a.change - b.change).slice(0, 5)
  });
});

router.get("/:symbol/history", (req, res) => res.json({ symbol: req.params.symbol.toUpperCase(), data: getHistory(req.params.symbol) }));

router.get("/:symbol/news", async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) return res.status(404).json({ message: "Stock not found" });
  const articles = await getNewsForStock(stock);
  const sentiment = await analyzeHeadlines(articles);
  res.json({ symbol: stock.symbol, ...sentiment });
});

router.get("/:symbol/metrics", (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) return res.status(404).json({ message: "Stock not found" });
  res.json(stock);
});

router.get("/:symbol", async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) return res.status(404).json({ message: "Stock not found" });
  const news = await getNewsForStock(stock);
  const sentiment = await analyzeHeadlines(news);
  res.json({ stock: scoreStock(stock, sentiment.score, sentiment.label), news: sentiment.articles });
});

export default router;
