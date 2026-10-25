import "server-only";
import { MAX_FILE_BYTES, MIN_TEXT_CHARS } from "./constants";

export type Extracted = { fileName: string; text: string; charCount: number };

export class ExtractError extends Error {}

/** Extracts plain text from a PDF, DOCX or TXT file held in memory. The file itself is never stored. */
export async function extractText(file: File): Promise<Extracted> {
  const name = file.name || "document";
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (!["pdf", "docx", "txt"].includes(ext)) {
    throw new ExtractError(`${name} is not a PDF, DOCX or TXT file.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError(`${name} is larger than 10 MB.`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else {
      text = buffer.toString("utf8");
    }
  } catch {
    throw new ExtractError(`Couldn't read ${name}. Check the file isn't damaged or password-protected.`);
  }
  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
    throw new ExtractError(`No readable text in ${name}. It looks like a scanned PDF. Upload a text-based PDF, DOCX or TXT.`);
  }
  return { fileName: name, text, charCount: text.length };
}
