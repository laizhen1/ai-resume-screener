import type { TransformerEvidence } from "@/lib/transformers";

export function TransformerEvidencePanel({ result }: { result?: TransformerEvidence }) {
  if (!result) return null;
  return <section className="semantic-note transformer-panel">
    <h3>Transformer evidence review</h3>
    <p>Independent model judgments for human review. They do not change the main analysis score.</p>
    {result.status === "unavailable" ? <p role="status">Transformer review unavailable: {result.error}</p> : <>
      <p><strong>Models:</strong> {result.metadata?.models.embedding} → {result.metadata?.models.reranker} → {result.metadata?.models.nli}</p>
      <p>Model probabilities are uncalibrated. A relevant passage does not necessarily demonstrate experience.</p>
      {!result.assessments.length && <p>No supported taxonomy requirements were extracted from this job description.</p>}
      <div className="requirement-grid">{result.assessments.map(assessment => <article className={`requirement-card verdict-${assessment.verdict}`} key={assessment.skill}>
        <h4>{assessment.skill}</h4><p className="verdict-label">{assessment.verdict}</p><p>{assessment.reason}</p>
        {assessment.evidence && <blockquote>{assessment.evidence.text}<small>{assessment.evidence.section} · characters {assessment.evidence.start}–{assessment.evidence.end}</small></blockquote>}
        <details><summary>Inspect retrieved evidence</summary>{assessment.candidates.map(candidate => <div key={candidate.passageId}>
          <blockquote>{candidate.evidence.text}</blockquote>
          <small>Similarity: {candidate.similarity.toFixed(3)} · Reranker score: {candidate.rerankScore.toFixed(3)} · NLI support: {candidate.nli.entailment.toFixed(3)} / neutral: {candidate.nli.neutral.toFixed(3)} / contradiction: {candidate.nli.contradiction.toFixed(3)} · Learning support: {candidate.learningNli.entailment.toFixed(3)}</small>
        </div>)}</details>
      </article>)}</div>
      {result.metadata?.models.ner && <div><h4>Extracted entities</h4><p>{result.metadata.models.ner} · model labels require review.</p>{result.entities.length ? result.entities.map((entity, index) => <p key={index}><strong>{entity.label}:</strong> <mark>{entity.evidence.text}</mark> · {entity.evidence.section} · characters {entity.evidence.start}–{entity.evidence.end}</p>) : <p>No entity spans returned.</p>}</div>}
      {result.metadata?.models.evidence && <div>
        <h4>Fine-tuned evidence classifier</h4>
        <p>{result.metadata.models.evidence} · Passage-level predictions; probabilities are uncalibrated and do not change the score.</p>
        {result.trainedEvidence?.map((item, index) => <article key={index}>
          <strong>{item.skill}: {item.verdict}</strong>{item.abstained && <span> · abstained below confidence threshold</span>}
          <blockquote>{item.evidence.text}</blockquote>
          <small>{Object.entries(item.probabilities).map(([label, value]) => `${label}: ${value.toFixed(3)}`).join(" · ")}</small>
        </article>)}
      </div>}
    </>}
    {result.warnings.map(warning => <p key={warning}>{warning}</p>)}
  </section>;
}
