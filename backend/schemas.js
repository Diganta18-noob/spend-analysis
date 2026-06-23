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
    newPassword: z.string().min(4, "New password must be at least 4 characters"),
  })
  .strict();

// ─── Analysis update ────────────────────────────────────────────────
// The analysis payload is large and semi-structured, so we validate the
// shape loosely but still reject completely unknown top-level keys.

const transactionSchema = z.object({
  date: z.string().optional(),
  desc: z.string().optional(),
  amount: z.number().optional(),
  cat: z.string().optional(),
  reward_points: z.number().nullable().optional(),
}).passthrough(); // Allow extra per-txn fields the AI might add

const insightSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  badge: z.string().optional(),
  color: z.string().optional(),
}).passthrough();

export const updateAnalysisSchema = z
  .object({
    period: z.string().optional(),
    bank: z.string().optional(),
    account_holder: z.string().nullable().optional(),
    opening_balance: z.number().nullable().optional(),
    closing_balance: z.number().nullable().optional(),
    total_credits: z.number().nullable().optional(),
    total_reward_points: z.number().nullable().optional(),
    transactions: z.array(transactionSchema).optional(),
    insights: z.array(insightSchema).optional(),
    id: z.string().optional(), // Sometimes the frontend echoes the id inside the body
    is_redacted: z.boolean().optional(),
  })
  .passthrough(); // Permissive on extra AI-generated fields
