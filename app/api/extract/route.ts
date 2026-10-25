import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api";
import { extractText, ExtractError } from "@/lib/extract";

/** Upload one file, get its text back. The file is parsed in memory and never stored. */
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Choose a file to upload.");
  try {
    return NextResponse.json(await extractText(file));
  } catch (e) {
    return jsonError(e instanceof ExtractError ? e.message : "Couldn't read that file.", 422);
  }
}
