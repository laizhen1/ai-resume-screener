"""Offline integration test: train/reload tiny random BERTs. No quality claim."""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    root = Path(args.output).resolve()
    if root.exists() and any(root.iterdir()):
        parser.error("Use a new empty output directory")
    root.mkdir(parents=True, exist_ok=True)
    import torch
    from transformers import BertConfig, BertModel, BertTokenizerFast, set_seed
    set_seed(42)
    torch.set_num_threads(2)
    base = root / "tiny-base"
    base.mkdir()
    # WordPiece falls back to UNK while still preserving exact word offsets.
    (base / "vocab.txt").write_text("\n".join(["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]", ".", ",", ";", "python", "docker", "java", "sql", "experience", "required", "is"]), encoding="utf-8")
    tokenizer = BertTokenizerFast(vocab_file=str(base / "vocab.txt"), do_lower_case=True)
    tokenizer.save_pretrained(base)
    BertModel(BertConfig(vocab_size=len(tokenizer), hidden_size=24, num_hidden_layers=1, num_attention_heads=2, intermediate_size=32)).save_pretrained(base)
    service = Path(__file__).resolve().parent
    repo = service.parent.parent
    for task in ("ner", "evidence"):
        subprocess.run([sys.executable, str(service / "train.py"), "--task", task,
                        "--train", str(repo / f"datasets/smoke/{task}.train.jsonl"),
                        "--validation", str(repo / f"datasets/smoke/{task}.validation.jsonl"),
                        "--model", str(base), "--output", str(root / task), "--epochs", "1", "--batch-size", "4", "--cpu"], check=True)
        subprocess.run([sys.executable, str(service / "evaluate_model.py"), "--checkpoint", str(root / task / "model"),
                        "--test", str(repo / f"datasets/smoke/{task}.test.jsonl"), "--output", str(root / f"{task}-report.json")], check=True)
    from learned import EvidenceClassifier
    classifier = EvidenceClassifier(str(root / "evidence/model"))
    scores = classifier.predict(["Python experience is required."], ["Built Python services."])
    assert abs(sum(scores[0].values()) - 1) < 1e-5
    (root / "smoke-result.json").write_text(json.dumps({"status": "passed", "trainedAndReloaded": ["ner", "evidence"], "qualityClaim": False}), encoding="utf-8")
    print("Training, held-out evaluation and reload smoke passed; random tiny models are not usable domain models.")


if __name__ == "__main__":
    main()
