import { describe, it, expect, vi } from 'vitest';
const analysis = vi.hoisted(() => ({ findOne: vi.fn(), findOneAndUpdate: vi.fn() }));
vi.mock('mongoose', async importOriginal => {
  const original = await importOriginal();
  return { ...original, default: { ...original.default, model: name => name === 'Analysis' ? analysis : {} } };
});
import { updateAccessibleAnalysis } from '../db.js';
describe('versioned category updates', () => {
  it('retries a concurrent update and writes data and total atomically', async () => {
    const quality = { reconciliation: { status: 'mismatch', differenceMinor: 100 } };
    analysis.findOne.mockReturnValueOnce({ lean: async () => ({ __v: 0, data: { quality, transactions: [{ amount: 100, cat: 'Other' }, { amount: 200, cat: 'Other' }] } }) })
      .mockReturnValueOnce({ lean: async () => ({ __v: 1, data: { quality, transactions: [{ amount: 100, cat: 'Other' }, { amount: 200, cat: 'Self Transfer' }] } }) });
    analysis.findOneAndUpdate.mockReturnValueOnce({ lean: async () => null }).mockReturnValueOnce({ lean: async () => ({ id: 'a' }) });
    await updateAccessibleAnalysis('a', [{ index: 0, cat: 'Self Transfer' }], { kind: 'owner', ownerId: 'u' });
    const [filter, update] = analysis.findOneAndUpdate.mock.calls[1];
    expect(filter).toEqual({ id: 'a', owner_id: 'u', __v: 1 });
    expect(update.$inc.__v).toBe(1);
    expect(update.$set.total_spent).toBe(0);
    expect(update.$set.data.quality).toEqual(quality);
    expect(update.$set.data.transactions.every(row => row.cat === 'Self Transfer')).toBe(true);
  });
});
