import json
import tempfile
import unittest
from pathlib import Path
from ml_data import bio_spans, encode_row, ensure_disjoint, identity, load_rows, NER_LABELS
from ml_metrics import entity_metrics, classification_metrics
from learned import evidence_verdict
from retrieval import retrieve, fuse
from evaluate_retrieval import ranking_metrics


class FakeTokenizer:
    def __call__(self, text, **kwargs):
        return {"input_ids": [1, 2, 3, 4], "offset_mapping": [(0, 0), (0, 3), (3, 6), (0, 0)]}


class MlTests(unittest.TestCase):
    def test_span_alignment_and_truncation(self):
        row = {"id": "x", "text": "Python", "entities": [{"start": 0, "end": 6, "label": "SKILL"}]}
        self.assertEqual(encode_row(FakeTokenizer(), row, "ner")["labels"], [-100, NER_LABELS.index("B-SKILL"), NER_LABELS.index("I-SKILL"), -100])
        with self.assertRaises(ValueError):
            encode_row(FakeTokenizer(), row, "ner", 3)
        row["entities"][0]["start"] = 1
        with self.assertRaises(ValueError):
            encode_row(FakeTokenizer(), row, "ner")

    def test_leakage_by_document_group_and_normalized_text(self):
        left = identity([{"id": "a", "document_id": "a", "group_id": "template", "text": "Uses Python"}], "ner")
        for group, text in [("template", "Other text"), ("other", " USES  python ")]:
            right = identity([{"id": "b", "document_id": "b", "group_id": group, "text": text}], "ner")
            with self.assertRaises(ValueError):
                ensure_disjoint(left, right)

    def test_invalid_annotations_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data.jsonl"
            row = {"id": "x", "document_id": "x", "group_id": "x", "text": "Python", "entities": [{"start": 0, "end": 6, "text": "Java", "label": "SKILL"}]}
            path.write_text(json.dumps(row), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_rows(path, "ner")

    def test_exact_entity_metrics_and_bio(self):
        self.assertEqual(bio_spans(["B-SKILL", "I-SKILL", "O", "I-TOOL"]), [(0, 2, "SKILL"), (3, 4, "TOOL")])
        result = entity_metrics([[(0, 6, "SKILL")]], [[(0, 5, "SKILL")]])
        self.assertEqual(result["f1"], 0)

    def test_evidence_calibration_and_abstention(self):
        result = classification_metrics(["supported", "unknown"], [[0.9, 0.1, 0, 0], [0.8, 0, 0, 0.2]])
        self.assertEqual(result["accuracy"], 0.5)
        self.assertEqual(result["falseSupportedRate"], 1)
        self.assertAlmostEqual(result["ece"], 0.45)
        self.assertEqual(result["selectiveAccuracy"][-1]["accuracy"], None)
        result = evidence_verdict({"supported": 0.4, "partial": 0.3, "contradicted": 0.1, "unknown": 0.2})
        self.assertTrue(result["abstained"])
        self.assertEqual(result["verdict"], "unknown")

    def test_scoped_keyword_retrieval_and_empty_match(self):
        rows = [{"id": 19, "text": "Built Python services"}, {"id": 45, "text": "Customer research"}]
        self.assertEqual(retrieve(None, "Python", rows, mode="keyword", rerank=False)["passageIds"], [19])
        self.assertEqual(retrieve(None, "Kubernetes", rows, mode="keyword", rerank=False)["passageIds"], [])
        with self.assertRaises(ValueError):
            retrieve(None, "Python", [rows[0], rows[0]], mode="keyword")

    def test_fusion_rerank_and_metrics(self):
        order, _ = fuse([[2, 1], [1, 2]])
        self.assertEqual(order, [1, 2])
        class Engine:
            def similarities(self, queries, texts): return [[0.1, 0.9]]
            def rerank(self, query, texts): return [0.8, 0.2]
        output = retrieve(Engine(), "Python", [{"id": 1, "text": "Python"}, {"id": 2, "text": "Backend"}], mode="dense", rerank_k=1)
        self.assertEqual(output["passageIds"], [2])
        result = ranking_metrics([7, 3], [3, 9], 2)
        self.assertEqual(result["recallAtK"], 0.5)
        self.assertEqual(result["mrrAtK"], 0.5)


if __name__ == "__main__":
    unittest.main()
