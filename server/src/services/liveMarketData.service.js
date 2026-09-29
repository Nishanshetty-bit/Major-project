import { fetchCandles, fetchQuote } from "./marketDataProviders/yahooFinanceChart.provider.js";

const cache = new Map();
const inFlight = new Map();
const TTL = { quote: 30_000, candles: 60_000 };
const MAX_STALE = { quote: 5 * 60_000, candles: 10 * 60_000 };
const MAX_CACHE_ENTRIES = 600;

function pruneCache() {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (now - value.storedAt > Math.max(...Object.values(MAX_STALE))) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}

async function cached(key, kind, loader) {
  const now = Date.now();
  const previous = cache.get(key);
  if (previous && now - previous.storedAt < TTL[kind]) {
    return { ...previous.value, cacheStatus: "hit", stale: false };
  }
  if (inFlight.has(key)) return inFlight.get(key);

  const request = loader().then(value => {
    cache.set(key, { value, storedAt: Date.now() });
    pruneCache();
    return { ...value, cacheStatus: "miss", stale: false };
  }).catch(error => {
    const isRateLimit = error.code === "RATE_LIMITED";
    const mayUseStale = previous
      && !isRateLimit
      && error.status >= 500
      && Date.now() - previous.storedAt < MAX_STALE[kind];
    if (!mayUseStale) throw error;
    return {
      ...previous.value,
      cacheStatus: "stale",
      stale: true,
      warning: "The provider is unavailable. This is the last cached response, not live data."
    };
  }).finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

export function getLiveQuote(symbol) {
  const normalized = String(symbol).trim().toUpperCase();
  return cached(`quote:${normalized}`, "quote", () => fetchQuote(normalized));
}

export function getLiveCandles(symbol, interval = "5m") {
  const normalized = String(symbol).trim().toUpperCase();
  return cached(`candles:${normalized}:${interval}`, "candles", () => fetchCandles(normalized, interval));
}
