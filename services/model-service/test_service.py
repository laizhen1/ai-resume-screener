"""Optional service/FAISS contract tests; basic CI needs no ML dependencies."""
import importlib.util
import os
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import patch

HAS_SERVICE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None
HAS_FAISS = importlib.util.find_spec("faiss") is not None


@unittest.skipUnless(HAS_SERVICE, "Install model-service requirements for HTTP tests")
class ServiceTests(unittest.TestCase):
    def setUp(self):
        from app import app
        from fastapi.testclient import TestClient
        self.app = app
        self.app.state.engine = SimpleNamespace(evidence=None)
        self.app.state.lock = threading.Lock()
        self.client = TestClient(app)
        self.environment = patch.dict(os.environ, {"MODEL_SERVICE_TOKEN": "test-token"})
        self.environment.start()
        self.metadata = patch("app.metadata", return_value={"version": "test"})
        self.metadata.start()
        self.headers = {"Authorization": "Bearer test-token"}

    def tearDown(self):
        self.environment.stop()
        self.metadata.stop()
        self.client.close()

    def test_requires_auth_and_unique_passages(self):
        data = {"query": "Python", "passages": [{"id": 7, "text": "Python"}], "mode": "keyword", "rerank": False}
        self.assertEqual(self.client.post("/retrieve", json=data).status_code, 401)
        response = self.client.post("/retrieve", json=data, headers=self.headers)
        self.assertEqual(response.json()["passageIds"], [7])
        data["passages"] *= 2
        self.assertEqual(self.client.post("/retrieve", json=data, headers=self.headers).status_code, 422)

    def test_classifier_unavailable_and_low_confidence(self):
        data = {"pairs": [{"requirement": "Python", "passage": "Coursework"}]}
        self.assertEqual(self.client.post("/classify-evidence", json=data, headers=self.headers).status_code, 503)
        self.app.state.engine.evidence = SimpleNamespace(predict=lambda a, b: [{"supported": 0.4, "partial": 0.3, "unknown": 0.2, "contradicted": 0.1}])
        with patch.dict(os.environ, {"EVIDENCE_THRESHOLD": "0.8"}):
            output = self.client.post("/classify-evidence", json=data, headers=self.headers).json()
        self.assertEqual(output["predictions"][0]["verdict"], "unknown")
        self.assertTrue(output["predictions"][0]["abstained"])

    def test_busy_service_does_not_infer(self):
        self.app.state.lock.acquire()
        try:
            data = {"query": "Python", "passages": [{"id": 7, "text": "Python"}]}
            self.assertEqual(self.client.post("/retrieve", json=data, headers=self.headers).status_code, 503)
        finally:
            self.app.state.lock.release()


@unittest.skipUnless(HAS_FAISS, "Install requirements-faiss.txt for FAISS parity test")
class FaissTests(unittest.TestCase):
    def test_faiss_matches_dense_and_keeps_original_ids(self):
        import numpy as np
        from retrieval import retrieve
        class Embedding:
            def encode(self, texts, **kwargs):
                return np.array([[1, 0] if "Python" in text else [0, 1] for text in texts], dtype="float32")
        class Engine:
            embedding = Embedding()
            def similarities(self, queries, texts):
                return (self.embedding.encode(queries) @ self.embedding.encode(texts).T).tolist()
        passages = [{"id": 99, "text": "Office work"}, {"id": 3, "text": "Python services"}]
        dense = retrieve(Engine(), "Python", passages, mode="dense", rerank=False)
        indexed = retrieve(Engine(), "Python", passages, mode="dense", backend="faiss", rerank=False)
        self.assertEqual(indexed["passageIds"], dense["passageIds"])
        self.assertEqual(indexed["passageIds"][0], 3)
        self.assertEqual(retrieve(Engine(), "Python", [passages[0]], mode="dense", backend="faiss", rerank=False)["passageIds"], [99])


if __name__ == "__main__":
    unittest.main()
