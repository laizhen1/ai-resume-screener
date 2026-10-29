import { readFile, writeFile } from "node:fs/promises";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "../lib/analyzer";
import { align } from "../lib/experiments/runner";
import type { ExperimentReport } from "../lib/experiments/types";
async function main(){
 const pairs=[["development-deepseek-v8.json","deepseek-v9-development-2026-10-28.json"],["diagnostic-deepseek-v8.json","deepseek-v9-diagnostic-2026-10-28.json"],["challenge-deepseek-v8.json","deepseek-v9-challenge-verified-2026-10-28.json"]];const output=[];
 for(const [oldFile,newFile] of pairs){const old:ExperimentReport=JSON.parse(await readFile('reports/'+oldFile,'utf8')),current:ExperimentReport=JSON.parse(await readFile('reports/'+newFile,'utf8'));let replayDifferences=0;
 for(const run of [old,current]) for(const row of run.results.filter(r=>r.pipeline==='llm'&&r.modelDraft)){const example=run.examples.find(e=>e.id===row.caseId)!;const result=composeAiAnalysis(example.job,example.resume,DEFAULT_SCORING_WEIGHTS,row.modelDraft!,run.configuration.model);const replay=align(example,(result.requirementAssessments??[]).map(a=>({skill:a.skill,verdict:a.verdict,reason:a.reason,quote:a.evidence?.text??null})));const saved=run.results.find(r=>r.caseId===row.caseId&&r.pipeline==='hybrid')!;replayDifferences+=replay.filter((p,i)=>p.actual!==saved.predictions[i].actual).length;}
 output.push({oldFile,newFile,sameDataset:old.dataset.hash===current.dataset.hash,sameRecordedConfiguration:JSON.stringify(old.configuration)===JSON.stringify(current.configuration),replayDifferences,changes:current.results.filter(r=>r.pipeline==='llm').flatMap(row=>row.predictions.flatMap(p=>{const previous=old.results.find(r=>r.pipeline==='llm'&&r.caseId===row.caseId)?.predictions.find(q=>q.skill===p.skill);return previous?.actual!==p.actual?[{caseId:row.caseId,skill:p.skill,previous,current:p}]:[]}))});}
 await writeFile('reports/deepseek-v10-investigation.json',JSON.stringify({scope:'Saved-output replay before v10 changes; no new model calls. Compares judgments, not candidate scores.',sets:output},null,2),{flag:'wx'});console.log(output.map(({changes,...rest})=>({...rest,changedRawJudgments:changes.length})));
}main();
