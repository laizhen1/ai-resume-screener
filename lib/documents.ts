const MAX_FILE_SIZE = 5 * 1024 * 1024;

export type ExtractionResult = {
  text: string;
  method: "text" | "pdf" | "docx" | "ocr" | "external-ocr";
  warnings: string[];
};

function validateSignature(name: string, buffer: Buffer) {
  if (name.endsWith(".pdf") && buffer.subarray(0, 4).toString() !== "%PDF") throw new Error("The uploaded file is not a valid PDF.");
  if (name.endsWith(".docx") && buffer.subarray(0, 2).toString() !== "PK") throw new Error("The uploaded file is not a valid DOCX archive.");
  if (name.endsWith(".png") && buffer.subarray(1, 4).toString() !== "PNG") throw new Error("The uploaded file is not a valid PNG image.");
  if ((name.endsWith(".jpg") || name.endsWith(".jpeg")) && !(buffer[0] === 0xff && buffer[1] === 0xd8)) throw new Error("The uploaded file is not a valid JPEG image.");
  if (name.endsWith(".txt") && buffer.includes(0)) throw new Error("The text file appears to contain binary data.");
}

async function externalOcr(file: File): Promise<string | null> {
  const endpoint = process.env.OCR_ENDPOINT;
  if (!endpoint) return null;
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(endpoint, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`OCR service returned ${response.status}.`);
  const payload = await response.json() as { text?: string };
  return payload.text?.trim() || null;
}

export async function extractDocumentDetailed(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_FILE_SIZE) throw new Error("File is larger than the 5 MB limit.");
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  validateSignature(name, buffer);

  if (name.endsWith(".txt")) return { text: buffer.toString("utf8"), method: "text", warnings: [] };
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, method: "docx", warnings: result.messages.map((message) => message.message) };
  }
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(process.env.OCR_LANGUAGE ?? "eng");
    try {
      const result = await worker.recognize(buffer);
      return { text: result.data.text, method: "ocr", warnings: ["Text was extracted with OCR; verify important details against the original image."] };
    } finally {
      await worker.terminate();
    }
  }
  if (name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse")).default;
    const text = (await pdf(buffer)).text.trim();
    if (text.length >= 80) return { text, method: "pdf", warnings: [] };
    const ocrText = await externalOcr(file);
    if (ocrText) return { text: ocrText, method: "external-ocr", warnings: ["This scanned PDF was processed by the configured OCR service."] };
    throw new Error("The PDF contains little extractable text. Configure OCR_ENDPOINT for scanned PDFs or upload page images.");
  }
  throw new Error("Unsupported file type. Upload PDF, DOCX, TXT, PNG or JPEG.");
}

export async function extractDocument(file: File): Promise<string> {
  return (await extractDocumentDetailed(file)).text;
}
