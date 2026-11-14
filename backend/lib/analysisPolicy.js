export function accessFilter(id, access) {
  if (access?.kind === "admin") return { id };
  if (access?.kind === "owner" && access.ownerId)
    return { id, owner_id: access.ownerId };
  throw new Error("Unauthorized");
}

export const escapeSearch = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function analysisFilter({ query, bank, from, to, quality } = {}) {
  const filter = {};
  if (query)
    filter.$or = ["bank", "period", "account_holder", "id"].map((key) => ({
      [key]: { $regex: escapeSearch(query), $options: "i" },
    }));
  if (bank) filter.bank = bank;
  if (from || to) {
    filter.created_at = {};
    if (from) filter.created_at.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to)
      filter.created_at.$lt = new Date(
        new Date(`${to}T00:00:00.000Z`).getTime() + 86400000,
      );
  }
  if (quality === "review")
    filter.$and = [
      {
        $or: [
          { "data.quality.reconciliation.status": "mismatch" },
          { "data.quality.reconciliation.status": "review" },
          { "data.quality.warnings.0": { $exists: true } },
        ],
      },
    ];
  return filter;
}

export function applyCategoryEdits(data, edits) {
  const transactions = [...(data.transactions || [])];
  for (const { index, cat, credit_type } of edits) {
    if (!Number.isInteger(index) || index < 0 || index >= transactions.length)
      throw Object.assign(new Error("Transaction no longer exists"), {
        status: 422,
      });
    if (credit_type !== undefined && transactions[index].amount >= 0)
      throw Object.assign(new Error("Only credits have a credit purpose"), { status: 422 });
    transactions[index] = { ...transactions[index], ...(cat === undefined ? {} : { cat }), ...(credit_type === undefined ? {} : { credit_type }) };
  }
  const quality = edits.some((e) => e.credit_type !== undefined)
    ? { ...data.quality, reconciliation: { status: "review", differenceMinor: null, reasons: ["Credit purpose was edited; source balances must be checked again"] } }
    : data.quality;
  return { ...data, transactions, quality };
}
