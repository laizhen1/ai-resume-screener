import type { AnalysisResult, Evidence } from "./types";
import { findSkills } from "./skills";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function evidenceLines(text: string, terms: string[], limit = 4): string[] {
  const lines = text.split(/\n|(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => terms.some((term) => line.toLowerCase().includes(term.toLowerCase())))
    .slice(0, limit)
    .map((line) => line.slice(0, 220));
}

export function analyzeResume(jobDescription: string, resumeText: string): AnalysisResult {
  const jobSkills = findSkills(jobDescription);
  const resumeSkills = findSkills(resumeText);
  const matchedSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));

  const skillScore = jobSkills.length ? (matchedSkills.length / jobSkills.length) * 100 : 50;
  const quantified = (resumeText.match(/\b\d+(?:\.\d+)?%|\b\d+\+?\s*(?:users|customers|projects|teams|ms|seconds|hours|days)\b/gi) ?? []).length;
  const impactScore = clamp(35 + quantified * 15);
  const actionVerbs = ["built", "created", "delivered", "designed", "developed", "improved", "implemented", "led", "reduced", "shipped"];
  const actionHits = actionVerbs.filter((verb) => resumeText.toLowerCase().includes(verb));
  const experienceScore = clamp(35 + actionHits.length * 8);
  const structureSignals = ["experience", "education", "skills", "summary"].filter((section) => resumeText.toLowerCase().includes(section));
  const clarityScore = clamp(30 + structureSignals.length * 15 + (resumeText.length > 500 ? 10 : 0));

  const criteria: Evidence[] = [
    {
      criterion: "Relevant skills",
      weight: 55,
      score: clamp(skillScore),
      explanation: jobSkills.length ? `${matchedSkills.length} of ${jobSkills.length} detected job skills are supported.` : "Few explicit skills were detected in the job description.",
      evidence: evidenceLines(resumeText, matchedSkills)
    },
    {
      criterion: "Demonstrated experience",
      weight: 20,
      score: experienceScore,
      explanation: `${actionHits.length} distinct delivery-oriented action signals were found.`,
      evidence: evidenceLines(resumeText, actionHits)
    },
    {
      criterion: "Measurable impact",
      weight: 15,
      score: impactScore,
      explanation: `${quantified} quantified outcome signal${quantified === 1 ? " was" : "s were"} found.`,
      evidence: evidenceLines(resumeText, ["%", "users", "customers", "projects", "ms", "seconds"])
    },
    {
      criterion: "Document clarity",
      weight: 10,
      score: clarityScore,
      explanation: `${structureSignals.length} expected resume sections were detected.`,
      evidence: structureSignals.map((section) => `${section[0].toUpperCase()}${section.slice(1)} section detected`)
    }
  ];

  const overallScore = clamp(criteria.reduce((total, item) => total + item.score * (item.weight / 100), 0));
  const warnings = [
    ...(jobSkills.length < 3 ? ["The job description has few recognizable skills, so the score may be less informative."] : []),
    ...(resumeText.length < 350 ? ["The resume contains limited text; check that document extraction succeeded."] : []),
    "Keyword evidence can miss transferable or equivalent experience. A person must review the original application."
  ];

  const interviewQuestions = missingSkills.slice(0, 3).map((skill) => `Can you describe any experience related to ${skill}, even if it is not listed on your resume?`);
  if (interviewQuestions.length < 3) {
    interviewQuestions.push("Which project best demonstrates the impact you could bring to this role?", "What trade-offs did you make in your most technically challenging project?");
  }

  return {
    overallScore,
    matchedSkills,
    missingSkills,
    criteria,
    interviewQuestions: interviewQuestions.slice(0, 4),
    warnings,
    disclaimer: "Decision-support only. Do not use this score as the sole basis for an employment decision."
  };
}
