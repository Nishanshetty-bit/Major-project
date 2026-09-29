import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

function signals(stock) {
  const items = [];
  if (Number(stock.volatility) >= 35) items.push({ label: `Annualized volatility ${stock.volatility}%`, type: "high" });
  if (Math.abs(Number(stock.maxDrawdown)) >= 30) items.push({ label: `Maximum drawdown ${stock.maxDrawdown}%`, type: "high" });
  if (Number(stock.rsi) >= 75) items.push({ label: `RSI ${stock.rsi} indicates elevated momentum`, type: "medium" });
  return items;
}

export default function Alerts() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/stocks").then(({ data }) => setStocks(data.data || [])).catch(() => setError("Could not load historical risk signals. Check the API connection.")).finally(() => setLoading(false)); }, []);
  const alerts = stocks.map(stock => ({ stock, signals: signals(stock) })).filter(item => item.signals.length);

  return <div className="space-y-6">
    <header className="page-heading"><p className="eyebrow">RISK MONITOR</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Historical risk alerts</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Signals are calculated from the processed dataset using annualized volatility, maximum drawdown and RSI.</p></header>
    {error && <div role="alert" className="error-banner rounded-xl px-4 py-3 text-sm">{error}</div>}
    {loading ? <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map(n => <div key={n} className="skeleton h-32 rounded-2xl" />)}</div> : alerts.length ? <div className="grid gap-3 md:grid-cols-2">{alerts.map(({ stock, signals: stockSignals }) => <article key={stock.symbol} className="surface-card p-5"><div className="flex items-start justify-between"><div><p className="text-lg font-semibold">{stock.symbol}</p><p className="text-xs text-slate-500">{stock.name}</p></div><span className="alert-mark"><ShieldAlert size={17} /></span></div><div className="mt-4 space-y-2">{stockSignals.map(item => <p className="flex items-start gap-2 text-xs text-amber-100/80" key={item.label}><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />{item.label}</p>)}</div><Link to={`/stocks/${stock.symbol}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white">Review analysis <ArrowRight size={13} /></Link></article>)}</div> : <div className="surface-card px-6 py-12 text-center"><ShieldAlert size={25} className="mx-auto text-emerald-300" /><h2 className="mt-3 font-semibold">No threshold alerts</h2><p className="mt-1 text-sm text-slate-500">{stocks.length ? "No stocks crossed the current historical risk thresholds." : "No stock data is available."}</p></div>}
    <p className="text-xs text-slate-500">These are historical screening signals, not predictions or personalized financial advice.</p>
  </div>;
}
