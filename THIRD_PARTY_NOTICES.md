# Third-party notices

This project depends on open-source packages installed through `package.json`. Their original copyright holders and licenses apply.

Key direct dependencies include:

| Package | Purpose | License |
| --- | --- | --- |
| Next.js | Web application framework | MIT |
| React | User interface | MIT |
| Zod | Runtime validation | MIT |
| Mammoth.js | DOCX text extraction | BSD-2-Clause |
| pdf-parse | PDF text extraction | MIT |
| node-postgres (`pg`) | PostgreSQL access | MIT |
| node-redis (`redis`) | Background queue transport | MIT |
| Tesseract.js | Local image OCR | Apache-2.0 |
| Vitest | Testing | MIT |
| Playwright | End-to-end browser testing | Apache-2.0 |
| tsx | TypeScript script execution | MIT |

Ollama is an optional external local service and is not redistributed by this repository. Models downloaded through Ollama can have their own licenses; users must review the license of the model they select.

Run the package manager's license-report tooling before every public release and update this file when direct dependencies change.
