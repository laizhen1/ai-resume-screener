"""Compare retrieval independently of answer generation on scoped JSONL cases."""
import argparse
import json
import math
from pathlib import Path
from time import perf_counter
from ml_data import file_hash
from retrieval import retrieve


def ranking_metrics(ids, relevant, k):
    if not relevant:
        raise ValueError("Ranking metrics require at least one relevant passage")
    hits = [int(i in relevant) for i in ids[:k]]
    dcg = sum(hit / math.log2(rank + 2) for rank, hit in enumerate(hits))
    ideal = sum(1 / math.log2(rank + 2) for rank in range(min(k, len(relevant))))
    return {"recallAtK": len(set(ids[:k]) & set(relevant)) / len(set(relevant)),
            "mrrAtK": next((1 / (i + 1) for i, hit in enumerate(hits) if hit), 0), "ndcgAtK": dcg / ideal}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--with-models", action="store_true")
    parser.add_argument("--backend", choices=["numpy", "faiss"], default="numpy")
    parser.add_argument("--k", type=int, default=3)
    args = parser.parse_args()
    if args.k < 1:
        parser.error("k must be positive")
    rows = [json.loads(line) for line in Path(args.data).read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows or len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Expected nonempty unique retrieval cases")
    for row in rows:
        ids = {p["id"] for p in row["passages"]}
        if len(ids) != len(row["passages"]) or not set(row["relevantIds"]) <= ids or not row["relevantIds"]:
            raise ValueError("Invalid retrieval relevance labels")
    engine = None
    if args.with_models:
        from models import Models
        engine = Models()
    variants = [("keyword", False)] + ([("dense", False), ("hybrid", False), ("dense", True), ("hybrid", True)] if engine else [])
    reports = []
    for mode, rerank in variants:
        cases = []
        for row in rows:
            started = perf_counter()
            output = retrieve(engine, row["query"], row["passages"], mode=mode, backend=args.backend,
                              top_k=max(8, args.k), rerank_k=args.k, rerank=rerank)
            cases.append({"id": row["id"], "passageIds": output["passageIds"],
                          **ranking_metrics(output["passageIds"], row["relevantIds"], args.k),
                          "latencyMs": (perf_counter() - started) * 1000})
        latencies = sorted(c["latencyMs"] for c in cases)
        reports.append({"mode": mode, "reranked": rerank, "backend": args.backend if mode != "keyword" else "bm25",
                        "metrics": {key: sum(c[key] for c in cases) / len(cases) for key in ("recallAtK", "mrrAtK", "ndcgAtK")},
                        "p50LatencyMs": latencies[math.ceil(len(cases) * 0.5) - 1],
                        "p95LatencyMs": latencies[math.ceil(len(cases) * 0.95) - 1], "cases": cases})
    report = {"version": "retrieval-evaluation-v1", "datasetSha256": file_hash(args.data), "k": args.k,
              "models": engine.ids if engine else None, "revisions": engine.revisions if engine else None,
              "timingNote": "Single local runs, model load excluded; no warmup or capacity claim.",
              "annotationStatus": "Bundled examples are synthetic smoke fixtures, not a validated retrieval benchmark.",
              "variants": reports}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps([{k: v for k, v in r.items() if k != "cases"} for r in reports], indent=2))


if __name__ == "__main__":
    main()
