import { randomUUID } from "node:crypto";
import type { AuditEvent, Candidate, EvaluationRunRecord, Job } from "../domain";
import type { CreateCandidateInput, CreateJobInput, WorkspaceRepository } from "../repository";

type Store = {
  jobs: Job[];
  candidates: Candidate[];
  audit: AuditEvent[];
  evaluations: EvaluationRunRecord[];
};

const globalStore = globalThis as typeof globalThis & { __openResumeLabStore?: Store };
const store = globalStore.__openResumeLabStore ?? { jobs: [], candidates: [], audit: [], evaluations: [] };
globalStore.__openResumeLabStore = store;

export const memoryRepository: WorkspaceRepository = {
  async listJobs() { return [...store.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async getJob(id) { return store.jobs.find((job) => job.id === id) ?? null; },
  async createJob(input: CreateJobInput) {
    const job: Job = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store.jobs.push(job);
    return job;
  },
  async listCandidates(jobId) { return store.candidates.filter((candidate) => candidate.jobId === jobId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async getCandidate(id) { return store.candidates.find((candidate) => candidate.id === id) ?? null; },
  async createCandidate(input: CreateCandidateInput) {
    const now = new Date().toISOString();
    const candidate: Candidate = { ...input, id: randomUUID(), status: "new", notes: "", createdAt: now, updatedAt: now };
    store.candidates.push(candidate);
    return candidate;
  },
  async updateCandidate(id, update) {
    const candidate = store.candidates.find((item) => item.id === id);
    if (!candidate) return null;
    Object.assign(candidate, update, { updatedAt: new Date().toISOString() });
    return candidate;
  },
  async deleteCandidate(id) {
    const index = store.candidates.findIndex((candidate) => candidate.id === id);
    if (index < 0) return false;
    store.candidates.splice(index, 1);
    return true;
  },
  async deleteExpiredCandidates(now = new Date()) {
    const remaining = store.candidates.filter((candidate) => new Date(candidate.retentionUntil) > now);
    const deleted = store.candidates.length - remaining.length;
    store.candidates.splice(0, store.candidates.length, ...remaining);
    return deleted;
  },
  async addAudit(input) {
    const event: AuditEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store.audit.push(event);
    return event;
  },
  async listAudit(entityId) {
    return store.audit.filter((event) => !entityId || event.entityId === entityId || event.metadata.jobId === entityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async saveEvaluation(input) {
    const run: EvaluationRunRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store.evaluations.push(run);
    return run;
  },
  async listEvaluations() { return [...store.evaluations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
};
