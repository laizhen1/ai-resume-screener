# Threat model

## Sensitive assets

- Resume text and extracted evidence
- Reviewer notes and workflow decisions
- Authentication secrets and session cookies
- Audit metadata

## Main threats and controls

| Threat | Included control | Remaining operator responsibility |
| --- | --- | --- |
| Malicious upload | Size limit, allowlist and file-signature checks | Malware scanning and sandboxed conversion |
| Unauthorized access | Signed HTTP-only sessions and rate limiting | TLS, identity lifecycle and secret rotation |
| Excess retention | Per-candidate expiry and deletion endpoint | Scheduled execution and backup expiry |
| Silent model influence | Semantic results are advisory and labelled | Reviewer training and policy enforcement |
| Negated or aspirational claim treated as experience | Contextual verdicts separate contradicted and partial evidence; adversarial CI metrics | Manual evidence review and broader external evaluation |
| False certainty | Unknown verdicts, explicit abstention and extraction-quality warnings | Reviewer training; never interpret confidence as qualification probability |
| Empty/incorrect extraction | Minimum text checks, warnings and OCR boundary | Manual comparison with the source document |
| Audit tampering | Append-only application behavior | Restricted database roles and external log integrity |
| Denial of service | Request and batch limits | Reverse-proxy limits and capacity monitoring |

The built-in memory rate limiter and single-user authentication are portfolio-grade controls. Distributed deployments require shared rate-limit state and enterprise identity integration.
