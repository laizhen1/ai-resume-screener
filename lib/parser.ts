import { findSkills } from "./skills";
import type { EvidenceProvenance, ParsedSection, StructuredResume } from "./types";

const SECTION_NAMES: Record<string, keyof Omit<StructuredResume, "sections" | "skills"> | "skills"> = {
  experience: "experience",
  employment: "experience",
  "work history": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "projects",
  certifications: "certifications",
  certificates: "certifications",
  summary: "experience",
  profile: "experience"
};

function headingName(line: string): string | null {
  const normalized = line.trim().replace(/[:\s]+$/g, "").toLowerCase();
  return SECTION_NAMES[normalized] ? normalized : null;
}

export function parseSections(text: string): ParsedSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let offset = 0;
  let current: ParsedSection = { name: "header", text: "", start: 0, end: 0 };

  for (const line of lines) {
    const heading = headingName(line);
    if (heading) {
      current.end = offset;
      if (current.text.trim()) sections.push({ ...current, text: current.text.trim() });
      current = { name: heading, text: "", start: offset + line.length + 1, end: text.length };
    } else {
      current.text += `${line}\n`;
    }
    offset += line.length + 1;
  }
  current.end = text.length;
  if (current.text.trim()) sections.push({ ...current, text: current.text.trim() });
  return sections;
}

function listItems(sections: ParsedSection[], names: string[]): string[] {
  return sections
    .filter((section) => names.includes(SECTION_NAMES[section.name] ?? section.name))
    .flatMap((section) => section.text.split(/\r?\n/))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 2);
}

export function parseResume(text: string): StructuredResume {
  const sections = parseSections(text);
  return {
    sections,
    skills: findSkills(text),
    experience: listItems(sections, ["experience"]),
    education: listItems(sections, ["education"]),
    projects: listItems(sections, ["projects"]),
    certifications: listItems(sections, ["certifications"])
  };
}

export function locateEvidence(text: string, snippet: string, sections = parseSections(text)): EvidenceProvenance {
  const start = Math.max(0, text.toLowerCase().indexOf(snippet.toLowerCase()));
  const end = start + snippet.length;
  const section = sections.find((item) => start >= item.start && start <= item.end)?.name ?? "document";
  return { text: snippet, section, start, end };
}
