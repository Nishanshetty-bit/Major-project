"""Build the market analytics used by the Personalized Stock Advisor.

Input: Kaggle NSE/Nifty stock CSV with Date, Symbol, Open, High, Low, Close,
       Adj Close (optional), Volume.
Output: data/processed/stocks.json and data/processed/history.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd


def rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    value = 100 - (100 / (1 + rs))
    return float(value.iloc[-1]) if pd.notna(value.iloc[-1]) else 50.0


def max_drawdown(series: pd.Series) -> float:
    running_max = series.cummax()
    dd = series / running_max - 1
    return float(dd.min() * 100)


def safe_minmax(value: float, low: float, high: float) -> float:
    if high == low:
        return 50.0
    return float(np.clip((value - low) / (high - low) * 100, 0, 100))


def build(input_csv: Path, output_dir: Path, limit: int | None = None) -> None:
    df = pd.read_csv(input_csv)
    df.columns = [str(c).strip() for c in df.columns]

    required = {"Date", "Symbol", "Open", "High", "Low", "Close", "Volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    numeric = ["Open", "High", "Low", "Close", "Volume"]
    if "Adj Close" in df.columns:
        numeric.append("Adj Close")
    for col in numeric:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["Date", "Symbol", "Close"]).sort_values(["Symbol", "Date"])
    symbols = sorted(df["Symbol"].dropna().unique())
    if limit:
        symbols = symbols[:limit]
        df = df[df["Symbol"].isin(symbols)]

    summaries = []
    histories = {}

    for symbol, g in df.groupby("Symbol"):
        g = g.sort_values("Date").copy()
        price = g["Adj Close"] if "Adj Close" in g.columns and g["Adj Close"].notna().any() else g["Close"]
        price = price.ffill().bfill()
        returns = price.pct_change().dropna()
        if len(price) < 30 or price.iloc[0] <= 0:
            continue

        years = max((g["Date"].iloc[-1] - g["Date"].iloc[0]).days / 365.25, 1 / 365.25)
        cagr = ((price.iloc[-1] / price.iloc[0]) ** (1 / years) - 1) * 100
        volatility = returns.std(ddof=1) * np.sqrt(252) * 100 if len(returns) > 1 else 0
        sharpe = (returns.mean() / returns.std(ddof=1)) * np.sqrt(252) if returns.std(ddof=1) else 0
        drawdown = max_drawdown(price)

        sma20 = float(price.rolling(20).mean().iloc[-1])
        sma50 = float(price.rolling(50).mean().iloc[-1]) if len(price) >= 50 else sma20
        ema20 = float(price.ewm(span=20, adjust=False).mean().iloc[-1])
        ema12 = price.ewm(span=12, adjust=False).mean()
        ema26 = price.ewm(span=26, adjust=False).mean()
        macd = float((ema12 - ema26).iloc[-1])
        signal = float((ema12 - ema26).ewm(span=9, adjust=False).mean().iloc[-1])
        current = float(price.iloc[-1])
        rsi_value = rsi(price)
        high52 = float(price.tail(252).max())
        low52 = float(price.tail(252).min())

        # Transparent sub-scores. Sentiment starts neutral until news is supplied.
        performance = np.clip(50 + cagr * 2.5 + sharpe * 7, 0, 100)
        risk = np.clip(100 - volatility * 2 - abs(drawdown) * 0.35, 0, 100)
        technical = np.clip(
            50 + (current / sma20 - 1) * 250 + (current / sma50 - 1) * 150
            + (rsi_value - 50) * 0.25 + (macd - signal) / max(current, 1) * 2000,
            0,
            100,
        )
        stability = np.clip(100 - volatility * 1.7 - abs(drawdown) * 0.25, 0, 100)
        sentiment = 50.0
        score = performance * 0.30 + risk * 0.20 + technical * 0.20 + sentiment * 0.20 + stability * 0.10

        positives = []
        negatives = []
        if cagr > 10: positives.append(f"CAGR of {cagr:.1f}%")
        if sharpe > 1: positives.append(f"Sharpe ratio of {sharpe:.2f}")
        if volatility < 25: positives.append("Relatively controlled annualized volatility")
        if current > sma50: positives.append("Price above 50-day moving average")
        if rsi_value >= 55 and rsi_value <= 70: positives.append("Momentum is in a moderate range")
        if cagr < 5: negatives.append(f"CAGR is {cagr:.1f}%")
        if volatility > 35: negatives.append(f"High annualized volatility of {volatility:.1f}%")
        if abs(drawdown) > 30: negatives.append(f"Maximum drawdown of {drawdown:.1f}%")
        if current < sma50: negatives.append("Price is below 50-day moving average")
        if rsi_value > 75: negatives.append("RSI indicates potentially overheated momentum")
        if not positives: positives.append("Historical metrics are broadly neutral")
        if not negatives: negatives.append("No major negative historical signal detected")

        history_rows = []
        for row in g.tail(750).to_dict("records"):
            history_item = {
                "date": row["Date"].strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
            }
            adjusted_close = row.get("Adj Close")
            if pd.notna(adjusted_close):
                history_item["adjClose"] = round(float(adjusted_close), 2)
            history_rows.append(history_item)
        histories[symbol] = history_rows

        summaries.append({
            "symbol": str(symbol),
            "name": str(symbol),
            "currentPrice": round(current, 2),
            "cagr": round(float(cagr), 2),
            "volatility": round(float(volatility), 2),
            "sharpeRatio": round(float(sharpe), 2),
            "maxDrawdown": round(float(drawdown), 2),
            "rsi": round(float(rsi_value), 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "ema20": round(ema20, 2),
            "macd": round(macd, 4),
            "macdSignal": round(signal, 4),
            "high52": round(high52, 2),
            "low52": round(low52, 2),
            "performanceScore": round(float(performance), 2),
            "riskScore": round(float(risk), 2),
            "technicalScore": round(float(technical), 2),
            "sentimentScore": 50,
            "stabilityScore": round(float(stability), 2),
            "confidenceScore": round(float(score), 2),
            "sentiment": "Neutral",
            "positiveDrivers": positives[:4],
            "negativeDrivers": negatives[:4],
            "dataSource": "Kaggle NSE India Stock Market Data (2015-2024)",
        })

    summaries.sort(key=lambda x: x["confidenceScore"], reverse=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "stocks.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    (output_dir / "history.json").write_text(json.dumps(histories), encoding="utf-8")
    print(f"Processed {len(summaries)} stocks -> {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", default=Path("data/processed"), type=Path)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    build(args.input, args.output, args.limit)
