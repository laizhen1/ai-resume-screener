"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EvaluationRunRecord } from "@/lib/domain";
import { VERDICTS, type Feedback, type Pipeline, type Split } from "@/lib/experiments/types";

const names: Record<Pipeline, string> = { rules: "Rules baseline", llm: "LLM only", hybrid: "Hybrid - verified evidence" };
const percent = (value: number | null) => value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
const latency = (value: number | null) => value === null ? "N/A" : value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value.toFixed(1)} ms`;
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Highlight({ text, quote }: { text: string; quote: string | null }) {
  const start = quote ? text.indexOf(quote) : -1;
  return <pre className="source-text">{start < 0 || !quote ? text : <>{text.slice(0, start)}<mark>{quote}</mark>{text.slice(start + quote.length)}</>}</pre>;
}

export default function EvaluationPage() {
  const [runs, setRuns] = useState<EvaluationRunRecord[]>([]);
  const [runId, setRunId] = useState("");
  const [split, setSplit] = useState<Split>("heldout");
  const [includeModel, setIncludeModel] = useState(false);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 24 });
  const [error, setError] = useState("");
  const [pipeline, setPipeline] = useState<Pipeline>("rules");
  const [failuresOnly, setFailuresOnly] = useState(true);
  const [caseId, setCaseId] = useState("");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [verdict, setVerdict] = useState<typeof VERDICTS[number]>("unknown");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const active = runs.find(run => run.id === runId) ?? runs[0];
  const report = active?.report;
  const selected = report?.results.find(row => row.pipeline === pipeline && row.caseId === caseId);
  const example = report?.examples.find(item => item.id === caseId);
  const [skill, setSkill] = useState("");
  const prediction = selected?.predictions.find(item => item.skill === skill) ?? selected?.predictions[0];
  const summary = report?.summaries.find(item => item.pipeline === pipeline);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/workspace/experiments", { signal: abort.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setRuns(data.runs);
    }).catch(caught => { if (caught.name !== "AbortError") setError(caught.message); });
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    const abort = new AbortController();
    fetch(`/api/workspace/experiments/feedback?runId=${active.id}`, { signal: abort.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setFeedback(data.feedback);
    }).catch(caught => { if (caught.name !== "AbortError") setError(caught.message); });
    return () => abort.abort();
  }, [active]);

  async function run() {
    setBusy(true); setError(""); setNotice(""); setProgress({ completed: 0, total: split === "heldout" ? 24 : 10 });
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/workspace/experiments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ split, includeModel, ...(model.trim() ? { model: model.trim() } : {}) }),
        signal: controller.current.signal
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
      const reader = response.body?.getReader(); if (!reader) throw new Error("This browser cannot read the experiment stream.");
      const decoder = new TextDecoder(); let buffer = ""; let completed = false;
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const message = JSON.parse(line);
          if (message.type === "progress") setProgress({ completed: message.completed, total: message.total });
          if (message.type === "error") throw new Error(message.error);
          if (message.type === "complete") {
            setRuns(previous => [message.run, ...previous]); setRunId(message.run.id); setCaseId(""); setFeedback([]); completed = true;
          }
        }
        if (chunk.done) break;
      }
      if (!completed) throw new Error("The stream ended before the report was saved. Please retry.");
    } catch (caught) {
      setError(caught instanceof Error && caught.name === "AbortError" ? "Run cancelled. No completed report was received." : caught instanceof Error ? caught.message : "Comparison failed.");
    } finally { setBusy(false); controller.current = null; }
  }
  function chooseCase(id: string) { setCaseId(id); setSkill(""); setReason(""); setNotice(""); setVerdict("unknown"); }
  async function saveFeedback() {
    if (!active || !prediction) return;
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/workspace/experiments/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: active.id, caseId, skill: prediction.skill, pipeline, verdict, reason })
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setFeedback(previous => [data.feedback, ...previous]); setReason(""); setNotice("Review saved. Original labels and metrics are unchanged.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save review."); }
    finally { setSaving(false); }
  }
  const rows = report?.results.filter(row => row.pipeline === pipeline && (!failuresOnly || row.error || row.predictions.some(p => p.actual !== p.expected || p.missing || (p.actual !== "unknown" && !p.citationValid)))) ?? [];
  return <main className="app-shell experiment-shell">
    <header className="app-header"><Link className="brand-link" href="/">Open Resume Lab</Link><nav className="app-nav"><Link href="/workspace">Workspace</Link><Link href="/evaluation" aria-current="page">Evaluation</Link><Link href="/evaluation/regression">Regression suite</Link></nav></header>
    <section className="page-intro experiment-intro"><p className="eyebrow">EXPERIMENT LAB</p><h1>Put the evidence to the test.</h1><p>Compare rules, raw model judgments, and verified AI evidence on the same frozen examples.</p></section>
    <div className="experiment-body">
      <section className="content-card">
        <div className="experiment-controls">
          <label>Dataset split<select value={split} disabled={busy} onChange={event => setSplit(event.target.value as Split)}><option value="heldout">Held-out - 24 unique cases</option><option value="development">Development - 10 unique cases</option></select></label>
          <label className="checkbox-label"><input type="checkbox" checked={includeModel} disabled={busy} onChange={event => setIncludeModel(event.target.checked)} />Include local LLM + hybrid</label>
          {includeModel && <label>Ollama model<input placeholder="Use server configuration" value={model} disabled={busy} onChange={event => setModel(event.target.value)} /></label>}
          <button className="primary" disabled={busy} onClick={() => void run()}>{busy ? "Running experiment..." : "Run comparison"}</button>
          {busy && <button className="secondary" onClick={() => controller.current?.abort()}>Cancel</button>}
        </div>
        <p className="experiment-note">{includeModel ? "Uses your local Ollama model. Each example may take up to two minutes; progress appears after each example. Failed model calls are disclosed and stop further model requests for this run." : "Rules run locally without a model. Enable the comparison to measure LLM and hybrid results."}</p>
        {busy && <div role="status"><progress max={progress.total} value={progress.completed} aria-label="Experiment progress" /><span> {progress.completed} / {progress.total} unique examples</span></div>}
      </section>
      {error && <p className="wide-error" role="alert">{error}</p>}
      {report && active ? <>
        <section className="content-card experiment-metadata">
          <div><p className="eyebrow">{report.dataset.split === "heldout" ? "HELD-OUT EVALUATION" : "DEVELOPMENT EVALUATION"}</p><h2>{report.dataset.uniqueCases} unique examples - {report.dataset.executions} executions</h2><p>{report.dataset.annotationStatus}</p></div>
          <button className="secondary" onClick={() => download(`experiment-${active.id}.json`, report)}>Export run JSON</button>
          <dl><div><dt>Dataset</dt><dd>{report.dataset.version}</dd></div><div><dt>Model</dt><dd>{report.configuration.includeModel ? report.configuration.model : "Not requested"}</dd></div><div><dt>Engine / prompt</dt><dd>{report.engineVersion} / {report.configuration.promptVersion}</dd></div><div><dt>Dataset SHA-256</dt><dd className="hash-value">{report.dataset.hash}</dd></div></dl>
        </section>
        <section className="content-card">
          <h2>Pipeline comparison</h2>
          <div className="table-scroll"><table className="comparison-table"><caption>Metrics use each pipeline&apos;s completed cases. Compare quality only when coverage is equal and no fallbacks occurred.</caption><thead><tr><th>Pipeline</th><th>Coverage</th><th>Accuracy</th><th>Macro F1</th><th>Support precision</th><th>Support recall</th><th>P95 latency</th></tr></thead><tbody>
            {report.summaries.map(item => <tr key={item.pipeline}><th scope="row"><button className="text-button" aria-pressed={pipeline === item.pipeline} onClick={() => { setPipeline(item.pipeline); chooseCase(""); }}>{names[item.pipeline]}</button><small>{item.status} - {item.modelCases} model / {item.fallbackCases} fallback</small></th><td>{item.evaluatedCases}/{item.totalCases}</td><td>{percent(item.accuracy)}{item.accuracyInterval && <small>95% CI {percent(item.accuracyInterval[0])} to {percent(item.accuracyInterval[1])}</small>}</td><td>{percent(item.macroF1)}</td><td>{percent(item.supportPrecision)}</td><td>{percent(item.supportRecall)}</td><td>{latency(item.p95LatencyMs)}</td></tr>)}
          </tbody></table></div>
          <p className="experiment-note">LLM and hybrid share one generation per example to isolate validation. Hybrid latency includes that generation plus rules and validation; it excludes optional review and embedding enrichment. Confidence intervals are approximate Wilson intervals for one-requirement cases, not evidence of real-world hiring validity.</p>
        </section>
        {summary && <section className="experiment-grid">
          <article className="content-card"><h2>{names[pipeline]}</h2><dl className="quality-list"><div><dt>Abstention rate</dt><dd>{percent(summary.abstentionRate)}</dd></div><div><dt>Incorrect supported verdicts / all supported</dt><dd>{percent(summary.unsupportedSupportRate)}</dd></div><div><dt>Invalid or missing quotes / resolved verdicts</dt><dd>{percent(summary.invalidCitationRate)}</dd></div><div><dt>Requirements not extracted</dt><dd>{percent(summary.missingRequirementRate)}</dd></div><div><dt>Median latency</dt><dd>{latency(summary.p50LatencyMs)}</dd></div></dl><p className="experiment-note">An exact quote can still be irrelevant. Citation validity checks source presence; expected labels measure whether the judgment is correct. N/A means no denominator or no evaluated cases.</p></article>
          <article className="content-card"><h2>Confusion matrix</h2><div className="table-scroll"><table className="confusion-table"><caption>Rows: expected / Columns: predicted</caption><thead><tr><th>Expected / predicted</th>{VERDICTS.map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{VERDICTS.map((v, i) => <tr key={v}><th scope="row">{v}</th>{summary.confusion[i].map((count, j) => <td className={i === j ? "matrix-diagonal" : count ? "matrix-error" : ""} key={j}>{count}</td>)}</tr>)}</tbody></table></div></article>
        </section>}
        <section className="content-card"><div className="experiment-heading"><h2>Error analysis</h2><label className="checkbox-label"><input type="checkbox" checked={failuresOnly} onChange={event => setFailuresOnly(event.target.checked)} />Failures only</label></div>
          <div className="slice-list">{summary?.slices.map(slice => <span key={slice.challenge}>{slice.challenge} <strong>{slice.correct}/{slice.total}</strong></span>)}</div>
          {rows.length ? <div className="table-scroll"><table><thead><tr><th>Example</th><th>Challenge</th><th>Provider</th><th>Expected to predicted</th><th>Inspect</th></tr></thead><tbody>{rows.map(row => <tr key={row.caseId}><td>{row.caseId}</td><td>{row.challenge}</td><td>{row.provider}</td><td>{row.predictions.map(p => <div key={p.skill}>{p.skill}: {p.expected} to <strong>{p.actual}</strong>{p.missing ? " (not extracted)" : ""}</div>)}{row.error && <small>{row.error}</small>}{!row.predictions.length && !row.error && "Not requested"}</td><td><button className="secondary" onClick={() => chooseCase(row.caseId)}>Inspect {row.caseId}</button></td></tr>)}</tbody></table></div> : <p className="empty">{summary?.evaluatedCases ? "No failures under this filter. Turn off Failures only to inspect all evidence." : "This pipeline has no evaluated predictions. Enable the local model and run the comparison."}</p>}
        </section>
        {example && selected && <section className="content-card evidence-inspector">
          <h2>Evidence review - {example.id}</h2>
          <p><strong>Job requirement:</strong> {example.job}</p>
          {selected.predictions.length > 1 && <label>Requirement<select value={prediction?.skill ?? ""} onChange={event => { setSkill(event.target.value); setReason(""); setNotice(""); }}>{selected.predictions.map(p => <option key={p.skill}>{p.skill}</option>)}</select></label>}
          <div className="experiment-grid"><div><h3>Original resume</h3><Highlight text={example.resume} quote={prediction?.quote ?? null} /></div><div><h3>Model judgment</h3>{prediction ? <><p><strong>{prediction.skill}</strong>: {prediction.actual} / expected {prediction.expected}</p><p>{prediction.reason}</p><blockquote>{prediction.quote ?? "No evidence quote provided."}</blockquote><p>{prediction.citationValid ? "Exact quote verified in the source." : "No exact source citation verified."}</p></> : <p>{selected.error ?? "This pipeline was not run."}</p>}</div></div>
          {prediction && <form onSubmit={event => { event.preventDefault(); void saveFeedback(); }}>
            <h3>Record a reviewer correction</h3><p>Corrections enter a development-candidate review queue. They do not rewrite this experiment or its frozen labels.</p>
            <label>Reviewer verdict<select value={verdict} disabled={saving} onChange={event => setVerdict(event.target.value as typeof verdict)}>{VERDICTS.map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Reason<textarea required minLength={10} maxLength={1500} value={reason} disabled={saving} onChange={event => setReason(event.target.value)} placeholder="Explain the evidence and why the verdict should change." /></label>
            <button className="primary" disabled={saving || reason.trim().length < 10}>{saving ? "Saving..." : "Save review"}</button>
            {notice && <p role="status">{notice}</p>}
          </form>}
        </section>}
        <section className="content-card"><div className="experiment-heading"><h2>Reviewer feedback - {feedback.length}</h2><button className="secondary" disabled={!feedback.length} onClick={() => download(`development-candidates-${active.id}.json`, { status: "pending-independent-adjudication", approvedForTraining: false, sourceDataset: report.dataset, policy: "Retire this held-out version before using its examples for training or prompt tuning.", candidates: feedback.map(item => ({ ...item, example: report.examples.find(e => e.id === item.caseId) })) })}>Export review candidates</button></div><p className="experiment-note">Human adjudication is required before promotion. Using held-out examples for development retires that split for future unbiased comparisons.</p>{feedback.map(item => <article className="feedback-item" key={item.id}><strong>{item.caseId} / {item.skill} to {item.verdict}</strong><p>{item.reason}</p><small>{item.actor} / {new Date(item.createdAt).toLocaleString()} / {names[item.pipeline]}</small></article>)}</section>
      </> : <section className="content-card experiment-empty"><h2>Establish your first baseline</h2><p>Run 24 unique, provisional held-out examples across delivery, learning, negation, ambiguous language, and adversarial instructions. Start with rules, then enable your local model to compare its strengths and failures.</p><p>Development data is for iteration. Held-out data is for a frozen comparison; do not tune the engine on its results.</p></section>}
      <section className="content-card"><h2>Experiment history</h2>{runs.length ? <div className="table-scroll"><table><thead><tr><th>Created</th><th>Split</th><th>Model</th><th>Unique cases</th><th>Report</th></tr></thead><tbody>{runs.map(run => <tr key={run.id}><td>{new Date(run.createdAt).toLocaleString()}</td><td>{run.report?.dataset.split}</td><td>{run.report?.configuration.includeModel ? run.report.configuration.model : "Rules only"}</td><td>{run.datasetSize}</td><td><button className="secondary" disabled={run.id === active?.id} onClick={() => { setRunId(run.id); chooseCase(""); setFeedback([]); }}>View run</button></td></tr>)}</tbody></table></div> : <p>No saved experiments yet.</p>}</section>
    </div>
  </main>;
}
