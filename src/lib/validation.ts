import { z } from "zod";

export const urlSchema = z.string().url("Please enter a valid URL (e.g., https://example.com)");

export function isValidUrl(value: string): boolean {
  return urlSchema.safeParse(value).success;
}

export function validateUrl(value: string): string | null {
  const result = urlSchema.safeParse(value);
  return result.success ? null : result.error.errors[0]?.message ?? "Invalid URL";
}
