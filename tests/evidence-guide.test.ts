import { expect, it } from "vitest";
import { buildAnalysisContract } from "@/lib/ai-analysis";
it("gives each requirement alias-aware source candidates without verdicts",()=>{
 const contract=buildAnalysisContract("GitHub Actions and React required.","Example College\nImplemented GitHub workflows.\nReact to customer feedback.\nBuilt React pages.");
 expect(contract.evidenceGuide.find(g=>g.skill==="github actions")).toMatchObject({aliases:["github actions","github workflow","github workflows"],candidatePassageIds:["s1"]});
 expect(contract.evidenceGuide.find(g=>g.skill==="react")?.candidatePassageIds).toEqual(["s2","s3"]);
 expect(JSON.stringify(contract.evidenceGuide)).not.toContain("verdict");
});
it("returns no invented candidates for an absent skill",()=>{
 expect(buildAnalysisContract("Docker required.","Fictional School").evidenceGuide[0].candidatePassageIds).toEqual([]);
});
it("splits delivery and coursework sentences while preserving exact source text",()=>{
 const source="Built SQL dashboards. Completed introductory Python coursework.";
 const c=buildAnalysisContract("SQL and Python required.",source);
 expect(c.passages.map(p=>p.text)).toEqual(["Built SQL dashboards.","Completed introductory Python coursework."]);
 expect(c.evidenceGuide.find(g=>g.skill==="python")?.candidatePassageIds).toEqual(["s1"]);
 expect(c.passages.every(p=>source.includes(p.text))).toBe(true);
});
