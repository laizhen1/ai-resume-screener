"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AnalysisResult, EvidenceVerdict, RequirementAssessment, ReviewerCorrection } from "@/lib/types";
import { exactEvidence, reviewReport, reviewText } from "@/lib/review";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CorrectionForm({ assessment, correction, onSave }: { assessment: RequirementAssessment; correction?: ReviewerCorrection; onSave: (value: ReviewerCorrection) => Promise<void> }) {
  const id = useId();
  const [verdict, setVerdict] = useState<EvidenceVerdict>(correction?.verdict ?? assessment.verdict);
  const [reason, setReason] = useState(correction?.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await onSave({ skill: assessment.skill, verdict, reason: reason.trim(), actor: "local reviewer", reviewedAt: new Date().toISOString() }); setMessage("Reviewer judgment recorded. Original analysis retained."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Review could not be saved."); }
    finally { setBusy(false); }
  }
  return <form className="correction-form" onSubmit={submit}>
    <h4>Review {assessment.skill}</h4>
    <label htmlFor={`${id}-verdict`}>Reviewer verdict</label><select id={`${id}-verdict`} value={verdict} disabled={busy} onChange={e => setVerdict(e.target.value as EvidenceVerdict)}>{["supported", "partial", "contradicted", "unknown"].map(value => <option key={value}>{value}</option>)}</select>
    <label htmlFor={`${id}-reason`}>Reason for reviewer judgment</label><textarea id={`${id}-reason`} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} rows={3} maxLength={2000} placeholder="Explain your reading of the original evidence…" />
    <button className="secondary" disabled={busy || reason.trim().length < 5}>{busy ? "Recording…" : "Record reviewer judgment"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}

export function EvidenceReview({ result, source, jobDescription = "", onChange }: { result: AnalysisResult; source: string; jobDescription?: string; onChange: (corrections: ReviewerCorrection[]) => void | Promise<void> }) {
  const requirements = result.requirementAssessments ?? [];
  const [selected, setSelected] = useState(requirements[0]?.skill ?? "");
  const assessment = requirements.find(item => item.skill === selected) ?? requirements[0];
  const evidence = assessment?.evidence;
  const valid = exactEvidence(source, evidence);
  const highlight = useRef<HTMLElement>(null);
  useEffect(() => { highlight.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }); }, [selected]);
  const correction = result.reviewerCorrections?.find(item => item.skill === assessment?.skill);
  return <section className="evidence-review" aria-label="Source-linked evidence review">
    <div className="review-toolbar"><p>Inspect a requirement beside the extracted source. Reviewer judgments stay separate from automated results and scores.</p><div>
      <button type="button" className="secondary" onClick={() => download("resume-evidence-review.json", JSON.stringify(reviewReport(result, source, jobDescription), null, 2), "application/json")}>Export review JSON</button>
      <button type="button" className="secondary" onClick={() => download("resume-evidence-review.txt", reviewText(result, source, jobDescription), "text/plain;charset=utf-8")}>Export summary</button>
    </div></div>
    <div className="source-review-grid"><div className="requirement-grid review-cards">{requirements.map(item => {
      const human = result.reviewerCorrections?.find(value => value.skill === item.skill);
      return <article className={`requirement-card verdict-${item.verdict}`} key={item.skill}>
        <div><strong>{item.skill}</strong><span>{item.importance}</span></div>
        <p className="verdict-label">{item.verdict} · {Math.round(item.confidence * 100)}%</p><p>{item.reason}</p>
        {item.evidence && <blockquote>{item.evidence.text}<small>{item.evidence.section} · characters {item.evidence.start}–{item.evidence.end}</small></blockquote>}
        {human && <p className="human-verdict">Reviewer: {human.verdict}<br />{human.reason}</p>}
        <button type="button" className="text-button" aria-pressed={assessment?.skill === item.skill} onClick={() => setSelected(item.skill)}>Inspect {item.skill} source</button>
      </article>;
    })}</div><aside className="source-review-panel">
      <h3>Résumé source</h3><p className="source-caption">Extracted text used for this analysis; original PDF layout is not reproduced.</p>
      <p role="status">{!source ? "Source is unavailable for this older result. Analyse again to inspect it." : valid ? `Highlighted evidence for ${assessment?.skill}.` : evidence ? "The citation does not match the source offsets. Verify manually." : `No source quote selected for ${assessment?.skill ?? "this requirement"}.`}</p>
      <pre className="resume-source" tabIndex={0} aria-label="Extracted résumé source">{valid && evidence ? <>{source.slice(0, evidence.start)}<mark ref={highlight}>{source.slice(evidence.start, evidence.end)}</mark>{source.slice(evidence.end)}</> : source}</pre>
      {assessment && <CorrectionForm key={assessment.skill} assessment={assessment} correction={correction} onSave={async value => { await onChange([...(result.reviewerCorrections ?? []).filter(item => item.skill !== value.skill), value]); }} />}
    </aside></div>
  </section>;
}
