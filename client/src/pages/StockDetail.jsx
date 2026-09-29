import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChevronLeft, CircleHelp, ExternalLink, Gauge, LineChart as LineChartIcon, Newspaper, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../services/api";
import LiveMarketPanel from "../components/LiveMarketPanel";

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const periods = [{ label: "1M", months: 1 }, { label: "6M", months: 6 }, { label: "1Y", months: 12 }, { label: "3Y", months: 36 }, { label: "5Y", months: 60 }, { label: "MAX", months: null }];
const tabs = ["Overview", "Performance", "Risk", "Technical", "Sentiment", "AI explanation"];

function Skeleton() { return <div className="space-y-5"><div className="skeleton h-40 rounded-3xl" /><div className="skeleton h-[450px] rounded-2xl" /></div>; }

function ValueCard({ label, value, detail, icon: Icon, tone = "" }) {
  return <article className="detail-metric"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${tone || "text-slate-100"}`}>{value}</p></div>{Icon && <span className="detail-metric-icon"><Icon size={16} /></span>}</div>{detail && <p className="mt-2 text-[10px] text-slate-500">{detail}</p>}</article>;
}

function ScorePanel({ stock }) {
  const components = [["Performance", stock.performanceScore, "30%"], ["Risk", stock.riskScore, "20%"], ["Technical", stock.technicalScore, "20%"], ["Sentiment", stock.sentimentScore, "20%"], ["Stability", stock.stabilityScore, "10%"]];
  return <section className="surface-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="eyebrow">EXPLAINABLE MODEL OUTPUT</p><h2 className="mt-1 text-lg font-semibold">AI confidence</h2><p className="mt-1 text-xs text-slate-500">Weighted historical and sentiment evidence.</p></div><div className="detail-score-ring" style={{ "--score": `${Math.max(0, Math.min(100, Number(stock.confidenceScore) || 0)) * 3.6}deg` }}><span>{number.format(stock.confidenceScore)}<small>/100</small></span></div></div><div className="mt-6 space-y-4">{components.map(([name, score, weight]) => <div key={name}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-slate-300">{name}<span className="ml-1.5 text-[10px] text-slate-600">{weight}</span></span><span className="font-semibold text-slate-200">{number.format(score)}</span></div><div className="profile-track"><div className="profile-fill" style={{ width: `${Math.max(0, Math.min(100, Number(score) || 0))}%` }} /></div></div>)}</div><p className="mt-5 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500"><CircleHelp size={13} className="mt-px shrink-0" />A historical evidence summary. It is not a forecast or a guarantee of future return.</p></section>;
}

function DriverPanel({ stock }) {
  return <div className="grid gap-3 sm:grid-cols-2"><section className="surface-subtle p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><TrendingUp size={15} /> Positive drivers</h3><ul className="mt-3 space-y-2">{(stock.positiveDrivers || []).map((driver, index) => <li key={`${driver}-${index}`} className="flex gap-2 text-xs leading-relaxed text-slate-300"><span className="mt-0.5 text-emerald-300">+</span>{driver}</li>)}</ul></section><section className="surface-subtle p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-amber-200"><ShieldAlert size={15} /> Risk factors</h3><ul className="mt-3 space-y-2">{(stock.negativeDrivers || []).map((driver, index) => <li key={`${driver}-${index}`} className="flex gap-2 text-xs leading-relaxed text-slate-300"><span className="mt-0.5 text-amber-300">!</span>{driver}</li>)}</ul></section></div>;
}

export default function StockDetail() {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [period, setPeriod] = useState("1Y");
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setStock(null);
    Promise.allSettled([api.get(`/stocks/${symbol}`), api.get(`/stocks/${symbol}/history`)]).then(([detail, prices]) => {
      if (!active) return;
      if (detail.status === "fulfilled") { setStock(detail.value.data.stock); setNews(detail.value.data.news || []); }
      else setError(detail.reason?.response?.status === 404 ? "This symbol is not present in the processed dataset." : "Stock analysis could not be loaded. Check the API connection.");
      if (prices.status === "fulfilled") setHistory(prices.value.data.data || []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [symbol]);

  const latestDate = history.at(-1)?.date;
  const availablePeriods = useMemo(() => {
    if (!history.length) return new Set(["MAX"]);
    const first = new Date(history[0].date);
    const latest = new Date(history.at(-1).date);
    return new Set(periods.filter(({ label, months }) => label === "MAX" || (() => { const threshold = new Date(latest); threshold.setMonth(threshold.getMonth() - months); return first <= threshold; })()).map(item => item.label));
  }, [history]);
  useEffect(() => { if (availablePeriods.size && !availablePeriods.has(period)) setPeriod("MAX"); }, [availablePeriods, period]);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const requested = periods.find(item => item.label === period);
    if (!requested?.months) return history;
    const threshold = new Date(history.at(-1).date);
    threshold.setMonth(threshold.getMonth() - requested.months);
    return history.filter(row => new Date(row.date) >= threshold);
  }, [history, period]);

  const chartKey = history.some(row => row.adjClose !== undefined) ? "adjClose" : "close";
  const latestPrice = history.length ? Number(history.at(-1)[chartKey]) : Number(stock?.currentPrice);
  const priorPrice = history.length > 1 ? Number(history.at(-2)[chartKey]) : null;
  const rangePosition = Number(stock?.high52) > Number(stock?.low52) ? Math.max(0, Math.min(100, (latestPrice - Number(stock.low52)) / (Number(stock.high52) - Number(stock.low52)) * 100)) : 50;
  const observedChange = priorPrice ? (latestPrice - priorPrice) / priorPrice * 100 : null;
  const latestNewsScore = news.length ? Math.round(news.reduce((sum, item) => sum + Number(item.sentimentScore ?? 50), 0) / news.length) : null;
  const latestNewsLabel = latestNewsScore === null ? "No news data" : latestNewsScore >= 67 ? "Positive" : latestNewsScore <= 33 ? "Negative" : "Neutral";

  if (loading) return <Skeleton />;
  if (error || !stock) return <div className="surface-card px-6 py-14 text-center"><p role="alert" className="text-sm text-rose-200">{error || "Stock not found."}</p><Link to="/stocks" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-300"><ChevronLeft size={15} /> Return to stocks</Link></div>;

  const performanceCards = [
    ["CAGR", `${number.format(stock.cagr)}%`, "Annualized growth across available history", TrendingUp],
    ["Volatility", `${number.format(stock.volatility)}%`, "Annualized standard deviation", Activity],
    ["Sharpe ratio", number.format(stock.sharpeRatio), "Historical return per unit of risk", Gauge],
    ["Maximum drawdown", `${number.format(stock.maxDrawdown)}%`, "Largest peak-to-trough decline", TrendingDown]
  ];
  const technicalCards = [["RSI · 14 day", number.format(stock.rsi)], ["SMA · 20 day", `₹${number.format(stock.sma20)}`], ["SMA · 50 day", `₹${number.format(stock.sma50)}`], ["EMA · 20 day", `₹${number.format(stock.ema20)}`], ["MACD", number.format(stock.macd)], ["MACD signal", number.format(stock.macdSignal)]];

  return <div className="space-y-5">
    <Link to="/stocks" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-200"><ChevronLeft size={15} /> All stocks</Link>
    <header className="detail-hero relative overflow-hidden rounded-3xl p-5 sm:p-7"><div className="detail-hero-glow" /><div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center"><div><p><span className="inline-flex rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-indigo-200">Historical · Kaggle dataset</span></p><div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{stock.symbol}</h1><span className="text-sm text-slate-400">{stock.name}</span></div><p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays size={13} /> Latest observation: {latestDate || "Date unavailable"} · {chartKey === "adjClose" ? "Adjusted close" : "Close"}</p></div><div className="flex items-end justify-between gap-5 sm:justify-start"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500">Historical dataset price</p><p className="mt-1 text-3xl font-semibold tracking-tight text-white">₹{number.format(latestPrice)}</p>{observedChange !== null && <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${observedChange >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{observedChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{observedChange >= 0 ? "+" : ""}{number.format(observedChange)}% from prior historical observation</p>}</div><div className="hidden items-center gap-2 rounded-xl border border-indigo-300/15 bg-indigo-400/[.07] px-3 py-2 sm:flex"><Sparkles size={14} className="text-indigo-300" /><div><p className="text-[9px] text-slate-500">AI CONFIDENCE</p><p className="text-sm font-bold text-indigo-100">{number.format(stock.confidenceScore)}<span className="ml-0.5 text-[10px] font-normal text-slate-500">/100</span></p></div></div></div></div></header>

    <LiveMarketPanel symbol={symbol} />

    <nav className="detail-tabs" aria-label="Stock analysis sections">{tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`detail-tab ${tab === item ? "detail-tab-active" : ""}`} aria-current={tab === item ? "page" : undefined}>{item}</button>)}</nav>

    {tab === "Overview" && <div className="space-y-5">
      <section className="surface-card min-w-0 p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><LineChartIcon size={16} className="text-indigo-300" /><h2 className="text-base font-semibold">Historical price</h2></div><p className="mt-1 text-[11px] text-slate-500">Range is relative to the latest available dataset date, not today.</p></div><div className="period-switch" aria-label="Historical chart range">{periods.map(item => <button key={item.label} disabled={!availablePeriods.has(item.label)} onClick={() => setPeriod(item.label)} className={period === item.label ? "period-active" : ""} title={availablePeriods.has(item.label) ? `${item.label} of available history` : `${item.label} is not covered by this symbol's history`}>{item.label}</button>)}</div></div>
        {chartData.length ? <div className="mt-5 h-[300px] min-w-0 sm:h-[360px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 6, bottom: 0, left: -12 }}><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#758cff" stopOpacity={0.25} /><stop offset="100%" stopColor="#758cff" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={42} /><YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tickFormatter={value => `₹${number.format(value)}`} width={64} /><Tooltip labelStyle={{ color: "#aab8ce", fontSize: 11 }} formatter={value => [`₹${number.format(value)}`, chartKey === "adjClose" ? "Adjusted close" : "Close"]} /><Area type="monotone" dataKey={chartKey} stroke="#8798ff" strokeWidth={2} fill="url(#priceFill)" activeDot={{ r: 4, stroke: "#c4ccff", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-500">No historical price rows are available for this symbol.</p>}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{performanceCards.map(([label, value, detail, icon], index) => <ValueCard key={label} label={label} value={value} detail={detail} icon={icon} tone={index === 3 ? "text-amber-200" : ""} />)}</div>
      <div className="grid gap-5 xl:grid-cols-3"><div className="space-y-4 xl:col-span-2"><DriverPanel stock={stock} /><div className="surface-subtle flex items-start gap-3 p-4"><CircleHelp size={15} className="mt-0.5 shrink-0 text-slate-500" /><p className="text-xs leading-relaxed text-slate-400">Risk metrics and score drivers are computed from the processed historical data. News sentiment uses headlines when the feed is available; unavailable headlines are not represented as positive or negative evidence.</p></div></div><ScorePanel stock={stock} /></div>
    </div>}

    {tab === "Performance" && <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{performanceCards.map(([label, value, detail, icon], index) => <ValueCard key={label} label={label} value={value} detail={detail} icon={icon} tone={index === 3 ? "text-amber-200" : ""} />)}</section><section className="surface-card p-5"><p className="eyebrow">HISTORICAL RANGE</p><h2 className="mt-1 text-base font-semibold">Price performance</h2><div className="mt-4 h-[360px] min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ left: -12, right: 6 }}><defs><linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#758cff" stopOpacity={0.24} /><stop offset="100%" stopColor="#758cff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={42} /><YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} /><Tooltip formatter={value => [`₹${number.format(value)}`, "Price"]} /><Area dataKey={chartKey} type="monotone" stroke="#8798ff" fill="url(#performanceFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section></div>}

    {tab === "Risk" && <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ValueCard label="Annualized volatility" value={`${number.format(stock.volatility)}%`} detail="Historical daily return variability" icon={Activity} /><ValueCard label="Maximum drawdown" value={`${number.format(stock.maxDrawdown)}%`} detail="Largest historical peak-to-trough decline" icon={TrendingDown} tone="text-amber-200" /><ValueCard label="Risk component" value={`${number.format(stock.riskScore)}/100`} detail="Higher score indicates lower measured historical risk" icon={ShieldAlert} /><ValueCard label="Sharpe ratio" value={number.format(stock.sharpeRatio)} detail="Historical excess return per volatility unit" icon={Gauge} /></section><div className="grid gap-5 md:grid-cols-2"><section className="surface-card p-5"><p className="eyebrow">DRAWDOWN CONTEXT</p><h2 className="mt-1 font-semibold">Historical downside</h2><p className="mt-4 text-sm leading-relaxed text-slate-400">The maximum drawdown of <strong className="text-slate-200">{number.format(stock.maxDrawdown)}%</strong> is the largest peak-to-trough decline found in this stock's available price history. It describes a past decline and does not estimate the next one.</p></section><section className="surface-card p-5"><p className="eyebrow">PRICE RANGE</p><h2 className="mt-1 font-semibold">Available 52-week range</h2><div className="mt-5 flex items-center justify-between text-sm"><div><p className="text-[10px] text-slate-500">Low</p><p className="mt-1 font-semibold">₹{number.format(stock.low52)}</p></div><div className="range-track"><span style={{ left: `${rangePosition}%` }} /></div><div className="text-right"><p className="text-[10px] text-slate-500">High</p><p className="mt-1 font-semibold">₹{number.format(stock.high52)}</p></div></div><p className="mt-4 text-[10px] text-slate-500">Calculated from the last 252 available trading observations.</p></section></div></div>}

    {tab === "Technical" && <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{technicalCards.map(([label, value]) => <ValueCard key={label} label={label} value={value} icon={Activity} detail="Latest calculated indicator" />)}</section><section className="surface-card p-5"><div className="flex items-center gap-2"><BarChart3 size={16} className="text-indigo-300" /><h2 className="font-semibold">Technical context</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="surface-subtle p-4"><p className="text-xs text-slate-500">Price vs SMA20</p><p className="mt-2 text-sm font-semibold">{Number(stock.currentPrice) >= Number(stock.sma20) ? "Above" : "Below"}</p><p className="mt-1 text-[10px] text-slate-500">₹{number.format(stock.sma20)}</p></div><div className="surface-subtle p-4"><p className="text-xs text-slate-500">Price vs SMA50</p><p className="mt-2 text-sm font-semibold">{Number(stock.currentPrice) >= Number(stock.sma50) ? "Above" : "Below"}</p><p className="mt-1 text-[10px] text-slate-500">₹{number.format(stock.sma50)}</p></div><div className="surface-subtle p-4"><p className="text-xs text-slate-500">MACD vs signal</p><p className="mt-2 text-sm font-semibold">{Number(stock.macd) >= Number(stock.macdSignal) ? "MACD above signal" : "MACD below signal"}</p><p className="mt-1 text-[10px] text-slate-500">{number.format(Number(stock.macd) - Number(stock.macdSignal))} difference</p></div></div></section></div>}

    {tab === "Sentiment" && <div className="grid gap-5 xl:grid-cols-3"><section className="surface-card p-5 sm:p-6 xl:col-span-2"><div className="flex items-center justify-between"><div><p className="eyebrow">FINANCIAL NEWS</p><h2 className="mt-1 font-semibold">Recent headlines</h2></div><Newspaper size={18} className="text-indigo-300" /></div><div className="mt-4 divide-y divide-slate-700/40">{news.length ? news.map((article, index) => <a href={article.url} target="_blank" rel="noreferrer" key={`${article.url}-${index}`} className="news-row block py-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium leading-relaxed text-slate-200">{article.title}</p><ExternalLink size={14} className="mt-1 shrink-0 text-slate-600" /></div><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`sentiment-badge sentiment-${String(article.label || "neutral").toLowerCase()}`}>{article.label || "Neutral"}</span><span className="text-[10px] text-slate-500">{article.source || "News source"}</span>{article.publishedAt && <span className="text-[10px] text-slate-600">{new Date(article.publishedAt).toLocaleDateString("en-IN")}</span>}</div></a>) : <div className="empty-panel rounded-xl px-4 py-10 text-center"><Newspaper size={22} className="mx-auto text-slate-500" /><p className="mt-3 text-sm font-medium">No current headlines available</p><p className="mt-1 text-xs text-slate-500">Historical stock metrics remain available while the feed is offline.</p></div>}</div></section><aside className="surface-card h-fit p-5"><p className="eyebrow">HEADLINE SIGNAL</p><h2 className="mt-1 text-lg font-semibold">{latestNewsLabel}</h2><p className="mt-1 text-xs text-slate-500">{latestNewsScore === null ? "No classified articles" : `${news.length} classified article${news.length === 1 ? "" : "s"}`}</p>{latestNewsScore !== null && <><div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold">{latestNewsScore}<small className="ml-1 text-sm font-normal text-slate-500">/100</small></span><span className="text-[10px] text-slate-500">Article mean</span></div><div className="mt-3 profile-track"><div className="profile-fill" style={{ width: `${latestNewsScore}%` }} /></div></>}<p className="mt-5 text-[11px] leading-relaxed text-slate-500">Headline sentiment is a lightweight text signal. It can miss context, sarcasm and event-specific nuance.</p></aside></div>}

    {tab === "AI explanation" && <div className="grid gap-5 xl:grid-cols-3"><div className="space-y-5 xl:col-span-2"><ScorePanel stock={stock} /><DriverPanel stock={stock} /></div><section className="surface-card h-fit p-5"><p className="eyebrow">SCORING METHOD</p><h2 className="mt-1 font-semibold">How the score is formed</h2><p className="mt-3 text-xs leading-relaxed text-slate-400">The overall confidence score combines five normalized components from the stock analysis pipeline. Each weighted contribution is visible in the panel, so the result can be traced to its inputs.</p><div className="mt-4 space-y-2">{[["Performance", "30%"], ["Risk", "20%"], ["Technical", "20%"], ["Sentiment", "20%"], ["Stability", "10%"]].map(([name, weight]) => <div key={name} className="flex justify-between border-b border-slate-800/70 py-2 text-xs"><span className="text-slate-400">{name}</span><span className="font-semibold text-slate-200">{weight}</span></div>)}</div><p className="mt-4 text-[10px] leading-relaxed text-slate-500">Historical confidence is not a prediction of future price movement or a recommendation to buy or sell.</p></section></div>}
  </div>;
}
