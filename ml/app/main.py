from pathlib import Path
import math
import re

from fastapi import FastAPI
from pydantic import BaseModel

try:
    import joblib
except ImportError:
    joblib = None

BASE = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE / "models" / "financial_sentiment.joblib"
sentiment_model = joblib.load(MODEL_PATH) if joblib and MODEL_PATH.exists() else None

app = FastAPI(title="Personalized Stock Advisor ML Service", version="2.0.0")

POSITIVE_TERMS = {
    "beat", "beats", "benefit", "bullish", "gain", "gains", "growth", "improve",
    "improved", "improves", "increase", "increased", "increases", "outperform",
    "outperforms", "positive", "profit", "profits", "record", "rise", "rises",
    "strong", "surge", "upgrade", "upgraded", "upgrades", "win", "wins",
}
NEGATIVE_TERMS = {
    " decline", "decline", "declines", "default", "downgrade", "downgraded", "drop",
    "drops", "fall", "falling", "falls", "fraud", "loss", "losses", "negative", "outlook",
    "poor", "recession", "risk", "risks", "slump", "warns", "weak", "weaker", "warning",
}
NEGATIONS = {"no", "not", "never", "without", "fails", "failed", "halted"}


def lexicon_sentiment(text: str):
    tokens = re.findall(r"[a-z]+", text.lower())
    polarity = 0
    for index, token in enumerate(tokens):
        value = 1 if token in POSITIVE_TERMS else -1 if token in NEGATIVE_TERMS else 0
        if value and any(word in NEGATIONS for word in tokens[max(0, index - 3):index]):
            value *= -1
        polarity += value

    scaled = math.tanh(polarity / 2)
    sentiment_score = round(50 + scaled * 50)
    label = "positive" if sentiment_score >= 60 else "negative" if sentiment_score <= 40 else "neutral"
    confidence = round(0.5 + abs(scaled) * 0.5, 4)
    return {
        "label": label,
        "score": confidence,
        "sentimentScore": sentiment_score,
        "model": "financial-lexicon-fallback",
    }

class SentimentRequest(BaseModel):
    text: str

class ScoreRequest(BaseModel):
    performance: float
    risk: float
    technical: float
    sentiment: float
    stability: float

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml", "sentimentModelLoaded": sentiment_model is not None}

@app.post("/sentiment")
def sentiment(payload: SentimentRequest):
    if sentiment_model is None:
        return lexicon_sentiment(payload.text)
    probabilities = sentiment_model.predict_proba([payload.text])[0]
    classes = sentiment_model.classes_
    index = int(probabilities.argmax())
    label = str(classes[index])
    confidence = float(probabilities[index])
    numeric = {"negative": 0, "neutral": 50, "positive": 100}[label]
    return {"label": label, "score": round(confidence, 4), "sentimentScore": numeric, "model": "tfidf-logistic-regression"}

@app.post("/score")
def score(payload: ScoreRequest):
    value = payload.performance * 0.30 + payload.risk * 0.20 + payload.technical * 0.20 + payload.sentiment * 0.20 + payload.stability * 0.10
    return {"confidenceScore": round(max(0, min(100, value)), 2)}
