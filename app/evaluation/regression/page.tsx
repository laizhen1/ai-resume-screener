"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EvaluationRunRecord } from "@/lib/domain";

const FEATURED_METRICS = [
  ["contextualAccuracy", "Contextual accuracy", "Correct supported, partial, contradicted or unknown verdicts."],
  ["precision", "Support precision", "How often a supported verdict is actually expected."],
  ["recall", "Support recall", "How much expected supporting evidence the engine recovers."],
  ["negationFalsePositiveRate", "Negation false positives", "Negated experience incorrectly presented as supported; lower is better."],
  ["aspirationalFalsePositiveRate", "Learning false positives", "Learning-only claims incorrectly presented as supported; lower is better."],
  ["abstentionRate", "Abstention rate", "Requirements intentionally left unknown when evidence is insufficient."],
  ["evidenceCoverage", "Evidence coverage", "Resolved verdicts carrying exact source evidence."],
  ["brierScore", "Brier score", "Confidence error for verdict correctness; lower is better."]
] as const;

function formatMetric(name: string, value: number | undefined) {
  if (value === undefined) return "—";
  if (name.toLowerCase().includes("latency")) return `${value} ms`;
  return `${Math.round(value * 1000) / 10}%`;
}

export default function EvaluationPage() {
  const [runs, setRuns] = useState<EvaluationRunRecord[]>([]);
  const [size, setSize] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/workspace/evaluations");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setRuns(data.evaluations);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/evaluations", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => setRuns(data.evaluations))
      .catch((caught) => { if (caught.name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load evaluations."); });
    return () => controller.abort();
  }, []);

  async function run() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/workspace/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Evaluation failed."); }
    finally { setBusy(false); }
  }

  const latest = runs[0];
  return <main className="app-shell">
    <header className="app-header"><Link className="brand-link" href="/">Open Resume Lab</Link><nav className="app-nav"><Link href="/workspace">Workspace</Link><Link href="/evaluation">Evaluation</Link></nav></header>
    <section className="page-intro"><p className="eyebrow">ADVERSARIAL EVALUATION · DATASET V2</p><h1>Measure before making claims.</h1><p>The versioned benchmark tests exact skills, aliases, negation, learning-only language, ambiguous terms, missing evidence, name counterfactuals and formatting changes. It is a regression suite—not proof of hiring validity or fairness.</p></section>
    {error && <div className="wide-error">{error}</div>}
    <p className="experiment-note" style={{ maxWidth: 1112, margin: "16px auto" }}>This suite repeats ten fixed fixtures. Increasing executions does not add unique examples. Use the experiment lab for held-out comparisons.</p>
    <section className="evaluation-controls content-card">
      <label>Fixture executions<input type="number" min={20} max={500} value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
      <button onClick={() => void run()} disabled={busy}>{busy ? "Running…" : "Run benchmark"}</button>
    </section>
    {latest && <>
      <section className="metric-grid">
        {FEATURED_METRICS.map(([name, label]) => <article key={name}><span>{label}</span><strong>{formatMetric(name, latest.metrics[name])}</strong></article>)}
      </section>
      <section className="metric-guidance content-card"><h2>How to read these results</h2><div>{FEATURED_METRICS.map(([name, label, description]) => <article key={name}><strong>{label}</strong><p>{description}</p></article>)}</div><p className="method-note">Confidence is a rule-strength estimate evaluated with Brier score; it is not the probability that a candidate is qualified. An abstention is a deliberate “unknown,” not an error by itself.</p></section>
    </>}
    <section className="content-card run-history"><h2>Evaluation history</h2>{runs.length ? <table><thead><tr><th>Date</th><th>Engine</th><th>Cases</th><th>Context</th><th>Precision</th><th>Recall</th><th>Negation FP</th><th>Consistency</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{new Date(run.createdAt).toLocaleString()}</td><td>{run.engineVersion}</td><td>{run.datasetSize}</td><td>{formatMetric("contextualAccuracy", run.metrics.contextualAccuracy)}</td><td>{formatMetric("precision", run.metrics.precision)}</td><td>{formatMetric("recall", run.metrics.recall)}</td><td>{formatMetric("negationFalsePositiveRate", run.metrics.negationFalsePositiveRate)}</td><td>{formatMetric("counterfactualConsistency", run.metrics.counterfactualConsistency)}</td></tr>)}</tbody></table> : <p className="empty">Run the first benchmark to establish a baseline.</p>}</section>
  </main>;
}
