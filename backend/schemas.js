import { z } from "zod";

// ─── Admin routes ───────────────────────────────────────────────────

export const loginSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(12, "New password must be at least 12 characters").max(128),
  })
  .strict();

// ─── Analysis update ────────────────────────────────────────────────
// Category corrections are the only accepted analysis mutation.

const categories = ['Rent', 'Insurance', 'Personal Transfer', 'Office Food', 'Food & Dining', 'Transport', 'Bills & Subscriptions', 'Groceries', 'Self Transfer', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other'];
export const updateAnalysisSchema = z.object({ edits: z.array(z.object({ index: z.number().int().min(0), cat: z.enum(categories) }).strict()).min(1).max(10000) }).strict();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
export const analysisListSchema = z.object({ query: z.string().trim().max(150).optional(), bank: z.string().max(100).optional(), from: day.optional(), to: day.optional(), quality: z.enum(['review']).optional(), limit: z.coerce.number().int().min(1).max(100).default(25), offset: z.coerce.number().int().min(0).max(1000000).default(0) }).strict().refine(x => !x.from || !x.to || x.from <= x.to, 'Start date must precede end date');
export const auditListSchema = z.object({ query: z.string().trim().max(150).optional(), action: z.string().max(80).optional(), from: day.optional(), to: day.optional(), limit: z.coerce.number().int().min(1).max(100).default(25), offset: z.coerce.number().int().min(0).max(1000000).default(0) }).strict().refine(x => !x.from || !x.to || x.from <= x.to, 'Start date must precede end date');
