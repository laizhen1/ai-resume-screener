import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import type { AuditEvent, Candidate, EvaluationRunRecord, Job } from "../domain";
import type { CreateCandidateInput, CreateJobInput, WorkspaceRepository } from "../repository";

function mapJob(row: QueryResultRow): Job {
  return { id: row.id, title: row.title, description: row.description, criteria: row.criteria, createdAt: row.created_at.toISOString() };
}

function mapCandidate(row: QueryResultRow): Candidate {
  return {
    id: row.id, jobId: row.job_id, displayName: row.display_name, fileName: row.file_name,
    resumeText: row.resume_text ?? undefined, retentionUntil: row.retention_until.toISOString(),
    status: row.status, notes: row.notes, analysis: row.analysis ?? undefined,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

export class PostgresRepository implements WorkspaceRepository {
  private readonly pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when DATA_MODE=postgres.");
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  }

  async listJobs() { return (await this.pool.query("SELECT * FROM jobs ORDER BY created_at DESC")).rows.map(mapJob); }
  async getJob(id: string) { const row = (await this.pool.query("SELECT * FROM jobs WHERE id=$1", [id])).rows[0]; return row ? mapJob(row) : null; }
  async createJob(input: CreateJobInput) {
    const row = (await this.pool.query("INSERT INTO jobs(id,title,description,criteria) VALUES($1,$2,$3,$4) RETURNING *", [randomUUID(), input.title, input.description, JSON.stringify(input.criteria)])).rows[0];
    return mapJob(row);
  }
  async listCandidates(jobId: string) { return (await this.pool.query("SELECT * FROM candidates WHERE job_id=$1 ORDER BY created_at DESC", [jobId])).rows.map(mapCandidate); }
  async getCandidate(id: string) { const row = (await this.pool.query("SELECT * FROM candidates WHERE id=$1", [id])).rows[0]; return row ? mapCandidate(row) : null; }
  async createCandidate(input: CreateCandidateInput) {
    const row = (await this.pool.query(
      "INSERT INTO candidates(id,job_id,display_name,file_name,resume_text,retention_until,analysis) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [randomUUID(), input.jobId, input.displayName, input.fileName, input.resumeText, input.retentionUntil, JSON.stringify(input.analysis ?? null)]
    )).rows[0];
    return mapCandidate(row);
  }
  async updateCandidate(id: string, update: Partial<Pick<Candidate, "status" | "notes" | "analysis"> >) {
    const current = await this.getCandidate(id);
    if (!current) return null;
    const row = (await this.pool.query(
      "UPDATE candidates SET status=$2,notes=$3,analysis=$4,updated_at=NOW() WHERE id=$1 RETURNING *",
      [id, update.status ?? current.status, update.notes ?? current.notes, JSON.stringify(update.analysis ?? current.analysis ?? null)]
    )).rows[0];
    return mapCandidate(row);
  }
  async deleteCandidate(id: string) { return (await this.pool.query("DELETE FROM candidates WHERE id=$1", [id])).rowCount === 1; }
  async deleteExpiredCandidates(now = new Date()) { return (await this.pool.query("DELETE FROM candidates WHERE retention_until <= $1", [now])).rowCount ?? 0; }
  async addAudit(input: Omit<AuditEvent, "id" | "createdAt">) {
    const row = (await this.pool.query(
      "INSERT INTO audit_events(id,actor,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [randomUUID(), input.actor, input.action, input.entityType, input.entityId, JSON.stringify(input.metadata)]
    )).rows[0];
    return { id: row.id, actor: row.actor, action: row.action, entityType: row.entity_type, entityId: row.entity_id, metadata: row.metadata, createdAt: row.created_at.toISOString() };
  }
  async listAudit(entityId?: string) {
    const result = entityId
      ? await this.pool.query("SELECT * FROM audit_events WHERE entity_id=$1 OR metadata->>'jobId'=$1 ORDER BY created_at DESC", [entityId])
      : await this.pool.query("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 250");
    return result.rows.map((row) => ({ id: row.id, actor: row.actor, action: row.action, entityType: row.entity_type, entityId: row.entity_id, metadata: row.metadata, createdAt: row.created_at.toISOString() }));
  }
  async saveEvaluation(input: Omit<EvaluationRunRecord, "id" | "createdAt">) {
    const row = (await this.pool.query(
      "INSERT INTO evaluation_runs(id,engine_version,dataset_size,metrics) VALUES($1,$2,$3,$4) RETURNING *",
      [randomUUID(), input.engineVersion, input.datasetSize, JSON.stringify(input.metrics)]
    )).rows[0];
    return { id: row.id, engineVersion: row.engine_version, datasetSize: row.dataset_size, metrics: row.metrics, createdAt: row.created_at.toISOString() };
  }
  async listEvaluations() {
    return (await this.pool.query("SELECT * FROM evaluation_runs ORDER BY created_at DESC")).rows.map((row) => ({ id: row.id, engineVersion: row.engine_version, datasetSize: row.dataset_size, metrics: row.metrics, createdAt: row.created_at.toISOString() }));
  }
}
