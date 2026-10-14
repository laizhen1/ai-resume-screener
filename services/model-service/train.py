"""Train a local NER or requirement/evidence checkpoint; test data is never read here."""
import argparse
import json
from importlib.metadata import version
from pathlib import Path
from ml_data import NER_LABELS, VERDICTS, bio_spans, encode_row, ensure_disjoint, file_hash, identity, load_rows
from ml_metrics import classification_metrics, entity_metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", choices=["ner", "evidence"], required=True)
    parser.add_argument("--train", required=True)
    parser.add_argument("--validation", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="distilbert/distilbert-base-uncased")
    parser.add_argument("--revision", default="main")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cpu", action="store_true")
    args = parser.parse_args()
    if args.epochs <= 0 or args.batch_size <= 0 or args.learning_rate <= 0:
        parser.error("Training parameters must be positive")
    output = Path(args.output)
    if output.exists() and any(output.iterdir()):
        parser.error("Output directory must be empty; preserve previous runs")
    train, validation = load_rows(args.train, args.task), load_rows(args.validation, args.task)
    train_id, validation_id = identity(train, args.task), identity(validation, args.task)
    ensure_disjoint(train_id, validation_id)
    if args.task == "evidence" and {r["label"] for r in train} != set(VERDICTS):
        parser.error("Training data must include all four verdicts")
    import numpy as np
    from transformers import (AutoTokenizer, AutoModelForTokenClassification, AutoModelForSequenceClassification,
                              DataCollatorForTokenClassification, DataCollatorWithPadding, Trainer, TrainingArguments, set_seed)
    set_seed(args.seed)
    labels = NER_LABELS if args.task == "ner" else VERDICTS
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.revision, use_fast=True, trust_remote_code=False)
    model_class = AutoModelForTokenClassification if args.task == "ner" else AutoModelForSequenceClassification
    model = model_class.from_pretrained(args.model, revision=args.revision, num_labels=len(labels),
                                       id2label=dict(enumerate(labels)), label2id={v: i for i, v in enumerate(labels)}, trust_remote_code=False)
    max_length = min(512, getattr(model.config, "max_position_embeddings", 512))
    encoded_train = [encode_row(tokenizer, r, args.task, max_length) for r in train]
    encoded_validation = [encode_row(tokenizer, r, args.task, max_length) for r in validation]

    def metrics(prediction):
        logits, gold = prediction
        if args.task == "ner":
            predicted = logits.argmax(axis=-1)
            pairs = [([labels[int(y)] for y in ys if y != -100], [labels[int(p)] for p, y in zip(ps, ys) if y != -100]) for ps, ys in zip(predicted, gold)]
            result = entity_metrics([bio_spans(a) for a, _ in pairs], [bio_spans(b) for _, b in pairs])
            return {k: result[k] for k in ("precision", "recall", "f1")}
        probabilities = np.exp(logits - logits.max(axis=-1, keepdims=True))
        probabilities /= probabilities.sum(axis=-1, keepdims=True)
        result = classification_metrics([labels[int(y)] for y in gold], probabilities.tolist())
        return {k: result[k] for k in ("accuracy", "macroF1", "falseSupportedRate", "ece", "brier")}

    trainer = Trainer(model=model, args=TrainingArguments(
        output_dir=str(output / "checkpoints"), num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size, per_device_eval_batch_size=args.batch_size,
        learning_rate=args.learning_rate, weight_decay=0.01, seed=args.seed, data_seed=args.seed,
        eval_strategy="epoch", save_strategy="epoch", load_best_model_at_end=True, save_total_limit=1,
        metric_for_best_model="f1" if args.task == "ner" else "macroF1", greater_is_better=True,
        report_to="none", use_cpu=args.cpu, dataloader_pin_memory=not args.cpu),
        train_dataset=encoded_train, eval_dataset=encoded_validation, processing_class=tokenizer,
        data_collator=(DataCollatorForTokenClassification(tokenizer) if args.task == "ner" else DataCollatorWithPadding(tokenizer)),
        compute_metrics=metrics)
    trainer.train()
    checkpoint = output / "model"
    trainer.save_model(str(checkpoint))
    tokenizer.save_pretrained(checkpoint)
    manifest = {"version": "resume-training-v1", "task": args.task, "arguments": vars(args),
                "baseRevision": getattr(model.config, "_commit_hash", None), "labels": labels,
                "packages": {p: version(p) for p in ("torch", "transformers", "accelerate")},
                "train": {"sha256": file_hash(args.train), **train_id},
                "validation": {"sha256": file_hash(args.validation), **validation_id},
                "validationMetrics": trainer.evaluate(), "testEvaluated": False,
                "annotationStatus": "User-supplied labels; bundled examples are synthetic smoke fixtures, not a validated corpus."}
    if args.task == "ner":
        manifest["dictionaryBaseline"] = sorted({(e["text"], e["label"]) for r in train for e in r["entities"]})
    (checkpoint / "training-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Saved {checkpoint}. Evaluate on a separately curated test split before use.")


if __name__ == "__main__":
    main()
