import { localModel } from "./local-llm";
export type ModelStatus = "disabled" | "ready" | "missing-model" | "unreachable" | "timeout" | "malformed-output" | "http-error";
export async function modelReadiness(): Promise<{status: ModelStatus; model: string; elapsedMs: number}> {
 const start=performance.now(); const model=localModel("analysis");
 const result=(status: ModelStatus)=>({status,model,elapsedMs:Math.round(performance.now()-start)});
 if(process.env.ENABLE_LOCAL_AI === "false" || process.env.ENABLE_LOCAL_AI_ANALYSIS === "false") return result("disabled");
 try {
 const response=await fetch((process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434")+"/api/tags",{signal:AbortSignal.timeout(5000),cache:"no-store"});
 if(!response.ok) return result("http-error");
 const data: unknown=await response.json();
 if(!data || typeof data!=="object" || !("models" in data) || !Array.isArray(data.models)) return result("malformed-output");
 const names=data.models.map((item: unknown)=>item && typeof item === "object" && "name" in item ? item.name : null);
 if(names.some(name=>typeof name!=="string")) return result("malformed-output");
 return result(names.includes(model) || names.includes(model.includes(":")?model:model+":latest")?"ready":"missing-model");
 } catch(error) {return result(error instanceof Error && error.name === "TimeoutError" ? "timeout" : error instanceof SyntaxError ? "malformed-output" : "unreachable");}
}
