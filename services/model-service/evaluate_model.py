"""Evaluate a trained checkpoint on a disjoint test split, with per-case errors."""
import argparse
import json
import re
from pathlib import Path
from time import perf_counter
from ml_data import NER_LABELS, VERDICTS, bio_spans, encode_row, ensure_disjoint, file_hash, identity, load_rows
from ml_metrics import classification_metrics, entity_metrics


def evaluate_ner(checkpoint, rows, manifest):
    import torch
    from transformers import AutoTokenizer, AutoModelForTokenClassification
    tokenizer = AutoTokenizer.from_pretrained(checkpoint, use_fast=True, trust_remote_code=False)
    model = AutoModelForTokenClassification.from_pretrained(checkpoint, trust_remote_code=False).eval()
    if [model.config.id2label[i] for i in range(len(NER_LABELS))] != NER_LABELS:
        raise ValueError("Unexpected NER checkpoint label mapping")
    predictions, baseline, expected, cases = [], [], [], []
    for row in rows:
        encode_row(tokenizer, row, "ner", min(512, model.config.max_position_embeddings))
        inputs = tokenizer(row["text"], return_offsets_mapping=True, return_tensors="pt")
        offsets = inputs.pop("offset_mapping")[0].tolist()
        started = perf_counter()
        with torch.inference_mode():
            tags = model(**inputs).logits.argmax(dim=-1)[0].tolist()
        valid = [(model.config.id2label[tag], offset) for tag, offset in zip(tags, offsets) if offset[0] != offset[1]]
        predicted = bio_spans([v[0] for v in valid], [v[1] for v in valid])
        gold = [(e["start"], e["end"], e["label"]) for e in row["entities"]]
        dictionary = set()
        for text, label in manifest.get("dictionaryBaseline", []):
            for match in re.finditer(r"(?<!\w)" + re.escape(text) + r"(?!\w)", row["text"], re.I):
                dictionary.add((match.start(), match.end(), label))
        predictions.append(predicted)
        baseline.append(list(dictionary))
        expected.append(gold)
        cases.append({"id": row["id"], "expected": gold, "predicted": predicted, "baseline": sorted(dictionary),
                      "correct": set(gold) == set(predicted), "latencyMs": (perf_counter() - started) * 1000})
    return {"model": entity_metrics(expected, predictions), "dictionaryBaseline": entity_metrics(expected, baseline), "cases": cases}


def evaluate_evidence(checkpoint, rows, baseline_path=None, with_nli=False):
    from learned import EvidenceClassifier
    classifier = EvidenceClassifier(checkpoint)
    probabilities, cases = [], []
    for row in rows:
        started = perf_counter()
        scores = classifier.predict([row["requirement"]], [row["passage"]])[0]
        probabilities.append([scores[label] for label in VERDICTS])
        actual = max(scores, key=scores.get)
        cases.append({"id": row["id"], "expected": row["label"], "actual": actual, "probabilities": scores,
                      "challenge": row.get("challenge", "unspecified"), "correct": actual == row["label"],
                      "latencyMs": (perf_counter() - started) * 1000})
    expected = [r["label"] for r in rows]
    result = {"model": classification_metrics(expected, probabilities), "cases": cases}
    if baseline_path:
        exported = json.loads(Path(baseline_path).read_text(encoding="utf-8"))
        baseline = {row["id"]: row["actual"] for row in exported["predictions"]}
        if len(baseline) != len(rows) or set(baseline) != {r["id"] for r in rows}:
            raise ValueError("Baseline must cover exactly the test IDs")
        values = [[float(baseline[r["id"]] == v) for v in VERDICTS] for r in rows]
        result["rulesBaseline"] = classification_metrics(expected, values)
        result["rulesBaseline"]["probabilityNote"] = "One-hot deterministic verdicts; calibration metrics are not probabilistic confidence."
        for case in cases:
            case["rulesActual"] = baseline[case["id"]]
    if with_nli:
        from models import Models
        from pipeline import decide
        engine = Models()
        values = []
        for row, case in zip(rows, cases):
            skill = row.get("skill")
            if not skill:
                raise ValueError("NLI comparison requires an explicit skill field")
            p = row["passage"]
            actual = decide([{"passageId": 0,
                              "nli": engine.nli([p], f"The applicant has experience with {skill}.")[0],
                              "learningNli": engine.nli([p], f"The applicant is learning or has limited exposure to {skill}.")[0]}])["verdict"]
            values.append([float(actual == v) for v in VERDICTS])
            case["nliActual"] = actual
        result["nliBaseline"] = classification_metrics(expected, values)
        result["nliBaseline"]["probabilityNote"] = "One-hot final NLI verdicts, not four-class posterior probabilities."
    result["slices"] = {challenge: classification_metrics([r["label"] for r in rows if r.get("challenge", "unspecified") == challenge],
                         [p for r, p in zip(rows, probabilities) if r.get("challenge", "unspecified") == challenge])
                         for challenge in sorted({r.get("challenge", "unspecified") for r in rows})}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--test", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rules-baseline")
    parser.add_argument("--with-nli", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((Path(args.checkpoint) / "training-manifest.json").read_text(encoding="utf-8"))
    task = manifest["task"]
    rows = load_rows(args.test, task)
    if args.rules_baseline:
        baseline = json.loads(Path(args.rules_baseline).read_text(encoding="utf-8"))
        if baseline["datasetHash"] != file_hash(args.test):
            raise ValueError("Rules baseline was generated from a different dataset")
    test_id = identity(rows, task)
    ensure_disjoint(manifest["train"], test_id)
    ensure_disjoint(manifest["validation"], test_id)
    result = evaluate_ner(args.checkpoint, rows, manifest) if task == "ner" else evaluate_evidence(args.checkpoint, rows, args.rules_baseline, args.with_nli)
    result.update({"task": task, "testSha256": file_hash(args.test), "checkpoint": args.checkpoint,
                   "trainingManifestSha256": file_hash(Path(args.checkpoint) / "training-manifest.json"),
                   "annotationStatus": manifest["annotationStatus"], "evaluationDevice": "cpu"})
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result["model"], indent=2))


if __name__ == "__main__":
    main()
