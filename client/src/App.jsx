import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowUpRight, Bell, CandlestickChart, ChevronRight,
  Fingerprint, FlaskConical, LayoutDashboard, LogOut, Menu, Search, Settings,
  ShieldCheck, Sparkles, Wallet, X
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Stocks = lazy(() => import("./pages/Stocks"));
const Market = lazy(() => import("./pages/Market"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Behavior = lazy(() => import("./pages/Behavior"));
const Simulation = lazy(() => import("./pages/Simulation"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Login = lazy(() => import("./pages/Login"));
const Alerts = lazy(() => import("./pages/Alerts"));
const SettingsPage = lazy(() => import("./pages/Settings"));

const primaryNavigation = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/market", label: "Market", icon: Activity },
  { to: "/stocks", label: "Stocks", icon: CandlestickChart },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/behavior", label: "Behavior", icon: Fingerprint },
  { to: "/simulation", label: "Simulation", icon: FlaskConical }
];

function getMarketStatus() {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const minuteOfDay = Number(value.hour) * 60 + Number(value.minute);
  const weekday = !["Sat", "Sun"].includes(value.weekday);
  return weekday && minuteOfDay >= 555 && minuteOfDay < 930 ? "Open" : "Closed";
}

function NavigationLink({ item, onClick, count }) {
  const Icon = item.icon;
  return <NavLink to={item.to} onClick={onClick} className={({ isActive }) => `side-link ${isActive ? "side-link-active" : ""}`}>
    <Icon size={17} strokeWidth={1.8} />
    <span>{item.label}</span>
    {item.label === "Stocks" && count > 0 && <span className="side-link-count">{count}</span>}
  </NavLink>;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [universe, setUniverse] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus);
  const searchInput = useRef(null);

  useEffect(() => { api.get("/stocks").then(({ data }) => setUniverse(data.data || [])).catch(() => { }); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setMarketStatus(getMarketStatus()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setNotificationsOpen(false);
        searchInput.current?.focus();
      }
      if (event.key === "Escape") closePanels();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return universe.filter(stock => `${stock.symbol} ${stock.name}`.toLowerCase().includes(normalized)).slice(0, 6);
  }, [query, universe]);

  const flaggedStocks = useMemo(() => universe
    .filter(stock => Number(stock.volatility) >= 35 || Math.abs(Number(stock.maxDrawdown)) >= 30 || Number(stock.rsi) >= 75)
    .slice(0, 5), [universe]);
  const pageTitle = [...primaryNavigation, { to: "/alerts", label: "Alerts" }, { to: "/settings", label: "Preferences" }, { to: "/login", label: "Account" }]
    .find(item => location.pathname === item.to)?.label
    || (location.pathname.startsWith("/stocks/") ? "Stock analysis" : location.pathname === "/" ? "Welcome" : "Workspace");
  const closePanels = () => { setSearchOpen(false); setMobileSearchOpen(false); setNotificationsOpen(false); };

  return <div className="app-shell">
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-2">
        <Link to="/dashboard" className="flex items-center gap-3" aria-label="Personalized Stock Advisor overview">
          <span className="brand-mark"><ShieldCheck size={21} strokeWidth={2.1} /></span>
          <span><span className="block text-[15px] font-bold tracking-tight text-slate-100">PSA <span className="text-slate-400">Intelligence</span></span><span className="mt-0.5 block text-[10px] tracking-[0.15em] text-slate-500">PERSONAL STOCK ADVISOR</span></span>
        </Link>
        <button className="icon-button lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
      </div>

      <div className="mt-9 px-3"><p className="nav-section-label">WORKSPACE</p>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {primaryNavigation.map(item => <NavigationLink key={item.to} item={item} count={universe.length} onClick={() => setMobileOpen(false)} />)}
          <NavigationLink item={{ to: "/alerts", label: "Alerts", icon: Bell }} onClick={() => setMobileOpen(false)} />
        </nav>
      </div>

      <div className="mt-auto space-y-4">
        <div className="sidebar-insight mx-1 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-indigo-200"><Sparkles size={15} /><span className="text-xs font-semibold">Decision intelligence</span></div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">Historical evidence, clear explanations, and behavior-aware simulation.</p>
          <Link to="/simulation" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white">Explore simulation <ArrowUpRight size={13} /></Link>
        </div>
        <NavigationLink item={{ to: "/settings", label: "Settings", icon: Settings }} onClick={() => setMobileOpen(false)} />
        <div className="sidebar-user flex items-center gap-3 rounded-xl p-2">
          <div className="user-avatar">{(user?.name || "G").slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{user?.name || "Guest investor"}</p><p className="text-xs text-slate-500">{user ? "Personal workspace" : "Explore without an account"}</p></div>
          {user ? <button className="icon-button !min-h-8 !min-w-8 !rounded-lg" title="Sign out" aria-label="Sign out" onClick={() => { logout(); navigate("/"); }}><LogOut size={15} /></button> : <Link className="text-xs font-semibold text-indigo-300 hover:text-white" to="/login">Sign in</Link>}
        </div>
      </div>
    </aside>

    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

    <div className="min-h-screen lg:pl-[252px]">
      <header className="app-topbar sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="hidden min-w-0 sm:block"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">PERSONALIZED MARKET INTELLIGENCE</p><p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{pageTitle}</p></div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden w-[min(35vw,330px)] md:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input ref={searchInput} value={query} onFocus={() => { setSearchOpen(true); setNotificationsOpen(false); }} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") closePanels(); if (event.key === "Enter" && matches[0]) navigate(`/stocks/${matches[0].symbol}`); }} className="top-search w-full rounded-xl py-2.5 pl-9 pr-14 text-sm" placeholder="Search stocks..." aria-label="Search stocks" />
            <span className="search-shortcut">⌘ K</span>
            {searchOpen && query && <div className="top-popover absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden rounded-2xl p-1.5 shadow-2xl">
              {matches.length ? matches.map(stock => <Link key={stock.symbol} to={`/stocks/${stock.symbol}`} onClick={() => { setQuery(""); setSearchOpen(false); }} className="search-result flex items-center justify-between rounded-xl px-3 py-2.5"><span><b className="text-sm">{stock.symbol}</b><span className="ml-2 text-xs text-slate-500">{stock.name}</span></span><ChevronRight size={15} className="text-slate-500" /></Link>) : <p className="px-3 py-3 text-sm text-slate-500">No matching stocks in the processed dataset.</p>}
            </div>}
          </div>
          <div className="relative md:hidden"><button className="icon-button" onClick={() => { setMobileSearchOpen(open => !open); setSearchOpen(false); setNotificationsOpen(false); }} aria-label="Search stocks"><Search size={17} /></button>{mobileSearchOpen && <div className="mobile-search-popover top-popover absolute right-0 top-[calc(100%+12px)] w-[min(88vw,360px)] rounded-2xl p-2 shadow-2xl"><input autoFocus id="mobile-stock-search" value={query} onFocus={() => setSearchOpen(true)} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") closePanels(); if (event.key === "Enter" && matches[0]) { setMobileSearchOpen(false); navigate(`/stocks/${matches[0].symbol}`); } }} className="top-search w-full rounded-xl px-3 py-2.5 text-sm" placeholder="Search stocks..." aria-label="Search stocks" />{query && <div className="mt-2 max-h-64 overflow-y-auto">{matches.length ? matches.map(stock => <Link key={stock.symbol} to={`/stocks/${stock.symbol}`} onClick={() => { setQuery(""); closePanels(); }} className="search-result flex items-center justify-between rounded-xl px-3 py-2.5"><span><b className="text-sm">{stock.symbol}</b><span className="ml-2 text-xs text-slate-500">{stock.name}</span></span><ChevronRight size={15} className="text-slate-500" /></Link>) : <p className="px-3 py-3 text-sm text-slate-500">No matching stocks in the processed dataset.</p>}</div>}</div>}</div>
          <div className="market-pill hidden items-center gap-2 rounded-full px-3 py-2 sm:flex" title="Indicative NSE weekday market hours; exchange holidays are not checked"><span className={`market-dot ${marketStatus === "Open" ? "market-dot-open" : ""}`} /><span className="text-xs font-medium text-slate-300">Market {marketStatus}</span></div>
          <div className="relative">
            <button className="icon-button relative" onClick={() => { setNotificationsOpen(open => !open); setSearchOpen(false); }} aria-label={`Historical risk alerts${flaggedStocks.length ? `, ${flaggedStocks.length}` : ""}`}><Bell size={17} />{flaggedStocks.length > 0 && <span className="notification-dot" />}</button>
            {notificationsOpen && <div className="top-popover absolute right-0 top-[calc(100%+12px)] w-[min(88vw,340px)] rounded-2xl p-4 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Historical risk signals</h3><Link to="/alerts" onClick={closePanels} className="text-xs font-semibold text-indigo-300">View all</Link></div><p className="mt-1 text-xs text-slate-500">Based on volatility, drawdown and RSI in the processed dataset.</p><div className="mt-3 space-y-1">{flaggedStocks.length ? flaggedStocks.map(stock => <Link to={`/stocks/${stock.symbol}`} onClick={closePanels} key={stock.symbol} className="search-result flex items-center justify-between rounded-xl px-2.5 py-2"><span className="text-sm font-semibold">{stock.symbol}</span><span className="text-xs text-amber-300">{Number(stock.volatility) >= 35 ? `${stock.volatility}% volatility` : Number(stock.rsi) >= 75 ? `RSI ${stock.rsi}` : `${stock.maxDrawdown}% drawdown`}</span></Link>) : <p className="py-2 text-sm text-slate-500">No high-risk signals in the available dataset.</p>}</div></div>}
          </div>
          <Link to={user ? "/settings" : "/login"} className="profile-chip flex items-center gap-2 rounded-xl px-2 py-1.5 sm:px-3" aria-label={user ? "Open profile settings" : "Sign in"}><span className="user-avatar !h-8 !w-8 !text-xs">{(user?.name || "G").slice(0, 1).toUpperCase()}</span><span className="hidden max-w-28 truncate text-xs font-semibold text-slate-300 sm:block">{user?.name || "Guest"}</span></Link>
        </div>
      </header>
      <main onClick={() => { if (searchOpen || notificationsOpen) closePanels(); }} className="mx-auto max-w-[1600px] px-4 pb-12 pt-6 sm:px-7 sm:pt-8 xl:px-10">{children}</main>
    </div>
  </div>;
}

function Home() {
  const [stockCount, setStockCount] = useState(null);
  useEffect(() => { api.get("/stocks").then(({ data }) => setStockCount(data.data?.length ?? 0)).catch(() => setStockCount(null)); }, []);
  return <main className="home-hero data-grid relative overflow-hidden rounded-[28px] border border-slate-700/40 px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
    <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
    <div className="relative z-10 max-w-3xl"><p className="eyebrow flex items-center gap-2"><span className="status-pulse" /> AI-ASSISTED INVESTOR WORKSPACE</p><h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">Personalized Stock Advisory for <span className="gradient-text">Smarter Investing</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Connect historical market evidence, explainable scoring and behavioral insight in one clear decision-support platform.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/dashboard" className="primary-button inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">Open intelligence dashboard <ArrowUpRight size={16} /></Link><Link to="/simulation" className="secondary-button inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">Try the simulation <ChevronRight size={16} /></Link></div><p className="mt-8 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} /> Educational decision support. No real trades are executed.</p></div>
    <div className="hero-stat-card surface-card absolute bottom-10 right-10 hidden w-[290px] p-5 xl:block"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-400">EVIDENCE-BASED RANKING</span><Sparkles size={16} className="text-indigo-300" /></div><div className="mt-5 flex items-end gap-2"><span className="text-4xl font-semibold text-white">{stockCount ?? "—"}</span><span className="pb-1 text-sm text-slate-400">stocks analyzed</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-500 to-violet-400" /></div><p className="mt-3 text-xs text-slate-500">Historical analytics · explainable confidence</p></div>
  </main>;
}

function RouteLoading() {
  return <div aria-label="Loading page" className="space-y-4"><div className="skeleton h-24 rounded-2xl" /><div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-72 rounded-2xl" /><div className="skeleton h-72 rounded-2xl" /></div></div>;
}

export default function App() {
  return <AuthProvider><Layout><Suspense fallback={<RouteLoading />}><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/market" element={<Market />} /><Route path="/stocks" element={<Stocks />} /><Route path="/stocks/:symbol" element={<StockDetail />} /><Route path="/portfolio" element={<Portfolio />} /><Route path="/behavior" element={<Behavior />} /><Route path="/simulation" element={<Simulation />} /><Route path="/alerts" element={<Alerts />} /><Route path="/settings" element={<SettingsPage />} /></Routes></Suspense></Layout></AuthProvider>;
}