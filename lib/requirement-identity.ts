import { SKILL_ALIASES, SKILL_CATALOG } from "./skills";
import type { EvidenceVerdict } from "./types";

export const ALIGNMENT_VERSION = "canonical-wrapper-v2";

/** Exact aliases plus bounded grammatical wrappers; never substring/fuzzy matching. */
export function canonicalRequirementName(name: string): string {
  const normalized = name.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
  const unwrapped = normalized
    .replace(/^(?:(?:hands-on|professional|practical) )?(?:experience|proficiency|familiarity|knowledge|expertise|skills?) (?:in|with|of) /, "")
    .replace(/ (?:(?:hands-on|professional|practical) )?(?:experience|proficiency|familiarity|knowledge|expertise|skills?)(?: (?:is )?(?:required|preferred))?$/, "");
  return SKILL_CATALOG.find(skill => [skill, ...(SKILL_ALIASES[skill] ?? [])].includes(unwrapped)) ?? normalized;
}

/** Order-independent conflict policy; do not silently select a favorable verdict. */
export function consolidateRequirements<T extends { skill: string; verdict: EvidenceVerdict; reason: string }>(
  items: T[], clearEvidence: (item: T) => T
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const skill = canonicalRequirementName(item.skill);
    groups.set(skill, [...(groups.get(skill) ?? []), { ...item, skill }]);
  }
  return [...groups.values()].map(group => new Set(group.map(item => item.verdict)).size > 1
    ? { ...clearEvidence(group[0]), verdict: "unknown" as const, reason: "Conflicting model judgments for the same requirement; the system abstained." }
    : group[0]);
}
