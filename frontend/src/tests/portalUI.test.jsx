import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, ConfirmDialog } from '../components/ui/PortalUI';
describe('shared controls', () => {
  it('exposes selected tabs and changes on keyboard activation', async () => {
    const onChange = vi.fn();
    render(<Tabs value="overview" onChange={onChange} items={[{ value: 'overview', label: 'Overview' }, { value: 'transactions', label: 'Transactions' }]} />);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Transactions' }));
    expect(onChange).toHaveBeenCalledWith('transactions');
  });
  it('can cancel a destructive action without confirming it', async () => {
    const onCancel = vi.fn(); const onConfirm = vi.fn();
    render(<ConfirmDialog title="Delete analysis?" onCancel={onCancel} onConfirm={onConfirm}>This cannot be undone.</ConfirmDialog>);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled(); expect(onConfirm).not.toHaveBeenCalled();
  });
});
