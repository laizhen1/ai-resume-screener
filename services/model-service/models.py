import os
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline


class Models:
    def __init__(self):
        self.device = os.getenv("MODEL_DEVICE", "cpu")
        self.ids = {
            "embedding": os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
            "reranker": os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"),
            "nli": os.getenv("NLI_MODEL", "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"),
        }
        self.embedding = SentenceTransformer(self.ids["embedding"], device=self.device, trust_remote_code=False)
        self.reranker = CrossEncoder(self.ids["reranker"], device=self.device, trust_remote_code=False, max_length=512)
        self.tokenizer = AutoTokenizer.from_pretrained(self.ids["nli"], trust_remote_code=False)
        self.classifier = AutoModelForSequenceClassification.from_pretrained(self.ids["nli"], trust_remote_code=False).to(self.device).eval()
        self.labels = {int(k): v.lower() for k, v in self.classifier.config.id2label.items()}
        if set(self.labels.values()) != {"entailment", "neutral", "contradiction"}:
            raise ValueError("Configure an NLI checkpoint with entailment/neutral/contradiction id2label names")
        ner_model = os.getenv("NER_MODEL", "").strip()
        self.ner = pipeline("token-classification", model=ner_model, aggregation_strategy="simple", device=self.device, trust_remote_code=False) if ner_model else None
        self.ids["ner"] = ner_model or None
        # Save resolved commits when available, alongside package versions in reports.
        self.revisions = {
            "embedding": getattr(self.embedding[0].auto_model.config, "_commit_hash", None),
            "reranker": getattr(self.reranker.model.config, "_commit_hash", None),
            "nli": getattr(self.classifier.config, "_commit_hash", None),
            "ner": getattr(self.ner.model.config, "_commit_hash", None) if self.ner else None,
        }

    def similarities(self, queries, passages):
        q = self.embedding.encode(queries, normalize_embeddings=True, show_progress_bar=False)
        p = self.embedding.encode(passages, normalize_embeddings=True, show_progress_bar=False)
        return (q @ p.T).clip(-1, 1).tolist()

    def rerank(self, query, passages):
        return self.reranker.predict([(query, p) for p in passages], show_progress_bar=False).tolist()

    def nli(self, premises, hypothesis):
        batch = self.tokenizer(premises, [hypothesis] * len(premises), padding=True, truncation="only_first", max_length=512, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            probabilities = self.classifier(**batch).logits.softmax(dim=-1).cpu().tolist()
        return [{self.labels[i]: float(score) for i, score in enumerate(row)} for row in probabilities]

    def entities(self, passages):
        if not self.ner:
            return []
        entities = []
        for passage in passages:
            for entity in self.ner(passage["text"]):
                # Return JS UTF-16 offsets, including for text containing emoji.
                start, end = int(entity["start"]), int(entity["end"])
                entities.append({"passageId": passage["id"], "label": entity["entity_group"],
                                 "start": len(passage["text"][:start].encode("utf-16-le")) // 2,
                                 "end": len(passage["text"][:end].encode("utf-16-le")) // 2,
                                 "text": passage["text"][start:end], "score": float(entity["score"])})
        return entities[:300]
