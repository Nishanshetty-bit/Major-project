"""Train a small, explainable financial-news sentiment classifier.

Expected CSV columns can be either:
  sentence,text,headline,News Headline + sentiment/label/Sentiment
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def find_col(df, candidates):
    normalized = {str(c).strip().lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in normalized:
            return normalized[candidate.lower()]
    raise ValueError(f"Could not find any of {candidates}; columns={list(df.columns)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", default=Path("ml/models/financial_sentiment.joblib"), type=Path)
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    text_col = find_col(df, ["sentence", "text", "headline", "news headline", "News Headline"])
    label_col = find_col(df, ["sentiment", "label"])
    df = df[[text_col, label_col]].dropna()
    df[text_col] = df[text_col].astype(str)
    df[label_col] = df[label_col].astype(str).str.lower().str.strip()
    mapping = {"0": "negative", "1": "neutral", "2": "positive"}
    df[label_col] = df[label_col].map(lambda x: mapping.get(x, x))
    df = df[df[label_col].isin(["negative", "neutral", "positive"])]

    x_train, x_test, y_train, y_test = train_test_split(
        df[text_col], df[label_col], test_size=0.2, random_state=42, stratify=df[label_col]
    )
    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=50000, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=1500, class_weight="balanced")),
    ])
    model.fit(x_train, y_train)
    print(classification_report(y_test, model.predict(x_test), digits=3))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.output)
    print(f"Saved {args.output}")


if __name__ == "__main__":
    main()
