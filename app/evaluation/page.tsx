"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EvaluationRunRecord } from "@/lib/domain";

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
    <section className="page-intro"><p className="eyebrow">REPRODUCIBLE EVALUATION</p><h1>Measure before making claims.</h1><p>The benchmark uses synthetic cases and reports detection quality, latency and name-counterfactual consistency for the versioned deterministic engine.</p></section>
    {error && <div className="wide-error">{error}</div>}
    <section className="evaluation-controls content-card">
      <label>Dataset size<input type="number" min={20} max={500} value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
      <button onClick={() => void run()} disabled={busy}>{busy ? "Running…" : "Run benchmark"}</button>
    </section>
    {latest && <section className="metric-grid">
      {Object.entries(latest.metrics).map(([name, value]) => <article key={name}><span>{name.replace(/([A-Z])/g, " $1")}</span><strong>{name.toLowerCase().includes("latency") ? `${value} ms` : value}</strong></article>)}
    </section>}
    <section className="content-card run-history"><h2>Evaluation history</h2>{runs.length ? <table><thead><tr><th>Date</th><th>Engine</th><th>Cases</th><th>Precision</th><th>Recall</th><th>F1</th><th>Consistency</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{new Date(run.createdAt).toLocaleString()}</td><td>{run.engineVersion}</td><td>{run.datasetSize}</td><td>{run.metrics.precision}</td><td>{run.metrics.recall}</td><td>{run.metrics.f1}</td><td>{run.metrics.counterfactualConsistency}</td></tr>)}</tbody></table> : <p className="empty">Run the first benchmark to establish a baseline.</p>}</section>
  </main>;
}
