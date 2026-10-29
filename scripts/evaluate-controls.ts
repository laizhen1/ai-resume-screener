import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { analyzeWithOllama, ANALYSIS_PROMPT_VERSION } from "../lib/ai-analysis";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS, ENGINE_VERSION } from "../lib/analyzer";
import { generationSettings, localModel } from "../lib/local-llm";
async function main(){
 const require=createRequire(import.meta.url);createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(),true);
 const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Supply frozen input and new output path');
 const data=JSON.parse(await readFile(input,'utf8'));if(createHash('sha256').update(JSON.stringify(data.examples)).digest('hex')!==data.hash)throw new Error('Frozen input hash mismatch');
 const results=[];for(const example of data.examples){const started=performance.now();const ai=await analyzeWithOllama(example.job,example.resume,DEFAULT_SCORING_WEIGHTS);const analysis=ai?composeAiAnalysis(example.job,example.resume,DEFAULT_SCORING_WEIGHTS,ai.draft,ai.model):null;const verdict=analysis?.requirementAssessments?.find(a=>a.skill===example.skill)?.verdict??null;results.push({id:example.id,expected:example.expected,actual:verdict,correct:verdict===example.expected,latencyMs:performance.now()-started,ai,analysis});console.error(results.length+'/'+data.examples.length);}
 const correct=results.filter(r=>r.correct).length;await writeFile(output,JSON.stringify({createdAt:new Date().toISOString(),engineVersion:ENGINE_VERSION,promptVersion:ANALYSIS_PROMPT_VERSION,model:localModel('analysis'),generation:generationSettings(localModel('analysis')),dataset:data,correct,total:results.length,unavailable:results.filter(r=>!r.ai).length,results},null,2),{flag:'wx'});console.log({correct,total:results.length});if(results.some(r=>!r.ai))process.exitCode=2;
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
