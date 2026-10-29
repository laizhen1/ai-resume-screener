import { expect,it } from "vitest";
import { buildAnalysisContract } from "@/lib/ai-analysis";
import { explicitBoundary } from "@/lib/evidence-boundaries";
it("separates JSON values and gives each skill only its exact evidence",()=>{
 const source=JSON.stringify({AWS:"I might take an AWS class later.",Azure:"I have never used Azure."});
 const c=buildAnalysisContract("AWS and Azure required.",source);
 expect(c.passages).toHaveLength(2);
 expect(c.passages.every(p=>source.includes(p.text))).toBe(true);
 expect(c.evidenceGuide.find(g=>g.skill==='azure')?.candidatePassages.map(p=>p.text)).toEqual(['"I have never used Azure."']);
});
it("retains escaped JSON text as literal source evidence",()=>{
 const source=JSON.stringify({note:'Built Python tools called "Quartz".'});
 const c=buildAnalysisContract('Python required.',source);
 expect(c.passages.every(p=>source.includes(p.text))).toBe(true);
});
it("separates Chinese quoted advert and applicant denial without rewriting",()=>{
 const source='招聘广告引用：“使用 Python 清洗数据。”这不是我的经历。我从未使用过 TypeScript。';
 const c=buildAnalysisContract('Python and TypeScript required.',source);
 expect(c.passages.every(p=>source.includes(p.text))).toBe(true);
 expect(c.evidenceGuide.find(g=>g.skill==='python')?.candidatePassages.every(p=>!p.text.includes('TypeScript'))).toBe(true);
});
it("keeps malformed JSON as source text",()=>{
 const source='{ note: "Built Python services."';
 expect(buildAnalysisContract('Python required.',source).passages.every(p=>source.includes(p.text))).toBe(true);
});
it.each([
 ['tailwind','A blank form includes "Tailwind: add your example"; it is not completed.','contradicted','unknown'],
 ['python','引用职位广告：“使用 Python 清洗数据。”这不是我的经历，工作记录中没有提供相关证据。我从未使用过 TypeScript。','contradicted','unknown'],
 ['go','Here Go is an ordinary English word, not a software skill.','contradicted','unknown'],
 ['azure','Azure is only a future reading topic;','contradicted','unknown'],
 ['azure','Built Azure services for a future reading recommendation product.','supported',null],
 ['tailwind','Built Tailwind components for a blank form editor.','supported',null],
 ['go','I have never used Go.','contradicted',null],
 ['azure','I have no professional experience with Azure.','partial','contradicted'],
 ['java','My 2018 biography said I had never used Java. In 2023 I implemented Java services; that earlier statement is obsolete.','contradicted','supported'],
 ['java','My 2025 biography said I had never used Java. In 2019 I implemented Java services; that earlier statement is obsolete.','contradicted',null],
 ['java','My 2018 biography said I had never used Java. In 2023 I implemented Java services.','contradicted',null],
 ['java','My 2018 biography said I had never used Java. In 2023 I implemented Java services; that earlier statement is obsolete.','unknown',null]
] as const)("boundary %s %s",(skill,text,original,expected)=>expect(explicitBoundary(skill,text,original)).toBe(expected));
