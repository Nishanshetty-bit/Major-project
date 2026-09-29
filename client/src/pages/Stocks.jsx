import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowUpRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function Metric({ label, value, tone = "" }) {
  return <div className="stock-metric"><p>{label}</p><p className={tone}>{value}</p></div>;
}

function SkeletonGrid() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <div key={index} className="skeleton h-[245px] rounded-2xl" />)}</div>;
}

function Sparkline({ prices, symbol }) {
  if (!prices?.length) return <span className="sparkline-empty" aria-hidden="true" />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const points = prices.map((price, index) => `${(index / Math.max(1, prices.length - 1)) * 80},${22 - ((price - min) / span) * 19}`).join(" ");
  const positive = prices.at(-1) >= prices[0];
  return <svg className="stock-sparkline" viewBox="0 0 80 24" role="img" aria-label={`${symbol} historical price movement in the latest ${prices.length} observations`}><polyline points={points} fill="none" stroke={positive ? "#55d5a7" : "#ff7b8c"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function riskLevel(volatility) {
  if (Number(volatility) < 20) return { name: "Lower", color: "risk-low" };
  if (Number(volatility) < 35) return { name: "Moderate", color: "risk-medium" };
  return { name: "Elevated", color: "risk-high" };
}

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [sparklines, setSparklines] = useState(new Map());
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("confidenceScore");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get("/stocks"), api.get("/stocks/recommendations"), api.get("/stocks/sparklines")]).then(([base, rankings, trends]) => {
      if (!active) return;
      if (base.status === "rejected") setError("The market dataset could not be loaded. Check the API connection.");
      const allStocks = base.status === "fulfilled" ? base.value.data.data || [] : [];
      const ranked = rankings.status === "fulfilled" ? rankings.value.data.data || [] : [];
      const rankingBySymbol = new Map(ranked.map(stock => [stock.symbol, stock]));
      const trendBySymbol = new Map((trends.status === "fulfilled" ? trends.value.data.data || [] : []).map(item => [item.symbol, item.prices]));
      setSparklines(trendBySymbol);
      setStocks(allStocks.map(stock => ({ ...stock, sparkline: trendBySymbol.get(stock.symbol) || [], ...(rankingBySymbol.get(stock.symbol) || {}) })));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...stocks]
      .filter(stock => !needle || `${stock.symbol} ${stock.name}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const left = Number(a[sortBy]) || 0;
        const right = Number(b[sortBy]) || 0;
        return sortBy === "volatility" ? left - right : right - left;
      });
  }, [stocks, query, sortBy]);

  const articleCount = stocks.reduce((sum, stock) => sum + Number(stock.newsArticleCount || 0), 0);

  return <div className="space-y-6">
    <header className="page-heading flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">NSE HISTORICAL UNIVERSE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">AI stock intelligence</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Search and compare explainable confidence scores across the processed market dataset.</p></div><div className="flex flex-wrap gap-2"><span className="data-tag"><span className="data-tag-dot" />{loading ? "Loading" : `${stocks.length} equities`}</span><span className="data-tag">{articleCount ? `${articleCount} headlines scored` : "No current headline signals"}</span></div></header>

    <section className="stock-toolbar flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center"><label className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by symbol or company..." aria-label="Search stocks by symbol or company" className="w-full rounded-xl py-3 pl-10 pr-4 text-sm" /></label><label className="flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 text-xs text-slate-400"><SlidersHorizontal size={15} /><span className="hidden sm:inline">Sort by</span><select value={sortBy} onChange={event => setSortBy(event.target.value)} className="border-0 !bg-transparent py-3 text-xs font-semibold text-slate-200 focus:outline-none"><option value="confidenceScore">AI confidence</option><option value="cagr">CAGR</option><option value="volatility">Lowest volatility</option><option value="sharpeRatio">Sharpe ratio</option></select></label></section>

    {error && <div role="alert" className="error-banner rounded-xl px-4 py-3 text-sm">{error}</div>}
    {loading ? <SkeletonGrid /> : filtered.length ? <>
      <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {filtered.length} of {stocks.length} equities</span><span className="hidden items-center gap-1 sm:inline-flex">{sortBy === "volatility" ? <ArrowUpWideNarrow size={14} /> : <ArrowDownWideNarrow size={14} />} sorted by {sortBy === "confidenceScore" ? "confidence" : sortBy === "volatility" ? "volatility" : sortBy === "sharpeRatio" ? "Sharpe ratio" : "CAGR"}</span></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Stock rankings">
        {filtered.map((stock, index) => {
          const risk = riskLevel(stock.volatility);
          const sentiment = Number(stock.newsArticleCount) > 0 ? stock.sentiment || "Neutral" : "No headlines";
          return <Link to={`/stocks/${stock.symbol}`} className="stock-card reveal group p-4 sm:p-5" key={stock.symbol} style={{ animationDelay: `${Math.min(index % 9, 8) * 35}ms` }}>
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="stock-avatar">{stock.symbol.slice(0, 1)}</span><div className="min-w-0"><h2 className="truncate text-base font-bold tracking-wide text-slate-100">{stock.symbol}</h2><p className="mt-0.5 truncate text-xs text-slate-500">{stock.name}</p></div></div><div className="text-right"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500">Confidence</p><div className="mt-1 inline-flex items-center gap-1.5"><span className="confidence-meter"><span style={{ width: `${Math.max(0, Math.min(100, Number(stock.confidenceScore) || 0))}%` }} /></span><span className="text-sm font-bold text-indigo-200">{number.format(stock.confidenceScore)}</span></div></div></div>
            <div className="mt-4 flex items-end justify-between border-b border-slate-700/40 pb-3"><div><p className="text-[10px] text-slate-500">Latest dataset price</p><p className="mt-1 text-lg font-semibold text-slate-100">₹{money.format(stock.currentPrice)}</p></div><div className="flex items-center gap-3"><Sparkline prices={sparklines.get(stock.symbol)} symbol={stock.symbol} /><span className={`risk-badge ${risk.color}`}>{risk.name} risk</span></div></div>
            <div className="mt-3 grid grid-cols-4 gap-2"><Metric label="CAGR" value={`${number.format(stock.cagr)}%`} tone={Number(stock.cagr) >= 0 ? "metric-positive" : "metric-negative"} /><Metric label="Volatility" value={`${number.format(stock.volatility)}%`} /><Metric label="Sharpe" value={number.format(stock.sharpeRatio)} /><Metric label="RSI" value={number.format(stock.rsi)} /></div>
            <div className="mt-3 flex items-center justify-between gap-2"><span className={`sentiment-badge ${sentiment === "No headlines" ? "sentiment-unavailable" : `sentiment-${String(sentiment).toLowerCase()}`}`}>{sentiment === "No headlines" ? sentiment : `${sentiment} sentiment`}</span><span className="text-[10px] text-slate-500">Drawdown {number.format(stock.maxDrawdown)}%</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-3"><span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500"><Sparkles size={12} className="text-indigo-300" />{stock.positiveDrivers?.[0] || "Historical score is broadly neutral"}</span><ArrowUpRight size={15} className="shrink-0 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-300" /></div>
          </Link>;
        })}
      </section>
    </> : <div className="surface-card px-6 py-14 text-center"><Search className="mx-auto text-slate-500" size={24} /><h2 className="mt-3 font-semibold">No stocks match this search</h2><p className="mt-1 text-sm text-slate-500">Try another company name or market symbol.</p></div>}
    <p className="border-t border-slate-800/70 pt-4 text-[11px] leading-relaxed text-slate-500">Historical scores and risk labels summarize the available dataset. They are not live quotes, forecasts or guarantees. Risk levels use annualized historical volatility thresholds.</p>
  </div>;
}
