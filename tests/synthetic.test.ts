import { describe, expect, it } from "vitest";
import { generateSyntheticResume, resumeToText } from "@/lib/synthetic";

describe("synthetic resume generation", () => {
  it("works offline and uses a reserved example address", async () => {
    process.env.ENABLE_LOCAL_AI = "false";
    const result = await generateSyntheticResume("Software Engineer", "Intermediate");
    expect(result.source).toBe("built-in");
    expect(result.resume.email.endsWith("@example.com")).toBe(true);
    expect(resumeToText(result.resume)).toContain("EXPERIENCE");
  });
});
