import { readFile,writeFile,access } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { z } from "zod";
import { analyzeResume,composeAiAnalysis,DEFAULT_SCORING_WEIGHTS,ENGINE_VERSION } from "../lib/analyzer";
import { analyzeWithOllama,ANALYSIS_PROMPT_VERSION,EVIDENCE_POLICY_VERSION } from "../lib/ai-analysis";
import { EVIDENCE_VALIDATION_VERSION } from "../lib/evidence-eligibility";
import { generationSettings,localModel,localTimeout } from "../lib/local-llm";
import { TAXONOMY_VERSION } from "../lib/skills";
import { align } from "../lib/experiments/runner";
import { ALIGNMENT_VERSION } from "../lib/requirement-identity";
import { summarize } from "../lib/experiments/metrics";
import { VERDICTS,type CaseResult,type ExperimentReport } from "../lib/experiments/types";
const schema=z.object({version:z.string(),frozenAt:z.string(),annotationStatus:z.string(),hash:z.string(),sources:z.record(z.string(),z.string()),examples:z.array(z.object({id:z.string(),challenge:z.string(),job:z.string(),resume:z.string(),expectedVerdicts:z.record(z.string(),z.enum(VERDICTS))})).min(1)});
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
async function main(){const require=createRequire(import.meta.url);createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(),true);const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Supply frozen dataset and new output filename');try{await access(output);throw new Error('Output already exists; refusing rerun overwrite');}catch(e){if(!(e instanceof Error && 'code' in e && e.code==='ENOENT'))throw e;}
 const bytes=await readFile(input);const frozen=schema.parse(JSON.parse(bytes.toString()));if(hash(JSON.stringify(frozen.examples))!==frozen.hash)throw new Error('Frozen examples/labels changed');if(new Set(frozen.examples.map(e=>e.id)).size!==frozen.examples.length)throw new Error('Duplicate case IDs');
 const assertSources=async()=>{for(const [f,expected] of Object.entries(frozen.sources))if(hash(await readFile(f))!==expected)throw new Error('Frozen engine source changed: '+f);};await assertSources();
 const model=localModel('analysis'),settings=generationSettings(model),timeoutMs=localTimeout();const results:CaseResult[]=[];const start=new Date().toISOString();
 const mapped=(a:ReturnType<typeof analyzeResume>)=>(a.requirementAssessments??[]).map(x=>({skill:x.skill,verdict:x.verdict,reason:x.reason,quote:x.evidence?.text??null}));
 const report=():ExperimentReport=>({version:'comparison-v1',createdAt:new Date().toISOString(),engineVersion:ENGINE_VERSION,taxonomyVersion:TAXONOMY_VERSION,dataset:{version:frozen.version,split:'heldout',hash:frozen.hash,uniqueCases:frozen.examples.length,executions:frozen.examples.length,annotationStatus:frozen.annotationStatus},configuration:{includeModel:true,includeTransformers:false,model,promptVersion:ANALYSIS_PROMPT_VERSION,evidencePolicyVersion:EVIDENCE_POLICY_VERSION,evidenceValidationVersion:EVIDENCE_VALIDATION_VERSION,alignmentVersion:ALIGNMENT_VERSION,outputSemantics:'One fresh generation per document; raw and checked pipelines share that generation. No tuning during this run.',seed:settings.options.seed,temperature:settings.options.temperature,timeoutMs,node:process.version,platform:process.platform,generation:settings},examples:frozen.examples,results,summaries:['rules','llm','hybrid'].map(p=>summarize(p as 'rules'|'llm'|'hybrid',results))});
 for(const [index,e] of frozen.examples.entries()){
 const t=performance.now(),rules=analyzeResume(e.job,e.resume),rulesMs=performance.now()-t;const base={caseId:e.id,challenge:e.challenge};results.push({...base,pipeline:'rules',provider:'rules',latencyMs:rulesMs,predictions:align(e,mapped(rules))});
 let diagnostic='not-run';let invalidOutput:unknown;const modelStart=performance.now();const ai=await analyzeWithOllama(e.job,e.resume,DEFAULT_SCORING_WEIGHTS,{model,seed:settings.options.seed,temperature:settings.options.temperature,timeoutMs,onDiagnostic:s=>{diagnostic=s;},onInvalidOutput:v=>{invalidOutput=v;}});const modelMs=performance.now()-modelStart;
 if(!ai){results.push({...base,pipeline:'llm',provider:'unavailable',latencyMs:modelMs,predictions:[],error:diagnostic,modelOutput:invalidOutput});results.push({...base,pipeline:'hybrid',provider:'fallback',latencyMs:rulesMs+modelMs,predictions:align(e,mapped(rules)),error:diagnostic});}
 else{results.push({...base,pipeline:'llm',provider:'ollama',latencyMs:modelMs,modelDraft:ai.draft,modelOutput:ai.wireOutput,requestMetadata:ai.requestMetadata,predictions:align(e,ai.draft.requirements.map(x=>({...x,quote:x.evidenceText})))});const checkStart=performance.now();try{const checked=composeAiAnalysis(e.job,e.resume,DEFAULT_SCORING_WEIGHTS,ai.draft,ai.model);results.push({...base,pipeline:'hybrid',provider:'ollama',latencyMs:rulesMs+modelMs+performance.now()-checkStart,predictions:align(e,mapped(checked)),evidenceChecks:(checked.requirementAssessments??[]).flatMap(a=>a.evidenceValidation?[{skill:a.skill,...a.evidenceValidation}]:[])});}catch{results.push({...base,pipeline:'hybrid',provider:'fallback',latencyMs:rulesMs+modelMs+performance.now()-checkStart,predictions:align(e,mapped(rules)),error:'Composition failed'});}}
 await writeFile(output+'.checkpoint.json',JSON.stringify({status:'checkpoint',completedDocuments:index+1,totalDocuments:frozen.examples.length,report:report()},null,2));console.error('Completed '+(index+1)+'/'+frozen.examples.length+' documents');
 }
 await assertSources();const final=report();await writeFile(output,JSON.stringify({...final,protocol:{startedAt:start,frozenArtifact:input,frozenFileHash:hash(bytes),engineSourcesUnchanged:true,engineSources:frozen.sources,labelExposure:'Only job and resume supplied to inference; references used only by evaluation.',independentlyAnnotated:false,tunedDuringRun:false}},null,2),{flag:'wx'});console.log(final.summaries);if(final.summaries.some(s=>s.status!=='complete'))process.exitCode=2;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
