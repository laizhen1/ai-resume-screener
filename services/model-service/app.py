import os
import secrets
import threading
from contextlib import asynccontextmanager
from importlib.metadata import version
from typing import Annotated
from fastapi import FastAPI, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pipeline import analyze, VERSION, THRESHOLD, MARGIN, TOP_K, RERANK_K


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
        return {**result, "metadata": metadata(), "entities": entities, "entityError": entity_error}
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
        texts = [p.text for p in data.passages]
        similarities = app.state.engine.similarities([data.query], texts)[0]
        indices = sorted(range(len(texts)), key=lambda i: similarities[i], reverse=True)[:TOP_K]
        scores = app.state.engine.rerank(data.query, [texts[i] for i in indices])
        ranked = sorted(zip(indices, scores), key=lambda item: item[1], reverse=True)[:RERANK_K]
        return {"passageIds": [data.passages[i].id for i, _ in ranked], "metadata": metadata()}
    except Exception as error:
        raise HTTPException(503, "Retrieval failed") from error
    finally:
        app.state.lock.release()
