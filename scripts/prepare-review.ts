import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getDataset } from "../lib/experiments/dataset";
const row=z.object({caseId:z.string(),skill:z.string(),verdict:z.enum(["supported","partial","contradicted","unknown"]),reason:z.string().min(10),reviewer:z.string().min(2),family:z.string().min(2),source:z.enum(["human","external","agent"])}).strict();
async function main(){
 const [mode,path,output]=process.argv.slice(2); if(!path || !output) throw new Error("Usage: tsx scripts/prepare-review.ts export challenge output.json OR validate packet.json labels.json");
 if(mode === "export") {
 if(!["challenge","heldout","development"].includes(path)) throw new Error("Unknown split");
 const {examples,metadata}=getDataset(path as "challenge");
 const cases=examples.map(({id,job,resume,expectedVerdicts})=>({id,job,resume,skills:Object.keys(expectedVerdicts)}));
 await writeFile(output,JSON.stringify({version:"blind-review-v1",provenance:metadata,hash:createHash("sha256").update(JSON.stringify(cases)).digest("hex"),instructions:"Labels and predictions omitted. Existing synthetic material is reused, not an unseen independent test.",cases},null,2),{flag:"wx"});
 }else if(mode === "validate"){
 const packet=JSON.parse(await readFile(path,"utf8"));
 if(createHash("sha256").update(JSON.stringify(packet.cases)).digest("hex")!==packet.hash) throw new Error("Packet hash mismatch");
 const labels=z.array(row).parse(JSON.parse(await readFile(output,"utf8")));
 const required=new Set<string>(packet.cases.flatMap((c:{id:string;skills:string[]})=>c.skills.map(skill=>c.id+":"+skill)));
 const seen=new Set<string>(); for(const label of labels){const key=label.caseId+":"+label.skill;if(!required.has(key)||seen.has(key))throw new Error("Unknown or duplicate judgment: "+key);seen.add(key);}
 if(seen.size!==required.size)throw new Error("Incomplete labels");
 console.log(JSON.stringify({valid:true,judgments:labels.length,claimedSources:[...new Set(labels.map(l=>l.source))],independenceVerified:false,note:"Reviewer identity, unseen families and adjudication require human verification. No automatic promotion to independent benchmark."},null,2));
 }else throw new Error("Unknown mode");
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
