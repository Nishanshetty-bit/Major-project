import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Brain, CircleHelp, Clock3, LineChart as LineChartIcon, Play, RotateCcw, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../services/api";

const sessionId = localStorage.getItem("stockAdvisorSession") || (() => { const id = crypto.randomUUID?.() || `s-${Date.now()}`; localStorage.setItem("stockAdvisorSession", id); return id; })();
const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const stepsAhead = 40;

function bootstrapScenario(history, seed) {
  const prices = history.map(row => Number(row.adjClose ?? row.close)).filter(price => Number.isFinite(price) && price > 0);
  if (prices.length < 3) return [];
  const returns = prices.slice(1).map((price, index) => price / prices[index] - 1).filter(value => Number.isFinite(value) && value > -1);
  let state = (seed >>> 0) || 1;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  let price = prices.at(-1);
  const data = [{ step: 0, time: "Now", price: Number(price.toFixed(2)) }];
  for (let step = 1; step <= stepsAhead; step += 1) {
    const sampledReturn = returns[Math.floor(random() * returns.length)] || 0;
    price = Math.max(0.01, price * (1 + sampledReturn));
    data.push({ step, time: `D${step}`, price: Number(price.toFixed(2)) });
  }
  return data;
}

function profilePatterns(profile, actions) {
  const total = Math.max(actions.length, 1);
  const localFomo = actions.filter(item => item.pattern === "possible_fomo").length / total * 100;
  const localPanic = actions.filter(item => item.pattern === "possible_panic_sell").length / total * 100;
  return { fomo: Math.max(Number(profile?.fomo) || 0, Math.round(localFomo)), panic: Math.max(Number(profile?.panicSelling) || 0, Math.round(localPanic)) };
}

export default function Simulation() {
  const [universe, setUniverse] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState({ label: "Unavailable", score: null, articleCount: 0 });
  const [scenario, setScenario] = useState([]);
  const [cursor, setCursor] = useState(12);
  const [profile, setProfile] = useState(null);
  const [cash, setCash] = useState(10000);
  const [shares, setShares] = useState(0);
  const [entry, setEntry] = useState(null);
  const [actions, setActions] = useState([]);
  const [started, setStarted] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [round, setRound] = useState(1);

  useEffect(() => {
    api.get("/stocks").then(({ data }) => {
      const stocks = data.data || [];
      setUniverse(stocks);
      setSymbol(stocks[0]?.symbol || "");
    }).catch(() => setError("Stock data could not be loaded. Check the API connection."));
    api.get(`/behavior/profile?sessionId=${sessionId}`).then(({ data }) => setProfile(data.profile || null)).catch(() => {});
  }, []);

  useEffect(() => {
    const selected = universe.find(item => item.symbol === symbol);
    if (!selected) return;
    let active = true;
    setLoading(true); setError(""); setStock(selected); setScenario([]); setWarning(null); setMessage("");
    Promise.allSettled([api.get(`/stocks/${symbol}/history`), api.get(`/stocks/${symbol}/news`)]).then(([prices, headlines]) => {
      if (!active) return;
      if (prices.status === "fulfilled") {
        const rows = prices.value.data.data || [];
        setHistory(rows);
        const path = bootstrapScenario(rows, Date.now());
        setScenario(path);
        setCursor(Math.min(12, Math.max(0, path.length - 1)));
        if (path.length < 2) setError("At least three historical price observations are needed to create a scenario.");
      } else setError("Historical prices could not be loaded for this stock.");
      if (headlines.status === "fulfilled") { const articles = headlines.value.data.articles || []; setNews({ label: articles.length ? headlines.value.data.label || "Neutral" : "Unavailable", score: headlines.value.data.score ?? null, articleCount: articles.length }); }
      else setNews({ label: "Unavailable", score: null, articleCount: 0 });
      setCash(10000); setShares(0); setEntry(null); setActions([]); setStarted(Date.now()); setRound(1);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [symbol, universe]);

  const visiblePath = scenario.slice(0, cursor + 1);
  const basePrice = scenario[0]?.price || Number(stock?.currentPrice) || 0;
  const currentPrice = scenario[cursor]?.price || basePrice;
  const marketChange = basePrice ? (currentPrice - basePrice) / basePrice * 100 : 0;
  const portfolioValue = cash + shares * currentPrice;
  const unrealized = entry !== null && shares ? (currentPrice - entry) * shares : 0;
  const movementUp = marketChange >= 0;
  const sentiment = news.articleCount ? String(news.label || "Neutral") : "Unavailable";
  const patterns = useMemo(() => profilePatterns(profile, actions), [profile, actions]);
  const remaining = Math.max(0, scenario.length - cursor - 1);

  async function requestAction(action) {
    const responseTimeMs = Date.now() - started;
    if (!stock) return;
    try {
      const { data } = await api.post("/intervention/check", { symbol, action, marketChange, fomo: patterns.fomo, panicSelling: patterns.panic });
      if (data.shouldWarn) { setWarning({ action, responseTimeMs, data, observed: action === "BUY" ? `FOMO indicator ${patterns.fomo}%` : `Panic selling indicator ${patterns.panic}%` }); return; }
      await execute(action, responseTimeMs);
    } catch {
      setMessage("The intervention service is unavailable. You may continue this educational simulation.");
      setWarning({ action, responseTimeMs, data: { severity: "unavailable", reasons: [], message: "A warning check could not be completed because the intervention API did not respond." }, observed: "Behavioral signal unavailable" });
    }
  }

  async function execute(action, responseTimeMs) {
    if (action === "BUY" && cash < currentPrice) { setMessage("Not enough simulated cash to buy one share at this scenario price."); return; }
    if (action === "SELL" && shares < 1) { setMessage("There are no simulated shares to sell yet."); return; }
    let nextCash = cash; let nextShares = shares; let nextEntry = entry;
    if (action === "BUY") { const totalCost = (entry || 0) * shares + currentPrice; nextShares += 1; nextCash -= currentPrice; nextEntry = totalCost / nextShares; }
    if (action === "SELL") { nextShares -= 1; nextCash += currentPrice; nextEntry = nextShares ? entry : null; }
    const pattern = action === "BUY" && marketChange >= 8 ? "possible_fomo" : action === "SELL" && marketChange <= -7 ? "possible_panic_sell" : action === "BUY" && marketChange <= -7 ? "contrarian_buy" : action === "SELL" && marketChange >= 8 ? "profit_taking" : "normal";
    const record = { sessionId, round, symbol, action, price: currentPrice, marketChange: Number(marketChange.toFixed(2)), marketVolatility: Number(stock.volatility), responseTimeMs, pattern, timestamp: Date.now() };
    setActions(previous => [...previous, record]); setCash(nextCash); setShares(nextShares); setEntry(nextEntry); setStarted(Date.now());
    setMessage(action === "HOLD" ? `Held ${symbol} at ₹${currency.format(currentPrice)}.` : `${action === "BUY" ? "Bought" : "Sold"} one ${symbol} share at ₹${currency.format(currentPrice)}.`);
    try { const { data } = await api.post("/behavior/simulation/response", record); if (data.profile) setProfile(data.profile); }
    catch { setMessage(previous => `${previous} The decision is shown locally; the behavior API did not save it.`); }
    if (cursor < scenario.length - 1) setCursor(index => index + 1);
    else setMessage(previous => `${previous} Scenario complete; start a new scenario to continue.`);
  }

  function nextScenario() {
    if (history.length < 3) return;
    const path = bootstrapScenario(history, Date.now() + round * 7919);
    setScenario(path); setCursor(Math.min(12, path.length - 1)); setCash(10000); setShares(0); setEntry(null); setActions([]); setMessage("New resampled path is ready. Choose an action based on the evidence shown."); setWarning(null); setStarted(Date.now()); setRound(value => value + 1);
  }

  if (loading) return <div aria-label="Loading simulation" className="space-y-5"><div className="skeleton h-28 rounded-3xl" /><div className="grid gap-5 lg:grid-cols-3"><div className="skeleton h-[560px] rounded-2xl lg:col-span-2" /><div className="skeleton h-[560px] rounded-2xl" /></div></div>;

  return <div className="space-y-5">
    <header className="simulation-hero relative overflow-hidden rounded-3xl p-5 sm:p-7"><div className="hero-orb hero-orb-one" /><div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="eyebrow flex items-center gap-2"><Activity size={13} /> BEHAVIORAL EXPERIMENT</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Simulation center</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Practice decisions on a resampled price path using this stock's observed historical daily returns.</p></div><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Select a real stock<select value={symbol} onChange={event => setSymbol(event.target.value)} className="mt-2 block min-w-[230px] rounded-xl px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-100">{universe.map(item => <option key={item.symbol} value={item.symbol}>{item.symbol} · {item.name}</option>)}</select></label></div><div className="relative z-10 mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><Sparkles size={12} className="text-indigo-300" /> Empirical return resampling</span><span>Seed price ₹{currency.format(stock?.currentPrice || 0)}</span><span>Source date {history.at(-1)?.date || "unavailable"}</span><span>Scenario {round}</span></div></header>
    {error && <div role="alert" className="error-banner rounded-xl px-4 py-3 text-sm">{error}</div>}
    <section className="simulation-layout grid gap-5 xl:grid-cols-3">
      <article className="surface-card min-w-0 p-4 sm:p-6 xl:col-span-2"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs text-slate-500">{stock?.symbol} · simulated observation {cursor} of {stepsAhead}</p><div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-2xl font-semibold tracking-tight text-white">₹{currency.format(currentPrice)}</h2><span className={`inline-flex items-center gap-1 text-sm font-semibold ${movementUp ? "text-emerald-300" : "text-rose-300"}`}>{movementUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{movementUp ? "+" : ""}{currency.format(marketChange)}%</span></div><p className="mt-1 text-[10px] text-slate-500">Path movement from the stock's latest historical close</p></div><div className="flex flex-wrap gap-2"><span className={`sentiment-badge ${news.articleCount ? `sentiment-${sentiment.toLowerCase()}` : "sentiment-unavailable"}`}><CircleHelp size={11} className="mr-1" />{news.articleCount ? `${sentiment} news sentiment` : "No fetched headlines"}</span><button onClick={nextScenario} disabled={history.length < 3} className="secondary-button inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"><RotateCcw size={13} />New path</button></div></div>
        <div className="mt-5 h-[280px] min-w-0 sm:h-[350px]">{visiblePath.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={visiblePath} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}><defs><linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={movementUp ? "#43d6a0" : "#ff7185"} stopOpacity={0.22} /><stop offset="100%" stopColor={movementUp ? "#43d6a0" : "#ff7185"} stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={25} /><YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tickFormatter={value => `₹${currency.format(value)}`} width={72} /><Tooltip formatter={value => [`₹${currency.format(value)}`, "Resampled price"]} labelStyle={{ color: "#aab8ce", fontSize: 11 }} /><ReferenceLine y={basePrice} stroke="rgba(169,184,211,.45)" strokeDasharray="4 4" /><Area type="monotone" dataKey="price" stroke={movementUp ? "#58d8ac" : "#ff8291"} strokeWidth={2.3} fill="url(#scenarioFill)" activeDot={{ r: 4, stroke: "#e5eafe", strokeWidth: 2 }} isAnimationActive /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Historical observations are needed to create a scenario.</div>}</div>
        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="simulation-message flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs text-slate-300"><Play size={13} className="mt-0.5 shrink-0 text-indigo-300" />{message || "Review the path and choose Buy, Hold or Sell. Each choice advances the scenario by one observation."}</div><span className="shrink-0 text-[10px] text-slate-500">{remaining} steps remaining</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">{[["BUY", "action-buy"], ["HOLD", "action-hold"], ["SELL", "action-sell"]].map(([action, className]) => <button key={action} onClick={() => requestAction(action)} disabled={!stock || scenario.length < 2} className={`action-button ${className}`}>{action}</button>)}</div>
      </article>

      <aside className="space-y-4"><article className="surface-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Simulated account</h2><Wallet size={16} className="text-indigo-300" /></div><div className="mt-4 space-y-3">{[["Cash", `₹${currency.format(cash)}`], ["Shares", currency.format(shares)], ["Portfolio value", `₹${currency.format(portfolioValue)}`]].map(([label, value]) => <div className="flex items-center justify-between text-xs" key={label}><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-200">{value}</span></div>)}<div className="flex items-center justify-between border-t border-slate-700/40 pt-3 text-xs"><span className="text-slate-500">Unrealized P/L</span><span className={`font-semibold ${unrealized >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{unrealized >= 0 ? "+" : "−"}₹{currency.format(Math.abs(unrealized))}</span></div></div></article>
        <article className="surface-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Risk context</h2><ShieldAlert size={16} className="text-amber-300" /></div><div className="mt-4 space-y-3">{[["Annualized volatility", `${currency.format(stock?.volatility || 0)}%`], ["Historical max drawdown", `${currency.format(stock?.maxDrawdown || 0)}%`], ["News sentiment", sentiment], ["FOMO signal", `${patterns.fomo}%`], ["Panic-selling signal", `${patterns.panic}%`]].map(([label, value]) => <div className="flex items-center justify-between gap-3 text-xs" key={label}><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-200">{value}</span></div>)}</div><Link to="/stocks" className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 hover:text-white">Review historical metrics <ArrowRight size={12} /></Link></article>
        <article className="simulation-summary flex items-center justify-between rounded-2xl p-5"><div><p className="text-xs text-slate-400">Responses this scenario</p><p className="mt-1 text-2xl font-semibold text-white">{actions.length}</p></div><div className="flex items-center gap-2 text-[10px] text-slate-400"><Clock3 size={14} />{history.length} price rows</div></article>
      </aside>
    </section>
    <div className="flex items-start gap-2 rounded-xl border border-slate-700/40 px-4 py-3 text-[10px] leading-relaxed text-slate-500"><Brain size={13} className="mt-0.5 shrink-0" />Scenario prices are sampled with replacement from this stock's historical daily returns and start from its latest processed close. They are simulated paths, not predictions or live market quotes.</div>

    {warning && <div className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="intervention-title" className="intervention-modal w-full max-w-lg rounded-3xl p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="warning-symbol"><ShieldAlert size={20} /></span><div><p className="eyebrow !text-amber-200">PRE-DECISION CHECK</p><h2 id="intervention-title" className="mt-1 text-xl font-semibold text-white">Review before {warning.action}</h2></div></div><span className={`severity-pill severity-${warning.data.severity || "medium"}`}>{warning.data.severity || "review"}</span></div><p className="mt-4 text-sm leading-relaxed text-slate-300">{warning.data.message}</p><div className="mt-4 grid grid-cols-2 gap-2"><WarningFact label="Scenario movement" value={`${marketChange >= 0 ? "+" : ""}${currency.format(marketChange)}%`} /><WarningFact label={`${symbol} volatility`} value={`${currency.format(stock?.volatility || 0)}%`} /><WarningFact label="Observed indicator" value={warning.observed} /><WarningFact label="Historical drawdown" value={`${currency.format(stock?.maxDrawdown || 0)}%`} /></div>{warning.data.reasons?.length > 0 && <div className="mt-4 space-y-2">{warning.data.reasons.map(reason => <p key={reason} className="rounded-xl border border-amber-300/10 bg-amber-300/[.045] px-3 py-2 text-xs text-amber-100/80">{reason}</p>)}</div>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row"><button onClick={() => { setWarning(null); setMessage("You reviewed the warning and cancelled the simulated action."); }} className="secondary-button flex-1 px-4 py-3 text-sm font-semibold">Review analysis</button><button onClick={async () => { const pending = warning; setWarning(null); await execute(pending.action, pending.responseTimeMs); }} className="primary-button flex-1 px-4 py-3 text-sm font-semibold">Continue simulation</button></div><p className="mt-4 text-center text-[10px] text-slate-500">Educational nudge only. No real order is placed.</p></section></div>}
  </div>;
}

function WarningFact({ label, value }) {
  return <div className="warning-fact rounded-xl px-3 py-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 truncate text-xs font-semibold text-slate-200">{value}</p></div>;
}
