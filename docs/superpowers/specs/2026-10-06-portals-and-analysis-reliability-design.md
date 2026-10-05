# Main and admin portals: UI and analysis reliability

Date: 2026-10-06
Status: Written specification awaiting user review
Scope direction approved by the user with “do it”.

## Goal and relationship to existing work

Deliver a coherent, responsive main portal and admin portal for Spend Analysis, with working upload, analysis, history, transaction editing, administration, audit, and usage flows. Improve the identified data and access problems alongside the interfaces. Use real API data; distinguish missing data from zero.

This specification extends the approved 2026-08-10 premium fintech UI design. Its React/Vite, typography, token, category color, and real-data decisions remain applicable. The previous prohibition on backend, API service, and authentication changes is superseded specifically for the reliability and access changes described here. Existing uncommitted edits to backend/server.js and frontend/src/App.jsx must be preserved and integrated. No framework migration or deployment is included.

## Recommended approach and alternatives

Incrementally replace the presentation layer using shared components, wire existing analytical helpers into actual views, and repair APIs in small verifiable steps. This avoids parallel implementations of financial calculations and keeps existing functionality available.

A cosmetic CSS-only refresh is faster but leaves the oversized components, inconsistent states, and logic defects. A Next.js rebuild could match some registry examples directly but introduces routing, authentication, deployment, and streaming changes without serving the current goal. The incremental approach is selected.

## Visual contract and reference integration

Use the existing graphite surfaces, gold primary action, Inter interface text, JetBrains Mono amounts, Lucide icons, and semantic credit/debit colors. The light theme uses the existing CSS token overrides. Shared primitives cover buttons, inputs, tabs, cards, badges, dialogs, tables, skeletons, empty states, and inline errors.

Vengeance UI supplies candidates for animated numerical summaries and compact navigation; Skiper supplies candidates for tabs, tooltips, and restrained interaction feedback. Evaluate each selected component's dependencies and license before copying its public source, adapt to Vite, and include required attribution for Skiper free components. Premium components require an existing entitlement; no purchase is part of this scope. Animmaster informs motion patterns where accessible source and usage terms permit. SceneAI informs spacing, composition, gradients, and backgrounds; it is a prompt reference rather than an application package. Record any components actually incorporated and their sources in a credits document. Do not claim all four providers are installed dependencies.

Animation supports progress, entry, selection, and feedback, with short opacity/transform transitions. Respect reduced-motion preferences; preserve keyboard focus and native scrolling. Decorative cursor effects, continuous motion behind tables, and heavy 3D effects are excluded from the finance workspace.

## Main portal

The root remains the statement upload screen. Its primary area contains the upload drop zone, selected-file list with remove actions, format/size limits matching the server, sample-data action, and a clear privacy description. Retain per-file PDF passwords and existing streaming events. Show actual page conversion and extraction progress, not an invented percentage or timing promise. Surface recoverable errors beside the action with a retry path.

A reusable desktop sidebar and top bar frame the dashboard and signed-in history. Mobile navigation is accessible at narrow widths without squeezing desktop controls. Preserve existing hash links and add deep-linkable dashboard views for overview, transactions, vendors, insights, and rewards. Direct loading without active analysis presents a useful upload/history action. Navigation must not mutate browser location during render.

Overview contains spend summaries, category breakdown, chronological daily spend, top merchants, and extraction/reconciliation status. Label net spending and refunds explicitly; exclude self transfers by default with an accessible toggle. Do not render negative values as donut slices: encode category spending with nonnegative debit values and show refunds/net totals separately. Retain actual rewards when available and omit unsupported reward claims.

Transactions support merchant/category search, category filters, date/amount sort, and category corrections. Keep each original transaction index or stable identifier through sorting/filtering so edits affect the correct source row. Merchant-wide corrections show the affected count. Save feedback has saving, saved, and failed states with retry; failed writes do not silently disappear. History shows loading, empty, error, search, detail, and deletion states.

## Admin portal

Use the same design primitives and theme in a denser administrative shell. Navigation covers overview, analyses, API usage, and audit logs; account settings remain available.

Overview uses existing aggregate analysis and API data. Show analysis count, transaction count, aggregate spending, and available success/latency metrics with explicit labels. Do not imply revenue or active-user counts from analysis totals.

Analyses use server pagination, query, bank, and creation-date filters, with total-result count and reset filters. A detail panel shows statement metadata and extraction quality before opening the full analysis view. Retain category edits, single deletion with confirmation, and CSV export. Support export of the currently filtered result set, not merely the visible page, using a bounded/streamed server export if the result is large. Escape CSV quotes, delimiters, and line breaks and neutralize spreadsheet formula prefixes in textual cells. Record successful exports and edits in the audit trail.

API usage shows recorded request volume, failures, and latency over supported periods. Metrics absent from the data source are omitted rather than estimated. Audit filtering by action, text, and date happens before pagination, with validated pagination controls. Empty, stale, loading, and failed states remain distinguishable; retry keeps active filters.

The extraction review capability is a filterable view of stored analysis quality flags and detail explanations. This is human review of available analyses, not a new asynchronous job or provider retry system.

## Access and anonymous uploads

Protect saved analysis detail and update routes with a shared access policy: verified owner or verified admin. Check ownership on the server before returning any analysis metadata or mutating data. Missing credentials return 401; inaccessible IDs return 404 to avoid existence disclosure. Legacy records with no owner are admin-only. Do not reinterpret anonymous records as owned by whichever user opens them.

Anonymous uploads remain usable: return redacted analysis results to the uploading browser and permit in-memory category edits. Anonymous results are not persisted or remotely updated; label that sign-in is needed for saved history. If legacy anonymous records already exist, their protection follows the admin-only policy. Signed-in upload associates the verified user ID server-side. All main-portal detail/edit calls send the user token; admin calls send the admin token. Invalid supplied credentials must not silently become anonymous access.

Require a configured JWT secret and explicit bootstrap admin password where a new admin is created. Remove production default secrets/passwords. Document configuration failures clearly and update tests to configure explicit fixtures. Pin verification algorithms and validate expected admin identity; preserve current Clerk authentication integration.

Client local storage does not persist statement financial payloads. Keep active analysis in memory; preserve nonfinancial preferences such as theme. Clear legacy analysis cache keys. Reload retrieves signed-in history through authenticated API calls or offers upload; do not promise restoration of anonymous results.

## Data correctness and persistence

Consolidate presentation calculations into frontend/src/lib rather than retaining a second inline implementation. Parse supported statement date forms strictly; invalid/missing dates remain unknown and trigger a quality warning. Group daily charts and drilldowns by normalized full calendar date, using local calendar construction rather than UTC conversion that shifts dates. Transactions with unknown dates remain in totals and lists but are excluded from dated charts with a visible count.

Use integer minor units for monetary aggregations and validation. Define debit as positive amount and refund as negative amount, consistent with current extraction conventions. Distinguish gross debit, refunds, net spending, and self transfers. Recompute authoritative aggregates on the server after validated edits. Reject nonfinite amounts and unbounded or malformed update payloads; only supported transaction edits can be written. Do not let clients change ownership, redaction status, or protected metadata through passthrough fields.

Initial load, selection, and navigation cause no write. Category changes are explicit authenticated mutations with serialized saves so slower earlier requests cannot overwrite newer changes. Preserve unsaved edits after failure and expose retry. Server mutation filters include ownership rather than relying exclusively on a prior read. Detect unknown analyses and return a meaningful error rather than a false success.

Reconciliation records opening/closing balance, reported credits, extracted debits/refunds, difference, and one of balanced, mismatch, or unavailable. Display mismatches as review warnings, not as proof of extraction failure. Bank and card statement semantics differ: only claim balance reconciliation when available fields support the equation. Repeated page-level statement summary values are not blindly added. Deduplicate only demonstrable overlapping page-boundary rows with provenance/reference evidence; identical purchases alone are not duplicates.

Validate extraction responses before combining them. Build insight input from summaries of every valid transaction plus bounded examples, replacing the first-150-only input. If insight generation fails, retain successfully extracted transactions and show insights as unavailable. Do not fabricate insight text or extraction confidence percentages.

Store additive quality metadata in analysis data; older records compute what is possible and report unavailable otherwise. Raw passwords, raw uploaded files, and new PII are excluded from quality and audit metadata. Report the existing account-holder storage separately from redacted transactions; do not make an inaccurate claim that no identifying information is stored.

## API and module boundaries

Shared UI primitives live under frontend/src/components/ui; portal shells and views use the existing components as migration entry points. App remains responsible for active analysis and navigation; a focused persistence hook owns edit-saving state. Services expose authenticated reads/edits, filtered lists, and typed error handling. Existing lib/types.ts, lib/derive.ts, and lib/format.ts become the single frontend analysis contract.

Backend middleware owns access/configuration policy; validation schemas own query/edit boundaries; database helpers own ownership-constrained queries, pagination, aggregation, and updates; a focused analysis-quality module owns normalization/reconciliation/insight summaries. Avoid adding these responsibilities to the existing long server file.

For admin analysis lists and audit lists, use validated page size capped at 100, nonnegative offset, bounded query length, and valid date bounds. Return items, total, limit, and offset for paginated requests and update callers together. Retain old array responses temporarily for unpaginated callers only if needed during migration; remove unused compatibility paths once all repository callers have moved. Escape search expressions so user input is treated as text.

## Verification and delivery sequence

1. Capture existing test/build/lint/typecheck results and preserve the current dirty files.
2. Implement access/configuration, strict query/edit validation, anonymous behavior, and focused backend regression tests.
3. Repair date/monetary calculations, extraction quality, full-data insights, and explicit save behavior with regression tests.
4. Implement shared primitives and main portal views, keeping all current upload, sample, password, reward, and history flows.
5. Implement admin shell, paginated analyses, overview, quality review, usage, audits, and safe export.
6. Run backend/frontend tests, frontend production build, typecheck, and lint; inspect both themes at desktop and mobile sizes and exercise keyboard controls.

Regression evidence must cover owner/admin/anonymous/cross-owner access, filtered pagination, CSV escaping, date collisions across months, invalid dates, refund/self-transfer totals, sorted-row editing, absence of writes on load, save failure/retry, reconciliation unavailable/mismatch, and preservation of extraction results when insights fail. Existing tests that intentionally require fabricated dates must be updated to the new approved behavior.

Browser verification covers upload/sample, dashboard navigation, filters, detail/edit feedback, PDF-password recovery where an appropriate synthetic fixture is available, signed-in history, admin login, analysis detail, deletion confirmation, audit filtering, and usage errors. Use synthetic data only for tests and sample mode; do not replace live API responses. Report any unavailable external credentials or database as limits on live integration verification.

## Follow-up recommendations outside this delivery

Persisted budgets, recurring-payment intelligence, month-to-month comparisons, user administration, multi-admin role permissions, retention scheduling, and asynchronous extraction job retries require separate product/data contracts. The current delivery documents these recommendations but does not show dead-end navigation or simulated implementations for them.

## Acceptance

Both portals are visibly implemented and responsive, share accessible styling, and retain their existing working capabilities. Saved analyses cannot be read or changed across owners. Anonymous upload remains useful without exposing saved anonymous records. Daily charts separate calendar dates correctly. Loading analysis does not write it back. Failures are actionable. Admin pagination/filter/export reflect the same result set. Quality warnings and insights accurately reflect available data. Validation commands and browser evidence accompany the completed implementation; code changes are not treated as verified merely because a specification exists.
