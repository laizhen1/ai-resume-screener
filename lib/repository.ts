import type { AuditEvent, Candidate, EvaluationRunRecord, Job, ReviewStatus } from "./domain";

export type CreateJobInput = Pick<Job, "title" | "description" | "criteria">;
export type CreateCandidateInput = Pick<Candidate, "jobId" | "displayName" | "fileName" | "resumeText" | "retentionUntil"> & Partial<Pick<Candidate, "analysis">>;

export interface WorkspaceRepository {
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  createJob(input: CreateJobInput): Promise<Job>;
  listCandidates(jobId: string): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | null>;
  createCandidate(input: CreateCandidateInput): Promise<Candidate>;
  updateCandidate(id: string, update: { status?: ReviewStatus; notes?: string; analysis?: Candidate["analysis"] }): Promise<Candidate | null>;
  deleteCandidate(id: string): Promise<boolean>;
  deleteExpiredCandidates(now?: Date): Promise<number>;
  addAudit(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
  listAudit(entityId?: string): Promise<AuditEvent[]>;
  saveEvaluation(run: Omit<EvaluationRunRecord, "id" | "createdAt">): Promise<EvaluationRunRecord>;
  listEvaluations(): Promise<EvaluationRunRecord[]>;
}

let repositoryPromise: Promise<WorkspaceRepository> | null = null;

export function getRepository(): Promise<WorkspaceRepository> {
  if (!repositoryPromise) {
    repositoryPromise = process.env.DATA_MODE === "postgres"
      ? import("./repositories/postgres").then(({ PostgresRepository }) => new PostgresRepository())
      : import("./repositories/memory").then(({ memoryRepository }) => memoryRepository);
  }
  return repositoryPromise;
}
