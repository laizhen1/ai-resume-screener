# Setup verification — 2026-10-29

The README was checked against the current local source, not a fresh GitHub clone: these changes have not been pushed. A separate directory was populated with application source and configuration, without the existing `node_modules`, `.next`, private environment or career documents.

## Measured checks

| Check | Result |
|---|---|
| Environment | Windows; Node 24.19.0, npm 11.17.0 |
| Dependency installation | `npm ci --offline --no-audit --no-fund` installed 1,096 packages from the local npm cache |
| Production build | `npm run build` passed, including TypeScript and route generation |
| Development startup | `npm run dev -- --hostname 127.0.0.1 --port 3102` served the isolated application |
| Production preview | Same browser workflow passed against `npm run start -- --hostname 127.0.0.1 --port 3103`; final capture uses this preview |
| Configuration | Explicit AI/embeddings/transformers disabled; memory repository; inline jobs; private local auth bypass |
| Guided review | Four expected states, exact source highlight, separate correction and JSON export verified |
| Workspace | Original analysis saved, correction retained after opening and reloading the candidate |
| Mobile | No horizontal overflow at 390px in the saved review |
| Browser exceptions | None during the captured walkthrough |

See [capture metadata](images/demo-capture.json), [demo instructions](demo.md) and [the recording](images/resume-lab-demo.webm). Screenshots show real rendered UI from the isolated app; analysis responses were not mocked.

## What this verifies—and what it does not

The source and lockfile can install and build without reusing the project's installed dependencies, and the offline review workflow works without a model or database. The cache-backed install does not verify a cold network download, a clean OS, macOS/Linux, Docker, PostgreSQL/Redis or Python-model setup. The browser reused an installed Chromium runtime. No large models were downloaded. The development-server log included a hydration warning during the initial capture; the workflow still passed. The capture checks uncaught page exceptions, not all console warnings, so this is not a claim of warning-free development output. Its cause was not established in this pass.

The first sandboxed install encountered Windows `EPERM`; rerunning the same command with normal host filesystem access succeeded. npm emitted dependency deprecation and install-script policy notices. The app build and text-based demo succeeded; optional OCR, ONNX and Python tooling were not exercised. The production preview also emitted Next.js’s standalone-output warning: deployment should use the generated standalone server/container packaging described in operations. The preview served successfully, but this pass does not claim deployment verification. This pass was not a dependency security audit.

## Setup corrections made

- Added `.env.demo.example`: AI calls are now explicitly disabled for the no-model quick start. Without explicit settings, the application can attempt local AI before falling back.
- Use `npm ci` for lockfile-based installation. Copy configuration only for a fresh checkout; merge settings when a private `.env.local` already exists.
- Separate model-free startup from Ollama setup and optional multi-GB Python model downloads.
- Explain occupied ports, provider/fallback badges, memory-store lifetime and the Playwright browser/server requirements.
- Remove stale engine/scoring claims from the overview; link measured V13 results and preserve historical evaluations.

Application behavior did not change in this polish pass. The V13 validation remains 214 unit tests, 15 browser tests, lint and build passing. This pass added a fresh installation/build and an actual browser demonstration; it did not rerun model evaluations.
