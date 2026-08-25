import { NextResponse } from "next/server";
import { analyzeResume } from "@/lib/analyzer";
import { extractDocument } from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const jobDescription = String(form.get("jobDescription") ?? "").trim();
    let resumeText = String(form.get("resumeText") ?? "").trim();
    const file = form.get("resumeFile");

    if (file instanceof File && file.size > 0) resumeText = await extractDocument(file);
    if (jobDescription.length < 40) throw new Error("Add a more detailed job description (at least 40 characters).");
    if (resumeText.length < 80) throw new Error("Add a resume or upload a document containing at least 80 characters.");

    return NextResponse.json({ analysis: analyzeResume(jobDescription, resumeText), extractedCharacters: resumeText.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
