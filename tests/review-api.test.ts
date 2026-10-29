import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/workspace/reviews/route";
import { PATCH } from "@/app/api/workspace/candidates/[id]/review/route";
import { issueReceipt } from "@/lib/analysis-receipt";
import { analyzeResume } from "@/lib/analyzer";
import { getRepository } from "@/lib/repository";

beforeEach(() => { vi.stubEnv("AUTH_DISABLED", "true"); vi.stubEnv("DATA_MODE", "memory"); });
afterEach(() => vi.unstubAllEnvs());
function payload() {
  const jobDescription = "An engineer with Python experience building tested web services is required.";
  const resumeText = "FICTIONAL PERSON\nEXPERIENCE\nBuilt Python services for 200 users and maintained tested applications for an invented business.";
  const snapshot = { analysis: analyzeResume(jobDescription, resumeText), jobDescription, resumeText, fileName: "fixture.txt" };
  return { snapshot, receipt: issueReceipt(snapshot), title: "Review API fixture", retentionDays: 7, corrections: [{ skill: "python", verdict: "partial", reason: "Review with the applicant" }] };
}
function request(body: unknown) { return new Request("http://localhost/api/workspace/reviews", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": crypto.randomUUID() }, body: JSON.stringify(body) }); }

it("imports once even for concurrent duplicate submissions and preserves original scores", async () => {
  const input = payload();
  const [first, second] = await Promise.all([POST(request(input)), POST(request(input))]);
  expect(first.status).toBe(201); expect(second.status).toBe(201);
  const saved = await first.json(); expect(await second.json()).toEqual(saved);
  const repo = await getRepository(); const candidate = await repo.getCandidate(saved.candidateId);
  expect((await repo.listCandidates(saved.jobId)).length).toBe(1);
  expect(candidate?.resumeText).toBe(input.snapshot.resumeText);
  expect(candidate?.analysis?.overallScore).toBe(input.snapshot.analysis.overallScore);
  expect(candidate?.analysis?.requirementAssessments?.[0].verdict).toBe("supported");
  expect(candidate?.analysis?.reviewerCorrections?.[0].verdict).toBe("partial");
});

it("does not create jobs when the client tampers with a result or submits invalid corrections", async () => {
  const input = payload(); const repo = await getRepository(); const before = (await repo.listJobs()).length;
  const changed = structuredClone(input); changed.snapshot.analysis.overallScore = 100;
  expect((await POST(request(changed))).status).toBe(400);
  expect((await POST(request({ ...input, corrections: [{ skill: "fake", verdict: "supported", reason: "Invented requirement" }] }))).status).toBe(400);
  expect((await repo.listJobs()).length).toBe(before);
});

it("requires authentication when enabled", async () => {
  vi.stubEnv("AUTH_DISABLED", "false");
  expect((await POST(request(payload()))).status).toBe(401);
});

it("records workspace corrections and audit history without replacing model judgments", async () => {
  const response = await POST(request(payload())); const saved = await response.json();
  const changed = await PATCH(new Request("http://localhost/review", { method: "PATCH", body: JSON.stringify({ corrections: [{ skill: "python", verdict: "unknown", reason: "Need more detail on delivery" }] }) }), { params: Promise.resolve({ id: saved.candidateId }) });
  expect(changed.status).toBe(200);
  const { candidate } = await changed.json();
  expect(candidate.analysis.requirementAssessments[0].verdict).toBe("supported");
  expect(candidate.analysis.reviewerCorrections[0].verdict).toBe("unknown");
  const audit = await (await getRepository()).listAudit(saved.jobId);
  expect(audit.find(event => event.action === "candidate.evidence-reviewed")?.metadata.previousCorrections).toEqual([{ skill: "python", verdict: "partial" }]);
});

it("does not resurrect a deleted saved review on retry", async () => {
  const input = payload(); const saved = await (await POST(request(input))).json();
  await (await getRepository()).deleteCandidate(saved.candidateId);
  expect((await POST(request(input))).status).toBe(410);
});
