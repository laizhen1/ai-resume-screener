"""Request-scoped BM25, dense/FAISS and reciprocal-rank fusion retrieval."""
import math
import re
from collections import Counter
from time import perf_counter


def bm25(query, texts):
    tokens = [re.findall(r"[\w+#.-]+", text.lower()) for text in texts]
    query_tokens = set(re.findall(r"[\w+#.-]+", query.lower()))
    average = sum(map(len, tokens)) / max(1, len(tokens)) or 1
    frequencies = Counter(word for doc in tokens for word in set(doc))
    scores = []
    for doc in tokens:
        count, score = Counter(doc), 0.0
        for word in query_tokens:
            df, tf = frequencies[word], count[word]
            idf = math.log(1 + (len(tokens) - df + 0.5) / (df + 0.5))
            score += idf * tf * 2.5 / (tf + 1.5 * (0.25 + 0.75 * len(doc) / average))
        scores.append(score)
    return scores


def fuse(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, index in enumerate(ranking, 1):
            scores[index] = scores.get(index, 0) + 1 / (k + rank)
    return sorted(scores, key=lambda i: (-scores[i], i)), scores


def retrieve(engine, query, passages, mode="hybrid", backend="numpy", top_k=8, rerank_k=3, rerank=True):
    if mode not in ("keyword", "dense", "hybrid") or backend not in ("numpy", "faiss"):
        raise ValueError("Unknown retrieval mode/backend")
    if not passages or top_k < 1 or rerank_k < 1:
        raise ValueError("Retrieval requires passages and positive limits")
    if len({p["id"] for p in passages}) != len(passages):
        raise ValueError("Duplicate passage IDs")
    started = perf_counter()
    texts = [p["text"] for p in passages]
    rankings, scores = [], {}
    if mode in ("keyword", "hybrid"):
        lexical = bm25(query, texts)
        rankings.append(sorted((i for i, score in enumerate(lexical) if score > 0), key=lambda i: (-lexical[i], i))[:top_k])
        scores = dict(enumerate(lexical))
    if mode in ("dense", "hybrid"):
        if backend == "faiss":
            import faiss
            import numpy as np
            # Index exists only for this request's authorized passages. No shared PII cache.
            vectors = np.ascontiguousarray(engine.embedding.encode(texts, normalize_embeddings=True, show_progress_bar=False), dtype="float32")
            vector = np.ascontiguousarray(engine.embedding.encode([query], normalize_embeddings=True, show_progress_bar=False), dtype="float32")
            if vectors.ndim != 2 or vector.shape != (1, vectors.shape[1]) or not np.isfinite(vectors).all() or not np.isfinite(vector).all():
                raise ValueError("Invalid FAISS embeddings")
            index = faiss.IndexFlatIP(vectors.shape[1])
            index.add(vectors)
            distances, indices = index.search(vector, min(top_k, len(texts)))
            dense_rank = indices[0].tolist()
            dense_scores = dict(zip(dense_rank, distances[0].tolist()))
        else:
            similarities = engine.similarities([query], texts)[0]
            if len(similarities) != len(texts) or any(not math.isfinite(s) for s in similarities):
                raise ValueError("Invalid embedding similarities")
            dense_rank = sorted(range(len(texts)), key=lambda i: (-similarities[i], i))[:top_k]
            dense_scores = dict(enumerate(similarities))
        rankings.append(dense_rank)
        if mode == "dense":
            scores = dense_scores
    selected, scores = fuse(rankings) if mode == "hybrid" else (rankings[0], scores)
    selected = selected[:top_k]
    retrieval_ms = (perf_counter() - started) * 1000
    rerank_start = perf_counter()
    if rerank and selected:
        reranked = engine.rerank(query, [texts[i] for i in selected])
        if len(reranked) != len(selected) or any(not math.isfinite(float(s)) for s in reranked):
            raise ValueError("Invalid reranker scores")
        scores = dict(zip(selected, map(float, reranked)))
        selected.sort(key=lambda i: (-scores[i], i))
    selected = selected[:rerank_k]
    return {"passageIds": [passages[i]["id"] for i in selected], "scores": [scores[i] for i in selected],
            "retrieval": {"mode": mode, "backend": backend if mode != "keyword" else "bm25", "reranked": rerank,
                          "scope": "request", "topK": top_k, "resultK": rerank_k,
                          "retrievalMs": retrieval_ms, "rerankMs": (perf_counter() - rerank_start) * 1000}}
