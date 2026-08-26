CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  file_name text NOT NULL,
  resume_text text,
  embedding vector,
  retention_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','interview','hold','closed')),
  notes text NOT NULL DEFAULT '',
  analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidates_job_id_idx ON candidates(job_id);
CREATE INDEX IF NOT EXISTS candidates_retention_idx ON candidates(retention_until);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_events(entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id uuid PRIMARY KEY,
  engine_version text NOT NULL,
  dataset_size integer NOT NULL,
  metrics jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
