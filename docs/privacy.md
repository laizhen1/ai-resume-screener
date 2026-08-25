# Privacy and data handling

## Foundation behavior

- Uploaded files are read into server memory for the duration of one request.
- The application does not write resumes, extracted text or analysis results to a database or filesystem.
- The browser retains only the current page state.
- Ollama generation receives only a requested fictional role and seniority—not an uploaded resume.
- The project does not include analytics or telemetry.

Infrastructure can still produce access logs, temporary data or crash dumps. Anyone deploying the application is responsible for configuring those systems, access controls, TLS, retention and regional legal requirements.

## Safe demonstration data

The generator is instructed to create fictional identities and employers. Its output is validated, and non-example email addresses are replaced. Do not treat synthetic profiles as representative of demographic groups or use them to claim fairness.

## Prohibited product direction

Contributions should not introduce protected-attribute inference, emotion/personality inference, automatic rejection, covert candidate monitoring, or model training on uploaded resumes.

## Reporting

Do not submit real resumes in public issues. Follow `SECURITY.md` for vulnerabilities that could expose personal data.
