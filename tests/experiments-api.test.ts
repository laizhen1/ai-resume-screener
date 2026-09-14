import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/workspace/experiments/route";
import { GET as getFeedback, POST as postFeedback } from "@/app/api/workspace/experiments/feedback/route";

vi.mock("@/lib/api", () => ({ authorize: vi.fn(() => ({ session: { username: "test-reviewer" } })) }));
import { authorize } from "@/lib/api";
const request = (path: string, body: unknown) => new Request("http://localhost" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { vi.mocked(authorize).mockReturnValue({ session: { username: "test-reviewer" } } as ReturnType<typeof authorize>); });
describe("experiment API", () => {
  it("rejects malformed or unbounded experiment input", async () => {
    expect((await POST(request("/api/workspace/experiments", { split: "bad", includeModel: true }))).status).toBe(400);
    expect((await POST(request("/api/workspace/experiments", { split: "heldout", includeModel: "yes" }))).status).toBe(400);
  });
  it("protects report and feedback access", async () => {
    vi.mocked(authorize).mockReturnValue({ response: new Response("Unauthorized", { status: 401 }) } as ReturnType<typeof authorize>);
    expect((await GET(new Request("http://localhost/api/workspace/experiments"))).status).toBe(401);
    expect((await postFeedback(request("/feedback", {}))).status).toBe(401);
  });
  it("streams and persists a report, saves traceable corrections, and preserves frozen labels", async () => {
    const response = await POST(request("/api/workspace/experiments", { split: "development", includeModel: false }));
    const messages = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    expect(messages.filter(m => m.type === "progress")).toHaveLength(11);
    const run = messages.at(-1).run;
    const before = JSON.stringify(run.report);
    const row = run.report.results[0];
    const payload = { runId: run.id, caseId: row.caseId, skill: row.predictions[0].skill, pipeline: "rules", verdict: "partial", reason: "Reviewer sees only limited supporting evidence." };
    const saved = await postFeedback(request("/feedback", payload));
    expect(saved.status).toBe(201);
    const feedback = await (await getFeedback(new Request(`http://localhost/feedback?runId=${run.id}`))).json();
    expect(feedback.feedback[0].actor).toBe("test-reviewer");
    expect(feedback.feedback[0].destination).toBe("development-candidate");
    const history = await (await GET(new Request("http://localhost/api/workspace/experiments"))).json();
    expect(JSON.stringify(history.runs.find((r: { id: string }) => r.id === run.id).report)).toBe(before);
    expect((await postFeedback(request("/feedback", { ...payload, caseId: "invented-case" }))).status).toBe(404);
  });
});
