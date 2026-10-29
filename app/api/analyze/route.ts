import { NextResponse } from "next/server";
import { analyzeResumeHybrid } from "@/lib/analyzer";
import { extractDocument } from "@/lib/documents";
import { rateLimit } from "@/lib/rate-limit";
import { issueReceipt } from "@/lib/analysis-receipt";

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

    const analysis = await analyzeResumeHybrid(jobDescription, resumeText, undefined, request.signal);
    const fileName = file instanceof File && file.size > 0 ? file.name : "pasted-resume.txt";
    const snapshot = { analysis, jobDescription, resumeText, fileName };
    return NextResponse.json({ ...snapshot, receipt: issueReceipt(snapshot), extractedCharacters: resumeText.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
