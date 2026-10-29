"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AnalysisResult } from "@/lib/types";
import type { AnalysisReceipt, AnalysisSnapshot } from "@/lib/analysis-receipt";

export type AnalysisDraft = {
  step: number; jobDescription: string; resumeText: string; file: File | null; role: string; seniority: string;
  result: AnalysisResult | null; analysisSource: { text: string; file: File | null }; demoLoaded: boolean;
  saveSnapshot: AnalysisSnapshot | null; receipt: AnalysisReceipt | null;
};
const Context = createContext<{ draft: AnalysisDraft | null; setDraft: (value: AnalysisDraft | null) => void } | null>(null);
export function AnalysisDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<AnalysisDraft | null>(null);
  return <Context.Provider value={{ draft, setDraft }}>{children}</Context.Provider>;
}
export function useAnalysisDraft() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing analysis draft provider.");
  return context;
}
