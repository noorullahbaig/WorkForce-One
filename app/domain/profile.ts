import { z } from "zod";

export type ProfileData = { email: string; phone: string; bankName: string; bankAccountNumber: string };
export type ProfileFieldErrors = Partial<Record<keyof ProfileData, string>>;
export type ProfileParseResult = { success: true; data: ProfileData } | { success: false; fieldErrors: ProfileFieldErrors };

const profileSchema = z.object({
 email: z.string().trim().max(254, "Email must be at most 254 characters.").pipe(z.email("Enter a valid email address.")),
 phone: z.string().trim().refine(value => /^\+?[\d ()-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, "")), "Enter a phone number with 7–15 digits and an optional leading +."),
 bankName: z.string().trim().optional().default(""),
 bankAccountNumber: z.string().trim().transform(value => value.replace(/[ -]/g, "")).refine(value => value === "" || /^\d{6,34}$/.test(value), "Enter a bank account number with 6–34 digits.").optional().default(""),
});

export function parseProfile(input: { email: unknown; phone: unknown; bankName?: unknown; bankAccountNumber?: unknown }): ProfileParseResult {
 const parsed = profileSchema.safeParse(input);
 if (parsed.success) return { success: true, data: parsed.data };
 const fieldErrors: ProfileFieldErrors = {};
 for (const issue of parsed.error.issues) {
  const field = issue.path[0] as keyof ProfileData;
  fieldErrors[field] ??= issue.message;
 }
 return { success: false, fieldErrors };
}
