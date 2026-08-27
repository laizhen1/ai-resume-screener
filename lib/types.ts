export type SyntheticResume = {
  name: string;
  email: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    period: string;
    highlights: string[];
  }>;
  education: string;
};

export type Evidence = {
  criterion: string;
  weight: number;
  score: number;
  explanation: string;
  evidence: string[];
  provenance?: EvidenceProvenance[];
};

export type EvidenceProvenance = {
  text: string;
  section: string;
  start: number;
  end: number;
};

export type ParsedSection = {
  name: string;
  text: string;
  start: number;
  end: number;
};

export type StructuredResume = {
  sections: ParsedSection[];
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
};

export type SemanticMatch = {
  skill: string;
  similarity: number;
  evidence: EvidenceProvenance;
  method: "ollama-embedding" | "deterministic-fallback";
};

export type RequirementImportance = "required" | "preferred" | "unspecified";
export type EvidenceVerdict = "supported" | "partial" | "contradicted" | "unknown";

export type JobRequirement = {
  skill: string;
  importance: RequirementImportance;
  sourceText: string;
};

export type RequirementAssessment = JobRequirement & {
  verdict: EvidenceVerdict;
  confidence: number;
  reason: string;
  evidence?: EvidenceProvenance;
  method: "contextual-rules-v1";
};

export type ReliabilitySummary = {
  evidenceCoverage: number;
  averageConfidence: number;
  extractionQuality: "low" | "medium" | "high";
  status: "review-ready" | "needs-human-verification";
  abstainedRequirements: string[];
};

export type AnalysisResult = {
  overallScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  criteria: Evidence[];
  interviewQuestions: string[];
  warnings: string[];
  disclaimer: string;
  engineVersion?: string;
  taxonomyVersion?: string;
  semanticMatches?: SemanticMatch[];
  structuredResume?: StructuredResume;
  requirementAssessments?: RequirementAssessment[];
  reliability?: ReliabilitySummary;
};
