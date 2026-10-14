"""Dependency-free metrics. Unknown is a class; abstention is reported separately."""
import math
from ml_data import VERDICTS


def entity_metrics(expected, predicted):
    gold = {(i, *span) for i, spans in enumerate(expected) for span in spans}
    guess = {(i, *span) for i, spans in enumerate(predicted) for span in spans}
    correct = len(gold & guess)
    precision = correct / len(guess) if guess else 0.0
    recall = correct / len(gold) if gold else 0.0
    return {"precision": precision, "recall": recall,
            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
            "goldEntities": len(gold), "predictedEntities": len(guess), "correctEntities": correct}


def classification_metrics(labels, probabilities):
    if not labels or len(labels) != len(probabilities):
        raise ValueError("Expected nonempty aligned predictions")
    for row in probabilities:
        if len(row) != 4 or any(not math.isfinite(v) or not 0 <= v <= 1 for v in row) or abs(sum(row) - 1) > 1e-4:
            raise ValueError("Invalid four-class probabilities")
    actual = [max(range(4), key=lambda i: p[i]) for p in probabilities]
    expected = [VERDICTS.index(label) for label in labels]
    confusion = [[0] * 4 for _ in range(4)]
    for a, b in zip(expected, actual):
        confusion[a][b] += 1
    per_class = {}
    for i, name in enumerate(VERDICTS):
        tp = confusion[i][i]
        precision = tp / max(1, sum(row[i] for row in confusion))
        recall = tp / max(1, sum(confusion[i]))
        per_class[name] = {"precision": precision, "recall": recall, "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0}
    confidence = [max(p) for p in probabilities]
    correct = [a == b for a, b in zip(expected, actual)]
    ece = 0.0
    for bucket in range(10):
        indices = [i for i, c in enumerate(confidence) if min(9, int(c * 10)) == bucket]
        if indices:
            ece += abs(sum(confidence[i] for i in indices) - sum(correct[i] for i in indices)) / len(labels)
    selective = []
    for threshold in (0.0, 0.5, 0.7, 0.8, 0.9, 0.95):
        accepted = [i for i, c in enumerate(confidence) if c >= threshold]
        selective.append({"threshold": threshold, "coverage": len(accepted) / len(labels),
                          "accuracy": sum(correct[i] for i in accepted) / len(accepted) if accepted else None})
    return {"labels": VERDICTS, "confusion": confusion, "perClass": per_class,
            "accuracy": sum(correct) / len(labels), "macroF1": sum(m["f1"] for m in per_class.values()) / 4,
            "falseSupportedRate": sum(a != 0 and b == 0 for a, b in zip(expected, actual)) / max(1, sum(a != 0 for a in expected)),
            "unknownPredictionRate": actual.count(3) / len(actual), "ece": ece,
            "brier": sum(sum((p[j] - int(j == y)) ** 2 for j in range(4)) for p, y in zip(probabilities, expected)) / len(labels),
            "selectiveAccuracy": selective}
