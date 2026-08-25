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
};

export type AnalysisResult = {
  overallScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  criteria: Evidence[];
  interviewQuestions: string[];
  warnings: string[];
  disclaimer: string;
};
