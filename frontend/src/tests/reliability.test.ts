import { describe, it, expect } from 'vitest';
import { dailySeries, dailyBreakdown, normaliseTransactions, totalSpent, rewardStats } from '../lib/derive';
import { calendarDateKey, parseStatementDate } from '../lib/format';
describe('calendar and edit identity regressions', () => {
  it('separates days across months', () => {
    const rows = normaliseTransactions([{ date: '2026-09-01', amount: 10 }, { date: '2026-10-01', amount: 20 }]);
    expect(dailySeries(rows)).toEqual([{ day: '2026-09-01', amount: 10 }, { day: '2026-10-01', amount: 20 }]);
    expect(dailyBreakdown(rows, '2026-10-01')[0].value).toBe(20);
    expect(rows[1].sourceIndex).toBe(1);
  });
  it('retains invalid dates as unknown rather than inventing one', () => {
    const rows = normaliseTransactions([{ date: '2026-02-30', amount: 10 }]);
    expect(rows[0].date).toBe('');
    expect(totalSpent(rows)).toBe(10);
    expect(dailySeries(rows)).toEqual([]);
    expect(parseStatementDate('2026-10-01oops')).toBeNull();
    expect(calendarDateKey('01/10/2026')).toBe('2026-10-01');
  });
  it('uses minor-unit arithmetic', () => {
    expect(totalSpent(normaliseTransactions([{ amount: 0.1 }, { amount: 0.2 }]))).toBe(0.3);
  });
  it('prefers transaction rewards over page totals and preserves missing rewards', () => {
    const rows = normaliseTransactions([{ amount: 10, reward_points: 100 }, { amount: 20, reward_points: 200 }]);
    expect(rewardStats(rows, 200)?.net).toBe(300);
    const absent = normaliseTransactions([{ amount: 10 }]);
    expect(rewardStats(absent, null)).toBeNull();
    expect(rewardStats(absent, NaN)).toBeNull();
    expect(rewardStats(absent, 500)?.net).toBe(500);
  });
});
