"""Real-checkpoint smoke test; run separately from offline CI tests."""
import json
from fastapi.testclient import TestClient
from app import app


def main():
    with TestClient(app) as client:
        health = client.get("/health")
        health.raise_for_status()
        response = client.post("/analyze", json={
            "requirements": [{"skill": "python"}],
            "passages": [{"id": 0, "text": "Built and maintained Python services for 200 users."}],
            "includeBaseline": True,
            "includeEntities": False,
        })
        response.raise_for_status()
        result = response.json()
        assert len(result["reranked"]) == len(result["baseline"]) == 1
        assert result["reranked"][0]["passageId"] == 0
        retrieval = client.post("/retrieve", json={"query": "What backend work is listed?", "passages": [{"id": 0, "text": "Built Python services for 200 users."}]})
        retrieval.raise_for_status()
        assert retrieval.json()["passageIds"] == [0]
        invalid = client.post("/analyze", json={"requirements": [], "passages": [{"id": 0, "text": "a"}, {"id": 0, "text": "b"}]})
        assert invalid.status_code == 422
        print(json.dumps({"status": "passed", "metadata": result["metadata"], "example": result["reranked"], "timings": result["timings"]}, indent=2))


if __name__ == "__main__":
    main()
