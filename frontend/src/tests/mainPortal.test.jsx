import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionsView from '../views/TransactionsView';
import QualityPanel from '../views/QualityPanel';
describe('main portal', () => {
  it('edits a filtered row by its source index', async () => {
    const onEditCategory = vi.fn();
    render(<TransactionsView transactions={[{ sourceIndex: 0, desc: 'A', date: '2026-10-01', amount: 10, cat: 'Other' }, { sourceIndex: 1, desc: 'B', date: '2026-10-02', amount: 20, cat: 'Other' }]} onEditCategory={onEditCategory} onEditMerchant={vi.fn()} saveState="saved" />);
    await userEvent.type(screen.getByLabelText('Search transactions'), 'B');
    await userEvent.selectOptions(screen.getByLabelText('Category for B'), 'Shopping');
    expect(onEditCategory).toHaveBeenCalledWith(1, 'Shopping');
  });
  it('reports unavailable quality without inventing confidence', () => {
    render(<QualityPanel unknownDateCount={2} />);
    expect(screen.getByText(/2 transactions need date review/)).toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
  it('confirms exactly the merchant indices supplied to the visible workspace', async () => {
    const onEditMerchant = vi.fn();
    render(<TransactionsView transactions={[{ sourceIndex: 2, desc: 'Coffee', date: '2026-10-01', amount: 10, cat: 'Other' }, { sourceIndex: 5, desc: 'Coffee', date: '2026-10-02', amount: 20, cat: 'Other' }]} onEditCategory={vi.fn()} onEditMerchant={onEditMerchant} saveState="saved" />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Apply to merchant' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Apply category' }));
    expect(onEditMerchant).toHaveBeenCalledWith([2, 5], 'Other');
  });
});
