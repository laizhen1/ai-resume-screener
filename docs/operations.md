# Operations

## Local modes

The zero-infrastructure defaults are `DATA_MODE=memory` and `QUEUE_MODE=inline`. PostgreSQL requires `npm run db:migrate`; Redis queue mode requires a continuously running `npm run worker` process.

Docker Compose performs both automatically and is the easiest way to exercise the complete stack.

## Authentication

Generate a password hash with `npm run auth:hash -- your-password`. Set `AUTH_DISABLED=false`, `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, and a random `AUTH_SECRET` of at least 32 characters. Terminate TLS before the application.

## Retention

Every stored candidate has `retentionUntil`. An admin can invoke `POST /api/workspace/retention`; production deployments should schedule the same operation daily. Audit metadata does not contain resume text and remains after candidate deletion.

## Observability

Instrumented operations emit structured JSON logs with a trace ID, duration and failure flag. Authenticated users can inspect process-local aggregates at `GET /api/metrics`. Forward logs to a protected backend and configure a short retention period because infrastructure metadata can still be sensitive.

## OCR

PNG and JPEG OCR downloads Tesseract language assets on first use. Pin or mirror those assets in network-restricted deployments. A scanned-PDF OCR endpoint must accept multipart `file` and return JSON shaped as `{ "text": "..." }`.

## Backup and deletion

Database backups are outside the application's deletion boundary. Document backup schedules and restore tests, limit operators, encrypt backups and ensure retention promises include backup expiration.

## Optional model service operations

Use `docker compose -f docker-compose.yml -f docker-compose.models.yml up --build` to include local transformer inference, or follow the [Python setup](../services/model-service/README.md). Wait for `/health` to report ready; model downloads occur during first startup. The override enables the service URL on both web and worker. Keep a single inference worker unless memory capacity has been measured. Busy requests return 503 and must be retried.

For an existing standalone deployment, set `ENABLE_TRANSFORMER_ANALYSIS=true`, `MODEL_SERVICE_URL`, and optionally matching `MODEL_SERVICE_TOKEN` values on the app/worker and model service. Python service settings must be exported in its own shell; Next.js `.env.local` does not configure a separate Python process. The comparison CLI likewise reads exported environment variables. Keep port 8000 private. Cache model weights before enabling `HF_HUB_OFFLINE=1` for disconnected inference.

Model failure preserves existing analysis and displays unavailable transformer evidence. Evaluation never substitutes rules as transformer measurements. Q&A needs both the model service and Ollama; it returns an unavailable response if retrieval, generation or citation validation fails.
