import { describe, it, expect } from 'vitest';
import { selectTransactionPageIndexes, parseIciciCardStatement } from '../lib/statementPages.js';

describe('transaction page selection', () => {
  it('keeps ICICI card transaction tables and excludes text-bearing explanatory pages', () => {
    const header = 'ICICI Bank Credit Card STATEMENT SUMMARY Date SerNo. Transaction Details Statement period : November 01, 2026 to November 30, 2026';
    const continuation = 'Date SerNo. Transaction Details 12/11/2026 purchase';
    const terms = 'MOST IMPORTANT TERMS AND CONDITIONS '.repeat(12);
    expect(selectTransactionPageIndexes([header, continuation, terms, 'Worked illustration '.repeat(15)])).toEqual([0, 1]);
  });
  it('keeps scanned pages and unfamiliar formats for review', () => {
    const header = 'ICICI Bank Credit Card STATEMENT SUMMARY Date SerNo. Transaction Details Statement period : November 01, 2026 to November 30, 2026';
    expect(selectTransactionPageIndexes([header, '', 'Example '.repeat(20)])).toEqual([0, 1]);
    expect(selectTransactionPageIndexes(['Other bank', 'Terms'])).toEqual([0, 1]);
  });
  it('parses text-layer card rows only when printed totals reconcile', () => {
    const page = ['ICICI Bank Credit Card', 'STATEMENT SUMMARY', 'Total Amount due', '`80.00', 'SPENDS OVERVIEW', 'Statement period : November 01, 2026 to November 30, 2026',
      'Previous Balance', 'Purchases / Charges', 'Cash Advances', 'Payments / Credits', '`100.00', '`10.00', '`0.00', '`30.00',
      'Date', 'SerNo.', 'Transaction Details', '10/11/2026', '12345678901', 'ZOMATO', '1', '10.00', '11/11/2026', '12345678902', 'BBPS Payment received', '0', '30.00 CR'].join('\n');
    const pages = [page, 'MOST IMPORTANT TERMS AND CONDITIONS '.repeat(10)];
    const result = parseIciciCardStatement(pages);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[1].credit_type).toBe('card_payment');
    expect(result.transactions[0].source_page).toBe(1);
    expect(parseIciciCardStatement([page.replace('`80.00', '`81.00'), pages[1]])).toBeNull();
  });
});
