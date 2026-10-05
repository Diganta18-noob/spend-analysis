import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogTab from '../components/admin/AuditLogTab';
import ApiUsageTab from '../components/admin/ApiUsageTab';
import { fetchAuditLogs } from '../services/apiService';
vi.mock('../services/apiService', () => ({ fetchAuditLogs: vi.fn(async () => ({ items: [], total: 0 })), fetchApiUsage: vi.fn(async () => ({ daily: [], aggregate: {} })) }));
describe('admin monitoring', () => {
  it('filters audit events before pagination at the server', async () => {
    render(<AuditLogTab />);
    await userEvent.selectOptions(screen.getByLabelText('Audit action'), 'ANALYSIS_UPDATED');
    await waitFor(() => expect(fetchAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'ANALYSIS_UPDATED', offset: 0 })));
    expect(await screen.findByText('No matching audit events')).toBeInTheDocument();
  });
  it('does not invent latency when no calls exist', async () => {
    render(<ApiUsageTab />);
    expect(await screen.findByText('No recorded requests')).toBeInTheDocument();
    expect(screen.queryByText('0.0s')).not.toBeInTheDocument();
  });
});
