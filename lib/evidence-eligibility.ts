import { findSkills, termsForSkill } from "./skills";

/** Conservative source checks. These only abstain; they never infer a positive verdict. */
export const EVIDENCE_VALIDATION_VERSION = "evidence-eligibility-v1";
export type EvidenceIssue = "document-instruction" | "ordinary-word" | "other-person-work";
export const EVIDENCE_ISSUE_LABELS: Record<EvidenceIssue, string> = {
  "document-instruction": "The selected passage contains directions to an AI, not reliable applicant evidence.",
  "ordinary-word": "The selected wording uses the skill name in an ordinary-language sense.",
  "other-person-work": "The selected passage attributes the technical work to others without establishing the applicant's involvement."
};
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (skill: string, text: string) => termsForSkill(skill).some(term => new RegExp(`(^|[^a-z0-9+#])${escaped(term)}([^a-z0-9+#]|$)`, "i").test(text));
const clauses = (text: string) => text.split(/\r?\n|(?<=[.!?;])\s+|,\s*(?=(?:but |while |whereas )?I\b)/).map(part => part.trim()).filter(Boolean);

function hasDocumentInstruction(text: string): boolean {
  return clauses(text).some(part => /^(?:(?:note|message|instruction)\s+(?:to|for)\s+(?:the\s+)?(?:ai|llm|assistant|model|screener)\b|(?:system|assistant)\s*:|<\/?(?:system|assistant)>|\[\/?INST\]|(?:please\s+)?ignore\s+(?:(?:all|the|any|prior|previous|above|job)\s+)*(?:instructions?|requirements?|rules?|prompts?)\b|(?:please\s+)?(?:output|return|mark|classify|rate)\b.{0,70}\b(?:supported|contradicted|unknown|perfect score|100\s*%)\b)/i.test(part));
}

function ordinaryWordOnly(skill: string, text: string): boolean {
  if (skill !== "go" && skill !== "react") return false;
  // Evaluate individual mentions, so a real React project is not erased by an unrelated "react to" clause.
  const matches = [...text.matchAll(skill === "go" ? /\b(?:go|golang)\b/gi : /\breact(?:ed|ing|s)?\b/gi)];
  if (!matches.length) return false;
  return matches.every(match => {
    const before = text.slice(Math.max(0, match.index! - 70), match.index!);
    const after = text.slice(match.index! + match[0].length, match.index! + match[0].length + 90);
    const usedAsTool = /\b(?:using|used|use|learning|learned|studying|with|in|via)\s*$/i.test(before);
    if (skill === "go") {
      if (/^\s*[-–—]\s*to\s*[-–—]\s*market\b/i.test(after)) return true;
      if (/golang/i.test(match[0]) || usedAsTool || /^\s*(?:language|programming|modules?|routines?|compiler|services?|APIs?|backend|client|code)\b/i.test(after)) return false;
      return /^\s*[-–—]?\s*to\b|^\s+live\b|^\s+(?:board\s+)?game\b/i.test(after)
        || /\b(?:on\s+the|ready\s+to)\s*$/i.test(before)
        || /\b(?:board game|board-game|boardgame|tournament|stones)\b/i.test(before + match[0] + after);
    }
    if (/^react$/i.test(match[0]) && (usedAsTool || /^\s*(?:\.\s*js|JS|components?|hooks?|framework|library|application|app|frontend|UI)\b/i.test(after))) return false;
    return !/^react$/i.test(match[0]) || /^\s+(?:(?:quickly|calmly|promptly|effectively|appropriately)\s+)?to\b/i.test(after);
  });
}

const externalSubject = /\b(?:(?:our|the|my|their|another|a)\s+)?(?:(?:infrastructure|platform|engineering|backend|frontend|data|operations|software|security|partner|vendor|billing)\s+)*(?:team|department|colleagues?|coworkers?|co-workers?|contractors?|vendors?|manager|supervisor|peers?)\b.{0,45}\b(?:built|created|developed|implemented|maintained|operated|managed|deployed|used|uses|trained|owned|worked|wrote|writ(?:e|es)|ran|runs)\b/i;
const ownAction = /^(?:[-•?]\s*)?(?:built|created|developed|implemented|shipped|maintained|operated|managed|deployed|used|trained|wrote|authored|reviewed|debugged|configured|migrated|tested|contributed|worked)\b|\bI\s+(?:(?:personally|also|then|later|helped|jointly)\s+)*(?:built|created|developed|implemented|maintained|operated|managed|deployed|used|trained|wrote|authored|reviewed|debugged|configured|migrated|tested|contributed|worked)\b|\bmy\s+(?:own\s+)?(?:work|contribution|role|responsibilities)\b.{0,25}\b(?:included?|was|were|involved)\b/i;
const technicalWork = /\b(?:code|modules?|manifests?|clusters?|deployments?|services?|APIs?|database|queries|pipelines?|containers?|components?|tests?|configuration|workflows?)\b/i;

function onlyOthersWork(skill: string, text: string): boolean {
  const parts = clauses(text);
  const attributed = parts.some(part => mentions(skill, part) && (externalSubject.test(part)
    || /\b(?:built|maintained|managed|operated|deployed|used|owned)\s+by\s+(?:the |our |another |my )?(?:\w+\s+){0,3}(?:team|colleague|contractor|vendor)\b/i.test(part)));
  if (!attributed) return false;
  const applicantInvolved = parts.some(part => {
    if (!ownAction.test(part)) return false;
    // Restrict the check to the applicant's clause, not the preceding third-party claim.
    const own = part.slice(part.search(ownAction));
    if (mentions(skill, own)) return true;
    return findSkills(own).length === 0 && technicalWork.test(own) && findSkills(text).every(item => item === skill);
  });
  return !applicantInvolved;
}

export function evidenceIssues(skill: string, quote: string): EvidenceIssue[] {
  const issues: EvidenceIssue[] = [];
  if (hasDocumentInstruction(quote)) issues.push("document-instruction");
  if (ordinaryWordOnly(skill, quote)) issues.push("ordinary-word");
  if (onlyOthersWork(skill, quote)) issues.push("other-person-work");
  return issues;
}
