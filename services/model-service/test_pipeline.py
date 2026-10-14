import unittest
from pipeline import analyze, decide, probability_winner


def probabilities(label):
    return {key: 0.96 if key == label else 0.02 for key in ["entailment", "neutral", "contradiction"]}


def candidate(delivery="neutral", learning="neutral", passage_id=0):
    return {"passageId": passage_id, "nli": probabilities(delivery), "learningNli": probabilities(learning)}


class FakeEngine:
    def similarities(self, queries, texts):
        return [[0.9, 0.8, 0.7, 0.6] for _ in queries]

    def rerank(self, query, texts):
        return [0.1, 0.2, 0.3, 0.9]

    def nli(self, texts, hypothesis):
        learning = "limited exposure" in hypothesis
        return [probabilities("entailment" if text == "The applicant states in their resume: Built Python services" and not learning else "neutral") for text in texts]


class PipelineTests(unittest.TestCase):
    def test_unrelated_contradiction_cannot_cancel_support(self):
        unrelated = {**candidate("contradiction", passage_id=1), "mentionsRequirement": False}
        self.assertEqual(decide([unrelated])["verdict"], "unknown")
        self.assertEqual(decide([candidate("entailment"), unrelated])["verdict"], "supported")

    def test_resume_context_is_only_added_for_inference(self):
        class ContextEngine:
            def similarities(self, queries, texts):
                self.retrieved = texts
                return [[1.0]]

            def rerank(self, query, texts):
                self.reranked = texts
                return [1.0]

            def nli(self, texts, hypothesis):
                self.classified.append(texts)
                return [probabilities("neutral")]

        engine = ContextEngine()
        engine.classified = []
        original = "- Built TypeScript services."
        passages = [{"id": 7, "text": original}]
        output = analyze(engine, [{"skill": "typescript"}], passages, True)
        self.assertEqual(engine.retrieved, [original])
        self.assertEqual(engine.reranked, [original])
        self.assertEqual(passages, [{"id": 7, "text": original}])
        self.assertEqual(engine.classified, [[f"The applicant states in their resume: {original}"]] * 4)
        self.assertEqual(output["reranked"][0]["passageId"], 7)

    def test_uncertain_and_invalid_probabilities(self):
        self.assertEqual(probability_winner({"entailment": 0.6, "neutral": 0.3, "contradiction": 0.1}), "neutral")
        with self.assertRaises(ValueError):
            probability_winner({"LABEL_0": 0.9})
        with self.assertRaises(ValueError):
            probability_winner({"entailment": 0.9, "neutral": 0.9, "contradiction": 0.9})

    def test_learning_is_partial_not_contradicted(self):
        self.assertEqual(decide([candidate("contradiction", "entailment")])["verdict"], "partial")

    def test_conflicting_passages_abstain(self):
        result = decide([candidate("entailment"), candidate("contradiction", passage_id=1)])
        self.assertEqual(result["verdict"], "unknown")

    def test_empty_evidence_does_not_claim_support(self):
        self.assertEqual(decide([])["verdict"], "unknown")
        self.assertIsNone(decide([])["passageId"])

    def test_reranking_changes_selected_evidence_without_label_leakage(self):
        passages = [{"id": i, "text": text} for i, text in enumerate(["Python event", "Team uses Python", "Office duties", "Built Python services"])]
        output = analyze(FakeEngine(), [{"skill": "python"}], passages, include_baseline=True)
        self.assertEqual(output["baseline"][0]["verdict"], "unknown")
        self.assertEqual(output["reranked"][0]["verdict"], "supported")
        self.assertEqual(output["reranked"][0]["passageId"], 3)
        self.assertEqual(len(output["baseline"][0]["candidates"]), 3)
        self.assertEqual(len(output["reranked"][0]["candidates"]), 3)


if __name__ == "__main__":
    unittest.main()
