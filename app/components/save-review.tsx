"use client";

import Link from "next/link";
import { useState } from "react";
import type { AnalysisReceipt, AnalysisSnapshot } from "@/lib/analysis-receipt";
import type { ReviewerCorrection } from "@/lib/types";

export function SaveReview({ snapshot, receipt, role, corrections }: { snapshot: AnalysisSnapshot; receipt: AnalysisReceipt; role: string; corrections: ReviewerCorrection[] }) {
  const [title, setTitle] = useState(role || "Reviewed role");
  const [retentionDays, setRetentionDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ jobId: string; candidateId: string; mode: string } | null>(null);
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/workspace/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot, receipt, title, retentionDays, corrections: corrections.map(({ skill, verdict, reason }) => ({ skill, verdict, reason })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save review.");
      setSaved(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  return <section className="save-review"><h3>Continue in your workspace</h3><p>Create a job and candidate with this exact analysis and the reviewer judgments recorded so far. No model rerun. Memory-mode records disappear when the server restarts; PostgreSQL mode stores them until deletion or retention cleanup.</p>
    {saved ? <p role="status">Saved in {saved.mode} mode. <Link href={`/workspace?job=${encodeURIComponent(saved.jobId)}`}>Open saved review</Link>. Further judgments on this page are local; edit the workspace copy to update it.</p> : <><div className="save-review-fields"><label>Workspace job title<input value={title} maxLength={120} disabled={busy} onChange={e => setTitle(e.target.value)} /></label><label>Review retention<select value={retentionDays} disabled={busy} onChange={e => setRetentionDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label><button type="button" className="primary" disabled={busy || title.trim().length < 2} onClick={() => void save()}>{busy ? "Saving…" : "Save review to workspace"}</button></div><small>Save within 30 minutes of analysis. Refreshing or restarting the server may require a new analysis.</small></>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
