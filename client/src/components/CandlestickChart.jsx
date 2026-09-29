import { useEffect, useMemo, useRef, useState } from "react";

const chartHeight = 348;
const plotTop = 16;
const plotBottom = 228;
const volumeTop = 249;
const volumeBottom = 302;
const left = 68;
const right = 16;
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function candleLabel(timestamp, daily) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", daily
    ? { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" }
    : { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export default function CandlestickChart({ candles = [], interval = "5m" }) {
  const container = useRef(null);
  const svg = useRef(null);
  const [width, setWidth] = useState(800);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    if (!container.current) return undefined;
    const element = container.current;
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) setWidth(Math.max(320, nextWidth));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (!candles.length) return null;
    const lows = candles.map(candle => candle.low).filter(Number.isFinite);
    const highs = candles.map(candle => candle.high).filter(Number.isFinite);
    const volumes = candles.map(candle => candle.volume).filter(Number.isFinite);
    const rawLow = Math.min(...lows);
    const rawHigh = Math.max(...highs);
    const padding = Math.max((rawHigh - rawLow) * 0.06, rawHigh * 0.001);
    const minPrice = rawLow - padding;
    const maxPrice = rawHigh + padding;
    const plotWidth = Math.max(1, width - left - right);
    const volumeMax = Math.max(1, ...volumes);
    const y = value => plotTop + ((maxPrice - value) / (maxPrice - minPrice || 1)) * (plotBottom - plotTop);
    const slot = plotWidth / candles.length;
    return { minPrice, maxPrice, plotWidth, volumeMax, y, slot };
  }, [candles, width]);

  function selectFromPointer(event) {
    if (!candles.length || !svg.current) return;
    const pointerX = event.clientX ?? event.touches?.[0]?.clientX;
    if (pointerX === undefined) return;
    const bounds = svg.current.getBoundingClientRect();
    const scaledX = (pointerX - bounds.left) * (width / bounds.width) - left;
    const index = Math.floor(scaledX / (geometry?.slot || 1));
    setActiveIndex(Math.max(0, Math.min(candles.length - 1, index)));
  }

  if (!candles.length || !geometry) return null;

  const daily = interval === "1d";
  const candleWidth = Math.max(2, Math.min(12, geometry.slot * 0.64));
  const tickValues = Array.from({ length: 5 }, (_, index) => geometry.maxPrice - ((geometry.maxPrice - geometry.minPrice) * index / 4));
  const tickIndexes = Array.from({ length: Math.min(6, candles.length) }, (_, index) => Math.round(index * (candles.length - 1) / (Math.min(6, candles.length) - 1 || 1)));
  const selectedIndex = activeIndex === null ? candles.length - 1 : Math.max(0, Math.min(candles.length - 1, activeIndex));
  const active = candles[selectedIndex];
  const activeTimestamp = active?.timestamp ? new Date(active.timestamp) : null;

  return <div ref={container} className="relative h-[348px] w-full select-none" onMouseLeave={() => setActiveIndex(null)}>
    <div className="pointer-events-none absolute left-[72px] top-1 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 text-[10px] shadow-lg sm:text-[11px]">
      <span className="text-slate-400">{activeTimestamp && !Number.isNaN(activeTimestamp.getTime()) ? activeTimestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : ""}</span>
      <span className="text-slate-300">O <b className="text-slate-100">{number.format(active.open)}</b></span>
      <span className="text-slate-300">H <b className="text-slate-100">{number.format(active.high)}</b></span>
      <span className="text-slate-300">L <b className="text-slate-100">{number.format(active.low)}</b></span>
      <span className="text-slate-300">C <b className="text-slate-100">{number.format(active.close)}</b></span>
      <span className="text-slate-300">V <b className="text-slate-100">{Number.isFinite(active.volume) ? new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(active.volume) : "—"}</b></span>
    </div>
    <svg ref={svg} width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} preserveAspectRatio="none" role="img" aria-label={`${candles.length} ${interval} NSE candlesticks with volume`} onMouseMove={selectFromPointer} onTouchMove={selectFromPointer}>
      {tickValues.map((value, index) => {
        const y = plotTop + index * (plotBottom - plotTop) / 4;
        return <g key={`price-tick-${index}`}>
          <line x1={left} x2={width - right} y1={y} y2={y} stroke="rgba(148,163,184,.14)" strokeDasharray="3 5" />
          <text x={left - 9} y={y + 3.5} textAnchor="end" fill="#7f8da5" fontSize="9">₹{number.format(value)}</text>
        </g>;
      })}
      <line x1={left} x2={width - right} y1={volumeTop - 7} y2={volumeTop - 7} stroke="rgba(148,163,184,.15)" />
      <text x={left} y={volumeTop + 9} fill="#687891" fontSize="9">VOLUME</text>
      {candles.map((candle, index) => {
        const x = left + index * geometry.slot + geometry.slot / 2;
        const openY = geometry.y(candle.open);
        const closeY = geometry.y(candle.close);
        const rising = candle.close >= candle.open;
        const color = rising ? "#43d6a0" : "#ff7185";
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(1.3, Math.abs(closeY - openY));
        const volumeHeight = Number.isFinite(candle.volume) ? candle.volume / geometry.volumeMax * (volumeBottom - volumeTop) : 0;
        const hovered = index === activeIndex;
        return <g key={`${candle.timestamp}-${index}`}>
          {hovered && <line x1={x} x2={x} y1={plotTop} y2={volumeBottom} stroke="rgba(203,213,225,.25)" strokeDasharray="3 4" />}
          <line x1={x} x2={x} y1={geometry.y(candle.high)} y2={geometry.y(candle.low)} stroke={color} strokeWidth="1.2" />
          <rect x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} rx="0.6" fill={color} opacity={hovered ? 1 : 0.86} />
          {volumeHeight > 0 && <rect x={x - candleWidth / 2} y={volumeBottom - volumeHeight} width={candleWidth} height={volumeHeight} fill={color} opacity="0.38" />}
        </g>;
      })}
      {tickIndexes.map((index, tick) => {
        const x = left + index * geometry.slot + geometry.slot / 2;
        return <text key={`time-tick-${tick}`} x={x} y={chartHeight - 10} textAnchor="middle" fill="#7f8da5" fontSize="9">{candleLabel(candles[index].timestamp, daily)}</text>;
      })}
    </svg>
  </div>;
}
