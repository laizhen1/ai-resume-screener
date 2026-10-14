"""Validated, document-grouped JSONL data contracts shared by training and evaluation."""
import hashlib
import json
from pathlib import Path

VERDICTS = ["supported", "partial", "contradicted", "unknown"]
ENTITY_TYPES = ["SKILL", "TOOL", "QUALIFICATION", "JOB_TITLE", "DATE"]
NER_LABELS = ["O"] + [f"{prefix}-{name}" for name in ENTITY_TYPES for prefix in ("B", "I")]


def fingerprint(text):
    return hashlib.sha256(" ".join(text.lower().split()).encode()).hexdigest()


def load_rows(path, task):
    rows = [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        raise ValueError("Dataset must not be empty")
    ids = set()
    for row in rows:
        for key in ("id", "document_id", "group_id"):
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f"Every row requires {key}")
        if row["id"] in ids:
            raise ValueError("Duplicate row ID")
        ids.add(row["id"])
        text = row.get("text" if task == "ner" else "passage")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Missing source text")
        if task == "ner":
            if not isinstance(row.get("entities"), list):
                raise ValueError("NER requires entities, including [] for negative examples")
            end = 0
            for entity in sorted(row["entities"], key=lambda e: e["start"]):
                a, b = entity["start"], entity["end"]
                if type(a) is not int or type(b) is not int or not (end <= a < b <= len(text)):
                    raise ValueError("Entity spans must be non-overlapping Python character offsets")
                if entity["label"] not in ENTITY_TYPES or text[a:b] != entity.get("text"):
                    raise ValueError("Unknown entity label or source quote mismatch")
                end = b
        else:
            if row.get("label") not in VERDICTS or not isinstance(row.get("requirement"), str) or not row["requirement"].strip():
                raise ValueError("Evidence rows require requirement and a four-class label")
    return rows


def identity(rows, task):
    return {"ids": sorted({r["id"] for r in rows}),
            "documents": sorted({r["document_id"] for r in rows}),
            "groups": sorted({r["group_id"] for r in rows}),
            "texts": sorted({fingerprint(r["text" if task == "ner" else "passage"]) for r in rows})}


def ensure_disjoint(left, right):
    for key in ("ids", "documents", "groups", "texts"):
        if set(left[key]) & set(right[key]):
            raise ValueError(f"Dataset leakage: overlapping {key}")


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def encode_row(tokenizer, row, task, max_length=512):
    # Reject truncation instead of quietly losing labels/evidence. Curate shorter passages.
    if task == "evidence":
        encoded = tokenizer(row["requirement"], row["passage"], truncation=False)
        encoded["labels"] = VERDICTS.index(row["label"])
    else:
        encoded = tokenizer(row["text"], return_offsets_mapping=True, truncation=False)
        offsets = encoded.pop("offset_mapping")
        labels = [-100 if a == b else 0 for a, b in offsets]
        for entity in row["entities"]:
            indices = [i for i, (a, b) in enumerate(offsets) if a != b and a < entity["end"] and b > entity["start"]]
            if not indices or offsets[indices[0]][0] != entity["start"] or offsets[indices[-1]][1] != entity["end"]:
                raise ValueError(f"Entity does not align with tokenizer boundaries: {row['id']}")
            for n, i in enumerate(indices):
                labels[i] = NER_LABELS.index(f"{'B' if n == 0 else 'I'}-{entity['label']}")
        encoded["labels"] = labels
    if len(encoded["input_ids"]) > max_length:
        raise ValueError(f"Row {row['id']} exceeds {max_length} tokens; split and relabel it explicitly")
    return dict(encoded)


def bio_spans(labels, offsets=None):
    """Decode BIO tags into exact spans; an orphan I starts a new entity."""
    spans, current = [], None
    for i, label in enumerate([*labels, "O"]):
        prefix, _, kind = label.partition("-")
        if current and (prefix != "I" or current[2] != kind):
            spans.append(current)
            current = None
        if prefix in ("B", "I"):
            a, b = offsets[i] if offsets else (i, i + 1)
            current = (current[0], b, kind) if current else (a, b, kind)
    return spans
