import { NextResponse } from "next/server";
import { analyzeResumeHybrid } from "@/lib/analyzer";
import { extractDocument } from "@/lib/documents";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const throttle = rateLimit(request, "public.analyze", 20);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many analysis requests. Try again shortly." }, { status: 429 });
  try {
    const form = await request.formData();
    const jobDescription = String(form.get("jobDescription") ?? "").trim();
    let resumeText = String(form.get("resumeText") ?? "").trim();
    const file = form.get("resumeFile");

    if (file instanceof File && file.size > 0) resumeText = await extractDocument(file);
    if (jobDescription.length < 40) throw new Error("Add a more detailed job description (at least 40 characters).");
    if (resumeText.length < 80) throw new Error("Add a resume or upload a document containing at least 80 characters.");

    return NextResponse.json({ analysis: await analyzeResumeHybrid(jobDescription, resumeText), extractedCharacters: resumeText.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
