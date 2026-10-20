// Public fictional walkthrough, not training data or a held-out benchmark.
export const EVIDENCE_DEMO = {
  job: "We are hiring a backend engineer. Python, Docker, Kubernetes and Terraform experience are required. Explain the evidence for each requirement so a human reviewer can verify it.",
  resume: `Alex Example — fictional demonstration profile
SUMMARY
Backend developer building internal tools for a fictional community library.
EXPERIENCE
Built Python services that tracked book loans and sent reminder emails.
Documented service endpoints and investigated failed background tasks.
EDUCATION
Currently learning Docker through guided container tutorials.
SKILLS
I have never used Kubernetes.
PROJECTS
Created a volunteer scheduling tool and wrote its user guide.`,
  explanation: "Inspect four different evidence states: Python delivery, Docker learning, explicitly absent Kubernetes experience, and no Terraform evidence. Model judgments can differ; verify the original quotes."
};
