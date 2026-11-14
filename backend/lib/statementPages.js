/** Keep transaction-table pages for text-bearing ICICI card statements.
 * Other formats and pages without extractable text pass through unchanged.
 */
export function selectTransactionPageIndexes(pageTexts) {
  const all = pageTexts.map((_, index) => index);
  if (!pageTexts.length) return all;
  const first = pageTexts[0] || "";
  if (!/ICICI Bank Credit Card/i.test(first) || !/statement summary/i.test(first)) return all;
  const hasTable = (text) => /SerNo\./i.test(text) && /Transaction Details/i.test(text);
  if (!hasTable(first)) return all;
  const periodLine = first.match(/Statement period\s*:\s*([^\r\n]+)/i)?.[1] || "";
  const years = [...new Set(periodLine.match(/\b20\d{2}\b/g) || [])];
  if (!years.length) return all;
  const hasPeriodDate = (text) => years.some((year) => new RegExp(String.raw`\b\d{1,2}[/-]\d{1,2}[/-]${year}\b`).test(text));
  return all.filter((index) => {
    const text = pageTexts[index] || "";
    return text.length < 100 || hasTable(text) || hasPeriodDate(text);
  });
}

const money = (text) => Number(text.replace(/[^\d.]/g, ""));
const moneyLine = /^`?([\d,]+\.\d{2})(?:\s+CR)?$/i;
function categoryForDescription(desc) {
  if (/\b(?:ZOMATO|SWIGGY)\b/i.test(desc)) return "Food & Dining";
  if (/\b(?:ZEPTO|GROCERY)\b/i.test(desc)) return "Groceries";
  if (/\b(?:FUEL|PETROL)\b/i.test(desc)) return "Transport";
  if (/\b(?:EMI|AMORTIZATION|IGST|GOOGLE PLAY)\b/i.test(desc)) return "Bills & Subscriptions";
  if (/AMAZON PAY IN E COMMERC/i.test(desc)) return "Shopping";
  return "Other";
}

/** Parse the selectable transaction table in ICICI Amazon Pay card PDFs.
 * Return null if the layout or printed totals do not reconcile exactly.
 */
export function parseIciciCardStatement(pageTexts) {
  const selected = selectTransactionPageIndexes(pageTexts);
  const first = pageTexts[0] || "";
  if (!/ICICI Bank Credit Card/i.test(first) || !/statement summary/i.test(first) || !/SerNo\./i.test(first)) return null;
  const period = first.match(/Statement period\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
  const summary = first.match(/Previous Balance\s+Purchases\s*\/\s*Charges\s+Cash Advances\s+Payments\s*\/\s*Credits\s+`?([\d,]+\.\d{2})\s+`?([\d,]+\.\d{2})\s+`?([\d,]+\.\d{2})\s+`?([\d,]+\.\d{2})/i);
  const overview = first.split(/SPENDS OVERVIEW/i)[0];
  const due = [...overview.matchAll(/`([\d,]+\.\d{2})/g)].at(-1)?.[1];
  if (!period || !summary || !due) return null;
  const transactions = [];
  for (const pageIndex of selected) {
    const lines = pageTexts[pageIndex].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let i = 0; i < lines.length - 4; i++) {
      const date = lines[i].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!date || !/^\d{8,}$/.test(lines[i + 1])) continue;
      const dayKey = `${date[3]}-${date[2]}-${date[1]}`;
      const parsedDate = new Date(`${dayKey}T00:00:00Z`);
      if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dayKey) return null;
      let amountIndex = -1;
      for (let j = i + 3; j < Math.min(i + 9, lines.length); j++) {
        if (/^-?\d+$/.test(lines[j - 1]) && moneyLine.test(lines[j])) { amountIndex = j; break; }
      }
      if (amountIndex < 0) return null;
      const desc = lines.slice(i + 2, amountIndex - 1).join(" ");
      const rawAmount = lines[amountIndex];
      const credit = /\bCR$/i.test(rawAmount);
      const amount = money(rawAmount) * (credit ? -1 : 1);
      if (amount === 0) { i = amountIndex; continue; }
      const credit_type = !credit ? null : /payment received|bbps payment|auto.?payment/i.test(desc) ? "card_payment" : /surcharge|fee reversal|charge reversal/i.test(desc) ? "adjustment" : /refund|purchase reversal/i.test(desc) ? "refund" : "unknown";
      transactions.push({ date: dayKey, desc, amount, cat: categoryForDescription(desc), credit_type, reward_points: Number(lines[amountIndex - 1]), uncertain: credit_type === "unknown", source_page: pageIndex + 1 });
      i = amountIndex;
    }
  }
  const result = {
    statement_type: "credit_card", bank: "ICICI Bank", period,
    opening_balance: money(summary[1]), total_debits: money(summary[2]) + money(summary[3]),
    total_credits: money(summary[4]), closing_balance: money(due), transactions,
  };
  const debitMinor = transactions.reduce((sum, row) => sum + (row.amount > 0 ? Math.round(row.amount * 100) : 0), 0);
  const creditMinor = transactions.reduce((sum, row) => sum + (row.amount < 0 ? -Math.round(row.amount * 100) : 0), 0);
  if (!transactions.length || Math.abs(debitMinor - Math.round(result.total_debits * 100)) > 1 || Math.abs(creditMinor - Math.round(result.total_credits * 100)) > 1) return null;
  if (Math.abs(Math.round(result.opening_balance * 100) + debitMinor - creditMinor - Math.round(result.closing_balance * 100)) > 1) return null;
  return result;
}
