import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAnalyses, fetchAuditLogs } from '../services/apiService';
afterEach(() => vi.unstubAllGlobals());
const respond = body => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), json: async () => body }));
describe('admin list API contracts', () => {
  it('reports an outdated array API instead of silently showing no analyses', async () => {
    respond([{ id: 'existing-record' }]);
    await expect(fetchAnalyses()).rejects.toThrow(/backend.*outdated/i);
  });
  it('preserves valid paginated analyses', async () => {
    const result = { items: [{ id: 'a' }], total: 1, limit: 25, offset: 0, banks: ['Bank'] };
    respond(result);
    expect(await fetchAnalyses()).toEqual(result);
  });
  it('rejects malformed audit envelopes', async () => {
    respond({ items: [], total: 'unknown' });
    await expect(fetchAuditLogs()).rejects.toThrow(/backend.*outdated/i);
  });
});
