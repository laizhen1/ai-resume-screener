export const SKILL_CATALOG = [
  "accessibility", "agile", "aws", "azure", "c#", "c++", "ci/cd", "css",
  "data analysis", "docker", "fastapi", "figma", "gcp", "git", "github actions",
  "go", "graphql", "html", "java", "javascript", "kubernetes", "langchain",
  "llamaindex", "machine learning", "mongodb", "next.js", "node.js", "openai",
  "postgresql", "prisma", "prompt engineering", "python", "pytorch", "rag",
  "react", "redis", "rest api", "sql", "tailwind", "tensorflow", "terraform",
  "testing", "typescript", "vector search"
] as const;

export const TAXONOMY_VERSION = "2026.08.1";

export const SKILL_ALIASES: Record<string, string[]> = {
  "ci/cd": ["continuous integration", "continuous delivery"],
  "c#": ["csharp", ".net"],
  "c++": ["cpp"],
  "gcp": ["google cloud"],
  "github actions": ["github workflow"],
  "machine learning": ["ml"],
  "next.js": ["nextjs"],
  "node.js": ["nodejs", "node"],
  "postgresql": ["postgres"],
  "rag": ["retrieval augmented generation", "retrieval-augmented generation"],
  "rest api": ["restful api", "rest apis"],
  "vector search": ["semantic search", "embeddings", "pgvector"]
};

export function findSkills(text: string): string[] {
  const haystack = ` ${text.toLowerCase().replace(/[_–—]/g, " ")} `;
  return SKILL_CATALOG.filter((skill) => {
    const terms = [skill, ...(SKILL_ALIASES[skill] ?? [])];
    return terms.some((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(haystack);
    });
  });
}

export function termsForSkill(skill: string): string[] {
  return [skill, ...(SKILL_ALIASES[skill] ?? [])];
}
