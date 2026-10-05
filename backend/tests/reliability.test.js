import { describe, it, expect } from 'vitest';
import { analysisFilter, accessFilter, applyCategoryEdits } from '../lib/analysisPolicy.js';
import { serializeCsv } from '../lib/csv.js';
import { normalizeExtractedTransactions, summarizeMoney, reconcileAnalysis, buildInsightInput } from '../lib/analysisQuality.js';
import { analysisListSchema, updateAnalysisSchema } from '../schemas.js';
import { filterTransactionsByPeriod } from '../lib/dateFilter.js';

describe('analysis authorization and query policy', () => {
  it('constrains owners and permits admin access to legacy records', () => {
    expect(accessFilter('b', { kind: 'owner', ownerId: 'a' })).toEqual({ id: 'b', owner_id: 'a' });
    expect(accessFilter('b', { kind: 'admin' })).toEqual({ id: 'b' });
    expect(() => accessFilter('b', null)).toThrow();
  });
  it('escapes regex searches and includes date bounds', () => {
    const filter = analysisFilter({ query: 'a+b', from: '2026-10-01', to: '2026-10-06' });
    expect(filter.$or[0].bank.$regex).toBe('a\\+b');
    expect(filter.created_at.$lt.toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });
  it('rejects malformed pagination and edits', () => {
    expect(analysisListSchema.safeParse({ offset: '-1' }).success).toBe(false);
    expect(analysisListSchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(analysisListSchema.safeParse({ from: '2026-02-30' }).success).toBe(false);
    expect(updateAnalysisSchema.safeParse({ edits: [{ index: 0, cat: 'Shopping' }], owner_id: 'other' }).success).toBe(false);
    expect(() => applyCategoryEdits({ transactions: [{ amount: 10, cat: 'Other' }] }, [{ index: 2, cat: 'Shopping' }])).toThrow();
  });
  it('only modifies targeted categories', () => {
    const data = { bank: 'Test', transactions: [{ amount: 10, cat: 'Other' }, { amount: 20, cat: 'Other' }] };
    const result = applyCategoryEdits(data, [{ index: 1, cat: 'Shopping' }]);
    expect(result.transactions[0].cat).toBe('Other');
    expect(result.transactions[1].cat).toBe('Shopping');
    expect(data.transactions[1].cat).toBe('Other');
  });
});
describe('CSV safety', () => {
  it('quotes text and neutralizes formulas including whitespace', () => {
    const csv = serializeCsv(['Bank', 'Amount'], [[' =1+1', 25], ['A,"B"\nC', -10]]);
    expect(csv).toContain("' =1+1");
    expect(csv).toContain('"A,""B""\nC"');
    expect(csv).toContain('-10');
  });
});
describe('extraction quality', () => {
  it('keeps unknown-date purchases when a period filter applies', () => {
    const rows = [{ date: '', amount: 10 }, { date: '2026-10-01', amount: 20 }];
    expect(filterTransactionsByPeriod(rows, 'October 2026')).toHaveLength(2);
  });
  it('retains legitimate identical transactions and flags malformed rows', () => {
    const row = { date: '2026-10-01', desc: 'Coffee', amount: 100, cat: 'Food & Dining' };
    const result = normalizeExtractedTransactions([row, row, { amount: 'bad' }, { date: '2026-02-30', amount: 1 }]);
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[2].date).toBe('');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('computes monetary summaries using minor units', () => {
    expect(summarizeMoney([{ amount: 0.1 }, { amount: 0.2 }, { amount: -0.1 }, { amount: 100, cat: 'Self Transfer' }])).toEqual({ grossDebits: 30, refunds: 10, netSpend: 20, selfTransfers: 10000 });
  });
  it('does not claim a valid reconciliation without sufficient metadata', () => {
    expect(reconcileAnalysis({ transactions: [] }).status).toBe('unavailable');
    expect(reconcileAnalysis({ statement_type: 'bank_account', opening_balance: 100, closing_balance: 70, total_credits: 0, transactions: [{ amount: 10 }] }).status).toBe('mismatch');
    expect(reconcileAnalysis({ statement_type: 'bank_account', opening_balance: 100, closing_balance: 120, total_credits: 20, transactions: [{ amount: -20 }] }).status).toBe('balanced');
  });
  it('insight summaries cover transactions beyond row 150', () => {
    expect(buildInsightInput(Array.from({ length: 151 }, () => ({ amount: 1, cat: 'Other' }))).summary.netSpend).toBe(15100);
  });
});
