import { useEffect, useState } from "react";
import { Activity, AlertCircle, Clock3, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import api from "../services/api";
import CandlestickChart from "./CandlestickChart";

const intervals = [
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "1d", label: "1D" }
];
const currencyNumber = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const volumeNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, notation: "compact" });

function money(value, currency = "INR") {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  const sign = Number(value) < 0 ? "−" : "";
  return currency === "INR" ? `${sign}₹${currencyNumber.format(Math.abs(Number(value)))}` : `${sign}${currency || ""} ${currencyNumber.format(Math.abs(Number(value)))}`.trim();
}

function time(value) {
  if (!value) return "Not reported";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not reported" : date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
}

function requestIssue(error) {
  const status = error.response?.status;
  const details = error.response?.data?.error;
  if (!error.response) return { kind: "unavailable", message: "The PSA API could not be reached. Live market data is unavailable." };
  if (status === 429 || details?.code === "RATE_LIMITED") {
    const seconds = Number(details?.retryAfter || error.response?.headers?.["retry-after"] || 60);
    return { kind: "rate-limit", message: `Yahoo Finance is rate-limiting requests. Try again in about ${Math.max(1, seconds)} seconds.` };
  }
  if (details?.code === "NO_DATA" || status === 404) return { kind: "no-data", message: "No live quote or candles are available from the source for this symbol right now." };
  return { kind: "unavailable", message: details?.message || "The live market-data source is unavailable. Historical Kaggle analysis remains separate below." };
}

function QuoteMetric({ label, value }) {
  return <div className="rounded-xl border border-slate-700/50 bg-slate-950/20 px-3 py-3">
    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1.5 text-sm font-semibold text-slate-200">{value}</p>
  </div>;
}

function LoadingPanel() {
  return <div className="animate-pulse space-y-5" aria-label="Loading current quote and candles">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /></div>
    <div className="skeleton h-[348px] rounded-xl" />
  </div>;
}

export default function LiveMarketPanel({ symbol }) {
  const [quote, setQuote] = useState(null);
  const [quoteIssue, setQuoteIssue] = useState(null);
  const [candles, setCandles] = useState([]);
  const [candleIssue, setCandleIssue] = useState(null);
  const [interval, setInterval] = useState("5m");
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingCandles, setLoadingCandles] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setQuote(null);
    setQuoteIssue(null);
    setLoadingQuote(true);

    const load = async () => {
      try {
        const { data } = await api.get(`/stocks/${encodeURIComponent(symbol)}/quote`, { signal: controller.signal });
        if (active) { setQuote(data); setQuoteIssue(null); }
      } catch (error) {
        if (!active || error.code === "ERR_CANCELED") return;
        setQuoteIssue(requestIssue(error));
        setQuote(previous => previous ? { ...previous, stale: true } : null);
      } finally {
        if (active) setLoadingQuote(false);
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [symbol, refreshKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCandles([]);
    setCandleIssue(null);
    setLoadingCandles(true);

    const load = async () => {
      try {
        const { data } = await api.get(`/stocks/${encodeURIComponent(symbol)}/candles`, {
          params: { interval },
          signal: controller.signal
        });
        if (active) {
          setCandles(data.candles || []);
          setCandleIssue(data.stale ? { kind: "stale", message: data.warning || "Showing the last cached candles; they are not live." } : null);
        }
      } catch (error) {
        if (!active || error.code === "ERR_CANCELED") return;
        setCandleIssue(requestIssue(error));
      } finally {
        if (active) setLoadingCandles(false);
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [symbol, interval, refreshKey]);

  const change = Number(quote?.change);
  const positive = Number.isFinite(change) && change >= 0;
  const ChangeIcon = positive ? TrendingUp : TrendingDown;
  const sourceStatus = quote?.marketStatus?.label || "Status unavailable";
  const updatedAt = quote?.lastUpdated || quote?.fetchedAt;

  return <section className="surface-card min-w-0 overflow-hidden p-4 sm:p-6" aria-labelledby="live-market-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-rose-200"><span className="h-1.5 w-1.5 rounded-full bg-rose-300" />Live source data</span>
          {quote?.stale && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-200">Stale cache</span>}
          <span className="text-[10px] text-slate-500">{quote?.source || "Yahoo Finance chart feed"}</span>
        </div>
        <h2 id="live-market-title" className="mt-2 text-lg font-semibold">Current market snapshot</h2>
        <p className="mt-1 text-xs text-slate-500">Provider-reported quote and intraday OHLCV. This is separate from the historical Kaggle analysis.</p>
      </div>
      <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/60" aria-label="Refresh live market data"><RefreshCw size={13} /> Refresh</button>
    </div>

    {loadingQuote && !quote && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Loading quote"><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /></div>}

    {!quote && !loadingQuote && quoteIssue && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.07] p-4 text-sm text-amber-100"><AlertCircle size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{quoteIssue.kind === "rate-limit" ? "Rate limit reached" : quoteIssue.kind === "no-data" ? "No current quote" : "Live quote unavailable"}</p><p className="mt-1 text-xs leading-relaxed text-amber-100/70">{quoteIssue.message}</p></div></div>}

    {quote && <>
      {quoteIssue && <div role="status" className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100">{quoteIssue.message}</div>}
      {quote.warning && <div role="status" className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100">{quote.warning}</div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-700/50 bg-slate-950/25 p-4 sm:col-span-2"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500">LTP · provider-reported price</p><p className="mt-2 text-3xl font-semibold tracking-tight text-white">{money(quote.currentPrice, quote.currency)}</p></div><Activity size={18} className="mt-1 text-indigo-300" /></div><p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${quote.change === null || quote.change === undefined ? "text-slate-400" : positive ? "text-emerald-300" : "text-rose-300"}`}>{quote.change !== null && quote.change !== undefined && <ChangeIcon size={14} />}{quote.change === null || quote.change === undefined ? "Change unavailable" : `${positive ? "+" : "−"}${money(Math.abs(Number(quote.change)), quote.currency)}`}{quote.changePercent !== null && quote.changePercent !== undefined ? ` (${positive ? "+" : "−"}${currencyNumber.format(Math.abs(Number(quote.changePercent)))}%)` : ""}<span className="font-normal text-slate-500"> vs previous close</span></p></article>
        <QuoteMetric label="Market status" value={sourceStatus} />
        <QuoteMetric label="Day open" value={money(quote.dayOpen, quote.currency)} />
        <QuoteMetric label="Day high" value={money(quote.dayHigh, quote.currency)} />
        <QuoteMetric label="Day low" value={money(quote.dayLow, quote.currency)} />
        <QuoteMetric label="Volume" value={quote.volume === null || quote.volume === undefined ? "—" : volumeNumber.format(quote.volume)} />
        <QuoteMetric label="52-week low / high" value={`${money(quote.fiftyTwoWeekLow, quote.currency)} / ${money(quote.fiftyTwoWeekHigh, quote.currency)}`} />
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500"><Clock3 size={12} /> Source timestamp: {time(updatedAt)} IST {quote.lastUpdated ? `· received ${time(quote.fetchedAt)} IST` : "· response time only"} · {quote.marketStatus?.basis || "market status source not reported"}</p>
    </>}

    <div className="mt-6 border-t border-slate-700/40 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-100">Intraday candlesticks</h3><span className="rounded-full border border-rose-400/15 bg-rose-400/[.07] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose-200">Live</span></div><p className="mt-1 text-[10px] text-slate-500">OHLC candles with traded volume · times shown in India Standard Time</p></div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-950/20 p-1" role="group" aria-label="Candlestick timeframe">{intervals.map(option => <button key={option.value} type="button" onClick={() => setInterval(option.value)} aria-pressed={interval === option.value} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${interval === option.value ? "bg-indigo-400/15 text-indigo-200" : "text-slate-500 hover:text-slate-200"}`}>{option.label}</button>)}</div>
      </div>
      {loadingCandles && !candles.length && <div className="skeleton mt-4 h-[348px] rounded-xl" aria-label="Loading candles" />}
      {candles.length > 0 && <div className="mt-3"><CandlestickChart candles={candles} interval={interval} /></div>}
      {!loadingCandles && !candles.length && candleIssue && <div role="status" className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-slate-700/40 bg-slate-950/15 p-5 text-center"><div><AlertCircle size={18} className="mx-auto text-amber-200" /><p className="mt-2 text-sm font-medium text-slate-200">{candleIssue.kind === "rate-limit" ? "Candle requests are rate-limited" : candleIssue.kind === "no-data" ? "No candles for this interval" : "Candlestick data unavailable"}</p><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">{candleIssue.message}</p></div></div>}
      {candles.length > 0 && candleIssue && <p role="status" className="mt-1 text-xs text-amber-200">{candleIssue.message} The chart shows the last successfully fetched candles.</p>}
    </div>
    <p className="mt-2 text-[10px] leading-relaxed text-slate-600">{quote?.disclaimer || "Yahoo Finance may delay quotes and candles. Informational display only, not a licensed NSE real-time feed or trading input."}</p>
  </section>;
}
