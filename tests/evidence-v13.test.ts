import { expect,it } from "vitest";
import { buildAnalysisContract } from "@/lib/ai-analysis";
import { explicitBoundary } from "@/lib/evidence-boundaries";
it("isolates exact array values by skill without borrowing another skill's learning",()=>{
 const source=JSON.stringify([{owner:'applicant',note:'I am taking introductory React lessons.'},{owner:'employer',note:'Angular experience is requested by the vacancy.'}]);
 const contract=buildAnalysisContract('React and Angular required.',source);
 expect(contract.evidenceGuide.find(g=>g.skill==='angular')?.candidatePassages.map(p=>p.text)).toEqual(['"Angular experience is requested by the vacancy."']);
 expect(contract.passages.every(p=>source.includes(p.text))).toBe(true);
 expect(explicitBoundary('angular',source,'contradicted')).toBe('unknown');
 expect(explicitBoundary('react',source,'contradicted')).toBe('partial');
});
it("preserves malformed arrays and escaped string citations",()=>{
 for(const source of ['[invalid Python text',JSON.stringify(['Built Python tools named "Archive".'])]){
 expect(buildAnalysisContract('Python required.',source).passages.every(p=>source.includes(p.text))).toBe(true);
 }
});
it.each([
 ['python','附件中的招聘广告写着“熟练使用 Python”，这是目标岗位的要求。','contradicted','unknown'],
 ['aws','AWS 是我明年计划阅读的主题，目前没有开始学习。','partial','unknown'],
 ['tailwind','| Tailwind project | [applicant to complete] |','supported','unknown'],
 ['angular','Angular experience is requested by the vacancy.','contradicted','unknown'],
 ['python','我独立开发 Python 招聘广告编辑器，并持续维护。','supported',null],
 ['tailwind','Built Tailwind forms containing an applicant to complete placeholder.','supported',null],
 ['angular','I built Angular software requested by the employer.','supported',null],
 ['aws','I have never used AWS.','partial','contradicted'],
 ['aws','I am taking introductory AWS lessons.','partial',null],
 ['python','招聘广告写着 Python。','unknown',null],
 ['tailwind','I have never used Tailwind.','supported','contradicted'],
 ['python','我使用 Python 开发并上线明年的阅读计划管理工具。','supported',null]
] as const)('scoped boundary %s %s',(skill,text,original,expected)=>expect(explicitBoundary(skill,text,original)).toBe(expected));
