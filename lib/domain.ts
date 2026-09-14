import type { AnalysisResult } from "./types";

export type ReviewStatus = "new" | "reviewing" | "interview" | "hold" | "closed";

export type JobCriterion = {
  id: string;
  name: string;
  weight: number;
  required: boolean;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  criteria: JobCriterion[];
  createdAt: string;
};

export type Candidate = {
  id: string;
  jobId: string;
  displayName: string;
  fileName: string;
  resumeText?: string;
  retentionUntil: string;
  status: ReviewStatus;
  notes: string;
  analysis?: AnalysisResult;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type EvaluationRunRecord = {
  id: string;
  engineVersion: string;
  datasetSize: number;
  metrics: Record<string, number>;
  report?: import("./experiments/types").ExperimentReport;
  createdAt: string;
};
