"""Model-independent orchestration. Scores are experimental, not calibrated confidence."""
import math
from time import perf_counter

VERSION = "transformer-evidence-v1"
THRESHOLD = 0.80
MARGIN = 0.15
TOP_K = 8
RERANK_K = 3


def probability_winner(scores):
    if set(scores) != {"entailment", "neutral", "contradiction"}:
        raise ValueError("NLI model must expose semantic label names")
    if any(not math.isfinite(v) or v < 0 or v > 1 for v in scores.values()):
        raise ValueError("Invalid NLI probabilities")
    if abs(sum(scores.values()) - 1) > 0.01:
        raise ValueError("NLI probabilities must sum to one")
    ordered = sorted(scores, key=scores.get, reverse=True)
    return ordered[0] if scores[ordered[0]] >= THRESHOLD and scores[ordered[0]] - scores[ordered[1]] >= MARGIN else "neutral"


def decide(candidates):
    supported, contradicted, partial = [], [], []
    for row in candidates:
        delivery = probability_winner(row["nli"])
        learning = probability_winner(row["learningNli"])
        if delivery == "entailment":
            supported.append(row)
        elif learning == "entailment":
            partial.append(row)
        elif delivery == "contradiction":
            contradicted.append(row)
    if supported and contradicted:
        verdict, reason, chosen = "unknown", "Retrieved passages give conflicting evidence; review their context.", supported[0]
    elif supported:
        verdict, reason, chosen = "supported", "NLI predicts that the passage supports the skill-experience hypothesis.", supported[0]
    elif partial:
        verdict, reason, chosen = "partial", "NLI supports learning or limited exposure, but does not establish demonstrated experience.", partial[0]
    elif contradicted:
        verdict, reason, chosen = "contradicted", "NLI predicts contradiction of the skill-experience hypothesis; verify context.", contradicted[0]
    else:
        verdict, reason, chosen = "unknown", "No sufficiently decisive NLI evidence was found.", candidates[0] if candidates else None
    return {"verdict": verdict, "reason": reason, "passageId": chosen["passageId"] if chosen else None, "candidates": candidates}


def analyze(engine, requirements, passages, include_baseline=False):
    start = perf_counter()
    if not requirements or not passages:
        rows = [{"skill": r["skill"], **decide([])} for r in requirements]
        return {"baseline": rows if include_baseline else [], "reranked": rows, "timings": {"baselineMs": 0, "rerankedMs": 0}}
    texts = [p["text"] for p in passages]
    queries = [f"Experience with {r['skill']}" for r in requirements]
    similarities = engine.similarities(queries, texts)
    retrieval_ms = (perf_counter() - start) * 1000
    baseline, reranked = [], []
    baseline_ms, reranked_ms = retrieval_ms, retrieval_ms
    for requirement, similarities_row in zip(requirements, similarities):
        indices = sorted(range(len(passages)), key=lambda i: similarities_row[i], reverse=True)[:TOP_K]
        query = f"Experience with {requirement['skill']}"
        rerank_start = perf_counter()
        scores = engine.rerank(query, [texts[i] for i in indices])
        if len(scores) != len(indices) or any(not math.isfinite(float(score)) for score in scores):
            raise ValueError("Invalid reranker output")
        score_map = dict(zip(indices, scores))
        ranked = sorted(indices, key=lambda i: score_map[i], reverse=True)[:RERANK_K]
        rerank_ms = (perf_counter() - rerank_start) * 1000
        # Both variants classify three passages, isolating the selection stage.
        dense = indices[:RERANK_K]
        def classify(selected):
            chosen_texts = [texts[i] for i in selected]
            delivery = engine.nli(chosen_texts, f"The applicant has experience with {requirement['skill']}.")
            learning = engine.nli(chosen_texts, f"The applicant is learning or has limited exposure to {requirement['skill']}.")
            if len(delivery) != len(selected) or len(learning) != len(selected):
                raise ValueError("Incomplete NLI response")
            candidates = [{"passageId": passages[i]["id"], "similarity": float(similarities_row[i]),
                           "rerankScore": float(score_map[i]), "nli": d, "learningNli": l}
                          for i, d, l in zip(selected, delivery, learning)]
            return {"skill": requirement["skill"], **decide(candidates)}
        if include_baseline:
            stage = perf_counter()
            baseline.append(classify(dense))
            baseline_ms += (perf_counter() - stage) * 1000
        stage = perf_counter()
        reranked.append(classify(ranked))
        reranked_ms += rerank_ms + (perf_counter() - stage) * 1000
    return {"baseline": baseline, "reranked": reranked,
            "timings": {"baselineMs": baseline_ms if include_baseline else 0, "rerankedMs": reranked_ms}}
