import { afterEach, expect, it, vi } from "vitest";
import { modelReadiness } from "@/lib/model-diagnostics";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("does not contact a disabled service",async()=>{vi.stubEnv("ENABLE_LOCAL_AI","false");const fetch=vi.fn();vi.stubGlobal("fetch",fetch);expect((await modelReadiness()).status).toBe("disabled");expect(fetch).not.toHaveBeenCalled();});
it.each([[{models:[{name:"deepseek-r1:7b"}]},"ready"],[{models:[]},"missing-model"],[{},"malformed-output"]])("classifies response %j",async(body,status)=>{vi.stubEnv("ENABLE_LOCAL_AI","true");vi.stubEnv("ENABLE_LOCAL_AI_ANALYSIS","true");vi.stubEnv("OLLAMA_ANALYSIS_MODEL","deepseek-r1:7b");vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(body)));expect((await modelReadiness()).status).toBe(status);});
it("sanitizes transport failures",async()=>{vi.stubEnv("ENABLE_LOCAL_AI","true");vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("secret endpoint")));const result=await modelReadiness();expect(result.status).toBe("unreachable");expect(JSON.stringify(result)).not.toContain("secret");});
