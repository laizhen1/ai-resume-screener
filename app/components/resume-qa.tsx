"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ResumeAnswer } from "@/lib/resume-qa";

export function ResumeQa({ resumeText, file, candidateId }: { resumeText?: string; file?: File | null; candidateId?: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ResumeAnswer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(() => () => controller.current?.abort(), []);
  async function ask() {
    setBusy(true); setError(""); setAnswer(null);
    const abort = new AbortController(); controller.current = abort;
    try {
      const body = new FormData(); body.set("question", question.trim());
      if (candidateId) body.set("candidateId", candidateId);
      else if (file) body.set("resumeFile", file);
      else body.set("resumeText", resumeText ?? "");
      const response = await fetch("/api/resume-qa", { method: "POST", body, signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAnswer(data.answer);
    } catch (caught) { if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : "Question failed."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <section className="semantic-note resume-qa">
    <h3>Ask about this résumé</h3><p>Ask about job-related evidence. Answers use local retrieval and cite the original text.</p>
    <label htmlFor={id}>Evidence question</label><input id={id} value={question} onChange={event => setQuestion(event.target.value)} maxLength={500} placeholder="What evidence shows backend experience?" disabled={busy} />
    <button type="button" className="secondary" disabled={busy || question.trim().length < 3} onClick={() => void ask()}>{busy ? "Finding evidence…" : "Ask about evidence"}</button>
    {error && <p role="alert">{error}</p>}
    {answer && <div role="status"><p>{answer.message}</p>{answer.model && <small>Generated locally by {answer.model}</small>}{answer.claims.map((claim, index) => <article key={index}><p>{claim.text}</p><blockquote>{claim.evidence.text}<small>{claim.evidence.section} · characters {claim.evidence.start}–{claim.evidence.end}</small></blockquote></article>)}{answer.warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
  </section>;
}
