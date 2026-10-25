"use client";

export class ApiError extends Error {
  fields?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** JSON fetch with readable errors. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status}).`, res.status, data.fields);
  return data as T;
}

export type Extracted = { fileName: string; text: string; charCount: number };

export async function extractFile(file: File): Promise<Extracted> {
  const form = new FormData();
  form.append("file", file);
  return api<Extracted>("/api/extract", { method: "POST", body: form });
}
