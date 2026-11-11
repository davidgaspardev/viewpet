/**
 * Trimmed string value of a form field, or `""` when it is missing or is a
 * file. Shared by `actions.ts` and the parsers next to it; not defined in
 * `actions.ts` because a `"use server"` module may only export async functions.
 */
export function readString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
