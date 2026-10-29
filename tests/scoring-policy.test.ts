import { expect, it } from "vitest";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "@/lib/analyzer";
import type { AiAnalysisDraft } from "@/lib/ai-analysis";
const draft = (verdict: "supported" | "partial" | "contradicted" | "unknown", evidenceText: string | null): AiAnalysisDraft => ({requirements: [{skill: "python", importance: "required", sourceText: "Python required.", verdict, confidence: 1, reason: "Fixture", evidenceText}], criteria: ["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(criterion => ({criterion, score: 100, explanation: "Model suggestion", evidence: []})), interviewQuestions: ["Describe work"], warnings: ["Review"]});
it.each([["supported",100],["partial",40],["contradicted",0],["unknown",0]] as const)("scores checked %s as %s", (verdict, score) => {
 const input=draft(verdict,"Used Python."); const before=JSON.stringify(input);
 const result=composeAiAnalysis("Python required.","Used Python.",DEFAULT_SCORING_WEIGHTS,input,"fixture");
 expect(result.criteria[0].score).toBe(score); expect(result.overallScore).toBe(Math.round(score*.55+45));
 expect(result.originalModelRubric?.overallScore).toBe(100); expect(JSON.stringify(input)).toBe(before);
});
it("removes skills points after invalid evidence and handles empty requirements",()=>{
 const input=draft("supported","Invented quote");
 expect(composeAiAnalysis("Python required.","Used Python.",DEFAULT_SCORING_WEIGHTS,input,"fixture").criteria[0].score).toBe(0);
 input.requirements=[];
 expect(composeAiAnalysis("Python required.","Used Python.",DEFAULT_SCORING_WEIGHTS,input,"fixture").criteria[0].score).toBe(0);
});
