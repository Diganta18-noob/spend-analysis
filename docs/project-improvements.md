# Project improvements after portal implementation

## Implemented

Both portals share a responsive graphite/gold shell, light theme, clear loading/error/empty states, accessible controls, Vengeance-derived animated values and Skiper-derived links. The main workspace includes upload progress and password retry, daily/category summaries, searchable transactions, category corrections, merchant summaries, insights, rewards, and signed-in history. Sample data is explicitly labeled.

Administration adds operational overview, paginated server search with bank/date filters, quality review, detail drawer, category editing, confirmed deletion, complete filtered CSV exports, API usage, audit filters, and password settings. Unsupported cost/confidence metrics are not invented.

Analysis reads/edits require owner or verified administrator access. Owner deletions constrain the database operation itself. Edits accept category patches only and atomically update financial aggregates using version checks. Failed edits remain visible and retryable across viewer navigation. Anonymous analyses stay in memory and are not saved to the analysis collection or browser storage.

Unknown dates are retained for review, sums use minor units, full transaction summaries feed insights, and insight failure preserves extracted transactions. Reconciliation requires explicit bank-account metadata; card and combined-file results report unavailable reconciliation. Repeated page summaries are not added together. Rewards prefer actual row-level points and preserve unavailable values.

## Recommended next work, in order

1. **Durable analysis jobs.** Replace long-lived extraction requests with queued jobs and resumable progress. Add idempotency keys, cancellation at provider boundaries, retry budgets, and upload cleanup. This addresses reconnects, duplicate submissions, and work continuing after a browser disconnect.
2. **Extraction evaluation set.** Maintain synthetic/redacted bank and card fixtures, including encrypted PDFs, refunds, repeated pages, mixed periods, malformed dates, and missing metadata. Score amounts and coverage against expected rows. Require provenance before automatic deduplication or reconciliation; add independent per-file results for multi-statement uploads.
3. **Administrative review workflow.** Add assignable review items, correction reasons, reviewer identity, before/after category audit records, resolution status, and safe bulk actions. Introduce distinct roles before allowing multiple administrators; current access is a single administrator account.
4. **Privacy and retention controls.** Define retention periods and deletion policy, minimize account-holder/IP metadata, encrypt sensitive stored fields, and provide account deletion/export controls. Existing account-holder storage remains a privacy decision even when displayed transaction payloads are redacted.
5. **Database scale and observability.** Add compound indexes for owner/date and bank/date query patterns, measure query execution before selecting indexes, cap retained latency/error samples, and maintain failure-rate dashboards. Add integration tests against an isolated MongoDB instance for cursor exports, concurrent writes, pagination, and deletion.
6. **History growth.** Add owner-scoped server pagination/search and consolidate overview statistics into aggregation queries. Current personal history fetches the user's list and paginates locally; admin lists already paginate on the server.
7. **Financial planning features.** Add budgets, period-to-period comparisons, recurring merchant detection, and user-owned category rules after validating currency and statement identity. Keep suggestions separate from verified statement facts; avoid extrapolated reward cash values.

No deployment, multi-role system, background queue, retention migration, or budget engine is included in this implementation. Configuration and verification evidence are in `portal-validation.md` and `runbook.md`.
