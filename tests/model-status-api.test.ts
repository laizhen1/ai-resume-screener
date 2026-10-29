import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/model-status/route";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("requires authentication before contacting the model",async()=>{vi.stubEnv("AUTH_DISABLED","false");const fetch=vi.fn();vi.stubGlobal("fetch",fetch);const response=await GET(new Request("http://localhost/api/model-status",{headers:{"x-forwarded-for":"diagnostic-auth"}}));expect(response.status).toBe(401);expect(fetch).not.toHaveBeenCalled();});
it("returns disabled without an endpoint or cached response",async()=>{vi.stubEnv("AUTH_DISABLED","true");vi.stubEnv("ENABLE_LOCAL_AI","false");const response=await GET(new Request("http://localhost/api/model-status",{headers:{"x-forwarded-for":"diagnostic-disabled"}}));expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("no-store");expect((await response.json()).status).toBe("disabled");});
