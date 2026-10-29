import { afterEach, expect, it, vi } from "vitest";
import { analyzeWithOllama } from "@/lib/ai-analysis";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/analyzer";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.each([[200,"malformed-output"],[404,"model-or-endpoint-missing"],[503,"http-error"]])("diagnoses HTTP %s without throwing or leaking payload",async(status,expected)=>{
vi.stubEnv("NODE_ENV","production");vi.stubEnv("VITEST","");vi.stubEnv("ENABLE_LOCAL_AI","true");vi.stubEnv("ENABLE_LOCAL_AI_ANALYSIS","true");
vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{}',{status:status as number}))); const diagnostic=vi.fn();
expect(await analyzeWithOllama("Python required.","Used Python.",DEFAULT_SCORING_WEIGHTS,{onDiagnostic:diagnostic})).toBeNull();expect(diagnostic).toHaveBeenCalledWith(expected);
});
