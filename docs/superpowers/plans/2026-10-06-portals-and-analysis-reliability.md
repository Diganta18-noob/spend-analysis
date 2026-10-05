# Portals and Analysis Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement responsive main and admin portals with protected saved analyses, correct analytics, explicit save feedback, extraction quality visibility, and usable administrative workflows.

**Architecture:** Incrementally replace existing portal presentation using shared primitives and focused views. Keep React/Vite, Clerk, hash navigation, Recharts, and the existing streaming extraction protocol. Move financial calculations into shared frontend helpers and introduce focused backend access, validation, and quality helpers.

**Tech Stack:** React 19, Vite 8, JSX with incremental TypeScript, Tailwind CSS 4, Lucide, Recharts, Express 5, Mongoose, Zod, JWT, Vitest, Testing Library; selected public registry components adapted to Vite.

**Spec:** `docs/superpowers/specs/2026-10-06-portals-and-analysis-reliability-design.md`

## Global Constraints

- Existing uncommitted edits to backend/server.js and frontend/src/App.jsx must be preserved and integrated.
- No framework migration or deployment is included.
- Use real API data; distinguish missing data from zero.
- Respect reduced-motion preferences; preserve keyboard focus and native scrolling.
- Premium components require an existing entitlement; no purchase is part of this scope.
- Client local storage does not persist statement financial payloads.
- Legacy records with no owner are admin-only.
- Initial load, selection, and navigation cause no write.
- Anonymous results are not persisted or remotely updated.
- Persisted budgets, user administration, multi-admin roles, retention scheduling, and asynchronous job retries are follow-up work.

## Review Focus

1. A malformed supplied token must fail rather than silently create an anonymous upload; Task 2 tests it.
2. Identical purchases may be legitimate: only demonstrable page-boundary overlaps can be deduplicated; Task 4 tests it.
3. A filtered/sorted transaction must retain its original identity when edited; Tasks 5 and 7 test it.
4. A slow save response cannot overwrite a newer edit, and failure cannot lose pending edits; Task 5 tests both.
5. An export must include the filtered result set across pages and make spreadsheet formulas inert; Task 3 tests both.

## Preparation and baseline

Observed on 2026-10-06: backend/frontend tests, frontend build, typecheck, and lint cannot start because Vitest/Vite/TypeScript/ESLint executables are unavailable. This is a missing-install baseline, not evidence of source failures.

Before coding, inspect the dirty diff and preserve its intent. Execute in the current session using a working-tree baseline, unless the user chooses an isolated checkout; a fresh worktree does not automatically contain these changes. Never reset the existing checkout. Commits must stage explicit task-owned paths and must not accidentally stage pre-existing edits. If a task modifies a dirty file, keep that task uncommitted until the user changes can be isolated safely; report the remaining working-tree state.

## File map

- `backend/config.js`: secure server authentication configuration.
- `backend/middleware/analysisAccess.js`: owner/admin authorization.
- `backend/lib/analysisQuality.js`: extraction normalization, money summaries, provenance-aware reconciliation, insight input.
- `backend/lib/csv.js`: safe CSV serialization.
- `backend/schemas.js`: bounded queries and category-update contracts.
- `backend/db.js`: ownership-constrained mutations and filtered list/export queries.
- `backend/server.js`: wire helpers into routes and existing SSE flow.
- `frontend/src/lib/format.ts`, `derive.ts`, `types.ts`: dates, money, stable transaction identity, analysis quality types.
- `frontend/src/hooks/useAnalysisPersistence.js`: explicit serialized category saves and retry state.
- `frontend/src/services/apiService.js`: authenticated requests, pagination and API error mapping.
- `frontend/src/services/cacheService.js`: remove legacy financial cache persistence.
- `frontend/src/components/ui/`: shared accessible presentation primitives.
- `frontend/src/components/layout/PortalShell.jsx`: shared responsive shell.
- `frontend/src/views/`: main portal views and extraction quality presentation.
- Existing upload/history/navbar/admin components: integration entry points, replaced or reduced incrementally.
- `frontend/src/App.jsx`: navigation and active analysis, no implicit save side effect.
- `docs/ui-credits.md`: exact incorporated sources, terms, adaptations, attribution.
- `docs/runbook.md`: secure configuration, verification, behavior changes.

### Task 1: Reproducible baseline and dependency setup

**Files:** Existing `frontend/package.json`, `backend/package.json` and lockfiles; create `docs/portal-validation.md`.

**Interfaces:** Consumes existing scripts. Produces recorded baseline command results and a usable local toolchain.

- [ ] Inspect `git diff -- backend/server.js frontend/src/App.jsx` and list tracked lockfiles with `rg --files -g '*lock*' -g '!node_modules'`. Record existing edits in validation notes without copying sensitive content.
- [ ] Install each package tree with `npm ci` where a matching lockfile exists; otherwise use `npm install`. Do not upgrade packages to solve an absent-install error.
- [ ] Run `npm test` in backend and frontend, then frontend `npm run build`, `npm run typecheck`, and `npm run lint`. Record command, exit code, and meaningful failure summary. If Node does not satisfy the declared engine floor, locate a compatible existing runtime before altering code.
- [ ] Start from the baseline result; repair failures relevant to the delivery and distinguish unrelated pre-existing failures. Commit only the validation note or necessary task-owned setup changes.

### Task 2: Secure saved-analysis access without breaking anonymous uploads

**Files:** Create `backend/config.js`, `backend/middleware/analysisAccess.js`, `backend/tests/analysisAccess.test.js`; modify `backend/middleware/auth.js`, `backend/db.js`, `backend/server.js`, `backend/tests/auth.test.js`, `backend/tests/userAuth.test.js`, `backend/vitest.config.js`, `frontend/src/services/apiService.js`, `frontend/src/components/HistoryScreen.jsx`.

**Interfaces:** `requireAnalysisAccess(req,res,next)` sets `req.analysisAccess = { kind: 'admin' } | { kind: 'owner', ownerId: string }`. `getAccessibleAnalysis(id, access)` and `updateAccessibleAnalysis(id, changes, access)` apply the access filter in the database query. `fetchAnalysis(id, { userToken, admin } = {})` and `updateAnalysis(id, changes, { userToken, admin } = {})` always use the selected credential. Missing access returns 401; missing/inaccessible records return 404.

- [ ] Write failing access tests using the same mocked response/next pattern as existing auth tests:

```js
it('does not disclose another owner analysis', async () => {
  const access = { kind: 'owner', ownerId: 'owner-a' };
  await getAccessibleAnalysis('analysis-b', access);
  expect(Analysis.findOne).toHaveBeenCalledWith({ id: 'analysis-b', owner_id: 'owner-a' });
});
it('rejects a malformed supplied upload credential', async () => {
  const { req, res, next } = mockExpress('invalid');
  await optionalUserAuth(req, res, next);
  expect(res._status).toBe(401);
  expect(next).not.toHaveBeenCalled();
});
```

Expose database model/query mocking through a small module boundary if needed; do not run production database connections in unit tests. Include admin, owner, no credential, forged admin identity, expired token, and null-owner records.
- [ ] Run `npm test -- tests/analysisAccess.test.js tests/auth.test.js tests/userAuth.test.js` in backend and confirm the new cases fail for their intended reasons.
- [ ] Resolve JWT secret from explicit configuration, verify HS256 admin tokens with expected username, retain RS256 Clerk verification, and use explicit test environment fixtures. Require an explicit bootstrap password only when provisioning a new admin. Remove secret/password fallbacks in both server and middleware.
- [ ] Wire protected read/update routes and ownership-constrained database helpers. Anonymous extraction sends results without storing an analysis or exposing a remotely writable ID. Signed-in extraction derives owner ID from verified credentials. Protect legacy null-owner records with admin access.
- [ ] Send user credentials when history opens details and admin credentials when admin opens/edits details. Return safe, typed errors rather than raw internal details. Rerun focused tests and relevant frontend service tests; commit task-owned changes subject to dirty-file constraints.

### Task 3: Filtered admin lists, validated updates, and safe full-result export

**Files:** Modify `backend/schemas.js`, `backend/db.js`, `backend/server.js`, `frontend/src/services/apiService.js`; create `backend/lib/csv.js`, `backend/tests/adminQueries.test.js`, `backend/tests/csv.test.js`.

**Interfaces:** `listAnalyses({ query, bank, from, to, limit, offset })` and `listAuditLogs({ query, action, from, to, limit, offset })` return `{ items, total, limit, offset }`. API services expose `fetchAnalyses(filters)`, `fetchAuditLogs(filters)`, and `exportAnalyses(filters)`. Update shape is `{ edits: [{ index: integer, cat: canonicalCategory }] }`, capped to the analysis transaction count. Metadata and ownership are immutable through this route. `serializeCsv(headers, rows)` returns string.

- [ ] Write failing tests for invalid dates, negative offsets, page-size cap of 100, literal search containing regex characters, filtered counts before pagination, empty pages, malformed edits, unknown categories, and metadata injection.

```js
it('escapes CSV and prevents text formulas', () => {
  const csv = serializeCsv(['Bank', 'Amount'], [['=1+1', 25], ['A,"B"', 10]]);
  expect(csv).toContain("'=1+1");
  expect(csv).toContain('"A,""B"""');
});
it('rejects negative pagination offsets', () => {
  expect(analysisListSchema.safeParse({ offset: '-1' }).success).toBe(false);
});
```

- [ ] Run `npm test -- tests/adminQueries.test.js tests/csv.test.js` in backend and confirm the intended failures.
- [ ] Implement strict Zod query/edit schemas, escaped text search, database filtering before skip/limit, and matching filtered counts. Avoid accepting arbitrary passthrough analysis payloads. Use index validation against the stored transaction array and recompute aggregates after edits.
- [ ] Implement protected CSV export over the same filtered database query, iterating records in batches/cursor and respecting response backpressure. Serialize delimiter/quote/newline cells and neutralize formula prefixes in text, including leading whitespace. Audit completed exports and mutation events without storing raw financial rows in logs. On cursor/response errors, close the cursor and return or terminate the response appropriately.
- [ ] Test that a filtered 101-record result exported with a 25-row page size includes all 101 records, includes none from other filters, and does not issue an unbounded in-memory load. Rerun focused tests and commit task-owned changes.

### Task 4: Extraction quality and complete-data insights

**Files:** Create `backend/lib/analysisQuality.js`, `backend/tests/analysisQuality.test.js`; modify `backend/server.js`, `backend/geminiService.js`, `backend/schemas.js` as needed.

**Interfaces:** `normalizeExtractedTransactions(rows, provenance)` returns `{ transactions, warnings }`; `summarizeMoney(transactions)` returns minor-unit `{ grossDebits, refunds, netSpend, selfTransfers }`; `reconcileAnalysis(data)` returns `{ status: 'balanced'|'mismatch'|'unavailable', differenceMinor: number|null, reasons: string[] }`; `buildInsightInput(transactions)` returns all-data summaries and bounded samples. Quality metadata is `data.quality` and is additive for older records.

- [ ] Add regression tests for nonfinite/malformed amounts, unknown dates, refunds, self transfers, repeated page summary values, credit-card semantics without a valid equation, page-boundary overlaps with reference/provenance, identical legitimate purchases, and transactions after position 150 affecting insight totals.

```js
it('summarizes every transaction for insights', () => {
  const rows = Array.from({ length: 151 }, (_, index) => ({
    date: '2026-10-01', desc: `merchant-${index}`, amount: 1, cat: 'Other'
  }));
  expect(buildInsightInput(rows).summary.netSpend).toBe(15100);
});
it('retains legitimate identical purchases', () => {
  const row = { date: '2026-10-01', desc: 'Coffee', amount: 100, cat: 'Food & Dining' };
  expect(normalizeExtractedTransactions([row, row], { page: 1 }).transactions).toHaveLength(2);
});
```

- [ ] Run `npm test -- tests/analysisQuality.test.js`, verify failures, then implement helper contracts using integer minor units. Retain unknown dates as warnings and do not invent extraction-confidence percentages.
- [ ] Normalize every page before merging and retain provenance sufficient for conservative overlap detection. Treat repeated statement-level totals as metadata, not additive page amounts. Reconcile only when supported debit/refund/credit conventions and balances are available; mismatches remain warnings.
- [ ] Replace transaction slicing in the insight prompt with complete aggregate summaries and bounded examples. Catch insight-specific failure and finish extracted analysis with `insights: []` and an actionable quality reason. Keep extraction failures distinct and never fabricate insight text.
- [ ] Test the insight-failure route with mocked provider and database: streamed completion contains the extracted transactions, quality indicates unavailable insights, and signed-in analysis still stores successfully. Rerun focused tests and commit task-owned changes.

### Task 5: Correct frontend dates, stable edits, and explicit save state

**Files:** Modify `frontend/src/lib/types.ts`, `format.ts`, `derive.ts`, `frontend/src/tests/derive.test.ts`, `format.test.ts`, `frontend/src/App.jsx`, `frontend/src/services/cacheService.js`; create `frontend/src/hooks/useAnalysisPersistence.js`, `frontend/src/tests/persistence.test.jsx`.

**Interfaces:** Normalized transactions retain `sourceIndex`; invalid date is `''`. `calendarDateKey(raw)` returns `YYYY-MM-DD | null`. `dailySeries(txns)` returns chronological `{ day: ISODate, amount }[]`; `dailyBreakdown(txns, ISODate)` uses the same key. `useAnalysisPersistence({ analysis, onChange, getToken, admin })` exposes `editCategory(sourceIndex, cat)`, `editMerchantCategory(desc, cat)`, `saveState`, `saveError`, `retrySave`.

- [ ] Replace fabricated-date expectations and add tests covering February versus March on the same day, invalid rollover dates, unknown dates retained in totals, minor-unit precision, and sorted/filtered source identity.

```ts
it('separates the same day across months', () => {
  const rows = normaliseTransactions([
    { date: '2026-09-01', amount: 10, cat: 'Other' },
    { date: '2026-10-01', amount: 20, cat: 'Other' },
  ]);
  expect(dailySeries(rows)).toEqual([
    { day: '2026-09-01', amount: 10 },
    { day: '2026-10-01', amount: 20 },
  ]);
});
```

- [ ] Run frontend `npm test -- src/tests/derive.test.ts src/tests/format.test.ts`, confirm intended failures, and implement date/money contracts. Preserve invalid-date transactions while excluding them from dated series.
- [ ] Add hook tests with mocked API and deferred promises: mount/selection does not save; edits send only category patches with credentials; second request waits for the first; a failed save retains edits and retries; anonymous/sample edits never call the API.

```js
it('does not write on initial load', () => {
  renderHook(() => useAnalysisPersistence({ analysis, onChange: vi.fn(), getToken: vi.fn() }));
  expect(updateAnalysis).not.toHaveBeenCalled();
});
```

- [ ] Remove App's automatic full-payload update effect, integrate explicit edit handlers, and serialize mutations. Track pending changes separately from last saved state. Clear legacy cache keys and stop financial data writes to local storage. Theme preferences remain persisted.
- [ ] Run persistence, derive, and format suites and typecheck; commit task-owned changes subject to App's pre-existing diff.

### Task 6: Shared portal shell and accessible visual primitives

**Files:** Create `frontend/src/components/layout/PortalShell.jsx`, `frontend/src/components/ui/PortalUI.jsx`, `frontend/src/tests/portalUI.test.jsx`, `docs/ui-credits.md`; modify `frontend/src/index.css`, `frontend/package.json` and lockfile only for required dependencies.

**Interfaces:** `PortalShell({ portal, activeView, onNavigate, theme, onToggleTheme, children, actions })`; primitives `Button`, `Card`, `StatCard`, `Tabs`, `EmptyState`, `InlineError`, `Skeleton`, `ConfirmDialog`. Use native elements, semantic labels, token-based class styling, controlled states, and accessible focus behavior.

- [ ] Review exact publicly available component sources from the four user references. Select usable Vengeance/Skiper components, record license/attribution and adaptations, and avoid premium-only source. Use CSS motion when adequate; add Motion only when a selected component requires it and use React-19-compatible official guidance.
- [ ] Add tests that tabs expose selected state, sidebar links work by keyboard, mobile navigation toggles with aria-expanded, error retry is a button, and dialog Escape/cancel returns focus.

```jsx
it('provides keyboard-readable selection', () => {
  render(<Tabs value="overview" onChange={vi.fn()} items={[
    { value: 'overview', label: 'Overview' }, { value: 'transactions', label: 'Transactions' }
  ]} />);
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
});
```

- [ ] Run frontend `npm test -- src/tests/portalUI.test.jsx`, confirm failures, and implement shared primitives with Inter/mono typography, existing tokens, Lucide icons, reusable skeletons, clear inline errors, and semantic colors.
- [ ] Implement desktop sidebar/top bar and narrow-screen navigation; tables may scroll inside their panel without horizontal overflow of the entire page. Apply reduced-motion overrides and visible focus styles. Preserve both themes.
- [ ] Run focused tests, build, and inspect shell at desktop and mobile widths in both themes. Commit shared UI and source credits.

### Task 7: Main portal views and upload/history integration

**Files:** Create `frontend/src/views/OverviewView.jsx`, `TransactionsView.jsx`, `VendorsView.jsx`, `InsightsView.jsx`, `QualityPanel.jsx`, `frontend/src/tests/mainPortal.test.jsx`; modify `frontend/src/components/ExpenseManager.jsx`, `UploadScreen.jsx`, `HistoryScreen.jsx`, `Navbar.jsx`, `RewardsPanel.jsx`, `frontend/src/App.jsx`.

**Interfaces:** Views consume normalized transactions and the derivation helpers from Task 5. `TransactionsView({ transactions, onEditCategory, onEditMerchant, saveState, saveError, onRetry })` edits by sourceIndex. `QualityPanel({ quality, unknownDateCount })` supports unavailable legacy metadata. Dashboard hashes select overview/transactions/vendors/insights/rewards; existing `#/dashboard` remains the overview alias.

- [ ] Add behavior tests for deep-link view navigation, direct loading without analysis, sample flow, transaction filters/sorts, source-index editing, merchant correction count, missing insights/rewards, and quality mismatch/unavailable states.

```jsx
it('edits the original row after sorting', async () => {
  const onEditCategory = vi.fn();
  render(<TransactionsView transactions={[
    { sourceIndex: 0, desc: 'A', date: '2026-10-01', amount: 10, cat: 'Other' },
    { sourceIndex: 1, desc: 'B', date: '2026-10-02', amount: 20, cat: 'Other' }
  ]} onEditCategory={onEditCategory} saveState="saved" />);
  await userEvent.selectOptions(screen.getByLabelText('Category for B'), 'Shopping');
  expect(onEditCategory).toHaveBeenCalledWith(1, 'Shopping');
});
```

- [ ] Run frontend `npm test -- src/tests/mainPortal.test.jsx`, confirm failures, then replace the inline analytics and presentation in ExpenseManager with the shared shell and focused views.
- [ ] Build overview summaries, chronological bars, nonnegative debit donut, explicit refund/net figures, merchants, insights, and real reward display. Unknown-date count is visible; category filters consistently affect the displayed list/chart context.
- [ ] Redesign upload with drop zone, file list/removal, real limits, sample action, current-session/privacy copy, real streaming progress, password retries, and inline recovery. Do not break multipart file/password/token payloads.
- [ ] Integrate signed-in history states with authenticated detail access and confirmed deletion. Move navigation side effects out of render. Give anonymous/current-session and unsaved/failed-save states clear visible labels.
- [ ] Run main portal tests plus full frontend suite, build, and typecheck. Browser-check sample upload/navigation/filter/edit in both themes at mobile/desktop. Commit task-owned changes safely.

### Task 8: Admin overview, analyses, quality review, and exports

**Files:** Create `frontend/src/components/admin/AdminOverview.jsx`, `AnalysisTable.jsx`, `AnalysisDetailDrawer.jsx`, `frontend/src/tests/adminPortal.test.jsx`; modify `AdminDashboard.jsx`, `AdminLogin.jsx`, `AdminSettingsModal.jsx`, `ConfirmToast.jsx`.

**Interfaces:** AdminDashboard owns controlled filters and pagination, fetches Task 3 list envelopes and existing stats/usage, and passes authenticated detail/edit services. `AnalysisTable({ items, total, filters, onFiltersChange, onView, onDelete })`; `AnalysisDetailDrawer({ analysis, onClose, onOpenFull })`. Reuse the Task 6 dialog and shell.

- [ ] Add tests for load/error/retry, query resetting offset, bank/date filters reaching the service, pagination from total count, empty result behavior, details using admin auth, quality warnings, and cancellation leaving analyses untouched.

```jsx
it('resets pagination when changing the bank filter', async () => {
  render(<AdminDashboard />);
  await userEvent.selectOptions(await screen.findByLabelText('Bank filter'), 'HDFC');
  expect(fetchAnalyses).toHaveBeenLastCalledWith(expect.objectContaining({ bank: 'HDFC', offset: 0 }));
});
```

- [ ] Run frontend `npm test -- src/tests/adminPortal.test.jsx`, confirm failures, then implement overview with supported metrics, operational labels, last refresh, loading and error feedback.
- [ ] Implement paginated analysis table, filter/reset controls, metadata/quality detail drawer, full analysis viewer with Task 5 persistence configured for admin access, and confirmed single deletion. After deleting the last row on a page, move to the prior valid offset.
- [ ] Use the protected Task 3 CSV download endpoint with current filters, filename, pending/error feedback, Blob URL cleanup, and export result messaging. Client page data must not be mistaken for the full export.
- [ ] Redesign login and settings using shared primitives; preserve password changes and refreshed-token behavior. Verify session expiry redirects cleanly and errors do not silently display an empty overview. Run focused tests and commit safe task-owned paths.

### Task 9: API usage and audit workflows

**Files:** Modify `frontend/src/components/admin/ApiUsageTab.jsx`, `AuditLogTab.jsx`; create `frontend/src/tests/adminMonitoring.test.jsx`.

**Interfaces:** Usage consumes existing recorded daily/request/error/latency data. Audit service receives `{ action, query, from, to, limit, offset }` and returns Task 3 envelopes.

- [ ] Add tests for action filter before pagination, zero versus unavailable metrics, period selection, no audit results, retry preserving filters, and session-expiry errors.

```jsx
it('requests audit filtering from the server', async () => {
  render(<AuditLogTab />);
  await userEvent.selectOptions(await screen.findByLabelText('Audit action'), 'ANALYSIS_UPDATED');
  expect(fetchAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'ANALYSIS_UPDATED', offset: 0 }));
});
```

- [ ] Run frontend `npm test -- src/tests/adminMonitoring.test.jsx`, confirm failures, then implement tables/charts with the shared styles. Use explicit request counts and recorded latency; omit unsupported cost/token metrics.
- [ ] Add server-backed audit filters and consistent pagination/reset states. Avoid filtering only the loaded page. Provide status badges, readable timestamps, and accessible row content.
- [ ] Run focused tests and browser-check usable audit/usage states using real services when configured, controlled synthetic fixtures for failure/empty cases. Commit task-owned changes.

### Task 10: Integration verification and handoff

**Files:** Modify `docs/portal-validation.md`, `docs/runbook.md`, `docs/ui-credits.md`; update `.gsd/STATE.md` with actual progress without force-adding ignored planning state.

**Interfaces:** No new product contract. Produces evidence-backed completion report and configuration instructions.

- [ ] Run backend full tests and frontend full tests, production build, typecheck, and lint. Record actual exit codes and resolve new failures; do not treat the backend placeholder lint script as substantive lint evidence.
- [ ] Inspect desktop and mobile in both themes. Exercise root/sample flow, dashboard deep links, filters, edit feedback, keyboard navigation, signed-in history where configured, admin login/details, deletion confirmation, export, audit filters, and usage states. Verify reduced-motion behavior and readable contrast.
- [ ] Exercise PDF-password retry with a synthetic encrypted fixture if conversion dependencies are available. Check SSE fragmentation/error/completion behavior remains compatible after quality integration.
- [ ] Document required JWT secret/bootstrap password/Clerk keys without storing values. List schema/API behavior changes, anonymous session behavior, privacy limitations including existing account-holder storage, component credits, and external services unavailable during verification.
- [ ] Review the full diff for owner/access gaps, accidental financial local-storage persistence, incorrect aggregation, fake metrics, unsafe CSV, animation/focus issues, and unrelated changes. Re-run checks only after changes that warrant it.
- [ ] Commit verified task-owned work where safe; report preserved pre-existing changes and any uncommitted integrated files. Provide a concise implementation/validation/limitations summary with file links. No deployment or publishing.

## Coverage and execution handoff

Spec visual contract and sources: Task 6. Main portal: Tasks 5 and 7. Admin portal: Tasks 3, 8, and 9. Access and anonymous behavior: Task 2. Data correctness, quality, and persistence: Tasks 3–5. API/module boundaries: Tasks 2–9. Verification/runbook: Tasks 1 and 10. Follow-up recommendations remain explicitly outside implementation.

Recommended execution method: native implementation in this session, since access, API, persistence, and view changes share contracts and the existing dirty files require careful continuity. The user may choose subagent-driven execution instead. Implementation begins after the user reviews this written plan and selects the execution method, as required by the brainstorming and writing-plans skills.
