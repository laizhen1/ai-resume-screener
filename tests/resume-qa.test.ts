import { afterEach, describe, expect, it, vi } from "vitest";
import { answerResumeQuestion } from "@/lib/resume-qa";
import { POST } from "@/app/api/resume-qa/route";

const text = "EXPERIENCE\nBuilt Python services for 200 users and maintained PostgreSQL databases for a customer platform.";
const metadata = { version: "transformer-evidence-v1", models: { embedding: "test", reranker: "test", nli: "test", ner: null }, revisions: {}, packages: {}, device: "cpu", threshold: 0.8, margin: 0.15, topK: 8, rerankK: 3 };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("cited resume question answering", () => {
  it("does not call models when disabled", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "false"); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await answerResumeQuestion("What backend work is listed?", text)).status).toBe("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns source-verified quotes with original document offsets", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(Response.json({ response: JSON.stringify({ abstain: false, claims: [{ text: "The resume describes Python services.", passageId: 1, quote: "Built Python services for 200 users" }] }) }));
    vi.stubGlobal("fetch", fetch);
    const result = await answerResumeQuestion("What backend work is listed?", text);
    expect(result.status).toBe("answered");
    expect(text.slice(result.claims[0].evidence.start, result.claims[0].evidence.end)).toBe(result.claims[0].evidence.text);
    const prompt = JSON.parse(fetch.mock.calls[1][1].body).prompt;
    expect(prompt).toContain("Built Python services");
    const format = JSON.parse(fetch.mock.calls[1][1].body).format;
    expect(format.type).toBe("object");
    expect(format.required).toEqual(["abstain", "claims"]);
    expect(format.additionalProperties).toBe(false);
  });
  it("rejects invented quotes and citations outside the retrieved passages", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    for (const claim of [{ passageId: 1, quote: "Built Kubernetes platforms" }, { passageId: 0, quote: "EXPERIENCE" }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(Response.json({ response: JSON.stringify({ abstain: false, claims: [{ text: "Unverified claim.", ...claim }] }) })));
      const result = await answerResumeQuestion("What is listed?", text);
      expect(result.status).toBe("unavailable"); expect(result.claims).toEqual([]);
      expect(result.failure).toBe("invalid-citation");
    }
  });
  it("honors model abstention without displaying speculative claims", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(Response.json({ response: '{"abstain":true,"claims":[]}' })));
    expect((await answerResumeQuestion("What frontend work is listed?", text)).status).toBe("abstained");
  });
  it("requires authentication before reading stored candidate source", async () => {
    vi.stubEnv("AUTH_DISABLED", "false");
    const form = new FormData(); form.set("question", "What experience is listed?"); form.set("candidateId", "00000000-0000-4000-8000-000000000001");
    expect((await POST(new Request("http://localhost/api/resume-qa", { method: "POST", body: form }))).status).toBe(401);
  });
  it.each([
    "not JSON",
    '{"abstain":false,"claims":[]}',
    '{"abstain":false,"claims":[{"text":"Claim","passageId":1,"quote":"   "}]}',
    '{"abstain":true,"claims":[{"text":"Claim","passageId":1,"quote":"Python"}]}',
    '{"abstain":true,"claims":[],"recommendation":"hire"}'
  ])("rejects malformed or inconsistent structured output: %s", async response => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(Response.json({ response })));
    const result = await answerResumeQuestion("What backend work is listed?", text);
    expect(result.failure).toBe("invalid-output");
    expect(result.claims).toEqual([]);
  });
  it("does not expose a thinking field as a final answer", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(Response.json({ thinking: '{"abstain":true,"claims":[]}' })));
    expect((await answerResumeQuestion("What backend work is listed?", text)).failure).toBe("invalid-output");
  });
  it("distinguishes retrieval and generation failures", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await answerResumeQuestion("What is listed?", text)).failure).toBe("retrieval-unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [1], metadata })).mockResolvedValueOnce(new Response(null, { status: 503 })));
    expect((await answerResumeQuestion("What is listed?", text)).failure).toBe("generation-unavailable");
  });
  it("abstains without generating when retrieval is empty", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ passageIds: [], metadata }));
    vi.stubGlobal("fetch", fetch);
    expect((await answerResumeQuestion("What is listed?", text)).status).toBe("abstained");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("propagates cancellation instead of reporting an unavailable model", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true");
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => { controller.abort(); throw controller.signal.reason; }));
    await expect(answerResumeQuestion("What is listed?", text, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects oversized questions before contacting models", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const form = new FormData(); form.set("question", "x".repeat(501)); form.set("resumeText", text);
    expect((await POST(new Request("http://localhost/api/resume-qa", { method: "POST", body: form }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
