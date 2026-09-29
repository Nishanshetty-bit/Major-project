import axios from "axios";

const endpoint = "https://query1.finance.yahoo.com/v8/finance/chart";
const exchangeTimeZone = "Asia/Kolkata";
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

export class MarketDataProviderError extends Error {
  constructor(message, { code = "UPSTREAM_UNAVAILABLE", status = 502, retryAfter = null } = {}) {
    super(message);
    this.name = "MarketDataProviderError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const valueAsNumber = Number(value);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : null;
}

function providerSymbol(symbol) {
  const normalized = String(symbol).trim().toUpperCase();
  return normalized.endsWith(".NS") ? normalized : `${normalized}.NS`;
}

async function pacedGet(symbol, params) {
  const request = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 500;

    try {
      const response = await axios.get(`${endpoint}/${encodeURIComponent(symbol)}`, {
        params,
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; PSA educational market dashboard)"
        }
      });
      return response.data?.chart;
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        const retryHeader = Number(error.response.headers?.["retry-after"]);
        throw new MarketDataProviderError("Yahoo Finance is rate-limiting market-data requests.", {
          code: "RATE_LIMITED",
          status: 429,
          retryAfter: Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 60
        });
      }
      if (status === 404) {
        throw new MarketDataProviderError("Yahoo Finance has no quote for this NSE symbol.", { code: "NO_DATA", status: 404 });
      }
      throw new MarketDataProviderError("Yahoo Finance market data is temporarily unavailable.", {
        code: "UPSTREAM_UNAVAILABLE",
        status: 502
      });
    }
  });
  requestQueue = request.catch(() => undefined);
  return request;
}

async function fetchChart(symbol, interval, range) {
  const chart = await pacedGet(providerSymbol(symbol), {
    interval,
    range,
    includePrePost: false,
    events: "div,splits"
  });
  if (chart?.error) {
    const message = String(chart.error.description || "Yahoo Finance returned no market data.");
    throw new MarketDataProviderError(message, { code: "NO_DATA", status: 404 });
  }
  const result = chart?.result?.[0];
  if (!result) throw new MarketDataProviderError("Yahoo Finance returned no market data.", { code: "NO_DATA", status: 404 });
  return result;
}

function lastValidCandle(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  for (let index = timestamps.length - 1; index >= 0; index -= 1) {
    const close = numberOrNull(quote.close?.[index]);
    if (close === null) continue;
    return {
      timestamp: Number(timestamps[index]),
      open: numberOrNull(quote.open?.[index]),
      high: numberOrNull(quote.high?.[index]),
      low: numberOrNull(quote.low?.[index]),
      close,
      volume: numberOrNull(quote.volume?.[index])
    };
  }
  return null;
}

function isoFromEpoch(seconds) {
  return Number.isFinite(Number(seconds)) ? new Date(Number(seconds) * 1000).toISOString() : null;
}

function marketStatus(meta, quoteTimestamp) {
  const code = String(meta.marketState || "").toUpperCase();
  if (["REGULAR", "OPEN"].includes(code)) return { status: "open", label: "Open", isOpen: true, basis: "provider" };
  if (["CLOSED", "CLOSE"].includes(code)) return { status: "closed", label: "Closed", isOpen: false, basis: "provider" };
  if (["PRE", "PREPRE", "PREPOST"].includes(code)) return { status: "pre-market", label: "Pre-market", isOpen: false, basis: "provider" };
  if (["POST", "POSTPOST"].includes(code)) return { status: "after-hours", label: "After-hours", isOpen: false, basis: "provider" };

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: exchangeTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute);
  const weekday = !["Sat", "Sun"].includes(values.weekday);
  const insideRegularSession = weekday && minuteOfDay >= 555 && minuteOfDay < 930;
  if (!insideRegularSession) return { status: "closed", label: "Closed", isOpen: false, basis: "India session clock; exchange holidays may affect status" };

  const sourceTime = quoteTimestamp ? new Date(quoteTimestamp) : null;
  const now = new Date();
  const sameIndiaDay = sourceTime && new Intl.DateTimeFormat("en-CA", { timeZone: exchangeTimeZone }).format(sourceTime)
    === new Intl.DateTimeFormat("en-CA", { timeZone: exchangeTimeZone }).format(now);
  const sourceAgeMinutes = sourceTime ? (now.getTime() - sourceTime.getTime()) / 60000 : Infinity;
  if (sameIndiaDay && sourceAgeMinutes >= -2 && sourceAgeMinutes <= 30) {
    return { status: "open", label: "Open", isOpen: true, basis: "recent provider quote and India session clock" };
  }
  return { status: "unknown", label: "Status unavailable", isOpen: null, basis: "provider did not report market state" };
}

export async function fetchQuote(symbol) {
  const result = await fetchChart(symbol, "1d", "5d");
  const meta = result.meta || {};
  const last = lastValidCandle(result);
  const price = numberOrNull(meta.regularMarketPrice) ?? last?.close ?? null;
  if (price === null) throw new MarketDataProviderError("Yahoo Finance did not return a current quote.", { code: "NO_DATA", status: 404 });

  const previousClose = numberOrNull(meta.chartPreviousClose) ?? numberOrNull(meta.previousClose);
  const change = numberOrNull(meta.regularMarketChange) ?? (previousClose === null ? null : price - previousClose);
  const changePercent = numberOrNull(meta.regularMarketChangePercent)
    ?? (previousClose && change !== null ? (change / previousClose) * 100 : null);
  const quoteTimestamp = isoFromEpoch(meta.regularMarketTime) || isoFromEpoch(last?.timestamp);
  const fetchedAt = new Date().toISOString();
  const status = marketStatus(meta, quoteTimestamp);

  return {
    symbol: String(symbol).toUpperCase(),
    providerSymbol: providerSymbol(symbol),
    source: "Yahoo Finance chart data",
    currency: meta.currency || null,
    currentPrice: price,
    previousClose,
    change,
    changePercent,
    dayOpen: numberOrNull(meta.regularMarketDayOpen) ?? numberOrNull(meta.regularMarketOpen) ?? last?.open ?? null,
    dayHigh: numberOrNull(meta.regularMarketDayHigh) ?? last?.high ?? null,
    dayLow: numberOrNull(meta.regularMarketDayLow) ?? last?.low ?? null,
    volume: numberOrNull(meta.regularMarketVolume) ?? last?.volume ?? null,
    fiftyTwoWeekHigh: numberOrNull(meta.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: numberOrNull(meta.fiftyTwoWeekLow),
    marketStatus: status,
    lastUpdated: quoteTimestamp,
    fetchedAt,
    disclaimer: "Yahoo Finance quotes may be delayed. Informational use only; not for trading."
  };
}

const candleIntervals = {
  "5m": { interval: "5m", range: "1d" },
  "15m": { interval: "15m", range: "5d" },
  "1h": { interval: "60m", range: "1mo" },
  "1d": { interval: "1d", range: "1y" }
};

export const supportedIntervals = Object.keys(candleIntervals);

export async function fetchCandles(symbol, requestedInterval) {
  const config = candleIntervals[requestedInterval];
  if (!config) throw new MarketDataProviderError("Unsupported candle interval.", { code: "INVALID_INTERVAL", status: 400 });

  const result = await fetchChart(symbol, config.interval, config.range);
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const candles = timestamps.flatMap((timestamp, index) => {
    const open = numberOrNull(quote.open?.[index]);
    const high = numberOrNull(quote.high?.[index]);
    const low = numberOrNull(quote.low?.[index]);
    const close = numberOrNull(quote.close?.[index]);
    if ([open, high, low, close].some(value => value === null)) return [];
    return [{
      timestamp: isoFromEpoch(timestamp),
      open,
      high,
      low,
      close,
      volume: numberOrNull(quote.volume?.[index])
    }];
  });

  if (!candles.length) throw new MarketDataProviderError("No candles are available for this NSE symbol and interval.", { code: "NO_DATA", status: 404 });

  return {
    symbol: String(symbol).toUpperCase(),
    providerSymbol: providerSymbol(symbol),
    source: "Yahoo Finance chart data",
    interval: requestedInterval,
    currency: result.meta?.currency || null,
    candles,
    fetchedAt: new Date().toISOString(),
    disclaimer: "Candles may be delayed or incomplete. Informational use only; not for trading."
  };
}
