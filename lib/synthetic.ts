import { z } from "zod";
import { randomInt } from "node:crypto";
import type { SyntheticResume } from "./types";

const resumeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  location: z.string().min(2),
  summary: z.string().min(20),
  skills: z.array(z.string()).min(3).max(20),
  experience: z.array(z.object({
    title: z.string(), company: z.string(), period: z.string(), highlights: z.array(z.string()).min(1)
  })).min(1).max(4),
  education: z.string()
});

const firstNames = ["Avery", "Jordan", "Morgan", "Riley", "Taylor", "Casey"];
const lastNames = ["Ng", "Patel", "Rivera", "Kim", "Williams", "Martin"];
const companies = ["Northstar Labs", "Harbour Systems", "Koru Digital", "Juniper Works"];

function offlineResume(role: string, seniority: string): SyntheticResume {
  const seed = randomInt(0, 1_000_000);
  const name = `${firstNames[seed % firstNames.length]} ${lastNames[(seed >> 2) % lastNames.length]}`;
  const roleName = role.trim() || "Software Engineer";
  return {
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    location: "Wellington, New Zealand",
    summary: `${seniority} ${roleName} focused on accessible, reliable products and measurable customer outcomes. Entirely fictional profile generated for software testing.`,
    skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker", "Testing", "GitHub Actions"],
    experience: [
      {
        title: roleName,
        company: companies[seed % companies.length],
        period: "2023 - Present",
        highlights: [
          "Built a TypeScript service used by 1,200 synthetic test accounts.",
          "Reduced median response time by 38% through query profiling and caching.",
          "Implemented automated tests and CI checks, lowering escaped defects by 24%."
        ]
      },
      {
        title: `Junior ${roleName}`,
        company: companies[(seed + 1) % companies.length],
        period: "2021 - 2023",
        highlights: ["Delivered accessible React interfaces in a cross-functional agile team."]
      }
    ],
    education: "Bachelor of Information Technology, Example University, 2021"
  };
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function generateSyntheticResume(role: string, seniority: string) {
  const fallback = offlineResume(role, seniority);
  if (process.env.ENABLE_LOCAL_AI === "false") return { resume: fallback, source: "built-in" as const };

  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";
  const prompt = `Generate one completely fictional resume for UI testing. Role: ${role}. Seniority: ${seniority}.
Return JSON only with: name, email, location, summary, skills, experience[{title,company,period,highlights[]}], education.
Use example.com for email, invented employers, no real people, no phone number, and plausible but explicitly synthetic achievements.`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json", think: false, options: { temperature: 0.8 } }),
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json() as { response?: string; thinking?: string };
    const resume = resumeSchema.parse(extractJson(data.response || data.thinking || ""));
    if (!resume.email.endsWith("@example.com")) resume.email = fallback.email;
    return { resume, source: "ollama" as const };
  } catch {
    return { resume: fallback, source: "built-in" as const };
  }
}

export function resumeToText(resume: SyntheticResume): string {
  const jobs = resume.experience.map((job) => `${job.title} | ${job.company} | ${job.period}\n${job.highlights.map((item) => `- ${item}`).join("\n")}`).join("\n\n");
  return `${resume.name}\n${resume.email} | ${resume.location}\n\nSUMMARY\n${resume.summary}\n\nSKILLS\n${resume.skills.join(", ")}\n\nEXPERIENCE\n${jobs}\n\nEDUCATION\n${resume.education}`;
}
