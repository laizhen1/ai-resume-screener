import os
import secrets
import threading
from contextlib import asynccontextmanager
from importlib.metadata import version
from typing import Annotated, Literal
from fastapi import FastAPI, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pipeline import analyze, VERSION, THRESHOLD, MARGIN, TOP_K, RERANK_K
from retrieval import retrieve as retrieve_ranked
from learned import evidence_verdict


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Passage(StrictModel):
    id: int = Field(ge=0)
    text: str = Field(min_length=1, max_length=800)


class Requirement(StrictModel):
    skill: str = Field(min_length=1, max_length=120)


class AnalysisInput(StrictModel):
    requirements: list[Requirement] = Field(max_length=40)
    passages: list[Passage] = Field(max_length=160)
    includeBaseline: bool = False
    includeEntities: bool = False


class RetrievalInput(StrictModel):
    query: str = Field(min_length=3, max_length=500)
    passages: list[Passage] = Field(min_length=1, max_length=160)
    mode: Literal["keyword", "dense", "hybrid"] | None = None
    backend: Literal["numpy", "faiss"] | None = None
    topK: int = Field(default=8, ge=1, le=40)
    resultK: int = Field(default=3, ge=1, le=20)
    rerank: bool = True


class EvidencePair(StrictModel):
    requirement: str = Field(min_length=1, max_length=500)
    passage: str = Field(min_length=1, max_length=800)


class EvidenceInput(StrictModel):
    pairs: list[EvidencePair] = Field(min_length=1, max_length=40)


def authorize(authorization: Annotated[str | None, Header()] = None):
    token = os.getenv("MODEL_SERVICE_TOKEN", "")
    if token and not secrets.compare_digest(authorization or "", f"Bearer {token}"):
        raise HTTPException(401, "Invalid service token")


@asynccontextmanager
async def lifespan(app):
    from models import Models
    app.state.engine = Models()
    app.state.lock = threading.Lock()
    yield


app = FastAPI(title="Open Resume Lab local models", lifespan=lifespan, dependencies=[Depends(authorize)])


def metadata():
    engine = app.state.engine
    return {"version": VERSION, "models": engine.ids, "revisions": engine.revisions,
            "device": engine.device, "threshold": THRESHOLD, "margin": MARGIN,
            "topK": TOP_K, "rerankK": RERANK_K,
            "packages": {p: version(p) for p in ["torch", "transformers", "sentence-transformers"]}}


@app.get("/health")
def health():
    return {"status": "ready", **metadata()}


def check_unique(passages):
    if len({p.id for p in passages}) != len(passages):
        raise HTTPException(422, "Passage IDs must be unique")


@app.post("/analyze")
def analysis(data: AnalysisInput):
    check_unique(data.passages)
    if len({r.skill for r in data.requirements}) != len(data.requirements):
        raise HTTPException(422, "Requirements must be unique")
    if not app.state.lock.acquire(blocking=False):
        raise HTTPException(503, "Model service busy; retry later")
    try:
        passages = [p.model_dump() for p in data.passages]
        result = analyze(app.state.engine, [r.model_dump() for r in data.requirements], passages, data.includeBaseline)
        entities, entity_error = [], None
        if data.includeEntities and app.state.engine.ner:
            try:
                entities = app.state.engine.entities(passages)
            except Exception:
                entity_error = "Configured entity extractor failed."
        trained, trained_error = [], None
        if app.state.engine.evidence:
            try:
                by_id = {p["id"]: p for p in passages}
                threshold = float(os.getenv("EVIDENCE_THRESHOLD", "0.8"))
                for row in result["reranked"]:
                    candidates = row["candidates"]
                    if not candidates:
                        continue
                    scores = app.state.engine.evidence.predict([f"{row['skill']} experience is required."] * len(candidates),
                        [by_id[c["passageId"]]["text"] for c in candidates])
                    trained.extend({"skill": row["skill"], "passageId": c["passageId"], **evidence_verdict(p, threshold)} for c, p in zip(candidates, scores))
            except Exception:
                trained = []
                trained_error = "Configured evidence classifier failed."
        return {**result, "metadata": metadata(), "entities": entities, "entityError": entity_error,
                "trainedEvidence": trained, "trainedEvidenceError": trained_error}
    except Exception as error:
        raise HTTPException(503, "Model inference failed; check service configuration") from error
    finally:
        app.state.lock.release()


@app.post("/retrieve")
def retrieve(data: RetrievalInput):
    check_unique(data.passages)
    if not app.state.lock.acquire(blocking=False):
        raise HTTPException(503, "Model service busy; retry later")
    try:
        result = retrieve_ranked(app.state.engine, data.query, [p.model_dump() for p in data.passages],
            mode=data.mode or os.getenv("RETRIEVAL_MODE", "hybrid"), backend=data.backend or os.getenv("RETRIEVAL_BACKEND", "numpy"),
            top_k=data.topK, rerank_k=data.resultK, rerank=data.rerank)
        return {**result, "metadata": metadata()}
    except Exception as error:
        raise HTTPException(503, "Retrieval failed") from error
    finally:
        app.state.lock.release()


@app.post("/classify-evidence")
def classify_evidence(data: EvidenceInput):
    if not app.state.engine.evidence:
        raise HTTPException(503, "Set EVIDENCE_MODEL to a trained four-class checkpoint")
    if not app.state.lock.acquire(blocking=False):
        raise HTTPException(503, "Model service busy; retry later")
    try:
        scores = app.state.engine.evidence.predict([p.requirement for p in data.pairs], [p.passage for p in data.pairs])
        threshold = float(os.getenv("EVIDENCE_THRESHOLD", "0.8"))
        return {"predictions": [evidence_verdict(p, threshold) for p in scores], "threshold": threshold, "metadata": metadata()}
    except Exception as error:
        raise HTTPException(503, "Evidence inference failed") from error
    finally:
        app.state.lock.release()
