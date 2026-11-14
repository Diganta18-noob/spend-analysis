/** A transaction after normalisation. Every field is guaranteed present. */
export type Transaction = {
  sourceIndex?: number;
  date: string;
  desc: string;
  amount: number;
  cat: string;
  reward_points: number | null;
  credit_type: string | null;
  uncertain: boolean;
  source_page?: number;
};

/** A transaction as it arrives from the API — every field is untrusted. */
export type RawTransaction = {
  date?: unknown;
  desc?: unknown;
  amount?: unknown;
  cat?: unknown;
  reward_points?: unknown;
  credit_type?: unknown;
  uncertain?: unknown;
  source_page?: unknown;
};

/** An AI-generated insight. `icon` and `color` are advisory and get mapped, not rendered raw. */
export type Insight = {
  icon?: string;
  title?: string;
  body?: string;
  color?: string;
  badge?: string;
};

/** An analysis as held in App state. */
export type Analysis = {
  session_only?: boolean;
  quality?: { warnings?: string[]; reconciliation?: { status: string; differenceMinor: number | null; reasons?: string[] } };
  id?: string;
  period?: string;
  bank?: string;
  account_holder?: string;
  opening_balance?: number;
  closing_balance?: number;
  total_credits?: number;
  total_debits?: number;
  total_reward_points?: number;
  transactions?: RawTransaction[];
  insights?: Insight[];
  insights_status?: "withheld" | "unavailable";
  is_redacted?: boolean;
  created_at?: string;
  total_spent?: number;
};

/** An analysis row as returned by the list endpoints. */
export type StoredAnalysis = Analysis & {
  id: string;
  created_at: string;
  total_spent: number;
  transaction_count: number;
};
