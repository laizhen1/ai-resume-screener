"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAnalysisDraft } from "./components/analysis-draft";
import type { AnalysisReceipt, AnalysisSnapshot } from "@/lib/analysis-receipt";
import type { AnalysisResult } from "@/lib/types";
import { EVIDENCE_DEMO } from "@/lib/demo";
import { AnalysisResults } from "./components/analysis-results";
import { ModelStatus } from "./components/model-status";
import { StudioIcon } from "./components/studio-icons";

const SAMPLE_JOB = "We are seeking a Software Engineer to build reliable customer-facing products. The role requires TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, testing and GitHub Actions. You will design REST APIs, improve application performance, collaborate with an agile team and communicate technical trade-offs.";
const STEPS = ["Define role", "Add résumé", "Review evidence"];

const subscribeToHydration = () => () => {};
export default function Home() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { draft, setDraft } = useAnalysisDraft();
  const [saveSnapshot, setSaveSnapshot] = useState<AnalysisSnapshot | null>(draft?.saveSnapshot ?? null);
  const [receipt, setReceipt] = useState<AnalysisReceipt | null>(draft?.receipt ?? null);
  const [step, setStep] = useState(draft?.step ?? 1);
  const [jobDescription, setJobDescription] = useState(draft?.jobDescription ?? SAMPLE_JOB);
  const [resumeText, setResumeText] = useState(draft?.resumeText ?? "");
  const [file, setFile] = useState<File | null>(draft?.file ?? null);
  const [role, setRole] = useState(draft?.role ?? "Software Engineer");
  const [seniority, setSeniority] = useState(draft?.seniority ?? "Intermediate");
  const [source, setSource] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(draft?.result ?? null);
  const [loading, setLoading] = useState<"generate" | "analyze" | null>(null);
  const [error, setError] = useState("");
  const [analysisSource, setAnalysisSource] = useState<{ text: string; file: File | null }>(draft?.analysisSource ?? { text: "", file: null });
  const [demoLoaded, setDemoLoaded] = useState(draft?.demoLoaded ?? false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const analysisController = useRef<AbortController | null>(null);
  const generationController = useRef<AbortController | null>(null);
  const previousStep = useRef(step);
  const validRole = jobDescription.trim().length >= 40;
  const validResume = Boolean(file) || resumeText.trim().length >= 80;

  useEffect(() => () => { analysisController.current?.abort(); generationController.current?.abort(); }, []);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    document.getElementById(step === 3 ? "analysis-heading" : `step-${step}-heading`)?.focus();
  }, [step]);

  useEffect(() => {
    setDraft({ step, jobDescription, resumeText, file, role, seniority, result, analysisSource, demoLoaded, saveSnapshot, receipt });
  }, [step, jobDescription, resumeText, file, role, seniority, result, analysisSource, demoLoaded, saveSnapshot, receipt, setDraft]);

  function clearAnalysis() {
    setSaveSnapshot(null); setReceipt(null);
    setResult(null); setAnalysisSource({ text: "", file: null }); setError(""); setSource(null); setDemoLoaded(false);
  }
  function loadDemo() {
    clearAnalysis(); setJobDescription(EVIDENCE_DEMO.job); setResumeText(EVIDENCE_DEMO.resume);
    setRole("Backend Engineer"); setFile(null); setDemoLoaded(true); setStep(2);
    if (fileInput.current) fileInput.current.value = "";
  }
  function chooseFile(selected: File) {
    if (loading) return;
    clearAnalysis(); setFile(null); setResumeText(""); setDragging(false);
    if (!/\.(pdf|docx|txt|png|jpe?g)$/i.test(selected.name) || selected.size > 5 * 1024 * 1024 || selected.size === 0) {
      setError("Choose a non-empty PDF, DOCX, TXT, PNG or JPEG file up to 5 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(selected);
  }
  function removeFile() {
    clearAnalysis(); setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  async function generateResume() {
    setLoading("generate"); clearAnalysis();
    const controller = new AbortController(); generationController.current = controller;
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, seniority }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setResumeText(data.text); setFile(null); setSource(data.source);
      if (fileInput.current) fileInput.current.value = "";
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Generation failed."); }
    finally { if (generationController.current === controller) { setLoading(null); generationController.current = null; } }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (step === 1) { if (validRole) setStep(2); return; }
    if (step !== 2 || !validRole || !validResume) return;
    setLoading("analyze"); setError(""); setResult(null);
    const controller = new AbortController(); analysisController.current = controller;
    try {
      const form = new FormData(); form.set("jobDescription", jobDescription); form.set("resumeText", resumeText);
      if (file) form.set("resumeFile", file);
      const response = await fetch("/api/analyze", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (controller.signal.aborted || analysisController.current !== controller) return;
      setResult(data.analysis);
      setAnalysisSource({ text: data.resumeText ?? resumeText.trim(), file: data.resumeText ? null : file });
      setSaveSnapshot(data.receipt ? { analysis: data.analysis, jobDescription: data.jobDescription, resumeText: data.resumeText, fileName: data.fileName } : null);
      setReceipt(data.receipt ?? null); setStep(3);
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Analysis failed. Please try again."); }
    finally { if (analysisController.current === controller) { setLoading(null); analysisController.current = null; } }
  }

  return <main id="main-content" className="studio-page">
    <section className="studio-intro">
      <span className="intro-label"><StudioIcon name="spark" /> YOUR NEXT REVIEW STARTS HERE</span>
      <h1>From résumé to <span>clear evidence.</span></h1>
      <p>Understand the experience behind every match.<br className="desktop-break" /> A focused workflow, with you in control.</p>
      <button type="button" className="demo-link" onClick={loadDemo} disabled={!hydrated || loading !== null}>Load guided example <span aria-hidden="true">↗</span></button>
    </section>

    <nav className="studio-steps" aria-label="Analysis progress"><ol>{STEPS.map((label, index) => {
      const number = index + 1;
      return <li key={label} className={step === number ? "current" : step > number ? "complete" : ""}><button type="button" aria-current={step === number ? "step" : undefined} disabled={!hydrated || loading !== null || (number === 2 && !validRole) || (number === 3 && !result)} onClick={() => setStep(number)}><span className="step-number">{step > number ? <StudioIcon name="check" /> : number}</span><span>{label}</span></button></li>;
    })}</ol></nav>

    <div className={`studio-layout ${step === 3 ? "review-layout" : ""}`}>
      <form onSubmit={submit} className="studio-form content-card" hidden={step === 3} aria-label="Resume analysis">
        <section hidden={step !== 1} aria-labelledby="step-1-heading">
          <div className="form-heading"><span className="section-icon"><StudioIcon name="document" /></span><div><p className="eyebrow">STEP 01 / ROLE CONTEXT</p><h2 id="step-1-heading" tabIndex={-1}>What does the role need?</h2></div></div>
          <p className="form-description">Add the job requirements you want to review. Clear context makes the evidence more useful.</p>
          <label htmlFor="role-title">Role title <span className="optional-label">Optional</span></label><input id="role-title" value={role} disabled={!hydrated || loading !== null} onChange={e => setRole(e.target.value)} placeholder="e.g. Backend Engineer" maxLength={120} />
          <label htmlFor="job-description">Job description</label><textarea id="job-description" rows={8} disabled={!hydrated || loading !== null} value={jobDescription} onChange={e => { clearAnalysis(); setJobDescription(e.target.value); }} aria-describedby="job-help" placeholder="Describe the role, required skills, responsibilities and experience…" />
          <div className="field-meta" id="job-help"><span>Include the skills and experience that matter.</span><span>{jobDescription.trim().length} / 40 min. characters</span></div>
        </section>

        <section hidden={step !== 2} aria-labelledby="step-2-heading">
          <div className="form-heading"><span className="section-icon"><StudioIcon name="upload" /></span><div><p className="eyebrow">STEP 02 / CANDIDATE CONTEXT</p><h2 id="step-2-heading" tabIndex={-1}>Bring the experience into focus.</h2></div></div>
          <p className="form-description">Upload a résumé or paste its text. Use fictional or properly consented documents.</p>
          <div className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} onDragOver={event => { event.preventDefault(); if (!loading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files[0]) chooseFile(event.dataTransfer.files[0]); }}>
            <div className="upload-illustration"><StudioIcon name={file ? "document" : "upload"} /></div>
            {file ? <><strong className="uploaded-name">{file.name}</strong><span className="muted">{Math.ceil(file.size / 1024)} KB · ready to review</span><button type="button" className="text-button" onClick={removeFile} disabled={!hydrated || loading !== null}>Remove file</button></> : <><strong>Drop your résumé here</strong><span className="muted">or choose a file from your device</span></>}
            <label className={`file-button ${file ? "replace-file" : ""}`}>{file ? "Replace document" : "Choose document"}<input ref={fileInput} disabled={!hydrated || loading !== null} type="file" aria-label="Upload resume document" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={e => { if (e.target.files?.[0]) chooseFile(e.target.files[0]); }} /></label>
            {!file && <small>PDF, DOCX, TXT, PNG or JPEG · up to 5 MB</small>}
          </div>
          <div hidden={Boolean(file)}><div className="input-divider"><span>or paste text</span></div><label htmlFor="resume-text">Resume text</label><textarea id="resume-text" disabled={!hydrated || loading !== null} rows={7} value={resumeText} onChange={e => { clearAnalysis(); setResumeText(e.target.value); setFile(null); if (fileInput.current) fileInput.current.value = ""; }} aria-describedby="resume-help" placeholder="Paste the résumé, including relevant experience, projects, skills and education…" /><div className="field-meta" id="resume-help"><span>Keep the original wording for traceable evidence.</span><span>{resumeText.trim().length} / 80 min. characters</span></div></div>
          {demoLoaded && <p className="status" role="status"><StudioIcon name="check" /> Guided example loaded. Ready to analyse.</p>}
          {source && <p className="status" role="status">Generated by {source === "ollama" ? "your configured Ollama model" : "the built-in offline generator"}.</p>}
          <details className="demo-generator"><summary>Create another fictional profile</summary><p>Generate a practice résumé for the role above.</p><label htmlFor="sample-level">Experience level</label><select id="sample-level" disabled={!hydrated || loading !== null} value={seniority} onChange={e => setSeniority(e.target.value)}><option>Entry-level</option><option>Intermediate</option><option>Senior</option></select><button type="button" className="secondary" onClick={() => void generateResume()} disabled={!hydrated || loading !== null}>{loading === "generate" ? "Generating…" : "Generate fictional resume"}</button></details>
        </section>

        {error && <div className="error" role="alert">{error}</div>}
        {loading === "analyze" && <div className="analysis-progress" role="status"><span className="loading-ring" aria-hidden="true" /><div><strong>Reviewing the evidence</strong><p>Extraction and model analysis may take a little longer on the first request.</p></div></div>}
        <div className="studio-actions"><div>{step === 2 ? <button type="button" className="secondary" disabled={!hydrated || loading !== null} onClick={() => setStep(1)}>← Back</button> : <span className="private-note"><StudioIcon name="shield" /> Processed in memory</span>}</div>{step === 1 ? <button type="submit" className="primary" disabled={!hydrated || !validRole || loading !== null}>Continue <StudioIcon name="arrow" /></button> : <button type="submit" className="primary" disabled={!hydrated || loading !== null || !validRole || !validResume}>{loading === "analyze" ? "Analysing…" : "Analyse match"}<StudioIcon name="arrow" /></button>}</div>
        {loading === "analyze" && <button type="button" className="text-button cancel-analysis" onClick={() => analysisController.current?.abort()}>Cancel analysis</button>}
      </form>

      {step !== 3 && <aside className="studio-context"><ModelStatus />
        <div className="context-heading"><span className="context-symbol"><StudioIcon name="layers" /></span><span className="eyebrow">YOUR REVIEW CONTEXT</span></div><h2>{role.trim() || "Your next role"}</h2><p className="context-description">A clear role. A complete résumé.<br />A review grounded in evidence.</p>
        <ol className="context-checklist"><li><span className={validRole ? "context-check ready" : "context-check"}>{validRole ? <StudioIcon name="check" /> : "1"}</span><div><strong>Role requirements</strong><span>{validRole ? "Ready for analysis" : "Add at least 40 characters"}</span></div></li><li><span className={validResume ? "context-check ready" : "context-check"}>{validResume ? <StudioIcon name="check" /> : "2"}</span><div><strong>Résumé evidence</strong><span>{file ? file.name : validResume ? "Text ready to review" : "Add a document or paste text"}</span></div></li><li><span className="context-check">3</span><div><strong>Your review</strong><span>Inspect findings and original quotes</span></div></li></ol>
        <div className="context-footnote"><StudioIcon name="shield" /><div><strong>Designed for human judgment</strong><p>Evidence supports your review. The final decision stays with you.</p></div></div>
        <Link href="/evaluation" className="context-link">Explore the evaluation lab <span aria-hidden="true">↗</span></Link>
      </aside>}
    </div>
    {step === 3 && result && <AnalysisResults result={result} analysisSource={analysisSource} onEdit={() => setStep(2)} jobDescription={jobDescription} role={role} snapshot={saveSnapshot} receipt={receipt} onReview={reviewerCorrections => setResult({ ...result, reviewerCorrections })} />}
    <p className="draft-notice">Your analysis stays in this tab while navigating. Refreshing or closing the tab clears it. <button type="button" className="text-button" disabled={!hydrated || loading !== null} onClick={() => { clearAnalysis(); setResumeText(""); setFile(null); if (fileInput.current) fileInput.current.value = ""; setStep(1); }}>Clear résumé and review</button></p>
    {step !== 3 && <section className="studio-benefits" aria-label="What to expect"><div><StudioIcon name="document" /><span><strong>Source-linked findings</strong><small>Trace each finding to its evidence</small></span></div><div><StudioIcon name="layers" /><span><strong>Four evidence states</strong><small>Clear distinctions, useful context</small></span></div><div><StudioIcon name="shield" /><span><strong>Human-led review</strong><small>Your judgment stays central</small></span></div></section>}
  </main>;
}
