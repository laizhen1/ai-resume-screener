"""Local four-class inference, with explicit uncertainty abstention."""
import math
from ml_data import VERDICTS


class EvidenceClassifier:
    def __init__(self, checkpoint, device="cpu"):
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        self.tokenizer = AutoTokenizer.from_pretrained(checkpoint, use_fast=True, trust_remote_code=False)
        self.model = AutoModelForSequenceClassification.from_pretrained(checkpoint, trust_remote_code=False).to(device).eval()
        self.device = device
        self.labels = {int(k): v for k, v in self.model.config.id2label.items()}
        if set(self.labels.values()) != set(VERDICTS) or len(self.labels) != 4:
            raise ValueError("Evidence checkpoint must expose all four semantic verdict labels")
        self.revision = getattr(self.model.config, "_commit_hash", None)

    def predict(self, requirements, passages):
        import torch
        if not requirements or len(requirements) != len(passages):
            raise ValueError("Requirements and passages must be nonempty aligned pairs")
        encoded = self.tokenizer(requirements, passages, padding=True, truncation=False, return_tensors="pt")
        if encoded["input_ids"].shape[1] > min(512, self.model.config.max_position_embeddings):
            raise ValueError("Evidence input exceeds the checkpoint context window")
        with torch.inference_mode():
            values = self.model(**encoded.to(self.device)).logits.softmax(dim=-1).cpu().tolist()
        return [{self.labels[i]: float(value) for i, value in enumerate(row)} for row in values]


def evidence_verdict(probabilities, threshold=0.8):
    if not math.isfinite(threshold) or not 0 <= threshold <= 1:
        raise ValueError("Evidence threshold must be between zero and one")
    if set(probabilities) != set(VERDICTS) or any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities.values()) or abs(sum(probabilities.values()) - 1) > 1e-4:
        raise ValueError("Invalid evidence probabilities")
    label = max(probabilities, key=probabilities.get)
    abstained = probabilities[label] < threshold
    return {"verdict": "unknown" if abstained else label, "abstained": abstained, "probabilities": probabilities}
