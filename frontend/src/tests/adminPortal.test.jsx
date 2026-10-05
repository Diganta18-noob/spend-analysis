import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../components/admin/AdminDashboard';
import { fetchAnalyses } from '../services/apiService';
vi.mock('../services/apiService', () => ({ fetchAnalyses: vi.fn(async () => ({ items: [], total: 0, banks: ['HDFC'] })), fetchStats: vi.fn(async () => ({ total_analyses: 0, total_transactions: 0, total_spend_tracked: 0 })), fetchApiUsage: vi.fn(async () => ({ daily: [], aggregate: {} })), fetchAuditLogs: vi.fn(async () => ({ items: [], total: 0 })), fetchAnalysis: vi.fn(), deleteAnalysis: vi.fn(), exportAnalyses: vi.fn(), adminChangePassword: vi.fn(), updateAnalysis: vi.fn() }));
describe('admin portal', () => {
  it('requests bank filters from the server and resets the page', async () => {
    render(<AdminDashboard theme="dark" toggleTheme={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analyses' }));
    await userEvent.selectOptions(await screen.findByLabelText('Bank filter'), 'HDFC');
    await waitFor(() => expect(fetchAnalyses).toHaveBeenLastCalledWith(expect.objectContaining({ bank: 'HDFC', offset: 0 })));
    expect(await screen.findByText('No matching analyses')).toBeInTheDocument();
  });
});
