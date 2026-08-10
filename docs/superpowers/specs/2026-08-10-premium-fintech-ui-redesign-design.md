# Premium Fintech UI Redesign — Design Spec

**Date:** 2026-08-10
**Status:** Approved
**Scope:** Frontend presentation layer of the Spend Analysis app (`frontend/`)

---

## 1. Goal

Redesign the existing Expense / Spend Analysis application into a premium,
production-quality fintech interface without rebuilding it.

Preserved without change:

- Business logic and all analysis functionality
- API contracts and backend behaviour
- Database schema
- Authentication (Clerk for users, password/JWT for admin)
- Existing charts, admin functionality, and real data

Changed: the presentation layer, information hierarchy, motion, and responsive
behaviour.

The redesign targets the register of Stripe, Mercury, Ramp, Brex and Wise —
restraint, hierarchy, data density, interaction quality — expressed as an
original system, not a copy of any of them.

---

## 2. Decisions Taken

Four decisions were settled during design and are binding on implementation.

**Next.js is dropped.** An earlier stack list named Next.js App Router as
required. The brief that followed said not to rebuild, not to change routes, and
not to change auth. Migrating Vite to App Router is a frontend rebuild: hash
routes become path routes, Clerk moves to `@clerk/nextjs` middleware, every
component is touched, and the SSE reader needs revalidation. Every other item on
the stack list works in Vite unchanged. The app stays on Vite; Next.js is out of
scope.

**Real data only, degrading silently.** Seven requested components need fields
the pipeline does not produce (§4). Where a field genuinely does not exist, the
component omits that affordance rather than inventing a value or showing a
permanent placeholder.

**Sidebar drives hash sub-routes.** Dashboard tabs become
`#/dashboard/{transactions,vendors,insights,rewards}` so views are linkable,
survive reload, and support browser back/forward. `#/dashboard` aliases the
overview so existing links keep working.

**No separate landing page.** An earlier answer chose a scroll-driven landing at
`/` with upload at `/upload`. The detailed brief contains no landing section and
instructs not to change routes; it supersedes. Upload remains the root route,
redesigned per §12.

---

## 3. Current System (Audit)

| Concern | Current state |
|---|---|
| Framework | Vite 8, React 19, plain JSX, no TypeScript |
| Styling | Inline `style={}` objects + per-component `<style>` blocks |
| Fonts | DM Sans via Google Fonts `@import`, duplicated in two components (render-blocking) |
| Routing | Hand-rolled hash router in `App.jsx`; admin guard redirects during render |
| State | `useState` in `App.jsx`, props downward; no store |
| Auth | Clerk (degrades gracefully without a key) + separate admin JWT in `sessionStorage`, refreshed via `X-Refreshed-Token` header |
| Data layer | `apiService.js` (18 endpoints), `geminiService.js` (hand-written SSE reader) |
| Charts | Recharts 3.8 — donut + daily bars |
| Tokens | ~30 `--app-*` CSS custom properties, dark default with `.light-mode` override |
| Backend | Express 5 / MongoDB / Gemini / mupdf + sharp on Render, proxied by `vercel.json` |

`openaiService.js` appears unused and is left untouched.

### 3.1 UI Map

```
#/                UploadScreen (988 LOC)
                    server-status banner, 3-step strip, drop zone,
                    PDF password prompt, SSE progress, og.png preview
#/dashboard       ExpenseManager (630 LOC)
                    4 stat cards + 5 tabs:
                    overview | transactions | vendors | insights | rewards
                    RewardsPanel (325 LOC), Toast (apply-one / apply-all)
#/history         HistoryScreen (504 LOC) — Clerk-gated; search, view, delete
#/admin/login     AdminLogin
#/admin/*         AdminDashboard (427 LOC) — analyses | audit log | api usage
                    AdminSettingsModal, ConfirmToast
```

### 3.2 Confirmed Problems

- Four stat cards in four unrelated accent colours (`ExpenseManager.jsx:316`)
- 14 saturated category hues in `CAT_META`, leaving red/green no semantic room
- Emoji as production iconography: hero, primary CTA, tab, drop zone, 14 categories
- Gradient-text headings that fade letters mid-stroke
- Card backgrounds nearly identical to page background — no elevation
- `overflow-x: auto` as the only mobile table strategy
- No skeletons anywhere
- Theme toggle rendered independently in three components
- Infrastructure state ("Server Sleeping", "Wake Up Backend") as the first thing a user sees
- Dashboard content flush to the viewport edge — no shell, no container

### 3.3 Data Model (Ground Truth)

Transaction: `{ date, desc, amount, cat, reward_points }` — `date` is date-only.

Analysis: `{ period, bank, account_holder, opening_balance, closing_balance,
total_credits, total_reward_points, transactions[], insights[], is_redacted }`.

Stored analysis row adds `id, owner_id, total_spent, transaction_count, created_at`.

`ApiUsage` stores `total_calls, successful_calls, failed_calls,
total_tokens_estimated, latencies[], errors[]` per day — real telemetry that is
currently written but never displayed.

---

## 4. Data Gaps and Their Resolutions

Seven brief items require non-existent fields. Each degrades as follows.

| Requested | Gap | Resolution |
|---|---|---|
| Trend vs previous period | One analysis covers one period | Render delta only when a comparison analysis exists (rule below). Omit the delta row entirely otherwise — no dash, no zero, no "N/A". |
| `[7D][30D][90D]` + prev/next period | Dataset is a single ~31-day statement | Replace with the statement period label, stepping between the user's saved analyses, and a brush on the daily chart for in-range filtering. |
| Drawer: `8:42 PM`, `•••• 4821` | Dates are date-only; references destroyed by `piiRedactor` before storage | Show real fields plus honest derived ones: merchant total, share of spend, count and list of other transactions at that merchant. |
| Merchant logos | Only a raw `desc` string | Deterministic monogram from the normalised merchant name, tinted by category ramp position. |
| Rewards "Estimated value ₹549" | Implies an invented 1pt = ₹1 rate | Show real earn rate (points per ₹100) and points-by-category, both computable. No currency conversion. |
| Admin `Processing/Completed/Failed` | Analyses written only on success; no status field | Show `Redacted` / `Not redacted` from the real `is_redacted` field. Drop the invented lifecycle. |
| Admin storage + processing queue | No such endpoints | Surface the real `ApiUsage` telemetry: success rate, p50/p95 latency, token estimates, recent errors. |

### 4.1 Comparison Rule

A prior analysis qualifies as the comparison baseline when **all** of these hold:

1. The user is signed in (`isSignedIn` true) — anonymous sessions have no history
2. `/api/v2/me/analyses` returns at least one other analysis for the same `bank`
3. That analysis's `created_at` is the most recent one strictly older than the
   current analysis's `created_at`

Comparison is on `total_spent`, sourced from the list endpoint, so no extra
per-analysis fetch is needed. If two analyses cover overlapping or identical
periods, the rule still applies — it compares statements, not calendar windows,
and the delta label reads "vs previous statement" rather than "vs previous period"
to stay accurate.

The delta is computed client-side in `lib/derive.ts`. No backend change.

### 4.2 What Runs On Real Data

Everything else in the brief: sparklines, category-split tooltips, command
palette, vendor trends and averages, insight modules, ledger, drawer, admin
telemetry.

---

## 5. Design Tokens

Extend the existing `--app-*` layer in `index.css` rather than replacing it, so
light mode survives. Tailwind v4 `@theme` maps utilities onto the same variables —
one source of truth.

```
--bg           #08090D
--surface      #0D1017
--surface-2    #121621
--elevated     #171B24
--border       rgba(255,255,255,0.08)
--border-strong rgba(255,255,255,0.14)
--text         #F5F7FA
--text-2       #9AA3B2
--text-muted   #697386
--accent       #E3B341
--success      #20C997
--danger       #FF6B6B
--info         #5B9CFF
```

Light mode overrides the same variable names under `.light-mode`. It is a first-class
mode, not an afterthought — the existing toggle stays functional:

```
--bg           #FBFBFA
--surface      #FFFFFF
--surface-2    #F5F6F8
--elevated     #FFFFFF
--border       rgba(9,11,15,0.10)
--border-strong rgba(9,11,15,0.18)
--text         #0B0D12
--text-2       #4B5565
--text-muted   #6F7A8B
--accent       #A9761B
--success      #0E8A63
--danger       #C4362F
--info         #2563C9
```

Semantic and accent colours darken in light mode to hold contrast against a white
surface; the same four-role accent restriction applies. The category ramp inverts
direction (light bronze → deep graphite) so ordinal weight still reads.

Spacing: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Radius: 8 · 12 · 16 — nothing larger.

**Accent discipline.** Gold moves from `#FBBF24` to `#E3B341` (deeper reads more
premium on near-black) and never appears as a gradient fill.

The `--accent` token itself is permitted in exactly four interface roles: primary
button, active nav indicator, focus ring, and the single hero figure. It is not
used for decoration, borders, section headings, or hover fills.

The category ramp (below) is a separate scale that includes gold-family tones by
design. Ramp colours are data encoding, not accent usage, and the two must not be
mixed: a chart series never uses `--accent`, and no interface control is tinted
from the ramp.

**Semantic colour.** Green means credit or positive trend. Red means debit or
negative trend. Blue means neutral analytics. Nothing else claims these.

**Category ramp.** The 14 saturated hues collapse to one ordered ramp
(gold → bronze → graphite). Identification comes from icon plus label; hue carries
ordinal weight only. This frees green and red for semantic use.

Assignment is by **fixed index into a canonical category order**, not by spend
rank — rank-based assignment would change a category's colour between analyses and
destroy recognition. The canonical order is the existing `CAT_META` key order,
preserved exactly:

```
Rent, Insurance, Personal Transfer, Office Food, Food & Dining, Transport,
Bills & Subscriptions, Groceries, Self Transfer, Entertainment, Shopping,
Healthcare, Education, Other
```

A category absent from this list falls back to the `Other` ramp step. Adding a
category appends to the list; it never reindexes existing entries.

**Iconography.** All 14 category emoji and the decorative 💸 ✨ ⭐ 🔐 become
Lucide icons. `lucide-react` is already a dependency.

**Elevation.** Surfaces separate by background step plus a hairline border, not by
shadow. Shadow appears only on genuinely floating layers: drawer, modal, palette,
tooltip.

---

## 6. Typography

Inter Variable, self-hosted via `@fontsource-variable/inter`. This removes the
render-blocking Google Fonts `@import` currently duplicated across two components.

JetBrains Mono is reserved for the ledger amount column only.

`font-variant-numeric: tabular-nums` applies globally to every figure so digits
align down columns.

Scale:

| Role | Size / weight |
|---|---|
| Hero figure | 40px / 44px line, 600 |
| Page title | 20px, 600 |
| Section title | 15px, 600 |
| Body | 14px, 400 |
| Secondary | 13px, 400 |
| Label | 11px, 600, uppercase, 0.08em tracking |

Hierarchy is carried by scale and weight, never by colour alone. Gradient text is
removed everywhere.

---

## 7. Architecture

`ExpenseManager.jsx` currently computes and renders in the same 630-line file.
All analytics `useMemo` blocks — category totals, daily series, vendor map,
recurring payees, reward stats — extract into pure functions.

```
src/lib/derive.ts        all analytics, pure and unit-tested
src/lib/format.ts        currency, dates, relative time, truncation
src/lib/motion.ts        durations, easings, reduced-motion gate
src/lib/errors.ts        error → human sentence mapping
src/components/ui/       shadcn primitives (button, dialog, drawer, command, table…)
src/components/shell/    AppShell, Sidebar, Topbar, MobileNav, CommandPalette
src/components/data/     Metric, MetricGroup, Sparkline, Skeleton, EmptyState, ErrorState
src/components/charts/   ChartFrame, SpendTrend, CategoryDonut, DailySpend, ChartTooltip
src/views/               Overview, Transactions, Vendors, Insights, Rewards
```

**TypeScript arrives incrementally.** `allowJs: true`; new files are `.tsx`;
existing `.jsx` converts only when otherwise edited. No big-bang conversion.

**Data flow is unchanged.** `App.jsx` still owns `data` and the update handlers.
A thin `AnalysisContext` provides it to shell descendants so the sidebar and
palette do not require prop drilling. Services, auth, SSE and backend are not
touched.

**Router** extends to `#/dashboard/{transactions,vendors,insights,rewards}`.
`#/dashboard` aliases overview. Unknown sub-routes fall back to overview. The
admin guard moves out of render into an effect, fixing the existing
side-effect-during-render bug.

---

## 8. Application Shell

Desktop: collapsible left sidebar (Overview, Transactions, Vendors, Insights,
Rewards; Settings pinned to the bottom), collapsed state persisted to
`localStorage`. Active state is a gold left-edge indicator that animates between
items via Framer Motion `layoutId`.

Topbar: brand, contextual breadcrumb, ⌘K search trigger, theme toggle, avatar.
Subtle backdrop blur only when scrolled. The three duplicate theme toggles
collapse into this one.

Below 768px: sidebar becomes bottom navigation; drawers become bottom sheets;
filters become bottom sheets.

Content sits in a max-width container with consistent gutters, fixing the current
flush-to-edge layout.

---

## 9. Dashboard Hierarchy

The four equal cards are replaced by a deliberate hierarchy:

1. **Primary figure** — Total Debited, 40px, tabular, with trend delta *when
   available* (§4)
2. **Spend trend** — a compact line across the statement period
3. **Secondary row** — Transactions, Average transaction, Top category as
   lightweight metrics, not full cards
4. **Analytics** — category donut and daily spend
5. **Detail** — statement period, credits, opening and closing balance as a
   quiet summary strip

`Metric` is one reusable component supporting label, value, comparison, trend,
sparkline, icon and contextual note. Absent props render nothing rather than
placeholder chrome.

---

## 10. Charts

Charts stay on Recharts and are reframed to read as part of the product rather
than embedded library output: no heavy border, minimal grid, restrained axis
labels, category ramp colours.

**Donut** — centre shows total spend, compact-formatted. Hovering a legend row
highlights its slice and vice versa; the percentage animates over 200–400ms.

**Daily spend** — the visual centrepiece. Crosshair, custom tooltip showing date,
total, and per-category split derived from that day's transactions. Bars animate
on data change. A brush enables in-range filtering.

The existing stuck-tooltip artifact and baseline-breaking negative bar are fixed:
negative values render below a visible zero baseline with the credit colour.

**Tooltips** are one shared component across every chart — elevated surface,
hairline border, tabular figures.

---

## 11. Transactions, Vendors, Insights, Rewards

**Transactions** become a ledger: sticky header, right-aligned mono amounts,
category icon plus label, hover lift, click opens a right-side drawer (bottom
sheet on mobile) with real fields plus derived merchant context. Sort, filter and
search are preserved. The existing apply-one / apply-all category edit flow and
its toast are preserved exactly. Below 768px rows become cards.

**Vendors** gain per-merchant transaction count, average transaction, category,
frequency and a sparkline, with sorting, search and expandable rows.

**Insights** become modules with a headline, natural-language body, the figures
that drove it, and a link that deep-links into a filtered transaction view. The
AI-provided `icon`/`color` fields map onto the system's icon set and ramp rather
than being rendered raw.

**Rewards** lead with total points, then real earn rate (points per ₹100),
points by category, and best-earning transactions. A restrained highlight on the
total when it first resolves — no gamification.

---

## 12. Upload Experience

The oversized empty drop zone becomes a compact upload panel: clear title,
accepted formats, drag-and-drop plus a browse button, and file chips with type
icons.

Progress maps to **real** SSE events already emitted by
`analyzeStatementsV2` — `page_converted`, `page_extracted`, `finalizing`, `done` —
rendered as discrete steps. No fabricated percentages.

The server-status banner drops from hero position to a quiet inline indicator;
the wake action stays available but stops being the first thing a user sees.

The PDF password flow, its error states, and the sample-data path are preserved
exactly.

Privacy messaging is stated once, understated, near the drop zone.

---

## 13. Admin Console

Reframed from CRUD panel to internal operations console.

KPI row: total analyses, total transactions, total processed, API usage — all from
existing endpoints.

The analyses table gains sticky header, aligned columns, sorting, filtering,
search, pagination and export. Status shows real `is_redacted` state as a small
indicator, not a large badge. Delete is visually quiet and stays behind the
existing confirmation.

The API usage tab surfaces the `ApiUsage` telemetry already being written:
success rate, p50/p95 latency, token estimates, recent errors.

Audit log gains relative timestamps with absolute on hover, and action-type
filtering.

---

## 14. Motion System

All timings and easings live in `lib/motion.ts`. Nothing hardcodes a duration.

| Class | Duration |
|---|---|
| Fast interaction | 120–180ms |
| Standard transition | 200–300ms |
| Complex transition | 350–500ms |

Easing is `ease-out` for entry, spring for drawers and sheets.

**Library split:**

- **Lenis** — smooth scroll on long views
- **Framer Motion** — presence and layout: drawer, sheet, modal, palette, page
  transition (opacity + 8px translateY, 200ms), nav indicator via `layoutId`
- **GSAP + ScrollTrigger** — staged section reveals on long scrolling views
- **React Bits** — count-up on the hero figure only

**Number animation runs on first load, filter change and period change only** —
never on every render.

`prefers-reduced-motion` is honoured centrally: `lib/motion.ts` returns zero
durations, Lenis is not initialised, GSAP triggers are disabled, and count-up
renders its final value immediately.

---

## 15. States

**Loading** — skeletons mirroring final layout geometry with a subtle shimmer.
No spinners.

**Empty** — a title, one explanatory sentence, and a single action
("Reset filters"). No illustrations.

**Error** — `lib/errors.ts` maps known failures to human sentences: PDF password
required or incorrect, location-restricted API, 502/503 cold start, network
failure, unauthorised. Raw errors go to Sentry, never to the screen. Each error
state offers a retry.

---

## 16. Responsive Design

Breakpoints: 1440, 1280, 1024, 768, 480, 390, 375.

Layouts are redesigned per breakpoint rather than stacked. Below 768px: bottom
navigation, horizontally scrollable sub-navigation, tables become transaction
cards, drawers become bottom sheets, filters become bottom sheets, charts resize
with reduced tick density.

---

## 17. Accessibility

WCAG-aware contrast on the final palette, verified rather than assumed. Full
keyboard navigation including the command palette and ledger. Visible focus rings
in the accent colour. ARIA labels on all icon-only controls. Charts carry an
accessible text summary and a screen-reader table alternative. Semantic HTML
throughout. `prefers-reduced-motion` honoured as in §14.

---

## 18. Performance

Route-level code splitting; charts and the command palette lazy-loaded.
Memoised derivations in `lib/derive.ts`. Self-hosted fonts remove the blocking
Google import. Animation is restricted to compositor-friendly properties.

**Virtualisation is deliberately deferred.** The largest observed analysis is 60
rows. Virtualising there costs sticky headers and keyboard navigation for no
measurable gain. Revisit above roughly 300 rows.

---

## 19. Testing

Vitest and Testing Library are already configured.

- `lib/derive.ts` and `lib/format.ts` get real unit coverage — category totals,
  daily series with mixed date formats, vendor aggregation, reward stats,
  currency and date formatting, truncation. This is where bugs actually live.
- Each view gets a smoke render against sample data.
- Regression tests for the two known crash-adjacent paths: malformed dates and
  missing merchant descriptions.
- Existing backend tests are untouched.

---

## 20. Implementation Phases

Nineteen phases, resequenced from the brief's sixteen so that foundations land
before consumers and cross-cutting passes come last. Each phase ends with the app
running and every existing feature working — no phase leaves the app broken.

| # | Phase | Gate |
|---|---|---|
| 1 | Tokens, Tailwind v4, self-hosted fonts, Lucide icon migration | Both themes render; zero emoji remain |
| 2 | `lib/` extraction: `derive`, `format`, `motion`, `errors` | Unit tests pass; dashboard output identical to pre-extraction |
| 3 | shadcn primitives installed and themed | Primitives match tokens in both themes |
| 4 | AppShell, Sidebar, Topbar, MobileNav, router sub-routes | Deep links resolve; back/forward correct; `#/dashboard` still aliases overview |
| 5 | Dashboard hierarchy, `Metric` / `MetricGroup` | Hero figure dominates; delta absent when no baseline |
| 6 | Charts: `ChartFrame`, donut, daily spend, shared tooltip | Stuck tooltip and negative-baseline bugs fixed |
| 7 | Transactions ledger + detail drawer | Apply-one and apply-all category edit still work |
| 8 | Vendors | Sort, search, expand functional |
| 9 | Insights | Deep-link into filtered transactions works |
| 10 | Rewards | Earn rate correct; no invented currency value |
| 11 | Upload experience | PDF password, SSE progress, sample data all work |
| 12 | Admin console | Login, analyses, audit log, API usage, settings, CSV export, delete all work |
| 13 | Command palette | Keyboard navigable; searches all four entity types |
| 14 | Motion system pass | Every duration sourced from `lib/motion.ts` |
| 15 | Loading, empty, error states | No raw errors reachable; no spinners remain |
| 16 | Responsive pass | All seven breakpoints verified |
| 17 | Accessibility pass | Contrast verified; keyboard-complete; reduced-motion honoured |
| 18 | Performance pass | Route splitting in place; no regression vs baseline |
| 19 | Visual QA | §21 checklist fully satisfied |

Phases 1–4 are strictly ordered. Phases 5–13 may proceed in any order once 1–4
land. Phases 14–19 are cross-cutting and run last.

---

## 21. Definition of Done

- Every existing feature works: upload, PDF password, SSE progress, sample data,
  category edit with apply-one and apply-all, history, admin login, analyses,
  audit log, API usage, settings, CSV export, delete with confirmation
- No fabricated financial values anywhere
- Zero emoji in production UI
- Every figure uses tabular numerals
- `--accent` appears only in its four permitted interface roles; no chart series
  uses it and no control is tinted from the category ramp
- Green and red carry semantic meaning only
- Light and dark mode both correct
- Verified at all seven breakpoints
- Loading, empty, error and success states verified on every screen
- Verified against long merchant names, large amounts, long account names, and
  the largest available dataset
- Keyboard navigable end to end; `prefers-reduced-motion` fully honoured
- No raw technical errors surfaced to users
- `npm run lint` and `npm run test` pass in `frontend/`
