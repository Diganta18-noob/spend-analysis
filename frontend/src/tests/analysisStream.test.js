import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeStatementsV2 } from '../services/geminiService';
function stream(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk))); controller.close(); } });
}
afterEach(() => vi.unstubAllGlobals());
describe('statement SSE protocol', () => {
  it('handles fragmented progress and completion events', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream(['event: page_ex', 'tracted\ndata: {"index":1}\n', '\nevent: done\ndata: {"transactions":[],"session_only":true}\n\n']) }));
    const progress = vi.fn();
    const controller = new AbortController();
    expect(await analyzeStatementsV2([], {}, progress, null, controller.signal)).toEqual({ transactions: [], session_only: true });
    expect(progress).toHaveBeenCalledWith({ event: 'page_extracted', data: { index: 1 } });
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }));
  });
  it('retains password-retry metadata from server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream(['event: error\ndata: {"message":"Password needed","code":"PDF_PASSWORD_REQUIRED","fileName":"synthetic.pdf","fileIndex":0}\n\n']) }));
    await expect(analyzeStatementsV2([])).rejects.toMatchObject({ code: 'PDF_PASSWORD_REQUIRED', fileName: 'synthetic.pdf', fileIndex: 0 });
  });
  it('reports incomplete streams as failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream(['event: started\ndata: {}\n\n']) }));
    await expect(analyzeStatementsV2([])).rejects.toThrow('Stream closed before completion');
  });
});
