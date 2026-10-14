# Smoke dataset card

These fictional, agent-authored English examples are software fixtures, not independently annotated training or benchmark data. They are separate from `lib/experiments/dataset.ts` and do not import or relabel the existing held-out set. There are 3 NER documents and 4 evidence documents per split, plus 4 retrieval cases. These sizes are deliberately inadequate for model-quality claims.

## Schema

All training rows require stable `id`, `document_id`, and `group_id`. Group every document sharing an applicant, source, or template family under a common group ID before assigning train/validation/test splits. The loader checks overlap but cannot detect falsely assigned groups or all semantic duplicates.

NER example:

```json
{"id":"n1","document_id":"doc1","group_id":"source-family-1","text":"Used Python.","entities":[{"start":5,"end":11,"text":"Python","label":"SKILL"}]}
```

Offsets are zero-based, end-exclusive Python Unicode character offsets, not UTF-16 code units. The existing inference adapter converts returned entity spans for JavaScript. Annotate exact surface text, use non-overlapping spans, and leave surrounding whitespace outside the span. `SKILL` denotes a competency/language; `TOOL` denotes a named product/platform; `QUALIFICATION` a credential; `JOB_TITLE` a role; `DATE` an explicit date/year. Decide ambiguous skill/tool distinctions in the annotation guide before labeling; the fixtures do not establish a universal taxonomy.

Evidence example:

```json
{"id":"e1","document_id":"doc2","group_id":"source-family-2","requirement":"Python experience is required.","skill":"python","passage":"Completed a Python course.","label":"partial","challenge":"coursework"}
```

Use `supported` for explicit demonstrated use, `partial` for coursework/limited exposure, `contradicted` for explicit negation, and `unknown` when the passage does not establish evidence. Label the supplied passage, not claims elsewhere in the document. `skill` is needed for the rules/NLI baseline comparison; `challenge` supplies error-analysis slices.

Retrieval example:

```json
{"id":"q1","query":"Python services","passages":[{"id":8,"text":"Built Python services."},{"id":21,"text":"Processed invoices."}],"relevantIds":[8]}
```

Each retrieval case must have at least one relevant passage and unique passage IDs. Relevance means the passage addresses the query; deciding whether it demonstrates work is a separate classification task. This benchmark does not yet cover queries with no relevant answer; abstention is tested separately in Q&A and Promptfoo.

## Preparing a useful corpus

Use fictional or consented documents with recorded provenance. Write annotation instructions, have independent annotators label a sample, adjudicate disagreements, and document class coverage and limitations. Split entire source/template groups, including all requirement pairs from each document. Add varied layouts, ambiguous terms, negation, coursework, attribution, and unrelated passages. Keep private corpora in ignored `datasets/private/`. Never tune on test predictions and continue describing that same split as untouched.
