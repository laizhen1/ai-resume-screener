const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function extractDocument(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error("File is larger than the 5 MB limit.");
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".txt")) return buffer.toString("utf8");
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse")).default;
    return (await pdf(buffer)).text;
  }
  throw new Error("Unsupported file type. Upload PDF, DOCX or TXT.");
}
