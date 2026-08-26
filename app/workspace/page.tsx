"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { AuditEvent, Candidate, Job, ReviewStatus } from "@/lib/domain";

const DEFAULT_DESCRIPTION = "We are seeking a Software Engineer to build reliable customer-facing products. The role requires TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, testing, REST APIs and GitHub Actions.";

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export default function WorkspacePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [title, setTitle] = useState("Software Engineer");
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [weights, setWeights] = useState({ skills: 55, experience: 20, impact: 15, clarity: 10 });
  const [files, setFiles] = useState<File[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [mode, setMode] = useState("memory");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    try {
      const data = await jsonRequest("/api/workspace/jobs");
      setJobs(data.jobs); setMode(data.mode);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load jobs."); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/jobs", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load jobs.");
        return data;
      })
      .then((data) => { setJobs(data.jobs); setMode(data.mode); })
      .catch((caught) => { if (caught.name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load jobs."); });
    return () => controller.abort();
  }, []);

  async function openJob(job: Job) {
    setSelectedJob(job); setBusy("job"); setError(""); setCompareIds([]);
    try {
      const data = await jsonRequest(`/api/workspace/jobs/${job.id}`);
      setSelectedJob(data.job); setCandidates(data.candidates); setAudit(data.audit);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load job."); }
    finally { setBusy(""); }
  }

  async function createJob(event: FormEvent) {
    event.preventDefault(); setBusy("create"); setError("");
    try {
      const data = await jsonRequest("/api/workspace/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, criteria: [
          { name: "Relevant skills", weight: weights.skills, required: true },
          { name: "Demonstrated experience", weight: weights.experience, required: false },
          { name: "Measurable impact", weight: weights.impact, required: false },
          { name: "Document clarity", weight: weights.clarity, required: false }
        ] })
      });
      await loadJobs(); await openJob(data.job);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create job."); }
    finally { setBusy(""); }
  }

  async function uploadCandidates(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob) return;
    setBusy("upload"); setError("");
    try {
      const form = new FormData();
      files.forEach((file) => form.append("resumeFiles", file));
      form.set("retentionDays", String(retentionDays));
      await jsonRequest(`/api/workspace/jobs/${selectedJob.id}/candidates`, { method: "POST", body: form });
      setFiles([]); await openJob(selectedJob);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setBusy(""); }
  }

  async function updateCandidate(candidate: Candidate, update: { status?: ReviewStatus; notes?: string }) {
    setBusy(candidate.id); setError("");
    try {
      const data = await jsonRequest(`/api/workspace/candidates/${candidate.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update)
      });
      setCandidates((current) => current.map((item) => item.id === candidate.id ? data.candidate : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Update failed."); }
    finally { setBusy(""); }
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!window.confirm(`Permanently delete ${candidate.displayName} and their stored résumé?`)) return;
    setBusy(candidate.id); setError("");
    try {
      await jsonRequest(`/api/workspace/candidates/${candidate.id}`, { method: "DELETE" });
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      setCompareIds((current) => current.filter((id) => id !== candidate.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deletion failed."); }
    finally { setBusy(""); }
  }

  async function runRetention() {
    setBusy("retention"); setError("");
    try {
      const data = await jsonRequest("/api/workspace/retention", { method: "POST" });
      if (selectedJob) await openJob(selectedJob);
      window.alert(`Deleted ${data.deleted} expired candidate record(s).`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Retention run failed."); }
    finally { setBusy(""); }
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]);
  }

  const compared = compareIds.map((id) => candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is Candidate => Boolean(candidate));

  return <main className="app-shell">
    <header className="app-header">
      <div><Link className="brand-link" href="/">Open Resume Lab</Link><span className="mode-badge">{mode} mode</span></div>
      <nav className="app-nav"><Link href="/workspace">Workspace</Link><Link href="/evaluation">Evaluation</Link><Link href="/login">Sign in</Link></nav>
    </header>

    <section className="page-intro"><p className="eyebrow">HUMAN REVIEW WORKSPACE</p><h1>Jobs, evidence and decisions.</h1><p>Create a role, process up to ten résumés at once, and retain a human-owned review history. No candidate is automatically rejected.</p></section>
    {error && <div className="wide-error" role="alert">{error}</div>}

    <div className="workspace-layout">
      <aside className="sidebar-card">
        <h2>Create a job</h2>
        <form onSubmit={createJob}>
          <label>Job title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Description<textarea rows={9} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <fieldset className="rubric-fields"><legend>Scoring rubric · {Object.values(weights).reduce((sum, value) => sum + value, 0)}%</legend>{Object.entries(weights).map(([name, value]) => <label key={name}>{name}<input type="number" min={0} max={100} value={value} onChange={(event) => setWeights((current) => ({ ...current, [name]: Number(event.target.value) }))} /></label>)}</fieldset>
          <button className="primary" disabled={Boolean(busy) || Object.values(weights).reduce((sum, value) => sum + value, 0) !== 100}>{busy === "create" ? "Creating…" : "Create job"}<span>→</span></button>
        </form>
        <h2 className="spaced-heading">Jobs</h2>
        <div className="job-list">{jobs.length ? jobs.map((job) => <button key={job.id} className={selectedJob?.id === job.id ? "job-item active" : "job-item"} onClick={() => void openJob(job)}><strong>{job.title}</strong><small>{new Date(job.createdAt).toLocaleDateString()}</small></button>) : <p className="empty">No jobs yet.</p>}</div>
      </aside>

      <section className="content-card">
        {!selectedJob ? <div className="empty-state"><h2>Select or create a job</h2><p>The role dashboard will appear here.</p></div> : <>
          <div className="content-heading"><div><p className="eyebrow">ACTIVE ROLE</p><h2>{selectedJob.title}</h2></div><span>{candidates.length} candidates</span></div>
          <details className="job-description"><summary>View job description and rubric</summary><p>{selectedJob.description}</p><ul>{selectedJob.criteria.map((criterion) => <li key={criterion.id}>{criterion.name}: {criterion.weight}% {criterion.required ? "· required" : ""}</li>)}</ul></details>
          <form className="batch-upload" onSubmit={uploadCandidates}>
            <label className="file-button">Choose résumés<input multiple type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
            <span>{files.length ? `${files.length} selected` : "PDF, DOCX, TXT or images · maximum 10"}</span>
            <label>Retention<select value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
            <button disabled={!files.length || Boolean(busy)}>{busy === "upload" ? "Processing…" : "Upload and analyse"}</button>
          </form>

          <div className="candidate-list">{candidates.length ? candidates.map((candidate) => <article className="candidate-row" key={candidate.id}>
            <div className="candidate-summary">
              <label className="compare-check"><input type="checkbox" checked={compareIds.includes(candidate.id)} onChange={() => toggleCompare(candidate.id)} />Compare</label>
              <div><h3>{candidate.displayName}</h3><p>{candidate.fileName} · retained until {new Date(candidate.retentionUntil).toLocaleDateString()}</p></div>
              <div className="candidate-score"><strong>{candidate.analysis?.overallScore ?? "—"}</strong><small>/100</small></div>
              <select aria-label={`Status for ${candidate.displayName}`} value={candidate.status} disabled={busy === candidate.id} onChange={(event) => void updateCandidate(candidate, { status: event.target.value as ReviewStatus })}>
                <option value="new">New</option><option value="reviewing">Reviewing</option><option value="interview">Interview</option><option value="hold">Hold</option><option value="closed">Closed</option>
              </select>
            </div>
            {candidate.analysis && <details><summary>Inspect evidence</summary>
              <div className="evidence-grid">{candidate.analysis.criteria.map((criterion) => <div key={criterion.criterion}><strong>{criterion.criterion} · {criterion.score}</strong><p>{criterion.explanation}</p>{criterion.evidence.map((line) => <blockquote key={line}>{line}</blockquote>)}</div>)}</div>
              {candidate.analysis.semanticMatches?.length ? <div className="semantic-note"><strong>Advisory semantic matches</strong>{candidate.analysis.semanticMatches.map((match) => <p key={match.skill}>{match.skill} · {Math.round(match.similarity * 100)}% — “{match.evidence.text}”</p>)}</div> : null}
              <label>Reviewer notes<textarea defaultValue={candidate.notes} rows={3} onBlur={(event) => { if (event.target.value !== candidate.notes) void updateCandidate(candidate, { notes: event.target.value }); }} /></label>
              <button className="danger-button" onClick={() => void deleteCandidate(candidate)} disabled={busy === candidate.id}>Permanently delete candidate</button>
            </details>}
          </article>) : <div className="empty-state"><h3>No candidates</h3><p>Upload fictional or properly consented résumés to start the review.</p></div>}</div>

          {compared.length === 2 && <section className="comparison"><h2>Side-by-side comparison</h2><div>{compared.map((candidate) => <article key={candidate.id}><h3>{candidate.displayName}</h3><strong className="large-number">{candidate.analysis?.overallScore ?? "—"}</strong><h4>Supported skills</h4><p>{candidate.analysis?.matchedSkills.join(", ") || "None detected"}</p><h4>Skills to verify</h4><p>{candidate.analysis?.missingSkills.join(", ") || "None"}</p></article>)}</div></section>}
          <section className="activity-log"><div><h2>Audit history</h2><button onClick={() => void runRetention()} disabled={Boolean(busy)}>{busy === "retention" ? "Deleting…" : "Delete expired records"}</button></div>{audit.length ? <ol>{audit.slice(0, 20).map((event) => <li key={event.id}><strong>{event.action}</strong><span>{event.actor} · {new Date(event.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="empty">No recorded activity yet.</p>}</section>
        </>}
      </section>
    </div>
  </main>;
}
