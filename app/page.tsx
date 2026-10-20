"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/types";
import { TransformerEvidencePanel } from "./components/transformer-evidence";
import { ResumeQa } from "./components/resume-qa";
import { EVIDENCE_DEMO } from "@/lib/demo";

const SAMPLE_JOB = `We are seeking a Software Engineer to build reliable customer-facing products. The role requires TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, testing and GitHub Actions. You will design REST APIs, improve application performance, collaborate with an agile team and communicate technical trade-offs.`;

export default function Home() {
  const [jobDescription, setJobDescription] = useState(SAMPLE_JOB);
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("Software Engineer");
  const [seniority, setSeniority] = useState("Intermediate");
  const [source, setSource] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<"generate" | "analyze" | null>(null);
  const [error, setError] = useState("");
  const [analysisSource, setAnalysisSource] = useState<{ text: string; file: File | null }>({ text: "", file: null });
  const fileInput = useRef<HTMLInputElement>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const analysisController = useRef<AbortController | null>(null);
  useEffect(() => () => analysisController.current?.abort(), []);

  function clearAnalysis() {
    setResult(null); setError(""); setSource(null); setDemoLoaded(false);
  }

  function loadDemo() {
    clearAnalysis(); setJobDescription(EVIDENCE_DEMO.job); setResumeText(EVIDENCE_DEMO.resume);
    setFile(null); setDemoLoaded(true);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function generateResume() {
    setLoading("generate"); clearAnalysis();
    try {
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, seniority })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResumeText(data.text); setFile(null); setSource(data.source);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally { setLoading(null); }
  }

  async function analyze(event: FormEvent) {
    event.preventDefault(); setLoading("analyze"); setError(""); setResult(null);
    const controller = new AbortController(); analysisController.current = controller;
    try {
      const form = new FormData();
      form.set("jobDescription", jobDescription);
      form.set("resumeText", resumeText);
      if (file) form.set("resumeFile", file);
      const response = await fetch("/api/analyze", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.analysis);
      setAnalysisSource({ text: resumeText, file });
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally { setLoading(null); }
  }

  return (
    <main>
      <header className="hero">
        <nav><span className="brand">Open Resume Lab</span><span className="home-nav"><Link href="/workspace">Review workspace</Link><Link href="/evaluation">Evaluation lab</Link></span></nav>
        <div className="hero-copy">
          <p className="eyebrow">LOCAL-FIRST · EVIDENCE-GROUNDED · OPEN SOURCE</p>
          <h1>Inspect candidate evidence<br /><em>without automating decisions.</em></h1>
          <p className="lede">Use a local LLM to interpret job requirements and résumé evidence, verify its source quotes, and review what is demonstrated, still being learned, contradicted or unknown. An offline rules engine keeps the workflow available.</p>
          <div className="trust"><span>✓ No paid API required</span><span>✓ Explicit abstention</span><span>✓ Human review required</span></div>
        </div>
      </header>

      <form onSubmit={analyze} className="workspace">
        <section className="panel generator">
          <div className="section-heading"><div><span className="step">01</span><h2>Try the evidence demo</h2></div></div>
          <p>Start with a fictional profile that shows why a keyword match is only the beginning of a review.</p>
          <button type="button" className="primary" onClick={loadDemo} disabled={loading !== null}>Load guided example<span aria-hidden="true">→</span></button>
          <p className="demo-explanation">{EVIDENCE_DEMO.explanation}</p>
          {demoLoaded && <p className="status" role="status">Example loaded. Select Analyse match to inspect its evidence.</p>}
          <details className="demo-generator"><summary>Create another fictional profile</summary>
          <p>Use local AI when available, or the built-in offline generator.</p>
          <div className="inline-fields">
            <label>Target role<input disabled={loading !== null} value={role} onChange={(e) => setRole(e.target.value)} /></label>
            <label>Level<select disabled={loading !== null} value={seniority} onChange={(e) => setSeniority(e.target.value)}><option>Entry-level</option><option>Intermediate</option><option>Senior</option></select></label>
          </div>
          <button type="button" className="secondary" onClick={generateResume} disabled={loading !== null}>{loading === "generate" ? "Generating…" : "Generate fictional resume"}</button>
          {source && <p className="status">Generated by {source === "ollama" ? "your local Ollama model" : "the built-in offline generator"}.</p>}
          </details>
          <Link className="demo-evaluation-link" href="/evaluation">Compare pipelines in the evaluation lab →</Link>
        </section>

        <section className="panel inputs">
          <div className="section-heading"><div><span className="step">02</span><h2>Add role and resume</h2></div></div>
          <label>Job description<textarea disabled={loading !== null} rows={8} value={jobDescription} onChange={(e) => { clearAnalysis(); setJobDescription(e.target.value); }} /></label>
          <label>Resume text<textarea disabled={loading !== null} rows={13} value={resumeText} onChange={(e) => { clearAnalysis(); setResumeText(e.target.value); setFile(null); if (fileInput.current) fileInput.current.value = ""; }} placeholder="Load the guided example, paste text, or upload a file." /></label>
          <div className="upload-row">
            <label className="file-button">Upload PDF, DOCX, TXT or image<input ref={fileInput} disabled={loading !== null} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={(e) => { const selected = e.target.files?.[0]; if (!selected) return; clearAnalysis(); setFile(selected); setResumeText(""); }} /></label>
            <span>{file ? file.name : "Maximum 5 MB · processed in memory"}</span>
          </div>
          <button className="primary" disabled={loading !== null || jobDescription.trim().length < 40 || (!file && resumeText.trim().length < 80)}>{loading === "analyze" ? "Analysing…" : "Analyse match"}<span aria-hidden="true">→</span></button>
          {loading === "analyze" && <p className="status" role="status">Reviewing the evidence locally. The first request may take longer while the model loads.</p>}
          {loading === "analyze" && <button type="button" className="secondary" onClick={() => analysisController.current?.abort()}>Cancel analysis</button>}
          {error && <div className="error" role="alert">{error}</div>}
        </section>
      </form>

      <section className="guidance-strip" aria-label="How to read the analysis">
        <div><strong>Supported</strong><span>Explicit evidence linked to delivery or a listed competency.</span></div>
        <div><strong>Partial</strong><span>Learning, coursework, familiarity or limited exposure—not proven delivery.</span></div>
        <div><strong>Contradicted</strong><span>The résumé explicitly says the experience is absent or limited.</span></div>
        <div><strong>Unknown</strong><span>No reliable evidence was found, so the engine abstains.</span></div>
      </section>

      {result && <section className="results" aria-live="polite">
        <div className="result-title"><div><p className="eyebrow">EXPLAINABLE RESULT</p><h2>Match analysis</h2><span className={`analysis-source ${result.analysisProvider === "ollama" ? "ai" : "fallback"}`}>{result.analysisProvider === "ollama" ? `AI analysis · ${result.analysisModel}` : "Deterministic offline fallback"}</span></div><div className="score"><strong>{result.overallScore}</strong><span>/100</span></div></div>
        <p className="disclaimer">{result.disclaimer}</p>
        {result.reliability && <div className={`reliability-banner ${result.reliability.status}`}>
          <div><span>Review status</span><strong>{result.reliability.status === "review-ready" ? "Evidence found—review still required" : "Human verification required"}</strong></div>
          <div><span>Evidence coverage</span><strong>{Math.round(result.reliability.evidenceCoverage * 100)}%</strong></div>
          <div><span>Extraction quality</span><strong>{result.reliability.extractionQuality}</strong></div>
          <div><span>{result.analysisProvider === "ollama" ? "Model confidence (uncalibrated)" : "Rule confidence"}</span><strong>{Math.round(result.reliability.averageConfidence * 100)}%</strong></div>
        </div>}
        {result.aiReview && <section className="semantic-note ai-review">
          <h3>Local AI reviewer summary</h3>
          <p>This optional summary was generated locally by {result.aiReview.model}. It does not change the score or make an employment decision.</p>
          <p><strong>Summary:</strong> {result.aiReview.summary}</p>
          {result.aiReview.demonstratedStrengths.length ? <div><strong>Demonstrated evidence</strong><ul>{result.aiReview.demonstratedStrengths.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          {result.aiReview.verificationPoints.length ? <div><strong>Verify with the reviewer</strong><ul>{result.aiReview.verificationPoints.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          {result.aiReview.suggestedQuestions.length ? <div><strong>Suggested neutral questions</strong><ul>{result.aiReview.suggestedQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        </section>}
        <TransformerEvidencePanel result={result.transformerEvidence} />
        {result.transformerEvidence && <ResumeQa resumeText={analysisSource.text} file={analysisSource.file} />}
        {result.requirementAssessments?.length ? <section className="requirement-section">
          <div className="section-copy"><h3>Requirement evidence</h3><p>{result.analysisProvider === "ollama" ? "Model confidence is uncalibrated. Check each judgment against its source evidence." : "Confidence describes the rule judgment, not a probability that a person is qualified."}</p></div>
          <div className="requirement-grid">{result.requirementAssessments.map((assessment) => <article className={`requirement-card verdict-${assessment.verdict}`} key={assessment.skill}>
            <div><strong>{assessment.skill}</strong><span>{assessment.importance}</span></div>
            <p className="verdict-label">{assessment.verdict} · {Math.round(assessment.confidence * 100)}%</p>
            <p>{assessment.reason}</p>
            {assessment.evidence && <blockquote>{assessment.evidence.text}<small>{assessment.evidence.section} · characters {assessment.evidence.start}–{assessment.evidence.end}</small></blockquote>}
          </article>)}</div>
        </section> : null}
        <div className="skills-grid">
          <div><h3>Supported skills</h3><div className="chips matched">{result.matchedSkills.length ? result.matchedSkills.map((s) => <span key={s}>{s}</span>) : <small>None detected</small>}</div></div>
          <div><h3>Skills to verify</h3><div className="chips missing">{result.missingSkills.length ? result.missingSkills.map((s) => <span key={s}>{s}</span>) : <small>None detected</small>}</div></div>
        </div>
        {result.semanticMatches?.length ? <div className="semantic-note"><h3>Advisory semantic candidates</h3><p>These local-model retrieval results never alter the deterministic score.</p>{result.semanticMatches.map((match) => <p key={match.skill}><strong>{match.skill}</strong> · {Math.round(match.similarity * 100)}% similarity — “{match.evidence.text}”</p>)}</div> : null}
        <div className="criteria">
          {result.criteria.map((item) => <article key={item.criterion}>
            <div className="criterion-top"><h3>{item.criterion}</h3><strong>{item.score}/100</strong></div>
            <div className="bar"><i style={{ width: `${item.score}%` }} /></div>
            <p>{item.explanation} <small>Weight: {item.weight}%</small></p>
            {item.evidence.length > 0 && <ul>{item.evidence.map((line, index) => <li key={index}>{line}</li>)}</ul>}
          </article>)}
        </div>
        <div className="bottom-grid">
          <div><h3>Fair interview prompts</h3><ol>{result.interviewQuestions.map((q) => <li key={q}>{q}</li>)}</ol></div>
          <div className="warnings"><h3>Review notes</h3><ul>{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
        </div>
      </section>}

      <footer><span>Open Resume Lab</span><p>Built for learning—not automated employment decisions.</p></footer>
    </main>
  );
}
