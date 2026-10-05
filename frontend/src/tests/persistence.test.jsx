import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { useAnalysisPersistence } from '../hooks/useAnalysisPersistence';
import { updateAnalysis } from '../services/apiService';
vi.mock('../services/apiService', () => ({ updateAnalysis: vi.fn() }));
describe('explicit saves', () => {
  const analysis = { id: 'a', transactions: [{ desc: 'A', cat: 'Other' }, { desc: 'B', cat: 'Other' }] };
  it('does not write on load and keeps failed edits for retry', async () => {
    updateAnalysis.mockReset().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ success: true });
    const onChange = vi.fn();
    const { result } = renderHook(() => useAnalysisPersistence({ analysis, onChange, getToken: async () => 'token' }));
    expect(updateAnalysis).not.toHaveBeenCalled();
    act(() => result.current.editCategory(1, 'Shopping'));
    await waitFor(() => expect(result.current.saveState).toBe('failed'));
    expect(onChange).toHaveBeenCalled();
    await act(async () => { await result.current.retrySave(); });
    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(updateAnalysis).toHaveBeenLastCalledWith('a', { edits: [{ index: 1, cat: 'Shopping' }] }, { userToken: 'token' });
  });
  it('anonymous edits stay local', () => {
    updateAnalysis.mockReset();
    const { result } = renderHook(() => useAnalysisPersistence({ analysis: { ...analysis, id: null }, onChange: vi.fn() }));
    act(() => result.current.editCategory(0, 'Rent'));
    expect(updateAnalysis).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('local');
  });
  it('retains the saved category when an older fetched record is reopened during a save', async () => {
    let resolve;
    updateAnalysis.mockReset().mockImplementation(() => new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => {
      const [current, setCurrent] = useState(analysis);
      return { persistence: useAnalysisPersistence({ analysis: current, onChange: setCurrent, getToken: async () => 'token' }), setCurrent };
    });
    act(() => result.current.persistence.editCategory(1, 'Shopping'));
    await waitFor(() => expect(updateAnalysis).toHaveBeenCalled());
    act(() => result.current.setCurrent({ ...analysis }));
    await act(async () => resolve({ success: true }));
    expect(result.current.persistence.saveState).toBe('saved');
    expect(result.current.persistence.analysis.transactions[1].cat).toBe('Shopping');
  });
  it('retains failed edits while the viewer is absent and can reapply them', async () => {
    updateAnalysis.mockReset().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(({ current }) => useAnalysisPersistence({ analysis: current, onChange: vi.fn(), getToken: async () => 'token' }), { initialProps: { current: analysis } });
    act(() => result.current.editCategory(1, 'Shopping'));
    await waitFor(() => expect(result.current.saveState).toBe('failed'));
    rerender({ current: null });
    rerender({ current: analysis });
    expect(result.current.saveState).toBe('failed');
    expect(result.current.analysis.transactions[1].cat).toBe('Shopping');
    await act(async () => { await result.current.retrySave(); });
    expect(result.current.saveState).toBe('saved');
  });
});
