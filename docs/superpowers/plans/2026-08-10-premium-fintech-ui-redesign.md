# Premium Fintech UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the presentation layer of the Spend Analysis frontend into a premium fintech interface — restrained palette, real information hierarchy, extracted analytics, purposeful motion, seven-breakpoint responsiveness — without touching business logic, API contracts, auth, schema, or any existing feature.

**Architecture:** Analytics move out of `ExpenseManager.jsx` into pure, unit-tested modules under `src/lib/`. A new app shell (`Sidebar` + `Topbar` + `MobileNav`) wraps hash sub-routes `#/dashboard/{transactions,vendors,insights,rewards}`, with `#/dashboard` aliasing overview. Views under `src/views/` consume derived data via a thin `AnalysisContext`; `App.jsx` remains the sole owner of `data` and the mutation handlers. Styling converges on Tailwind v4 `@theme` mapped onto the existing `--app-*` custom-property layer so light mode survives.

**Tech Stack:** Vite 8, React 19.2, TypeScript (incremental, `allowJs`), Tailwind CSS v4, shadcn/ui primitives, Recharts 3.8, Framer Motion, GSAP + ScrollTrigger, Lenis, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-10-premium-fintech-ui-redesign-design.md`

---

## Global Constraints

These apply to **every** task. A task that violates one is not done.

**Preservation (from the brief, verbatim):**
- DO NOT rebuild the application from scratch.
- DO NOT remove existing functionality.
- DO NOT change business logic.
- DO NOT change the database schema unless absolutely necessary.
- DO NOT change API contracts.
- DO NOT change authentication logic.
- DO NOT change routes unless required for the UI.
- DO NOT remove existing analysis functionality.
- DO NOT remove existing charts.
- DO NOT remove existing admin functionality.
- DO NOT replace real data with fake data.

**Files that must not be modified in any task:**
- `frontend/src/services/apiService.js`
- `frontend/src/services/geminiService.js`
- `frontend/src/services/cacheService.js`
- `frontend/src/components/auth/AuthProvider.jsx`
- `frontend/vercel.json`
- anything under `backend/`

**Design rules:**
- `--accent` (`#E3B341` dark / `#A9761B` light) appears in exactly four interface roles: primary button, active nav indicator, focus ring, single hero figure. Never a gradient fill, never decoration, never a border, never a section heading, never a hover fill.
- Chart series never use `--accent`. Interface controls are never tinted from the category ramp. The two scales do not mix.
- Green means credit or positive trend. Red means debit or negative trend. Blue means neutral analytics. Nothing else claims these.
- Category colour is assigned by **fixed index into the canonical `CAT_META` key order**, never by spend rank. Canonical order: `Rent, Insurance, Personal Transfer, Office Food, Food & Dining, Transport, Bills & Subscriptions, Groceries, Self Transfer, Entertainment, Shopping, Healthcare, Education, Other`. Unknown categories fall back to the `Other` step.
- Zero emoji in production UI. All iconography is `lucide-react`.
- `font-variant-numeric: tabular-nums` on every figure.
- Radius values: 8, 12, 16 only. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Shadow only on genuinely floating layers: drawer, modal, command palette, tooltip. Surfaces separate by background step + hairline border.
- No gradient text anywhere.
- Every duration and easing is imported from `src/lib/motion.ts`. Nothing hardcodes a duration.
- `prefers-reduced-motion` is honoured centrally through `lib/motion.ts`.
- Number animation runs on first load, filter change and period change only — never on every render.
- No fabricated financial values. Where a field does not exist, the affordance is omitted entirely — no dash, no zero, no "N/A", no placeholder chrome.
- Raw technical errors never reach the screen. `lib/errors.ts` maps them to human sentences; the raw error goes to Sentry.
- Both light and dark mode must be correct after every task.

**Verification after every task:**
- `cd frontend && npm run lint` passes
- `cd frontend && npm run test` passes
- `cd frontend && npm run build` succeeds
- The app still runs and every existing feature still works

**Commit convention:** conventional commits, scoped to the phase. Commit at the end of every task.

---

## File Structure

**New:**
```
frontend/tsconfig.json                        incremental TS, allowJs
frontend/tsconfig.node.json                   vite config typing
frontend/src/lib/tokens.ts                    category ramp + canonical order + icon map
frontend/src/lib/format.ts                    currency, dates, relative time, truncation, monogram
frontend/src/lib/derive.ts                    all analytics, pure
frontend/src/lib/motion.ts                    durations, easings, reduced-motion gate
frontend/src/lib/errors.ts                    error -> human sentence
frontend/src/lib/types.ts                     Transaction, Analysis, derived shapes
frontend/src/lib/cn.ts                        className merge helper
frontend/src/components/ui/                   shadcn primitives
frontend/src/components/shell/                AppShell, Sidebar, Topbar, MobileNav, CommandPalette
frontend/src/components/data/                 Metric, MetricGroup, Sparkline, Skeleton, EmptyState, ErrorState, CategoryIcon, Monogram
frontend/src/components/charts/               ChartFrame, ChartTooltip, CategoryDonut, DailySpend, SpendTrend
frontend/src/views/                           Overview, Transactions, Vendors, Insights, Rewards
frontend/src/context/AnalysisContext.tsx      thin provider over App-owned data
frontend/src/tests/                           unit + smoke tests
```

**Modified:**
```
frontend/package.json          dependencies, scripts
frontend/vite.config.js        tailwind plugin, test block, path alias
frontend/eslint.config.js      widen to ts/tsx
frontend/src/index.css         token layer, @theme, base typography
frontend/src/main.jsx          font imports
frontend/src/App.jsx           sub-routes, admin guard to effect, shell mount
frontend/src/components/ExpenseManager.jsx    thinned to a view router
frontend/src/components/RewardsPanel.jsx      replaced by views/Rewards
frontend/src/components/UploadScreen.jsx      redesigned panel + real progress steps
frontend/src/components/HistoryScreen.jsx     shell-aware layout
frontend/src/components/Navbar.jsx            deleted, replaced by shell/Topbar
frontend/src/components/Toast.jsx             retokenised, behaviour untouched
frontend/src/components/admin/*               operations console pass
```

**Deleted:**
```
frontend/src/App.css           dead file, imported nowhere (verified: only index.css is imported, in main.jsx)
```

---

## Phase 1 — Foundations (Tasks 1–4, strictly ordered)

### Task 1: Toolchain — TypeScript, Tailwind v4, Vitest environment, ESLint widening

**Files:**
- Create: `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/src/lib/cn.ts`
- Modify: `frontend/package.json`, `frontend/vite.config.js`, `frontend/eslint.config.js`, `frontend/src/index.css:1`
- Delete: `frontend/src/App.css`
- Test: `frontend/src/tests/toolchain.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `cn(...inputs: ClassValue[]): string` from `src/lib/cn.ts`
  - path alias `@/*` → `src/*`, usable from both `.ts(x)` and `.jsx`
  - Vitest running in `jsdom` with globals enabled
  - Tailwind v4 available via `@import "tailwindcss"` in `index.css`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install tailwindcss@^4 @tailwindcss/vite@^4 clsx tailwind-merge
npm install -D typescript@^5.7 @vitest/coverage-v8 typescript-eslint @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/tests/toolchain.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("toolchain", () => {
  it("runs in a jsdom environment", () => {
    expect(typeof document).toBe("object");
    expect(document.createElement("div")).toBeTruthy();
  });

  it("resolves the @ alias and merges class names", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-medium")).toBe("text-sm font-medium");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- toolchain`
Expected: FAIL — `Failed to resolve import "@/lib/cn"` (alias not configured, file does not exist).

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.js"]
}
```

- [ ] **Step 6: Create `frontend/src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Rewrite `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
})
```

The `/api` proxy block is unchanged and must stay exactly as written.

- [ ] **Step 8: Create `frontend/src/tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements neither of these; components under test rely on both.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 9: Widen `frontend/eslint.config.js` to TypeScript**

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/components/ui/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', 'src/tests/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
```

`src/components/ui/**` is ignored because shadcn primitives are vendored, not authored.

- [ ] **Step 10: Add `@import "tailwindcss";` as line 1 of `frontend/src/index.css`**

Insert above the existing `:root {` block. Nothing else in the file changes in this task.

- [ ] **Step 11: Add scripts to `frontend/package.json`**

Add to `"scripts"`, keeping `dev`, `build`, `lint`, `preview`, `test` intact:

```json
"typecheck": "tsc --noEmit",
"test:watch": "vitest"
```

- [ ] **Step 12: Delete the dead stylesheet**

```bash
cd frontend && rm src/App.css
```

`App.css` is imported nowhere — `main.jsx:3` imports only `./index.css`. Verify before deleting: `grep -rn "App.css" frontend/src` returns nothing.

- [ ] **Step 13: Run the test to verify it passes**

Run: `cd frontend && npm run test -- toolchain`
Expected: PASS, 2 tests.

- [ ] **Step 14: Verify the whole toolchain**

```bash
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```
Expected: all four succeed. The app must still boot with `npm run dev`.

- [ ] **Step 15: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.js frontend/eslint.config.js frontend/src/index.css frontend/src/lib/cn.ts frontend/src/tests/setup.ts frontend/src/tests/toolchain.test.ts
git rm frontend/src/App.css
git commit -m "chore(frontend): add TypeScript, Tailwind v4, jsdom test env, TS linting"
```

---

### Task 2: Design tokens and typography

**Files:**
- Modify: `frontend/src/index.css`, `frontend/src/main.jsx`
- Test: `frontend/src/tests/tokens.test.ts`

**Interfaces:**
- Consumes: Tailwind v4 from Task 1
- Produces: CSS custom properties `--bg --surface --surface-2 --elevated --border --border-strong --text --text-2 --text-muted --accent --success --danger --info --ramp-0 … --ramp-13`, all defined on `:root` and overridden under `.light-mode`; Tailwind `@theme` names `bg-bg bg-surface bg-surface-2 bg-elevated text-text text-text-2 text-text-muted border-border border-border-strong text-accent text-success text-danger text-info`; font families `font-sans` (Inter Variable) and `font-mono` (JetBrains Mono Variable).

- [ ] **Step 1: Install self-hosted fonts**

```bash
cd frontend
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/tests/tokens.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

const DARK_TOKENS: Record<string, string> = {
  "--bg": "#08090D",
  "--surface": "#0D1017",
  "--surface-2": "#121621",
  "--elevated": "#171B24",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(255, 255, 255, 0.14)",
  "--text": "#F5F7FA",
  "--text-2": "#9AA3B2",
  "--text-muted": "#697386",
  "--accent": "#E3B341",
  "--success": "#20C997",
  "--danger": "#FF6B6B",
  "--info": "#5B9CFF",
};

const LIGHT_TOKENS: Record<string, string> = {
  "--bg": "#FBFBFA",
  "--surface": "#FFFFFF",
  "--surface-2": "#F5F6F8",
  "--elevated": "#FFFFFF",
  "--border": "rgba(9, 11, 15, 0.10)",
  "--border-strong": "rgba(9, 11, 15, 0.18)",
  "--text": "#0B0D12",
  "--text-2": "#4B5565",
  "--text-muted": "#6F7A8B",
  "--accent": "#A9761B",
  "--success": "#0E8A63",
  "--danger": "#C4362F",
  "--info": "#2563C9",
};

/** Extract the body of a top-level block whose selector matches. */
function block(selector: string): string {
  const start = css.indexOf(selector + " {");
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block: ${selector}`);
}

describe("design tokens", () => {
  let root: string;
  let light: string;

  beforeAll(() => {
    root = block(":root");
    light = block(".light-mode");
  });

  it.each(Object.entries(DARK_TOKENS))("defines %s in dark mode as %s", (name, value) => {
    expect(root).toContain(`${name}: ${value};`);
  });

  it.each(Object.entries(LIGHT_TOKENS))("overrides %s in light mode as %s", (name, value) => {
    expect(light).toContain(`${name}: ${value};`);
  });

  it("defines all 14 category ramp steps in both modes", () => {
    for (let i = 0; i < 14; i++) {
      expect(root).toContain(`--ramp-${i}:`);
      expect(light).toContain(`--ramp-${i}:`);
    }
  });

  it("applies tabular numerals globally", () => {
    expect(css).toContain("font-variant-numeric: tabular-nums");
  });

  it("no longer imports fonts from Google", () => {
    expect(css).not.toContain("fonts.googleapis.com");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- tokens`
Expected: FAIL — `:root` does not contain `--bg: #08090D;`.

- [ ] **Step 4: Replace the token layer in `frontend/src/index.css`**

Keep line 1 (`@import "tailwindcss";`). Replace the first `:root { … }` block (originally lines 1–29 — the block containing `--text: #6b6375` through `--app-hover-bg`) and the `.light-mode { … }` block with the following. **Keep every `--app-*` variable**: existing components still read them, and they are re-pointed at the new tokens so the old and new systems agree.

```css
:root {
  /* ── Surfaces ─────────────────────────────────────────── */
  --bg: #08090D;
  --surface: #0D1017;
  --surface-2: #121621;
  --elevated: #171B24;

  /* ── Lines ────────────────────────────────────────────── */
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  /* ── Text ─────────────────────────────────────────────── */
  --text: #F5F7FA;
  --text-2: #9AA3B2;
  --text-muted: #697386;

  /* ── Accent: primary button, active nav, focus ring, hero figure. Nothing else. ── */
  --accent: #E3B341;
  --accent-contrast: #0B0D12;

  /* ── Semantic: credit / debit / neutral analytics ─────── */
  --success: #20C997;
  --danger: #FF6B6B;
  --info: #5B9CFF;

  /* ── Category ramp: gold → bronze → graphite. Data encoding only. ── */
  --ramp-0: #E8C877;
  --ramp-1: #DBB765;
  --ramp-2: #CCA555;
  --ramp-3: #BC9348;
  --ramp-4: #AB823E;
  --ramp-5: #997236;
  --ramp-6: #886431;
  --ramp-7: #77582F;
  --ramp-8: #674D2F;
  --ramp-9: #58452F;
  --ramp-10: #4B3F31;
  --ramp-11: #403A34;
  --ramp-12: #373538;
  --ramp-13: #30313B;

  /* ── Elevation: floating layers only ──────────────────── */
  --shadow-drawer: 0 24px 64px -12px rgba(0, 0, 0, 0.65);
  --shadow-overlay: 0 16px 40px -8px rgba(0, 0, 0, 0.55);
  --shadow-tooltip: 0 8px 24px -6px rgba(0, 0, 0, 0.5);

  /* ── Radius ───────────────────────────────────────────── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* ── Legacy --app-* layer, re-pointed at the tokens above.
        Retained so untouched components keep rendering during migration. ── */
  --app-bg: var(--bg);
  --app-card-bg: var(--surface);
  --app-card-solid: var(--surface);
  --app-text: var(--text);
  --app-text-h: var(--text);
  --app-text-muted: var(--text-2);
  --app-text-darker: var(--text-muted);
  --app-border: var(--border);
  --app-border-hover: var(--border-strong);
  --app-input-bg: var(--surface-2);
  --app-table-border: var(--border);
  --app-toggle-bg: var(--surface-2);
  --app-shimmer-bg: linear-gradient(90deg, var(--surface-2) 0%, var(--elevated) 50%, var(--surface-2) 100%);
  --app-hover-bg: rgba(255, 255, 255, 0.025);
}

.light-mode {
  --bg: #FBFBFA;
  --surface: #FFFFFF;
  --surface-2: #F5F6F8;
  --elevated: #FFFFFF;

  --border: rgba(9, 11, 15, 0.10);
  --border-strong: rgba(9, 11, 15, 0.18);

  --text: #0B0D12;
  --text-2: #4B5565;
  --text-muted: #6F7A8B;

  --accent: #A9761B;
  --accent-contrast: #FFFFFF;

  --success: #0E8A63;
  --danger: #C4362F;
  --info: #2563C9;

  /* Ramp inverts direction: light bronze → deep graphite, so ordinal weight still reads. */
  --ramp-0: #B8862B;
  --ramp-1: #A87B2C;
  --ramp-2: #98702E;
  --ramp-3: #886630;
  --ramp-4: #785C32;
  --ramp-5: #6A5433;
  --ramp-6: #5D4C34;
  --ramp-7: #514535;
  --ramp-8: #473F36;
  --ramp-9: #3E3937;
  --ramp-10: #373538;
  --ramp-11: #313139;
  --ramp-12: #2C2D39;
  --ramp-13: #282A3A;

  --shadow-drawer: 0 24px 64px -12px rgba(9, 11, 15, 0.18);
  --shadow-overlay: 0 16px 40px -8px rgba(9, 11, 15, 0.14);
  --shadow-tooltip: 0 8px 24px -6px rgba(9, 11, 15, 0.12);

  --app-hover-bg: rgba(9, 11, 15, 0.03);
}
```

- [ ] **Step 5: Add the Tailwind `@theme` bridge below the token blocks**

```css
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-elevated: var(--elevated);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-accent-contrast: var(--accent-contrast);
  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-info: var(--info);

  --font-sans: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, Consolas, monospace;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

- [ ] **Step 6: Replace the base typography block**

Replace the second `:root { … }` block (originally lines 49–67, the one setting `--sans`/`--heading`/`--mono` and `font: 18px/145%`) and the `@media (prefers-color-scheme: dark)` block with:

```css
html {
  color-scheme: dark;
  background: var(--bg);
}

html.light-mode {
  color-scheme: light;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Every figure aligns down its column. */
:where(body, input, button, select, textarea, table, td, th) {
  font-variant-numeric: tabular-nums;
}

*, *::before, *::after {
  box-sizing: border-box;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

::selection {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
  color: var(--text);
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 8px;
  border: 3px solid var(--bg);
}
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

Also delete the now-orphaned `h1`, `h2`, `p`, `code`, `.counter` rules (originally lines 102–144) — heading sizes come from the type scale in components, and `#root` keeps only:

```css
#root {
  width: 100%;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 7: Replace the loading animations**

Replace `@keyframes spin-glow`, `@keyframes pulse-glow`, `.spin-loader` and `.pulse-text` (originally lines 146–180) with a single shimmer used by skeletons. `@keyframes shimmer` and `.shimmer` stay — `AdminDashboard.jsx` uses `.shimmer` — but retokenised:

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--elevated) 50%,
    var(--surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite linear;
}

@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

`.spin-loader` and `.pulse-text` are removed; grep for both and replace any usage with a `Skeleton` (Task 20) — spec §15 forbids spinners.

- [ ] **Step 8: Import the fonts in `frontend/src/main.jsx`**

Add above `import './index.css'`:

```js
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
```

- [ ] **Step 9: Remove the render-blocking Google Fonts import**

Delete the `@import url('https://fonts.googleapis.com/…')` line from `frontend/src/components/ExpenseManager.jsx:155` and from any other component that repeats it. Confirm with `grep -rn "fonts.googleapis.com" frontend/src` — expected: no matches.

Replace every `fontFamily: "'DM Sans', …"` with `fontFamily: "var(--font-sans)"` and every `fontFamily: "DM Mono, monospace"` with `fontFamily: "var(--font-mono)"` across `frontend/src`.

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend && npm run test -- tokens`
Expected: PASS, all token assertions green.

- [ ] **Step 11: Verify both themes by hand**

Run `npm run dev`, load `#/`, use the theme toggle. Both modes must render with no unstyled flash, no invisible text, and no leftover purple `--accent`.

- [ ] **Step 12: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/index.css frontend/src/main.jsx frontend/src/components frontend/src/tests/tokens.test.ts
git commit -m "feat(frontend): premium token palette, category ramp, self-hosted Inter and JetBrains Mono"
```

---

### Task 3: Domain types and the category system

**Files:**
- Create: `frontend/src/lib/types.ts`, `frontend/src/lib/categories.ts`
- Test: `frontend/src/tests/categories.test.ts`

**Interfaces:**
- Consumes: `--ramp-0 … --ramp-13` from Task 2
- Produces:
  - `type Transaction = { date: string; desc: string; amount: number; cat: string; reward_points: number | null }`
  - `type RawTransaction = Partial<Record<keyof Transaction, unknown>>`
  - `type Analysis = { id?: string; period?: string; bank?: string; account_holder?: string; opening_balance?: number; closing_balance?: number; total_credits?: number; total_reward_points?: number; transactions?: RawTransaction[]; insights?: Insight[]; is_redacted?: boolean; created_at?: string; total_spent?: number }`
  - `type Insight = { icon?: string; title?: string; body?: string; color?: string; badge?: string }`
  - `type StoredAnalysis = Analysis & { id: string; created_at: string; total_spent: number; transaction_count: number }`
  - `CATEGORY_ORDER: readonly string[]` — the 14 canonical names
  - `categoryIndex(cat: string): number`
  - `categoryColor(cat: string): string` — returns `var(--ramp-N)`
  - `categoryIcon(cat: string): LucideIcon`
  - `CATEGORY_ICONS: Record<string, LucideIcon>`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/categories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  CATEGORY_ORDER,
  categoryIndex,
  categoryColor,
  categoryIcon,
} from "@/lib/categories";

describe("category system", () => {
  it("preserves the canonical CAT_META order exactly", () => {
    expect([...CATEGORY_ORDER]).toEqual([
      "Rent",
      "Insurance",
      "Personal Transfer",
      "Office Food",
      "Food & Dining",
      "Transport",
      "Bills & Subscriptions",
      "Groceries",
      "Self Transfer",
      "Entertainment",
      "Shopping",
      "Healthcare",
      "Education",
      "Other",
    ]);
  });

  it("assigns colour by fixed index, not by spend rank", () => {
    expect(categoryColor("Rent")).toBe("var(--ramp-0)");
    expect(categoryColor("Food & Dining")).toBe("var(--ramp-4)");
    expect(categoryColor("Other")).toBe("var(--ramp-13)");
  });

  it("is stable regardless of the order categories are queried in", () => {
    const first = CATEGORY_ORDER.map(categoryColor);
    const shuffled = [...CATEGORY_ORDER].reverse().map(categoryColor);
    expect(CATEGORY_ORDER.map(categoryColor)).toEqual(first);
    expect(shuffled).toEqual([...first].reverse());
  });

  it("falls back to the Other step for unknown categories", () => {
    expect(categoryIndex("Crypto Gambling")).toBe(13);
    expect(categoryColor("Crypto Gambling")).toBe("var(--ramp-13)");
  });

  it("returns a Lucide component for every canonical category", () => {
    for (const cat of CATEGORY_ORDER) {
      const Icon = categoryIcon(cat);
      expect(typeof Icon === "function" || typeof Icon === "object").toBe(true);
    }
  });

  it("returns a fallback icon for unknown categories", () => {
    expect(categoryIcon("Crypto Gambling")).toBe(categoryIcon("Other"));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm run test -- categories`
Expected: FAIL — `Failed to resolve import "@/lib/categories"`.

- [ ] **Step 3: Create `frontend/src/lib/types.ts`**

```ts
/** A transaction after normalisation. Every field is guaranteed present. */
export type Transaction = {
  date: string;
  desc: string;
  amount: number;
  cat: string;
  reward_points: number | null;
};

/** A transaction as it arrives from the API — every field is untrusted. */
export type RawTransaction = {
  date?: unknown;
  desc?: unknown;
  amount?: unknown;
  cat?: unknown;
  reward_points?: unknown;
};

/** An AI-generated insight. `icon` and `color` are advisory and get mapped, not rendered raw. */
export type Insight = {
  icon?: string;
  title?: string;
  body?: string;
  color?: string;
  badge?: string;
};

/** An analysis as held in App state. */
export type Analysis = {
  id?: string;
  period?: string;
  bank?: string;
  account_holder?: string;
  opening_balance?: number;
  closing_balance?: number;
  total_credits?: number;
  total_reward_points?: number;
  transactions?: RawTransaction[];
  insights?: Insight[];
  is_redacted?: boolean;
  created_at?: string;
  total_spent?: number;
};

/** An analysis row as returned by the list endpoints. */
export type StoredAnalysis = Analysis & {
  id: string;
  created_at: string;
  total_spent: number;
  transaction_count: number;
};
```

- [ ] **Step 4: Create `frontend/src/lib/categories.ts`**

```ts
import {
  Home,
  ShieldCheck,
  Users,
  UtensilsCrossed,
  Soup,
  Car,
  Smartphone,
  ShoppingCart,
  RefreshCw,
  Clapperboard,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Circle,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical category order — the original CAT_META key order, preserved exactly.
 * Ramp colour is a fixed index into this list so a category keeps its colour
 * across analyses. Appending is safe; reordering is not.
 */
export const CATEGORY_ORDER = [
  "Rent",
  "Insurance",
  "Personal Transfer",
  "Office Food",
  "Food & Dining",
  "Transport",
  "Bills & Subscriptions",
  "Groceries",
  "Self Transfer",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Other",
] as const;

export type CategoryName = (typeof CATEGORY_ORDER)[number];

const OTHER_INDEX = CATEGORY_ORDER.length - 1;

const INDEX_BY_NAME = new Map<string, number>(
  CATEGORY_ORDER.map((name, i) => [name, i]),
);

export const CATEGORY_ICONS: Record<CategoryName, LucideIcon> = {
  "Rent": Home,
  "Insurance": ShieldCheck,
  "Personal Transfer": Users,
  "Office Food": UtensilsCrossed,
  "Food & Dining": Soup,
  "Transport": Car,
  "Bills & Subscriptions": Smartphone,
  "Groceries": ShoppingCart,
  "Self Transfer": RefreshCw,
  "Entertainment": Clapperboard,
  "Shopping": ShoppingBag,
  "Healthcare": HeartPulse,
  "Education": GraduationCap,
  "Other": Circle,
};

/** Fixed position in the canonical order; unknown categories map to `Other`. */
export function categoryIndex(cat: string): number {
  return INDEX_BY_NAME.get(cat) ?? OTHER_INDEX;
}

/**
 * Ramp colour for a category. Data encoding only — never use this to tint an
 * interface control, and never use `--accent` for a chart series.
 */
export function categoryColor(cat: string): string {
  return `var(--ramp-${categoryIndex(cat)})`;
}

export function categoryIcon(cat: string): LucideIcon {
  return CATEGORY_ICONS[CATEGORY_ORDER[categoryIndex(cat)]];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- categories`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/categories.ts frontend/src/tests/categories.test.ts
git commit -m "feat(frontend): canonical category order with index-stable ramp colours and Lucide icons"
```

---

### Task 4: `lib/format.ts`

**Files:**
- Create: `frontend/src/lib/format.ts`
- Test: `frontend/src/tests/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `formatCurrency(n: number, opts?: { sign?: boolean }): string` — `₹1,23,456.78`, Indian grouping
  - `formatCompactCurrency(n: number): string` — `₹1.2L`, `₹12.3K`, `₹1.2Cr`
  - `formatNumber(n: number): string`
  - `formatSignedPercent(n: number): string` — `+12.4%` / `−8.1%`
  - `parseStatementDate(raw: string): Date | null` — accepts `YYYY-MM-DD` and `DD-MM-YYYY`, `/` or `-` separated
  - `dayOfMonth(raw: string): number` — the day number used by the daily series
  - `formatDate(raw: string): string` — `12 May`
  - `formatLongDate(raw: string): string` — `12 May 2026`
  - `formatRelativeTime(iso: string, now?: Date): string` — `just now`, `4m ago`, `3h ago`, `2d ago`, else `12 May 2026`
  - `truncate(s: string, max: number): string`
  - `normaliseMerchant(desc: string): string` — the vendor key
  - `monogram(desc: string): string` — 1–2 uppercase letters

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCompactCurrency,
  formatSignedPercent,
  parseStatementDate,
  dayOfMonth,
  formatDate,
  formatRelativeTime,
  truncate,
  normaliseMerchant,
  monogram,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("uses Indian digit grouping", () => {
    expect(formatCurrency(123456.78)).toBe("₹1,23,456.78");
    expect(formatCurrency(1000)).toBe("₹1,000");
  });

  it("renders negatives with a leading minus, not parentheses", () => {
    expect(formatCurrency(-2089)).toBe("-₹2,089");
  });

  it("optionally forces a sign on positives", () => {
    expect(formatCurrency(500, { sign: true })).toBe("+₹500");
  });

  it("survives non-finite input", () => {
    expect(formatCurrency(Number.NaN)).toBe("₹0");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("₹0");
  });
});

describe("formatCompactCurrency", () => {
  it("uses Indian scale abbreviations", () => {
    expect(formatCompactCurrency(950)).toBe("₹950");
    expect(formatCompactCurrency(12345)).toBe("₹12.3K");
    expect(formatCompactCurrency(123456)).toBe("₹1.2L");
    expect(formatCompactCurrency(12345678)).toBe("₹1.2Cr");
  });

  it("keeps the sign", () => {
    expect(formatCompactCurrency(-123456)).toBe("-₹1.2L");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes the sign and uses a true minus glyph", () => {
    expect(formatSignedPercent(12.44)).toBe("+12.4%");
    expect(formatSignedPercent(-8.06)).toBe("−8.1%");
    expect(formatSignedPercent(0)).toBe("0.0%");
  });
});

describe("parseStatementDate", () => {
  it("parses ISO dates", () => {
    const d = parseStatementDate("2026-05-12");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(12);
  });

  it("parses DD-MM-YYYY", () => {
    const d = parseStatementDate("12-05-2026");
    expect(d?.getDate()).toBe(12);
    expect(d?.getMonth()).toBe(4);
  });

  it("parses slash separators in both orders", () => {
    expect(parseStatementDate("2026/05/12")?.getDate()).toBe(12);
    expect(parseStatementDate("12/05/2026")?.getMonth()).toBe(4);
  });

  it("returns null for malformed input rather than an Invalid Date", () => {
    expect(parseStatementDate("")).toBeNull();
    expect(parseStatementDate("not a date")).toBeNull();
    expect(parseStatementDate("2026-13-45")).toBeNull();
  });
});

describe("dayOfMonth", () => {
  it("reads the day from either supported layout", () => {
    expect(dayOfMonth("2026-05-12")).toBe(12);
    expect(dayOfMonth("12-05-2026")).toBe(12);
  });

  it("defaults to 1 when unparseable", () => {
    expect(dayOfMonth("garbage")).toBe(1);
    expect(dayOfMonth("")).toBe(1);
  });
});

describe("formatDate", () => {
  it("renders a short day and month", () => {
    expect(formatDate("2026-05-12")).toBe("12 May");
  });

  it("returns an em dash for unparseable dates instead of throwing", () => {
    expect(formatDate("garbage")).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-10T12:00:00Z");

  it("describes recent instants", () => {
    expect(formatRelativeTime("2026-08-10T11:59:30Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-08-10T11:56:00Z", now)).toBe("4m ago");
    expect(formatRelativeTime("2026-08-10T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-08-08T12:00:00Z", now)).toBe("2d ago");
  });

  it("falls back to an absolute date beyond a week", () => {
    expect(formatRelativeTime("2026-05-12T12:00:00Z", now)).toBe("12 May 2026");
  });
});

describe("truncate", () => {
  it("adds an ellipsis only when it actually shortens", () => {
    expect(truncate("Amazon Pay IN E COMMERC Bangalore", 12)).toBe("Amazon Pay…");
    expect(truncate("JIO Mumbai", 40)).toBe("JIO Mumbai");
  });
});

describe("normaliseMerchant", () => {
  it("strips parenthetical suffixes and trims", () => {
    expect(normaliseMerchant("Swiggy Limited (UPI)")).toBe("Swiggy Limited");
    expect(normaliseMerchant("  ZOMATO LIMITED Gurugram  ")).toBe("ZOMATO LIMITED Gurugram");
  });

  it("names the empty case rather than returning an empty string", () => {
    expect(normaliseMerchant("")).toBe("Unknown Payee");
    expect(normaliseMerchant("()")).toBe("Unknown Payee");
  });
});

describe("monogram", () => {
  it("takes initials from the first two words", () => {
    expect(monogram("Swiggy Limited Bangalore")).toBe("SL");
    expect(monogram("JIO")).toBe("JI");
  });

  it("skips non-alphanumeric noise", () => {
    expect(monogram("RAZ*Swiggy Bangalore KA")).toBe("RS");
    expect(monogram("")).toBe("?");
  });

  it("is deterministic", () => {
    expect(monogram("Amazon Pay IN")).toBe(monogram("Amazon Pay IN"));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm run test -- format`
Expected: FAIL — `Failed to resolve import "@/lib/format"`.

- [ ] **Step 3: Create `frontend/src/lib/format.ts`**

```ts
const INR = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

/** `₹1,23,456.78`. Negatives get a leading minus; `sign` forces one on positives. */
export function formatCurrency(n: number, opts: { sign?: boolean } = {}): string {
  const value = safe(Number(n));
  const abs = INR.format(Math.abs(value));
  if (value < 0) return `-₹${abs}`;
  return opts.sign ? `+₹${abs}` : `₹${abs}`;
}

/** `₹12.3K`, `₹1.2L`, `₹1.2Cr` — Indian scale, for chart centres and axis labels. */
export function formatCompactCurrency(n: number): string {
  const value = safe(Number(n));
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-₹" : "₹";
  const trim = (x: number) => Number(x.toFixed(1)).toString();

  if (abs >= 1e7) return `${prefix}${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${prefix}${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${prefix}${trim(abs / 1e3)}K`;
  return `${prefix}${INR.format(abs)}`;
}

export function formatNumber(n: number): string {
  return INR.format(safe(Number(n)));
}

/** `+12.4%` / `−8.1%`. Uses U+2212 for negatives so the glyph matches the type. */
export function formatSignedPercent(n: number): string {
  const value = safe(Number(n));
  const body = `${Math.abs(value).toFixed(1)}%`;
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return body;
}

/**
 * Accepts `YYYY-MM-DD` and `DD-MM-YYYY`, `-` or `/` separated — both appear in
 * extracted statements. Returns null rather than an Invalid Date so callers
 * cannot accidentally render "Invalid Date".
 */
export function parseStatementDate(raw: string): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.trim().split(/[-/]/);
  if (parts.length !== 3) return null;

  let year: number, month: number, day: number;
  if (parts[0].length === 4) {
    [year, month, day] = parts.map((p) => parseInt(p, 10));
  } else {
    [day, month, year] = parts.map((p) => parseInt(p, 10));
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/** The day-of-month key used to bucket the daily spend series. Defaults to 1. */
export function dayOfMonth(raw: string): number {
  return parseStatementDate(raw)?.getDate() ?? 1;
}

export function formatDate(raw: string): string {
  const d = parseStatementDate(raw);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).replace(/^0/, "");
}

export function formatLongDate(raw: string): string {
  const d = parseStatementDate(raw);
  if (!d) return "—";
  return d
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/^0/, "");
}

/** `just now` → `4m ago` → `3h ago` → `2d ago` → absolute beyond a week. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return then
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/^0/, "");
}

export function truncate(s: string, max: number): string {
  const str = String(s ?? "");
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

/** The vendor grouping key. Matches the existing `desc.split("(")[0].trim()` rule. */
export function normaliseMerchant(desc: string): string {
  const key = String(desc ?? "").split("(")[0].trim();
  return key || "Unknown Payee";
}

/** Deterministic 1–2 letter monogram, standing in for a merchant logo. */
export function monogram(desc: string): string {
  const words = normaliseMerchant(desc)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase().padEnd(1, "");
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm run test -- format`
Expected: PASS, all groups green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/format.ts frontend/src/tests/format.test.ts
git commit -m "feat(frontend): add lib/format with Indian currency, dual-layout date parsing, monograms"
```

---

### Task 5: `lib/derive.ts` — analytics extraction

This is the highest-value task in the plan. Every `useMemo` in `ExpenseManager.jsx` and `RewardsPanel.jsx` moves here as a pure function with real coverage. **Behaviour must be identical to the current implementation** — this is an extraction, not a redesign of the maths.

**Files:**
- Create: `frontend/src/lib/derive.ts`
- Test: `frontend/src/tests/derive.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `RawTransaction`, `Analysis`, `StoredAnalysis` from `@/lib/types`; `normaliseMerchant`, `dayOfMonth`, `parseStatementDate` from `@/lib/format`
- Produces:
  - `normaliseTransactions(raw: RawTransaction[] | undefined): Transaction[]`
  - `excludeSelfTransfers(txns: Transaction[], showSelf: boolean): Transaction[]`
  - `selfTransferTotal(txns: Transaction[]): number`
  - `categoryTotals(txns: Transaction[]): CategoryTotal[]` where `CategoryTotal = { name: string; value: number }`
  - `totalSpent(txns: Transaction[]): number`
  - `dailySeries(txns: Transaction[]): DailyPoint[]` where `DailyPoint = { day: string; amount: number }`
  - `dailyBreakdown(txns: Transaction[], day: string): CategoryTotal[]`
  - `filterAndSort(txns: Transaction[], opts: { category?: string; query?: string; sortBy?: "date" | "amount" }): Transaction[]`
  - `vendorStats(txns: Transaction[]): Vendor[]` where `Vendor = { name: string; count: number; total: number; average: number; cat: string; firstDate: string; lastDate: string; transactions: Transaction[] }`
  - `topVendors(txns: Transaction[], limit?: number): Vendor[]`
  - `recurringPayees(txns: Transaction[], limit?: number): Vendor[]`
  - `merchantContext(txns: Transaction[], txn: Transaction): MerchantContext` where `MerchantContext = { merchant: string; merchantTotal: number; shareOfSpend: number; count: number; others: Transaction[] }`
  - `hasRewardPoints(txns: Transaction[]): boolean`
  - `totalRewardPoints(txns: Transaction[]): number`
  - `rewardStats(txns: Transaction[], declaredTotal?: number | null): RewardStats | null`
  - `findComparisonBaseline(current: Analysis, history: StoredAnalysis[], isSignedIn: boolean): StoredAnalysis | null`
  - `spendDelta(currentTotal: number, baseline: StoredAnalysis | null): { percent: number; absolute: number } | null`
  - `sparklinePoints(txns: Transaction[], buckets?: number): number[]`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/derive.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normaliseTransactions,
  excludeSelfTransfers,
  selfTransferTotal,
  categoryTotals,
  totalSpent,
  dailySeries,
  dailyBreakdown,
  filterAndSort,
  vendorStats,
  topVendors,
  recurringPayees,
  merchantContext,
  hasRewardPoints,
  totalRewardPoints,
  rewardStats,
  findComparisonBaseline,
  spendDelta,
  sparklinePoints,
} from "@/lib/derive";
import type { StoredAnalysis } from "@/lib/types";

const TXNS = normaliseTransactions([
  { date: "2026-05-12", desc: "Amazon Pay IN E COMMERC", amount: 2089, cat: "Shopping", reward_points: -104 },
  { date: "2026-05-12", desc: "Amazon Pay IN GROCERY", amount: 73, cat: "Groceries", reward_points: 3 },
  { date: "2026-05-14", desc: "Swiggy Limited", amount: 184, cat: "Food & Dining", reward_points: 1 },
  { date: "2026-05-14", desc: "Swiggy Limited", amount: 35, cat: "Food & Dining", reward_points: 0 },
  { date: "2026-05-16", desc: "Self Move", amount: 5000, cat: "Self Transfer", reward_points: null },
]);

describe("normaliseTransactions", () => {
  it("returns an empty array for missing input", () => {
    expect(normaliseTransactions(undefined)).toEqual([]);
    expect(normaliseTransactions([])).toEqual([]);
  });

  it("defaults a short or missing date to 2026-06-01, matching current behaviour", () => {
    expect(normaliseTransactions([{ date: "5-12" }])[0].date).toBe("2026-06-01");
    expect(normaliseTransactions([{}])[0].date).toBe("2026-06-01");
  });

  it("defaults a missing description to Unknown Merchant", () => {
    expect(normaliseTransactions([{ amount: 10 }])[0].desc).toBe("Unknown Merchant");
  });

  it("coerces a non-numeric amount to 0 and a missing category to Other", () => {
    const [t] = normaliseTransactions([{ amount: "abc", cat: null }]);
    expect(t.amount).toBe(0);
    expect(t.cat).toBe("Other");
  });

  it("keeps reward_points null when absent but preserves a real zero", () => {
    expect(normaliseTransactions([{}])[0].reward_points).toBeNull();
    expect(normaliseTransactions([{ reward_points: 0 }])[0].reward_points).toBe(0);
  });
});

describe("self transfers", () => {
  it("excludes them by default and includes them on request", () => {
    expect(excludeSelfTransfers(TXNS, false)).toHaveLength(4);
    expect(excludeSelfTransfers(TXNS, true)).toHaveLength(5);
  });

  it("totals them separately", () => {
    expect(selfTransferTotal(TXNS)).toBe(5000);
  });
});

describe("categoryTotals", () => {
  const totals = categoryTotals(excludeSelfTransfers(TXNS, false));

  it("sorts descending by value", () => {
    expect(totals.map((c) => c.name)).toEqual(["Shopping", "Food & Dining", "Groceries"]);
  });

  it("rounds to two decimal places", () => {
    expect(categoryTotals(normaliseTransactions([
      { desc: "a", amount: 0.005, cat: "Other" },
      { desc: "b", amount: 0.005, cat: "Other" },
    ]))[0].value).toBe(0.01);
  });
});

describe("totalSpent", () => {
  it("sums the given set", () => {
    expect(totalSpent(excludeSelfTransfers(TXNS, false))).toBe(2381);
  });

  it("is 0 for an empty set", () => {
    expect(totalSpent([])).toBe(0);
  });
});

describe("dailySeries", () => {
  it("buckets by day and fills the gap days in between", () => {
    const series = dailySeries(excludeSelfTransfers(TXNS, false));
    expect(series.map((d) => d.day)).toEqual(["12", "13", "14"]);
    expect(series.map((d) => d.amount)).toEqual([2162, 0, 219]);
  });

  it("handles DD-MM-YYYY alongside YYYY-MM-DD", () => {
    const mixed = normaliseTransactions([
      { date: "2026-05-03", desc: "iso", amount: 100, cat: "Other" },
      { date: "05-05-2026", desc: "dmy", amount: 200, cat: "Other" },
    ]);
    const series = dailySeries(mixed);
    expect(series[0]).toEqual({ day: "3", amount: 100 });
    expect(series[series.length - 1]).toEqual({ day: "5", amount: 200 });
  });

  it("returns an empty array when there are no transactions", () => {
    expect(dailySeries([])).toEqual([]);
  });
});

describe("dailyBreakdown", () => {
  it("splits one day's spend by category, descending", () => {
    const split = dailyBreakdown(excludeSelfTransfers(TXNS, false), "12");
    expect(split).toEqual([
      { name: "Shopping", value: 2089 },
      { name: "Groceries", value: 73 },
    ]);
  });
});

describe("filterAndSort", () => {
  const base = excludeSelfTransfers(TXNS, false);

  it("returns everything for the All category", () => {
    expect(filterAndSort(base, { category: "All" })).toHaveLength(4);
  });

  it("filters by category", () => {
    expect(filterAndSort(base, { category: "Food & Dining" })).toHaveLength(2);
  });

  it("searches description case-insensitively", () => {
    expect(filterAndSort(base, { query: "swiggy" })).toHaveLength(2);
    expect(filterAndSort(base, { query: "  SWIGGY " })).toHaveLength(2);
  });

  it("sorts by amount descending when asked", () => {
    const sorted = filterAndSort(base, { sortBy: "amount" });
    expect(sorted[0].amount).toBe(2089);
    expect(sorted[sorted.length - 1].amount).toBe(35);
  });

  it("does not mutate its input", () => {
    const before = base.map((t) => t.amount);
    filterAndSort(base, { sortBy: "amount" });
    expect(base.map((t) => t.amount)).toEqual(before);
  });
});

describe("vendorStats", () => {
  const vendors = vendorStats(excludeSelfTransfers(TXNS, false));

  it("groups by the normalised merchant key", () => {
    const swiggy = vendors.find((v) => v.name === "Swiggy Limited");
    expect(swiggy?.count).toBe(2);
    expect(swiggy?.total).toBe(219);
    expect(swiggy?.average).toBe(109.5);
  });

  it("records the first and last dates seen", () => {
    const swiggy = vendors.find((v) => v.name === "Swiggy Limited");
    expect(swiggy?.firstDate).toBe("2026-05-14");
    expect(swiggy?.lastDate).toBe("2026-05-14");
  });

  it("carries the transactions for expandable rows", () => {
    expect(vendors.find((v) => v.name === "Swiggy Limited")?.transactions).toHaveLength(2);
  });
});

describe("topVendors", () => {
  it("sorts by total descending and honours the limit", () => {
    expect(topVendors(excludeSelfTransfers(TXNS, false), 2).map((v) => v.name)).toEqual([
      "Amazon Pay IN E COMMERC",
      "Swiggy Limited",
    ]);
  });

  it("defaults to 8", () => {
    expect(topVendors(excludeSelfTransfers(TXNS, false)).length).toBeLessThanOrEqual(8);
  });
});

describe("recurringPayees", () => {
  it("includes only merchants seen at least twice, by count descending", () => {
    expect(recurringPayees(excludeSelfTransfers(TXNS, false)).map((v) => v.name)).toEqual([
      "Swiggy Limited",
    ]);
  });
});

describe("merchantContext", () => {
  const base = excludeSelfTransfers(TXNS, false);

  it("reports merchant total, share of spend and sibling transactions", () => {
    const ctx = merchantContext(base, base[2]);
    expect(ctx.merchant).toBe("Swiggy Limited");
    expect(ctx.merchantTotal).toBe(219);
    expect(ctx.count).toBe(2);
    expect(ctx.others).toHaveLength(1);
    expect(ctx.shareOfSpend).toBeCloseTo(9.198, 2);
  });

  it("reports a 0 share rather than NaN when nothing was spent", () => {
    const zero = normaliseTransactions([{ desc: "x", amount: 0, cat: "Other" }]);
    expect(merchantContext(zero, zero[0]).shareOfSpend).toBe(0);
  });
});

describe("reward helpers", () => {
  it("detects presence of any reward data", () => {
    expect(hasRewardPoints(TXNS)).toBe(true);
    expect(hasRewardPoints(normaliseTransactions([{ desc: "x", amount: 1 }]))).toBe(false);
  });

  it("sums points treating null as zero", () => {
    expect(totalRewardPoints(TXNS)).toBe(-100);
  });
});

describe("rewardStats", () => {
  it("returns null when no transaction carries points", () => {
    expect(rewardStats(normaliseTransactions([{ desc: "x", amount: 1 }]))).toBeNull();
  });

  it("prefers the declared statement total over the computed sum", () => {
    expect(rewardStats(TXNS, 208)?.totalPoints).toBe(208);
    expect(rewardStats(TXNS, null)?.totalPoints).toBe(-100);
  });

  it("counts positive, zero and negative point transactions", () => {
    const s = rewardStats(TXNS, null)!;
    expect(s.positiveCount).toBe(2);
    expect(s.zeroCount).toBe(1);
    expect(s.negativeCount).toBe(1);
    expect(s.negativeTotal).toBe(-104);
  });

  it("computes the earn rate as points per ₹100", () => {
    const s = rewardStats(TXNS, null)!;
    expect(s.totalSpend).toBe(2381);
    expect(s.overallRate).toBeCloseTo(-4.2, 1);
  });

  it("reports 0 rate rather than NaN when spend is zero", () => {
    const zero = normaliseTransactions([{ desc: "x", amount: 0, cat: "Other", reward_points: 5 }]);
    expect(rewardStats(zero, null)?.overallRate).toBe(0);
  });

  it("identifies the best earning transaction", () => {
    expect(rewardStats(TXNS, null)?.bestTxn?.reward_points).toBe(3);
  });

  it("breaks points down by category, descending", () => {
    const s = rewardStats(TXNS, null)!;
    expect(s.byCategory[0].name).toBe("Groceries");
    expect(s.byCategory[0].points).toBe(3);
  });
});

describe("findComparisonBaseline", () => {
  const current = { id: "b", bank: "ICICI Credit Card", created_at: "2026-06-01T00:00:00Z" };
  const history: StoredAnalysis[] = [
    { id: "a", bank: "ICICI Credit Card", created_at: "2026-05-01T00:00:00Z", total_spent: 1000, transaction_count: 5 },
    { id: "old", bank: "ICICI Credit Card", created_at: "2026-04-01T00:00:00Z", total_spent: 900, transaction_count: 4 },
    { id: "other-bank", bank: "HDFC", created_at: "2026-05-20T00:00:00Z", total_spent: 5000, transaction_count: 9 },
    { id: "b", bank: "ICICI Credit Card", created_at: "2026-06-01T00:00:00Z", total_spent: 1200, transaction_count: 6 },
  ];

  it("returns null when the user is signed out", () => {
    expect(findComparisonBaseline(current, history, false)).toBeNull();
  });

  it("picks the most recent strictly older analysis from the same bank", () => {
    expect(findComparisonBaseline(current, history, true)?.id).toBe("a");
  });

  it("ignores analyses from a different bank", () => {
    const onlyOtherBank = history.filter((h) => h.bank === "HDFC");
    expect(findComparisonBaseline(current, onlyOtherBank, true)).toBeNull();
  });

  it("never matches itself or anything newer", () => {
    const noOlder = history.filter((h) => h.id === "b");
    expect(findComparisonBaseline(current, noOlder, true)).toBeNull();
  });

  it("returns null when history is empty", () => {
    expect(findComparisonBaseline(current, [], true)).toBeNull();
  });
});

describe("spendDelta", () => {
  const baseline = { id: "a", bank: "X", created_at: "2026-05-01T00:00:00Z", total_spent: 1000, transaction_count: 5 };

  it("returns null without a baseline so the row can be omitted entirely", () => {
    expect(spendDelta(1200, null)).toBeNull();
  });

  it("computes percent and absolute change", () => {
    expect(spendDelta(1200, baseline)).toEqual({ percent: 20, absolute: 200 });
  });

  it("returns null when the baseline total is zero, avoiding division by zero", () => {
    expect(spendDelta(500, { ...baseline, total_spent: 0 })).toBeNull();
  });
});

describe("sparklinePoints", () => {
  it("returns one number per bucket", () => {
    expect(sparklinePoints(excludeSelfTransfers(TXNS, false), 3)).toHaveLength(3);
  });

  it("returns an empty array with no data", () => {
    expect(sparklinePoints([], 8)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm run test -- derive`
Expected: FAIL — `Failed to resolve import "@/lib/derive"`.

- [ ] **Step 3: Create `frontend/src/lib/derive.ts`**

```ts
import type {
  Analysis,
  RawTransaction,
  StoredAnalysis,
  Transaction,
} from "@/lib/types";
import { dayOfMonth, normaliseMerchant, parseStatementDate } from "@/lib/format";

export type CategoryTotal = { name: string; value: number };
export type DailyPoint = { day: string; amount: number };

export type Vendor = {
  name: string;
  count: number;
  total: number;
  average: number;
  cat: string;
  firstDate: string;
  lastDate: string;
  transactions: Transaction[];
};

export type MerchantContext = {
  merchant: string;
  merchantTotal: number;
  shareOfSpend: number;
  count: number;
  others: Transaction[];
};

export type RewardCategory = {
  name: string;
  points: number;
  spend: number;
  count: number;
  rate: number;
};

export type RewardStats = {
  totalPoints: number;
  totalSpend: number;
  overallRate: number;
  positiveCount: number;
  negativeCount: number;
  zeroCount: number;
  negativeTotal: number;
  byCategory: RewardCategory[];
  bestTxn: Transaction | null;
  txnsWithPoints: Transaction[];
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Normalise the untrusted transaction array. The date and description defaults
 * match the pre-extraction behaviour in ExpenseManager exactly — changing them
 * would silently alter every downstream figure.
 */
export function normaliseTransactions(raw: RawTransaction[] | undefined): Transaction[] {
  return (raw || []).map((t) => {
    const rawDate = t?.date ? String(t.date) : "";
    return {
      date: rawDate.length >= 10 ? rawDate : "2026-06-01",
      desc: t?.desc ? String(t.desc) : "Unknown Merchant",
      amount: Number(t?.amount) || 0,
      cat: t?.cat ? String(t.cat) : "Other",
      reward_points: t?.reward_points != null ? Number(t.reward_points) : null,
    };
  });
}

export function excludeSelfTransfers(txns: Transaction[], showSelf: boolean): Transaction[] {
  return showSelf ? txns : txns.filter((t) => t.cat !== "Self Transfer");
}

export function selfTransferTotal(txns: Transaction[]): number {
  return txns.filter((t) => t.cat === "Self Transfer").reduce((s, t) => s + t.amount, 0);
}

export function categoryTotals(txns: Transaction[]): CategoryTotal[] {
  const map: Record<string, number> = {};
  for (const t of txns) map[t.cat] = (map[t.cat] || 0) + t.amount;
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
}

export function totalSpent(txns: Transaction[]): number {
  return txns.reduce((s, t) => s + t.amount, 0);
}

/** Day-bucketed spend across the observed range, gap days filled with 0. */
export function dailySeries(txns: Transaction[]): DailyPoint[] {
  const map: Record<number, number> = {};
  for (const t of txns) {
    const d = dayOfMonth(t.date);
    map[d] = (map[d] || 0) + t.amount;
  }

  const days = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (days.length === 0) return [];

  const min = days[0];
  const max = days[days.length - 1];
  return Array.from({ length: max - min + 1 }, (_, i) => i + min).map((d) => ({
    day: `${d}`,
    amount: Math.round(map[d] || 0),
  }));
}

/** The per-category split behind one bar in the daily chart, for its tooltip. */
export function dailyBreakdown(txns: Transaction[], day: string): CategoryTotal[] {
  const target = Number(day);
  return categoryTotals(txns.filter((t) => dayOfMonth(t.date) === target));
}

export function filterAndSort(
  txns: Transaction[],
  opts: { category?: string; query?: string; sortBy?: "date" | "amount" } = {},
): Transaction[] {
  const { category = "All", query = "", sortBy = "date" } = opts;
  let arr = category === "All" ? txns : txns.filter((t) => t.cat === category);

  const q = query.trim().toLowerCase();
  if (q) arr = arr.filter((t) => t.desc.toLowerCase().includes(q));

  if (sortBy === "amount") arr = [...arr].sort((a, b) => b.amount - a.amount);
  return arr === txns ? [...arr] : arr;
}

export function vendorStats(txns: Transaction[]): Vendor[] {
  const map = new Map<string, Vendor>();

  for (const t of txns) {
    const key = normaliseMerchant(t.desc);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: key,
        count: 1,
        total: t.amount,
        average: t.amount,
        cat: t.cat,
        firstDate: t.date,
        lastDate: t.date,
        transactions: [t],
      });
      continue;
    }
    existing.count += 1;
    existing.total += t.amount;
    existing.transactions.push(t);
    if (t.date < existing.firstDate) existing.firstDate = t.date;
    if (t.date > existing.lastDate) existing.lastDate = t.date;
  }

  return [...map.values()].map((v) => ({
    ...v,
    total: round2(v.total),
    average: round2(v.total / v.count),
  }));
}

export function topVendors(txns: Transaction[], limit = 8): Vendor[] {
  return vendorStats(txns).sort((a, b) => b.total - a.total).slice(0, limit);
}

export function recurringPayees(txns: Transaction[], limit = 6): Vendor[] {
  return vendorStats(txns)
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Real derived context for the transaction drawer — no invented card or time fields. */
export function merchantContext(txns: Transaction[], txn: Transaction): MerchantContext {
  const merchant = normaliseMerchant(txn.desc);
  const siblings = txns.filter((t) => normaliseMerchant(t.desc) === merchant);
  const merchantTotal = round2(siblings.reduce((s, t) => s + t.amount, 0));
  const overall = totalSpent(txns);

  return {
    merchant,
    merchantTotal,
    shareOfSpend: overall > 0 ? (merchantTotal / overall) * 100 : 0,
    count: siblings.length,
    others: siblings.filter((t) => t !== txn),
  };
}

export function hasRewardPoints(txns: Transaction[]): boolean {
  return txns.some((t) => t.reward_points != null);
}

export function totalRewardPoints(txns: Transaction[]): number {
  return txns.reduce((s, t) => s + (t.reward_points || 0), 0);
}

/**
 * Reward analytics. `declaredTotal` is the statement's own
 * `total_reward_points` and wins over the computed sum when present, matching
 * the current RewardsPanel behaviour.
 */
export function rewardStats(
  txns: Transaction[],
  declaredTotal?: number | null,
): RewardStats | null {
  const txnsWithPoints = txns.filter((t) => t.reward_points != null);
  if (txnsWithPoints.length === 0) return null;

  const computed = txnsWithPoints.reduce((s, t) => s + (t.reward_points || 0), 0);
  const totalPoints = declaredTotal ?? computed;

  const positive = txnsWithPoints.filter((t) => (t.reward_points as number) > 0);
  const negative = txnsWithPoints.filter((t) => (t.reward_points as number) < 0);
  const zero = txnsWithPoints.filter((t) => t.reward_points === 0);

  const catMap: Record<string, { points: number; spend: number; count: number }> = {};
  for (const t of txnsWithPoints) {
    if (!catMap[t.cat]) catMap[t.cat] = { points: 0, spend: 0, count: 0 };
    catMap[t.cat].points += t.reward_points || 0;
    catMap[t.cat].spend += t.amount;
    catMap[t.cat].count += 1;
  }

  const byCategory: RewardCategory[] = Object.entries(catMap)
    .map(([name, v]) => ({
      name,
      points: v.points,
      spend: round2(v.spend),
      count: v.count,
      rate: v.spend > 0 ? round2((v.points / v.spend) * 100) : 0,
    }))
    .sort((a, b) => b.points - a.points);

  const bestTxn = txnsWithPoints.reduce<Transaction | null>(
    (best, t) => ((t.reward_points || 0) > (best?.reward_points || 0) ? t : best),
    null,
  );

  const totalSpend = round2(txnsWithPoints.reduce((s, t) => s + t.amount, 0));

  return {
    totalPoints,
    totalSpend,
    overallRate: totalSpend > 0 ? round2((totalPoints / totalSpend) * 100) : 0,
    positiveCount: positive.length,
    negativeCount: negative.length,
    zeroCount: zero.length,
    negativeTotal: negative.reduce((s, t) => s + (t.reward_points || 0), 0),
    byCategory,
    bestTxn,
    txnsWithPoints: [...txnsWithPoints].sort(
      (a, b) => (b.reward_points || 0) - (a.reward_points || 0),
    ),
  };
}

/**
 * Spec §4.1. A prior analysis is a valid baseline only when the user is signed
 * in, the bank matches, and it is the most recent one strictly older than the
 * current analysis. Anything else means no delta is shown at all.
 */
export function findComparisonBaseline(
  current: Analysis,
  history: StoredAnalysis[],
  isSignedIn: boolean,
): StoredAnalysis | null {
  if (!isSignedIn) return null;
  if (!current?.bank || !current?.created_at) return null;

  const currentTime = new Date(current.created_at).getTime();
  if (Number.isNaN(currentTime)) return null;

  const candidates = (history || []).filter((h) => {
    if (h.id === current.id) return false;
    if (h.bank !== current.bank) return false;
    const t = new Date(h.created_at).getTime();
    return !Number.isNaN(t) && t < currentTime;
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((newest, h) =>
    new Date(h.created_at).getTime() > new Date(newest.created_at).getTime() ? h : newest,
  );
}

export function spendDelta(
  currentTotal: number,
  baseline: StoredAnalysis | null,
): { percent: number; absolute: number } | null {
  if (!baseline) return null;
  const prev = Number(baseline.total_spent);
  if (!Number.isFinite(prev) || prev === 0) return null;

  return {
    percent: round2(((currentTotal - prev) / prev) * 100),
    absolute: round2(currentTotal - prev),
  };
}

/** Evenly-bucketed spend over the statement window, for inline sparklines. */
export function sparklinePoints(txns: Transaction[], buckets = 12): number[] {
  if (txns.length === 0) return [];

  const times = txns
    .map((t) => parseStatementDate(t.date)?.getTime())
    .filter((t): t is number => typeof t === "number");
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;
  const out = new Array<number>(buckets).fill(0);

  for (const t of txns) {
    const time = parseStatementDate(t.date)?.getTime();
    if (time == null) continue;
    const idx = Math.min(buckets - 1, Math.floor(((time - min) / span) * buckets));
    out[idx] += t.amount;
  }

  return out.map(round2);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm run test -- derive`
Expected: PASS, every group green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/derive.ts frontend/src/tests/derive.test.ts
git commit -m "feat(frontend): extract all analytics into pure, unit-tested lib/derive"
```

---

### Task 6: `lib/motion.ts` and `lib/errors.ts`

**Files:**
- Create: `frontend/src/lib/motion.ts`, `frontend/src/lib/errors.ts`
- Test: `frontend/src/tests/motion.test.ts`, `frontend/src/tests/errors.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `DURATION = { fast: 0.14, standard: 0.24, complex: 0.42 }` (seconds, for Framer Motion)
  - `MS = { fast: 140, standard: 240, complex: 420 }` (milliseconds, for CSS and GSAP)
  - `EASE = { out: [0.16, 1, 0.3, 1], inOut: [0.65, 0, 0.35, 1] }`
  - `SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 }`
  - `prefersReducedMotion(): boolean`
  - `duration(key: keyof typeof DURATION): number` — returns 0 under reduced motion
  - `useReducedMotion(): boolean` — reactive hook
  - `fadeUp`, `fadeIn`, `drawerRight`, `sheetUp`, `overlay` — Framer Motion variant objects
  - `toHuman(err: unknown): { title: string; body: string; retryable: boolean }`
  - `reportError(err: unknown, context?: Record<string, unknown>): void` — forwards to Sentry, never to the UI

- [ ] **Step 1: Write the failing motion test**

Create `frontend/src/tests/motion.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { DURATION, MS, EASE, duration, prefersReducedMotion } from "@/lib/motion";

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("motion tokens", () => {
  it("keeps every duration inside its spec band", () => {
    expect(MS.fast).toBeGreaterThanOrEqual(120);
    expect(MS.fast).toBeLessThanOrEqual(180);
    expect(MS.standard).toBeGreaterThanOrEqual(200);
    expect(MS.standard).toBeLessThanOrEqual(300);
    expect(MS.complex).toBeGreaterThanOrEqual(350);
    expect(MS.complex).toBeLessThanOrEqual(500);
  });

  it("expresses DURATION in seconds matching MS", () => {
    expect(DURATION.fast).toBeCloseTo(MS.fast / 1000, 5);
    expect(DURATION.standard).toBeCloseTo(MS.standard / 1000, 5);
    expect(DURATION.complex).toBeCloseTo(MS.complex / 1000, 5);
  });

  it("exposes a cubic-bezier ease-out as four numbers", () => {
    expect(EASE.out).toHaveLength(4);
  });
});

describe("reduced motion", () => {
  it("reports the media query state", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("collapses every duration to zero when reduced motion is requested", () => {
    mockReducedMotion(true);
    expect(duration("fast")).toBe(0);
    expect(duration("standard")).toBe(0);
    expect(duration("complex")).toBe(0);
  });

  it("returns the real duration otherwise", () => {
    mockReducedMotion(false);
    expect(duration("standard")).toBe(DURATION.standard);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- motion`
Expected: FAIL — `Failed to resolve import "@/lib/motion"`.

- [ ] **Step 3: Create `frontend/src/lib/motion.ts`**

```ts
import { useEffect, useState } from "react";

/** Milliseconds — for CSS transitions, GSAP, and setTimeout. */
export const MS = {
  fast: 140,
  standard: 240,
  complex: 420,
} as const;

/** Seconds — for Framer Motion. */
export const DURATION = {
  fast: MS.fast / 1000,
  standard: MS.standard / 1000,
  complex: MS.complex / 1000,
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.9,
} as const;

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** The single gate. Every animated surface reads its timing through this. */
export function duration(key: keyof typeof DURATION): number {
  return prefersReducedMotion() ? 0 : DURATION[key];
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration("standard"), ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: duration("fast"), ease: EASE.out } },
};

/** Page transition: opacity plus an 8px lift, per spec §14. */
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration("standard"), ease: EASE.out } },
  exit: { opacity: 0, y: -4, transition: { duration: duration("fast"), ease: EASE.out } },
};

export const drawerRight = {
  initial: { x: "100%" },
  animate: { x: 0, transition: SPRING },
  exit: { x: "100%", transition: { duration: duration("standard"), ease: EASE.out } },
};

export const sheetUp = {
  initial: { y: "100%" },
  animate: { y: 0, transition: SPRING },
  exit: { y: "100%", transition: { duration: duration("standard"), ease: EASE.out } },
};

export const overlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration("fast") } },
  exit: { opacity: 0, transition: { duration: duration("fast") } },
};

/** Staggered list entry — used by MetricGroup and insight modules. */
export function stagger(index: number, step = 0.04) {
  return prefersReducedMotion() ? { delay: 0 } : { delay: index * step };
}
```

- [ ] **Step 4: Write the failing errors test**

Create `frontend/src/tests/errors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toHuman } from "@/lib/errors";

describe("toHuman", () => {
  it("explains a required PDF password", () => {
    const err = Object.assign(new Error("Password needed"), { code: "PDF_PASSWORD_REQUIRED" });
    const out = toHuman(err);
    expect(out.title).toBe("This PDF is password protected");
    expect(out.retryable).toBe(true);
  });

  it("distinguishes an incorrect password", () => {
    const err = Object.assign(new Error("nope"), { code: "PDF_PASSWORD_INCORRECT" });
    expect(toHuman(err).title).toBe("That password didn't work");
  });

  it("reads a code carried in the message, as App.jsx formats it", () => {
    expect(toHuman(new Error("PDF_PASSWORD_REQUIRED: Password needed")).title).toBe(
      "This PDF is password protected",
    );
  });

  it("explains a cold start behind a 502 or 503", () => {
    expect(toHuman(new Error("Server error (503): upstream")).title).toBe("The server is waking up");
    expect(toHuman(new Error("Server error (502): bad gateway")).title).toBe("The server is waking up");
  });

  it("explains a location-restricted API", () => {
    expect(toHuman(new Error("User location is not supported for the API use")).title).toBe(
      "This service isn't available in your region",
    );
  });

  it("explains a network failure", () => {
    expect(toHuman(new TypeError("Failed to fetch")).title).toBe("Couldn't reach the server");
  });

  it("explains an unauthorised response", () => {
    expect(toHuman(new Error("Server error (401): Unauthorized")).title).toBe("Your session expired");
  });

  it("never leaks the raw message in the fallback", () => {
    const out = toHuman(new Error("TypeError: Cannot read properties of undefined (reading 'x')"));
    expect(out.title).toBe("Something went wrong");
    expect(out.body).not.toContain("undefined");
    expect(out.body).not.toContain("TypeError");
  });

  it("handles a non-Error thrown value", () => {
    expect(toHuman("boom").title).toBe("Something went wrong");
    expect(toHuman(null).title).toBe("Something went wrong");
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `cd frontend && npm run test -- errors`
Expected: FAIL — `Failed to resolve import "@/lib/errors"`.

- [ ] **Step 6: Create `frontend/src/lib/errors.ts`**

```ts
import * as Sentry from "@sentry/react";

export type HumanError = {
  title: string;
  body: string;
  retryable: boolean;
};

const FALLBACK: HumanError = {
  title: "Something went wrong",
  body: "We couldn't complete that. Try again in a moment.",
  retryable: true,
};

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message || "";
  if (typeof err === "string") return err;
  return "";
}

function codeOf(err: unknown): string {
  const direct = (err as { code?: unknown } | null)?.code;
  if (typeof direct === "string") return direct;

  // App.jsx surfaces password failures as `${err.code}: ${err.message}`.
  const match = messageOf(err).match(/^([A-Z_]{4,}):/);
  return match ? match[1] : "";
}

/**
 * Map a failure to a sentence a person can act on. The raw error goes to
 * Sentry via `reportError`; it is never returned here and never rendered.
 */
export function toHuman(err: unknown): HumanError {
  const code = codeOf(err);
  const msg = messageOf(err);

  if (code === "PDF_PASSWORD_REQUIRED") {
    return {
      title: "This PDF is password protected",
      body: "Enter the password your bank uses for this statement and we'll continue.",
      retryable: true,
    };
  }

  if (code === "PDF_PASSWORD_INCORRECT") {
    return {
      title: "That password didn't work",
      body: "Check the password and try again. Banks often use a mix of your name and date of birth.",
      retryable: true,
    };
  }

  if (/\b(502|503|504)\b/.test(msg) || /gateway|unavailable/i.test(msg)) {
    return {
      title: "The server is waking up",
      body: "The analysis service sleeps when idle. Give it about thirty seconds and try again.",
      retryable: true,
    };
  }

  if (/location is not supported|user location/i.test(msg)) {
    return {
      title: "This service isn't available in your region",
      body: "The analysis provider doesn't accept requests from this location yet.",
      retryable: false,
    };
  }

  if (err instanceof TypeError && /fetch|network/i.test(msg)) {
    return {
      title: "Couldn't reach the server",
      body: "Check your connection and try again.",
      retryable: true,
    };
  }

  if (/\b(401|403)\b/.test(msg) || /unauthori[sz]ed|forbidden/i.test(msg)) {
    return {
      title: "Your session expired",
      body: "Sign in again to continue.",
      retryable: false,
    };
  }

  if (/\b413\b/.test(msg) || /too large|file size/i.test(msg)) {
    return {
      title: "That file is too large",
      body: "Upload a statement under 10 MB, or split it into separate files.",
      retryable: true,
    };
  }

  if (/\b429\b/.test(msg) || /rate limit|too many requests/i.test(msg)) {
    return {
      title: "Too many requests",
      body: "You've hit the rate limit. Wait a minute before trying again.",
      retryable: true,
    };
  }

  return FALLBACK;
}

/** Raw errors go here and nowhere else. */
export function reportError(err: unknown, context: Record<string, unknown> = {}): void {
  try {
    Sentry.captureException(err, { extra: context });
  } catch {
    // Sentry is optional; a reporting failure must never surface to the user.
  }
  if (import.meta.env.DEV) console.error(err, context);
}
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `cd frontend && npm run test -- motion errors`
Expected: PASS, both files green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/motion.ts frontend/src/lib/errors.ts frontend/src/tests/motion.test.ts frontend/src/tests/errors.test.ts
git commit -m "feat(frontend): add centralised motion tokens and human error mapping"
```

---

## Phase 3 — Primitives

### Task 7: shadcn/ui primitives, themed to the token layer

**Files:**
- Create: `frontend/components.json`, `frontend/src/components/ui/{button,dialog,drawer,sheet,command,table,input,select,badge,tooltip,popover,tabs,separator,scroll-area,dropdown-menu}.tsx`
- Test: `frontend/src/tests/ui-primitives.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/cn`; tokens from Task 2
- Produces: `Button` (variants `primary | secondary | ghost | danger`, sizes `sm | md | icon`), `Dialog`, `Drawer`, `Sheet`, `Command` + `CommandInput/List/Item/Group/Empty`, `Table` + `TableHeader/Body/Row/Head/Cell`, `Input`, `Select`, `Badge` (variants `neutral | success | danger | info`), `Tooltip`, `Popover`, `Tabs`, `Separator`, `ScrollArea`, `DropdownMenu`

- [ ] **Step 1: Install the primitive dependencies**

```bash
cd frontend
npm install class-variance-authority @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-separator @radix-ui/react-scroll-area @radix-ui/react-dropdown-menu @radix-ui/react-slot cmdk vaul
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/tests/ui-primitives.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Analyse</Button>);
    expect(screen.getByRole("button", { name: "Analyse" })).toBeInTheDocument();
  });

  it("uses the accent only for the primary variant", () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-accent");

    rerender(<Button variant="secondary">Go</Button>);
    expect(screen.getByRole("button").className).not.toContain("bg-accent");

    rerender(<Button variant="ghost">Go</Button>);
    expect(screen.getByRole("button").className).not.toContain("bg-accent");
  });

  it("forwards disabled state", () => {
    render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Badge", () => {
  it("maps semantic variants to semantic tokens", () => {
    const { rerender } = render(<Badge variant="success">Credit</Badge>);
    expect(screen.getByText("Credit").className).toContain("success");

    rerender(<Badge variant="danger">Debit</Badge>);
    expect(screen.getByText("Debit").className).toContain("danger");
  });
});

describe("Table", () => {
  it("renders semantic table markup", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Swiggy</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Swiggy" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd frontend && npm run test -- ui-primitives`
Expected: FAIL — `Failed to resolve import "@/components/ui/button"`.

- [ ] **Step 4: Create `frontend/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 5: Create `frontend/src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * `primary` is one of the four sanctioned uses of --accent. No other variant
 * may reference it, and no variant may use a category ramp colour.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-[13px] font-medium transition-colors duration-[140ms] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-contrast hover:brightness-110 active:brightness-95",
        secondary:
          "bg-surface-2 text-text border border-border hover:border-border-strong hover:bg-elevated",
        ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
        danger: "bg-transparent text-danger border border-border hover:border-danger/50 hover:bg-danger/10",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 6: Create `frontend/src/components/ui/badge.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-text-2 border border-border",
        success: "bg-success/12 text-success border border-success/25",
        danger: "bg-danger/12 text-danger border border-danger/25",
        info: "bg-info/12 text-info border border-info/25",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
```

- [ ] **Step 7: Create `frontend/src/components/ui/table.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/cn";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full border-collapse text-[13px]", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("sticky top-0 z-10 bg-surface/95 backdrop-blur-sm", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-colors duration-[140ms] hover:bg-surface-2/60",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted border-b border-border",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-3 py-2.5 align-middle text-text", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

- [ ] **Step 8: Create `frontend/src/components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/cn";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full rounded-[8px] border border-border bg-surface-2 px-3 text-[13px] text-text",
        "placeholder:text-text-muted transition-colors duration-[140ms]",
        "hover:border-border-strong focus:border-border-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 9: Add the remaining Radix-backed primitives**

Add these via the shadcn CLI, which reads `components.json` and writes into `src/components/ui/`:

```bash
cd frontend
npx shadcn@latest add dialog drawer sheet command select tabs separator scroll-area dropdown-menu tooltip popover --yes --overwrite
```

Then retokenise each generated file: replace every `bg-background` → `bg-surface`, `bg-popover` → `bg-elevated`, `text-foreground` → `text-text`, `text-muted-foreground` → `text-text-2`, `border-input`/`border-border` → `border-border`, `ring-ring` → `outline-accent`, and every `rounded-lg`/`rounded-md`/`rounded-xl` → `rounded-[12px]` (or `rounded-[8px]` for inputs and menu items). Overlays use `bg-black/60`; floating panels use `shadow-[var(--shadow-overlay)]` (drawer: `shadow-[var(--shadow-drawer)]`, tooltip: `shadow-[var(--shadow-tooltip)]`). Replace every hardcoded `duration-200`-style class with the motion values: `duration-[140ms]`, `duration-[240ms]`, `duration-[420ms]`.

If the CLI is unavailable offline, copy the primitives from the shadcn docs and apply the same substitutions — the primitives are vendored source, not a runtime dependency.

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend && npm run test -- ui-primitives`
Expected: PASS, all three groups.

- [ ] **Step 11: Verify primitives in both themes**

Render a scratch route or Storybook-less page mounting one of each primitive; toggle the theme. Every primitive must be legible in both, with no white-on-white and no residual shadcn neutral palette.

- [ ] **Step 12: Commit**

```bash
git add frontend/components.json frontend/package.json frontend/package-lock.json frontend/src/components/ui frontend/src/tests/ui-primitives.test.tsx
git commit -m "feat(frontend): add shadcn primitives themed to the token layer"
```

---

## Phase 4 — Shell and routing

### Task 8: Router sub-routes and the admin guard fix

**Files:**
- Create: `frontend/src/lib/router.ts`, `frontend/src/context/AnalysisContext.tsx`
- Modify: `frontend/src/App.jsx:38-51`, `frontend/src/App.jsx:144-164`
- Test: `frontend/src/tests/router.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type DashboardTab = "overview" | "transactions" | "vendors" | "insights" | "rewards" | "upload"`
  - `DASHBOARD_TABS: readonly DashboardTab[]`
  - `parseRoute(hash: string): Route` where `Route = { kind: "upload" } | { kind: "history" } | { kind: "dashboard"; tab: DashboardTab } | { kind: "admin"; page: "login" | "dashboard" }`
  - `routeQuery(hash: string): Record<string, string>`
  - `dashboardHref(tab: DashboardTab): string`
  - `routeKey(route: Route): string`
  - `AnalysisProvider` / `useAnalysis(): AnalysisContextValue` — full shape in Step 5; every later task destructures from it

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/router.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseRoute, routeQuery, dashboardHref, routeKey, DASHBOARD_TABS } from "@/lib/router";

describe("parseRoute", () => {
  it("treats the root and an empty hash as upload", () => {
    expect(parseRoute("")).toEqual({ kind: "upload" });
    expect(parseRoute("#/")).toEqual({ kind: "upload" });
  });

  it("aliases #/dashboard to the overview tab", () => {
    expect(parseRoute("#/dashboard")).toEqual({ kind: "dashboard", tab: "overview" });
    expect(parseRoute("#/dashboard/")).toEqual({ kind: "dashboard", tab: "overview" });
  });

  it("resolves every dashboard sub-route", () => {
    for (const tab of DASHBOARD_TABS) {
      expect(parseRoute(`#/dashboard/${tab}`)).toEqual({ kind: "dashboard", tab });
    }
  });

  it("falls back to overview for an unknown sub-route", () => {
    expect(parseRoute("#/dashboard/nonsense")).toEqual({ kind: "dashboard", tab: "overview" });
  });

  it("ignores a trailing query string", () => {
    expect(parseRoute("#/dashboard/transactions?cat=Shopping")).toEqual({
      kind: "dashboard",
      tab: "transactions",
    });
  });

  it("resolves history", () => {
    expect(parseRoute("#/history")).toEqual({ kind: "history" });
  });

  it("parses a trailing query string into a plain object", () => {
    expect(routeQuery("#/dashboard/transactions?category=Shopping&day=4")).toEqual({
      category: "Shopping",
      day: "4",
    });
  });

  it("returns an empty object when there is no query string", () => {
    expect(routeQuery("#/dashboard/transactions")).toEqual({});
  });

  it("resolves admin login and dashboard", () => {
    expect(parseRoute("#/admin/login")).toEqual({ kind: "admin", page: "login" });
    expect(parseRoute("#/admin/dashboard")).toEqual({ kind: "admin", page: "dashboard" });
    expect(parseRoute("#/admin")).toEqual({ kind: "admin", page: "dashboard" });
  });

  it("falls back to upload for anything unrecognised", () => {
    expect(parseRoute("#/wat")).toEqual({ kind: "upload" });
  });
});

describe("dashboardHref", () => {
  it("builds a linkable hash per tab", () => {
    expect(dashboardHref("overview")).toBe("#/dashboard");
    expect(dashboardHref("transactions")).toBe("#/dashboard/transactions");
  });
});

describe("routeKey", () => {
  it("gives every route kind a distinct non-empty key", () => {
    const keys = [
      routeKey({ kind: "upload" }),
      routeKey({ kind: "history" }),
      routeKey({ kind: "dashboard", tab: "overview" }),
      routeKey({ kind: "dashboard", tab: "vendors" }),
      routeKey({ kind: "admin", page: "login" }),
      routeKey({ kind: "admin", page: "dashboard" }),
    ];
    expect(keys.every((k) => typeof k === "string" && k.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- router`
Expected: FAIL — `Failed to resolve import "@/lib/router"`.

- [ ] **Step 3: Create `frontend/src/lib/router.ts`**

```ts
export const DASHBOARD_TABS = [
  "overview",
  "transactions",
  "vendors",
  "insights",
  "rewards",
  "upload",
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export type Route =
  | { kind: "upload" }
  | { kind: "history" }
  | { kind: "dashboard"; tab: DashboardTab }
  | { kind: "admin"; page: "login" | "dashboard" };

const isTab = (s: string): s is DashboardTab =>
  (DASHBOARD_TABS as readonly string[]).includes(s);

/** `#/dashboard` aliases overview so every existing link keeps working. */
export function parseRoute(hash: string): Route {
  const path = (hash || "").split("?")[0].replace(/^#/, "").replace(/\/+$/, "");

  if (path === "" || path === "/") return { kind: "upload" };
  if (path === "/history") return { kind: "history" };

  if (path.startsWith("/admin")) {
    return { kind: "admin", page: path === "/admin/login" ? "login" : "dashboard" };
  }

  if (path === "/dashboard") return { kind: "dashboard", tab: "overview" };
  if (path.startsWith("/dashboard/")) {
    const tab = path.slice("/dashboard/".length);
    return { kind: "dashboard", tab: isTab(tab) ? tab : "overview" };
  }

  return { kind: "upload" };
}

/** Deep links from the charts and the palette carry state after `?`. */
export function routeQuery(hash: string): Record<string, string> {
  const q = (hash || "").split("?")[1];
  if (!q) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(q)) out[k] = v;
  return out;
}

export function dashboardHref(tab: DashboardTab): string {
  return tab === "overview" ? "#/dashboard" : `#/dashboard/${tab}`;
}

/**
 * A stable per-screen identity for `PageTransition` (Task 23). Every `Route`
 * kind must produce a string — `route.tab` alone is `undefined` on the
 * upload, history and admin routes, which would collapse them into one key
 * and kill the cross-fade between them.
 */
export function routeKey(route: Route): string {
  switch (route.kind) {
    case "dashboard":
      return `dashboard:${route.tab}`;
    case "admin":
      return `admin:${route.page}`;
    default:
      return route.kind;
  }
}
```

`routeQuery` decodes percent-encoding itself, so callers pass the value straight through — do **not** call `decodeURIComponent` on the result a second time or `Food %26 Dining` becomes malformed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm run test -- router`
Expected: PASS, 12 tests.

- [ ] **Step 5: Create `frontend/src/context/AnalysisContext.tsx`**

`App.jsx` keeps ownership of the state and the handlers; this only stops the views, sidebar, topbar and palette from needing prop drilling. **This is the single shape every later task consumes** — Tasks 14–22 all destructure from `useAnalysis()`, so it is defined in full here rather than grown ad hoc.

```tsx
import { createContext, useContext, type ReactNode } from "react";
import type { Analysis, StoredAnalysis } from "@/lib/types";
import type { Stage } from "@/components/data/ProgressStages";

export type AnalysisContextValue = {
  /** The analysis currently on screen — sample data, an upload, or a history pick. */
  analysis: Analysis | null;
  /** Every stored analysis for this user; empty when signed out. */
  history: StoredAnalysis[];
  isSignedIn: boolean;

  /** The fourth argument is the raw description, which Toast needs for apply-all. */
  updateTransaction: (index: number, field: string, value: unknown, description?: string) => void;
  batchUpdateCategory: (desc: string, newCat: string) => void;

  analyze: (files: File[]) => void;
  analyzing: boolean;
  stage: Stage;
  stageDetail?: string;
  error: unknown;

  /** Backs the existing "Try with sample data" CTA. Must not be dropped. */
  loadSample: () => void;

  passwordFor: { fileName: string; fileIndex: number; incorrect?: boolean } | null;
  submitPassword: (password: string) => void;
  cancelPassword: () => void;

  navigate: (hash: string) => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({
  value,
  children,
}: {
  value: AnalysisContextValue;
  children: ReactNode;
}) {
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used inside an AnalysisProvider");
  return ctx;
}
```

The `Stage` import creates a forward reference to Task 20. To keep Task 8 self-contained, declare `stage: "upload" | "convert" | "extract" | "categorise" | "redact"` inline here and replace it with the imported type once Task 20 lands; both spellings are identical, so nothing else changes.

Then create `frontend/src/tests/helpers/renderWithAnalysis.tsx` in the same step. Spec §19 requires every view to get a smoke render against sample data, and each of Tasks 14–22 would otherwise hand-roll its own context object and drift from the type. This is the one factory they all import:

```tsx
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";
import { AnalysisProvider, type AnalysisContextValue } from "@/context/AnalysisContext";
import { SAMPLE_DATA } from "@/data/sampleData";

/** Real shipped sample data, never a bespoke fixture — spec §39. */
export function analysisValue(
  overrides: Partial<AnalysisContextValue> = {},
): AnalysisContextValue {
  return {
    analysis: { id: "sample", ...SAMPLE_DATA },
    history: [],
    isSignedIn: false,
    updateTransaction: vi.fn(),
    batchUpdateCategory: vi.fn(),
    analyze: vi.fn(),
    analyzing: false,
    stage: "upload",
    stageDetail: undefined,
    error: null,
    loadSample: vi.fn(),
    passwordFor: null,
    submitPassword: vi.fn(),
    cancelPassword: vi.fn(),
    navigate: vi.fn(),
    ...overrides,
  };
}

export function renderWithAnalysis(
  ui: ReactElement,
  overrides: Partial<AnalysisContextValue> = {},
) {
  const value = analysisValue(overrides);
  const result = render(<AnalysisProvider value={value}>{ui}</AnalysisProvider>);
  return { ...result, value };
}
```

`SAMPLE_DATA` uses the raw `{ date, desc, amount, cat }` shape, so views must go through `normaliseTransactions` (Task 5) before touching the rows. Any view test that fails here because it read `t.description` directly is telling you the view skipped normalisation — fix the view, not the fixture.

Every subsequent view test — Overview, Transactions, Vendors, Insights, Rewards, Upload, and the command palette — imports `renderWithAnalysis` and passes only the overrides that test cares about. That is the spec §19 "smoke render against sample data" for each view.

- [ ] **Step 6: Move the admin guard out of render in `frontend/src/App.jsx`**

The current guard at lines 144–164 assigns `window.location.hash` during render — a side effect in the render phase. Replace the whole `if (route.startsWith("#/admin")) { … }` block with a parsed route plus an effect.

Add near the other imports:

```js
import { parseRoute } from "./lib/router";
```

Replace the `route` state derivation with a parsed value, keeping the raw hash state as-is:

```js
const parsed = parseRoute(route);
const isAdminRoute = parsed.kind === "admin";
const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("admin_token"));
```

Add this effect **below the existing effects** — it does the redirecting the render used to do:

```js
// Admin guard. Runs as an effect, not during render.
useEffect(() => {
  if (parsed.kind !== "admin") return;
  const hasToken = !!sessionStorage.getItem("admin_token");
  if (!hasToken && parsed.page !== "login") {
    window.location.hash = "#/admin/login";
  } else if (hasToken && parsed.page === "login") {
    window.location.hash = "#/admin/dashboard";
  }
}, [parsed.kind, parsed.page, adminToken]);
```

Keep the token in state so a login inside `AdminLogin` re-triggers the guard. Add a `storage`-independent refresh by listening for the same hash change already handled:

```js
useEffect(() => {
  setAdminToken(sessionStorage.getItem("admin_token"));
}, [route]);
```

Then render admin without side effects:

```js
if (isAdminRoute) {
  const hasToken = !!adminToken;
  if (!hasToken && parsed.page !== "login") return null;   // effect above is redirecting
  if (hasToken && parsed.page === "login") return null;    // effect above is redirecting
  return parsed.page === "login" ? <AdminLogin /> : <AdminDashboard />;
}
```

The existing `onHashChange` effect (lines 38–51) and its `sessionStorage.removeItem("admin_token")` on navigation away are unchanged — that is auth behaviour and stays exactly as written.

- [ ] **Step 7: Verify admin flows by hand**

- `#/admin/dashboard` with no token → lands on `#/admin/login`, no React warning in console
- Log in → lands on `#/admin/dashboard`
- Navigate to `#/` → token cleared; returning to `#/admin/dashboard` requires login again
- No "Cannot update a component while rendering a different component" warning anywhere

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/router.ts frontend/src/context/AnalysisContext.tsx frontend/src/App.jsx frontend/src/tests/router.test.ts
git commit -m "feat(frontend): add dashboard sub-routes and move the admin guard into an effect"
```

---

### Task 9: AppShell, Sidebar, Topbar, MobileNav

**Files:**
- Create: `frontend/src/components/shell/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx`, `NavItems.ts`, `ThemeToggle.tsx`
- Modify: `frontend/src/App.jsx`
- Delete: `frontend/src/components/Navbar.jsx`
- Test: `frontend/src/tests/shell.test.tsx`

**Interfaces:**
- Consumes: `parseRoute`, `dashboardHref`, `DASHBOARD_TABS` from `@/lib/router`; `useAnalysis` from `@/context/AnalysisContext`; `duration`, `SPRING` from `@/lib/motion`; `Button` from `@/components/ui/button`
- Produces:
  - `<AppShell route={Route} theme="dark"|"light" onToggleTheme={() => void} onOpenPalette={() => void}>{children}</AppShell>`
  - `NAV_ITEMS: { tab: DashboardTab; label: string; icon: LucideIcon }[]`
  - `<ThemeToggle theme onToggle />` — the single theme control in the app

- [ ] **Step 1: Install Framer Motion**

```bash
cd frontend && npm install framer-motion
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/tests/shell.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/shell/AppShell";
import { renderWithAnalysis } from "@/tests/helpers/renderWithAnalysis";

function renderShell(overrides = {}) {
  return renderWithAnalysis(
    <AppShell
      route={{ kind: "dashboard", tab: "overview" }}
      theme="dark"
      onToggleTheme={vi.fn()}
      onOpenPalette={vi.fn()}
    >
      <div>view content</div>
    </AppShell>,
    overrides,
  ).value;
}

beforeEach(() => {
  localStorage.clear();
});

describe("AppShell", () => {
  it("renders its children", () => {
    renderShell();
    expect(screen.getByText("view content")).toBeInTheDocument();
  });

  it("exposes every dashboard destination as a link", () => {
    renderShell();
    for (const label of ["Overview", "Transactions", "Vendors", "Insights", "Rewards"]) {
      expect(screen.getByRole("link", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("marks the active destination for assistive tech", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /Overview/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Vendors/i })).not.toHaveAttribute("aria-current");
  });

  it("persists the collapsed state to localStorage", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(localStorage.getItem("sidebar-collapsed")).toBe("true");
  });

  it("renders exactly one theme toggle", () => {
    renderShell();
    expect(screen.getAllByRole("button", { name: /switch to light|switch to dark/i })).toHaveLength(1);
  });

  it("opens the command palette from the search trigger", async () => {
    const user = userEvent.setup();
    const onOpenPalette = vi.fn();
    renderWithAnalysis(
      <AppShell
        route={{ kind: "dashboard", tab: "overview" }}
        theme="dark"
        onToggleTheme={vi.fn()}
        onOpenPalette={onOpenPalette}
      >
        <div />
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(onOpenPalette).toHaveBeenCalled();
  });

  it("gives every icon-only control an accessible name", () => {
    renderShell();
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAccessibleName();
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd frontend && npm run test -- shell`
Expected: FAIL — `Failed to resolve import "@/components/shell/AppShell"`.

- [ ] **Step 4: Create `frontend/src/components/shell/NavItems.ts`**

```ts
import {
  LayoutDashboard,
  ReceiptText,
  Store,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { DashboardTab } from "@/lib/router";

export type NavItem = { tab: DashboardTab; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "transactions", label: "Transactions", icon: ReceiptText },
  { tab: "vendors", label: "Vendors", icon: Store },
  { tab: "insights", label: "Insights", icon: Lightbulb },
  { tab: "rewards", label: "Rewards", icon: Sparkles },
];
```

- [ ] **Step 5: Create `frontend/src/components/shell/ThemeToggle.tsx`**

The app's only theme control. The three duplicates in `Navbar`, `UploadScreen` and `ExpenseManager` are removed as their owners are migrated.

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "dark" | "light";
  onToggle: () => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/shell/Sidebar.tsx`**

```tsx
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Settings, Wallet } from "lucide-react";
import { NAV_ITEMS } from "./NavItems";
import { dashboardHref, type DashboardTab } from "@/lib/router";
import { SPRING, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Sidebar({
  activeTab,
  collapsed,
  onToggleCollapsed,
}: {
  activeTab: DashboardTab | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-border bg-surface",
        "transition-[width] duration-[240ms]",
        collapsed ? "w-[64px]" : "w-[228px]",
      )}
    >
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Wallet className="size-[18px] text-accent" aria-hidden />
        {!collapsed && (
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-text">Spend</span>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => {
          const active = tab === activeTab;
          return (
            <li key={tab} className="relative">
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  transition={reduced ? { duration: 0 } : SPRING}
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent"
                  aria-hidden
                />
              )}
              <a
                href={dashboardHref(tab)}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-[13px]",
                  "transition-colors duration-[140ms]",
                  active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2 hover:text-text",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span>{label}</span>}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-0.5 border-t border-border px-2 py-2">
        <a
          href="#/history"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-[13px] text-text-2",
            "transition-colors duration-[140ms] hover:bg-surface-2 hover:text-text",
            collapsed && "justify-center px-0",
          )}
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          {!collapsed && <span>Settings</span>}
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("self-start", collapsed && "self-center")}
        >
          {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 7: Create `frontend/src/components/shell/Topbar.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Topbar({
  breadcrumb,
  theme,
  onToggleTheme,
  onOpenPalette,
  right,
}: {
  breadcrumb: string[];
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  right?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:px-6",
        "transition-colors duration-[240ms]",
        scrolled ? "border-border bg-surface/80 backdrop-blur-md" : "border-transparent bg-bg",
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden />}
            <span
              className={cn("truncate", i === breadcrumb.length - 1 ? "text-text" : "text-text-2")}
              aria-current={i === breadcrumb.length - 1 ? "page" : undefined}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenPalette}
          aria-label="Search transactions, vendors and categories"
          className="hidden gap-2 text-text-2 sm:flex"
        >
          <Search aria-hidden />
          <span>Search</span>
          <kbd className="ml-1 rounded-[4px] border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenPalette}
          aria-label="Search"
          className="sm:hidden"
        >
          <Search aria-hidden />
        </Button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        {right}
      </div>
    </header>
  );
}
```

The `sm:hidden` icon button carries the accessible name "Search" that the shell test asserts on; the wider button's name is more descriptive, so the test's `/search/i` matcher finds the visible one at test viewport width. Both must always have an accessible name.

- [ ] **Step 8: Create `frontend/src/components/shell/MobileNav.tsx`**

```tsx
import { NAV_ITEMS } from "./NavItems";
import { dashboardHref, type DashboardTab } from "@/lib/router";
import { cn } from "@/lib/cn";

export function MobileNav({ activeTab }: { activeTab: DashboardTab | null }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex md:hidden",
        "border-t border-border bg-surface/95 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {NAV_ITEMS.map(({ tab, label, icon: Icon }) => {
        const active = tab === activeTab;
        return (
          <a
            key={tab}
            href={dashboardHref(tab)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
              "transition-colors duration-[140ms]",
              active ? "text-text" : "text-text-muted",
            )}
          >
            {active && (
              <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-accent" aria-hidden />
            )}
            <Icon className="size-[18px]" aria-hidden />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 9: Create `frontend/src/components/shell/AppShell.tsx`**

```tsx
import { useCallback, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS } from "./NavItems";
import type { Route } from "@/lib/router";

const STORAGE_KEY = "sidebar-collapsed";

function breadcrumbFor(route: Route): string[] {
  if (route.kind === "history") return ["Analyses"];
  if (route.kind === "upload") return ["Upload"];
  if (route.kind === "admin") return ["Admin", route.page === "login" ? "Sign in" : "Console"];
  const label = NAV_ITEMS.find((n) => n.tab === route.tab)?.label ?? "Overview";
  return ["Dashboard", label];
}

export function AppShell({
  route,
  theme,
  onToggleTheme,
  onOpenPalette,
  topbarRight,
  children,
}: {
  route: Route;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  topbarRight?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const activeTab = route.kind === "dashboard" ? route.tab : null;

  return (
    <div className="flex min-h-svh bg-bg text-text">
      <Sidebar activeTab={activeTab} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          breadcrumb={breadcrumbFor(route)}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenPalette={onOpenPalette}
          right={topbarRight}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <MobileNav activeTab={activeTab} />
    </div>
  );
}
```

- [ ] **Step 10: Mount the shell in `frontend/src/App.jsx` and delete `Navbar`**

Replace the `<Navbar … />` + `<div style={{flex:1}}>` wrapper at lines 198–211 with:

```jsx
return (
  <AnalysisProvider value={analysisContextValue}>
    <AppShell
      route={parsed}
      theme={theme}
      onToggleTheme={toggleTheme}
      onOpenPalette={() => setPaletteOpen(true)}
    >
      {body}
    </AppShell>
  </AnalysisProvider>
);
```

Add the supporting state and memo above the return:

```jsx
const [paletteOpen, setPaletteOpen] = useState(false);
const { isSignedIn } = useAuth();
const [history, setHistory] = useState([]);

const analysisContextValue = useMemo(() => ({
  analysis: data,
  history,
  isSignedIn: !!isSignedIn,
  updateTransaction: handleUpdateTransaction,
  batchUpdateCategory: handleBatchUpdateCategory,
  analyze: handleAnalyze,
  analyzing: loading,
  stage,
  stageDetail,
  error,
  loadSample: handleUseSample,
  passwordFor,
  submitPassword: handleSubmitPassword,
  cancelPassword: handleCancelPassword,
  navigate: handleNavigate,
}), [
  data, history, isSignedIn, handleUpdateTransaction, handleBatchUpdateCategory,
  handleAnalyze, loading, stage, stageDetail, error, handleUseSample,
  passwordFor, handleSubmitPassword, handleCancelPassword, handleNavigate,
]);
```

The context field is `analysis`, not `data` — the local state variable in `App.jsx` keeps its existing name, but consumers read `analysis` because `data` says nothing about what it holds. This is the complete value; every field maps to something `App.jsx` already owns. `stage` and `stageDetail` do not exist yet — add them as `useState` in Task 20 Step 7 and pass `stage="upload"`/`stageDetail={undefined}` until then so the shape never changes.

Extend the existing `useAuth()` destructure at line 15 from `{ getToken }` to `{ getToken, isSignedIn }` — `AuthProvider` already exposes it. Import `useMemo` alongside the existing hooks.

Fetch history for the comparison baseline, guarded so signed-out users never make the call:

```jsx
useEffect(() => {
  if (!isSignedIn) { setHistory([]); return; }
  let cancelled = false;
  fetchUserAnalyses()
    .then(res => { if (!cancelled) setHistory(res?.analyses || res || []); })
    .catch(err => reportError(err, { where: "history-for-comparison" }));
  return () => { cancelled = true; };
}, [isSignedIn]);
```

Import `fetchUserAnalyses` from `./services/apiService` (already exported, used by `HistoryScreen`) and `reportError` from `./lib/errors`. `apiService.js` itself is not modified.

Then delete the old navbar:

```bash
cd frontend && rm src/components/Navbar.jsx
```

Confirm no remaining import: `grep -rn "Navbar" frontend/src` returns nothing.

- [ ] **Step 11: Run the test to verify it passes**

Run: `cd frontend && npm run test -- shell`
Expected: PASS, 7 tests.

- [ ] **Step 12: Verify routing and shell by hand**

- Every sidebar item deep-links and survives reload
- Browser back/forward moves between tabs correctly
- `#/dashboard` still lands on overview
- Collapse persists across reload
- Below 768px the sidebar is gone and bottom nav is present
- Exactly one theme toggle exists on screen

- [ ] **Step 13: Commit**

```bash
git add frontend/src/components/shell frontend/src/App.jsx frontend/src/tests/shell.test.tsx
git rm frontend/src/components/Navbar.jsx
git commit -m "feat(frontend): add app shell with sidebar, topbar and mobile navigation"
```

---

## Phase 5 — Data display components

### Task 10: Metric, MetricGroup, Sparkline, CategoryIcon, Monogram

**Files:**
- Create: `frontend/src/components/data/Metric.tsx`, `MetricGroup.tsx`, `Sparkline.tsx`, `CategoryIcon.tsx`, `Monogram.tsx`, `Delta.tsx`, `CountUp.tsx`
- Test: `frontend/src/tests/metric.test.tsx`

**Interfaces:**
- Consumes: `formatCurrency`, `formatSignedPercent`, `monogram` from `@/lib/format`; `categoryColor`, `categoryIcon` from `@/lib/categories`; `duration`, `useReducedMotion`, `stagger` from `@/lib/motion`
- Produces:
  - `<Metric label value size?="hero"|"md"|"sm" delta? note? sparkline? icon? animateKey? />`
  - `<MetricGroup>{…}</MetricGroup>`
  - `<Sparkline points={number[]} className? />`
  - `<CategoryIcon cat size? />`
  - `<Monogram desc cat size? />`
  - `<Delta percent absolute? label? />`
  - `<CountUp value formatter animateKey />`

The `animateKey` prop is the mechanism enforcing spec §14: the count-up only re-runs when the key changes (first mount, filter change, period change) — never on an unrelated re-render.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/metric.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Metric } from "@/components/data/Metric";
import { Delta } from "@/components/data/Delta";
import { Sparkline } from "@/components/data/Sparkline";
import { Monogram } from "@/components/data/Monogram";

describe("Metric", () => {
  it("renders its label and value", () => {
    render(<Metric label="Total Debited" value="₹2,381" />);
    expect(screen.getByText("Total Debited")).toBeInTheDocument();
    expect(screen.getByText("₹2,381")).toBeInTheDocument();
  });

  it("renders nothing for absent optional props — no placeholder chrome", () => {
    const { container } = render(<Metric label="Transactions" value="14" />);
    expect(container.textContent).toBe("Transactions14");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("omits the delta entirely when none is given", () => {
    render(<Metric label="Total" value="₹100" />);
    expect(screen.queryByText("—")).toBeNull();
    expect(screen.queryByText("N/A")).toBeNull();
    expect(screen.queryByText("0.0%")).toBeNull();
  });

  it("shows the delta when one is given", () => {
    render(<Metric label="Total" value="₹100" delta={{ percent: 12.4 }} />);
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
  });

  it("uses the accent only at hero size", () => {
    const { container, rerender } = render(<Metric label="Total" value="₹100" size="hero" />);
    expect(container.querySelector('[data-hero="true"]')).not.toBeNull();

    rerender(<Metric label="Total" value="₹100" size="sm" />);
    expect(container.querySelector('[data-hero="true"]')).toBeNull();
  });
});

describe("Delta", () => {
  it("colours a rise as danger, since more spend is worse", () => {
    render(<Delta percent={12.4} />);
    expect(screen.getByText("+12.4%").className).toContain("danger");
  });

  it("colours a fall as success", () => {
    render(<Delta percent={-8.1} />);
    expect(screen.getByText("−8.1%").className).toContain("success");
  });

  it("labels the comparison as vs previous statement", () => {
    render(<Delta percent={5} label="vs previous statement" />);
    expect(screen.getByText("vs previous statement")).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  it("renders nothing when there is no data", () => {
    const { container } = render(<Sparkline points={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an aria-hidden svg with a path when it has data", () => {
    const { container } = render(<Sparkline points={[1, 5, 2, 8]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("path")).not.toBeNull();
  });

  it("survives a flat series without producing NaN coordinates", () => {
    const { container } = render(<Sparkline points={[4, 4, 4]} />);
    expect(container.querySelector("path")?.getAttribute("d")).not.toContain("NaN");
  });
});

describe("Monogram", () => {
  it("shows deterministic initials", () => {
    render(<Monogram desc="Swiggy Limited Bangalore" cat="Food & Dining" />);
    expect(screen.getByText("SL")).toBeInTheDocument();
  });

  it("is hidden from assistive tech, since the name is adjacent", () => {
    const { container } = render(<Monogram desc="JIO Mumbai" cat="Bills & Subscriptions" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- metric`
Expected: FAIL — `Failed to resolve import "@/components/data/Metric"`.

- [ ] **Step 3: Create `frontend/src/components/data/CountUp.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { MS, useReducedMotion } from "@/lib/motion";

/**
 * Animates only when `animateKey` changes — first mount, filter change,
 * period change. An unrelated re-render never restarts the count.
 */
export function CountUp({
  value,
  formatter,
  animateKey,
}: {
  value: number;
  formatter: (n: number) => string;
  animateKey: string | number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const from = 0;
    const start = performance.now();
    const total = MS.complex;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // `value` is intentionally excluded: re-running on every value change would
    // animate on unrelated re-renders. `animateKey` is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey, reduced]);

  useEffect(() => {
    setDisplay(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatter(display)}</>;
}
```

- [ ] **Step 4: Create `frontend/src/components/data/Delta.tsx`**

```tsx
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

/** More spend is a negative outcome, so a rise is red and a fall is green. */
export function Delta({
  percent,
  absolute,
  label,
}: {
  percent: number;
  absolute?: number;
  label?: string;
}) {
  const worse = percent > 0;
  const Icon = worse ? TrendingUp : TrendingDown;

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium",
          worse ? "text-danger" : "text-success",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {formatSignedPercent(percent)}
      </span>
      {absolute != null && (
        <span className="text-text-muted">({formatCurrency(absolute, { sign: true })})</span>
      )}
      {label && <span className="text-text-muted">{label}</span>}
    </span>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/data/Sparkline.tsx`**

```tsx
import { cn } from "@/lib/cn";

/**
 * Decorative trend line. Never uses --accent — it renders in the neutral
 * analytics colour so it cannot compete with the hero figure.
 */
export function Sparkline({
  points,
  className,
  width = 72,
  height = 20,
}: {
  points: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (!points.length) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible text-info", className)}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/data/CategoryIcon.tsx` and `Monogram.tsx`**

`CategoryIcon.tsx`:

```tsx
import { categoryColor, categoryIcon } from "@/lib/categories";
import { cn } from "@/lib/cn";

export function CategoryIcon({
  cat,
  size = 16,
  className,
}: {
  cat: string;
  size?: number;
  className?: string;
}) {
  const Icon = categoryIcon(cat);
  return (
    <Icon
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{ width: size, height: size, color: categoryColor(cat) }}
    />
  );
}
```

`Monogram.tsx`:

```tsx
import { monogram } from "@/lib/format";
import { categoryColor } from "@/lib/categories";
import { cn } from "@/lib/cn";

/**
 * Stands in for a merchant logo, which the pipeline does not provide.
 * Tinted by the merchant's category ramp position — data encoding, not accent.
 */
export function Monogram({
  desc,
  cat,
  size = 28,
  className,
}: {
  desc: string;
  cat: string;
  size?: number;
  className?: string;
}) {
  const color = categoryColor(cat);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[8px] font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
      }}
    >
      {monogram(desc)}
    </span>
  );
}
```

- [ ] **Step 7: Create `frontend/src/components/data/Metric.tsx`**

```tsx
import type { ReactNode } from "react";
import { Delta } from "./Delta";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/cn";

export type MetricProps = {
  label: string;
  value: ReactNode;
  size?: "hero" | "md" | "sm";
  delta?: { percent: number; absolute?: number; label?: string };
  note?: string;
  sparkline?: number[];
  icon?: ReactNode;
};

/**
 * One reusable figure. Absent props render nothing at all — no dash, no zero,
 * no placeholder chrome (spec §9).
 */
export function Metric({ label, value, size = "md", delta, note, sparkline, icon }: MetricProps) {
  const hero = size === "hero";

  return (
    <div className={cn("flex flex-col gap-1", hero && "gap-2")}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span
          data-hero={hero ? "true" : undefined}
          className={cn(
            "font-semibold leading-none tracking-[-0.02em] text-text",
            hero && "text-[40px] leading-[44px] text-accent",
            size === "md" && "text-[20px]",
            size === "sm" && "text-[15px]",
          )}
        >
          {value}
        </span>
        {sparkline && sparkline.length > 0 && <Sparkline points={sparkline} />}
      </div>

      {delta && <Delta percent={delta.percent} absolute={delta.absolute} label={delta.label} />}
      {note && <span className="text-[12px] text-text-2">{note}</span>}
    </div>
  );
}
```

The hero figure is the fourth and last sanctioned use of `--accent`. No other metric size may reference it.

- [ ] **Step 8: Create `frontend/src/components/data/MetricGroup.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Lightweight row of secondary metrics — separators, not four boxed cards. */
export function MetricGroup({ children, className }: { children: ReactNode; className?: string }) {
  /*
    Callers gate individual metrics on data they may not have — AdminStats
    (Task 21) omits its p95 cell when the endpoint returns no durations,
    Overview omits the comparison cell with no baseline. Those arrive as
    `false`/`null` array entries, and wrapping one in a padded cell would
    render an empty box with visible separators around it. Drop them here so
    no caller has to build its children array conditionally.
  */
  const cells = (Array.isArray(children) ? children : [children]).filter(
    (child) => child !== null && child !== undefined && child !== false,
  );
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-[12px] border border-border bg-border",
        "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {cells.map((child, i) => (
        <div key={i} className="bg-surface px-4 py-3.5">
          {child}
        </div>
      ))}
    </div>
  );
}
```

The 1px gap over a `bg-border` parent produces hairline separators between cells without four separate bordered cards.

Add the matching case to the test in Step 2:

```tsx
it("drops absent cells instead of rendering empty boxes", () => {
  const { container } = render(
    <MetricGroup>
      {<Metric label="Total spend" value="₹12,480" />}
      {null}
      {false}
    </MetricGroup>,
  );
  expect(container.querySelectorAll(".bg-surface")).toHaveLength(1);
});
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd frontend && npm run test -- metric`
Expected: PASS, all five groups.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/data frontend/src/tests/metric.test.tsx
git commit -m "feat(frontend): add Metric, Delta, Sparkline, CategoryIcon and Monogram"
```

---

### Task 11: Skeleton, EmptyState, ErrorState

**Files:**
- Create: `frontend/src/components/data/Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `PageHeader.tsx`
- Test: `frontend/src/tests/states.test.tsx`

**Interfaces:**
- Consumes: `toHuman`, `reportError` from `@/lib/errors`; `Button` from `@/components/ui/button`
- Produces:
  - `<Skeleton className? />`, `<SkeletonText lines? />`, `<SkeletonMetric />`, `<SkeletonTable rows? cols? />`, `<SkeletonChart height? />`
  - `<EmptyState title body? actionLabel? onAction? />`
  - `<ErrorState error onRetry? />`
  - `<PageHeader title description? actions? />`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/states.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Skeleton, SkeletonTable } from "@/components/data/Skeleton";
import { EmptyState } from "@/components/data/EmptyState";
import { ErrorState } from "@/components/data/ErrorState";

describe("Skeleton", () => {
  it("shimmers and is hidden from assistive tech", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("shimmer");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("mirrors the final table geometry", () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(3);
  });
});

describe("EmptyState", () => {
  it("shows a title and a single action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No transactions match"
        body="Try a different category or clear the search."
        actionLabel="Reset filters"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("No transactions match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("omits the action when none is supplied", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ErrorState", () => {
  it("shows a human sentence, never the raw error", () => {
    render(<ErrorState error={new Error("TypeError: Cannot read properties of undefined")} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText(/TypeError/)).toBeNull();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it("maps a known failure to its specific sentence", () => {
    render(<ErrorState error={new Error("Server error (503): upstream")} />);
    expect(screen.getByText("The server is waking up")).toBeInTheDocument();
  });

  it("offers a retry for retryable failures", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState error={new Error("Server error (503): upstream")} onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("hides retry for a non-retryable failure", () => {
    render(<ErrorState error={new Error("Server error (401): Unauthorized")} onRetry={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("announces itself to assistive tech", () => {
    render(<ErrorState error={new Error("boom")} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- states`
Expected: FAIL — `Failed to resolve import "@/components/data/Skeleton"`.

- [ ] **Step 3: Create `frontend/src/components/data/Skeleton.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("shimmer rounded-[8px]", className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-6 w-32" />
    </div>
  );
}

/** Geometry mirrors the real ledger so nothing shifts when data lands. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-px rounded-[12px] border border-border bg-border">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} data-skeleton-row className="flex items-center gap-4 bg-surface px-3 py-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3", c === 1 ? "flex-[3]" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height }} aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-b-none"
          // Deterministic staircase, not random — a random height would change
          // on every render and read as flicker.
          style={{ height: `${30 + ((i * 37) % 60)}%` }}
        />
      ))}
    </div>
  );
}
```

`Skeleton` needs a `style` passthrough for `SkeletonChart`; extend its signature to `{ className, style }: { className?: string; style?: React.CSSProperties }` and spread `style` onto the div.

- [ ] **Step 4: Create `frontend/src/components/data/EmptyState.tsx`**

```tsx
import { Button } from "@/components/ui/button";

/** A title, one sentence, one action. No illustration (spec §15). */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-border bg-surface px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-text">{title}</p>
      {body && <p className="max-w-[42ch] text-[13px] text-text-2">{body}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/data/ErrorState.tsx`**

```tsx
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { reportError, toHuman } from "@/lib/errors";
import { Button } from "@/components/ui/button";

/** The raw error goes to Sentry; only the mapped sentence reaches the screen. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, body, retryable } = toHuman(error);

  useEffect(() => {
    reportError(error, { surface: "ErrorState" });
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[12px] border border-border bg-surface px-6 py-12 text-center"
    >
      <AlertCircle className="size-5 text-danger" aria-hidden />
      <p className="text-[15px] font-semibold text-text">{title}</p>
      <p className="max-w-[46ch] text-[13px] text-text-2">{body}</p>
      {retryable && onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/data/PageHeader.tsx`**

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-text">
          {title}
        </h1>
        {description && <p className="text-[13px] text-text-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd frontend && npm run test -- states`
Expected: PASS, all three groups.

- [ ] **Step 8: Replace the leftover spinners**

`grep -rn "spin-loader\|pulse-text" frontend/src` — replace each with the appropriate skeleton. Spec §15 forbids spinners; the classes were deleted from `index.css` in Task 2, so any remaining usage is now a silent no-op and must be fixed here.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/data frontend/src/tests/states.test.tsx frontend/src/components
git commit -m "feat(frontend): add skeleton, empty and error states with human error copy"
```

---

## Phase 6 — Charts

### Task 12: ChartFrame, ChartTooltip, CategoryDonut, DailySpend

**Files:**
- Create: `frontend/src/components/charts/ChartFrame.tsx`, `ChartTooltip.tsx`, `CategoryDonut.tsx`, `DailySpend.tsx`, `chartTheme.ts`
- Test: `frontend/src/tests/charts.test.tsx`

**Interfaces:**
- Consumes: `categoryColor`, `CATEGORY_ORDER` from `@/lib/categories`; `formatCompactCurrency`, `formatCurrency`, `dayOfMonth` from `@/lib/format`; `categoryTotals`, `dailySeries`, `dailyBreakdown` from `@/lib/derive`; `MS` from `@/lib/motion`
- Produces:
  - `<ChartFrame title subtitle? legend? action? height? empty? children />`
  - `<ChartTooltip active? payload? label? renderer />`
  - `<CategoryDonut totals total onSelect? selected? />`
  - `<DailySpend series breakdown onSelectDay? />`
  - `CHART_GRID`, `CHART_AXIS`, `axisTickStyle` from `chartTheme.ts`

Two live bugs are fixed here, both required by the spec §20 phase 6 gate:

1. **Stuck tooltip.** The current charts leave a tooltip painted after the pointer leaves, because Recharts' `onMouseLeave` fires on the shape rather than the container. Fix: hold hover state on the `ResponsiveContainer` wrapper and clear it in the wrapper's `onMouseLeave` and `onPointerLeave`, passing `active={hovered}` explicitly to `<Tooltip>`.
2. **Negative baseline.** A bar chart whose `domain` is inferred renders a baseline below zero when every value is positive, leaving a visible gap under the bars. Fix: pin `domain={[0, "dataMax"]}` and `allowDataOverflow={false}` on the Y axis of every bar chart.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/charts.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { DailySpend } from "@/components/charts/DailySpend";

// Recharts measures its parent; jsdom reports 0x0 and renders nothing.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 640 });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 320 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 320 });
});

const TOTALS = { "Food & Dining": 1200, Transport: 800, Shopping: 400 };
const SERIES = [
  { day: 1, amount: 300 },
  { day: 2, amount: 0 },
  { day: 3, amount: 1200 },
];

describe("ChartFrame", () => {
  it("renders its title and children", () => {
    render(
      <ChartFrame title="Where it went">
        <div data-testid="body" />
      </ChartFrame>,
    );
    expect(screen.getByText("Where it went")).toBeInTheDocument();
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("replaces the body with an empty state rather than an axis-only chart", () => {
    render(
      <ChartFrame title="Where it went" empty={{ title: "No spend in this period" }}>
        <div data-testid="body" />
      </ChartFrame>,
    );
    expect(screen.queryByTestId("body")).toBeNull();
    expect(screen.getByText("No spend in this period")).toBeInTheDocument();
  });
});

describe("CategoryDonut", () => {
  it("renders one arc per category", () => {
    const { container } = render(<CategoryDonut totals={TOTALS} total={2400} />);
    expect(container.querySelectorAll(".recharts-pie-sector").length).toBe(3);
  });

  it("prints the total in the centre", () => {
    render(<CategoryDonut totals={TOTALS} total={2400} />);
    expect(screen.getByText("₹2,400")).toBeInTheDocument();
  });

  it("colours arcs from the ramp by fixed category index, not by rank", () => {
    const { container } = render(<CategoryDonut totals={TOTALS} total={2400} />);
    const fills = Array.from(container.querySelectorAll(".recharts-pie-sector path")).map((p) =>
      p.getAttribute("fill"),
    );
    // Food & Dining is index 4, Transport 5, Shopping 10 in CATEGORY_ORDER.
    expect(fills).toEqual(["var(--ramp-4)", "var(--ramp-5)", "var(--ramp-10)"]);
  });

  it("reports the clicked category", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CategoryDonut totals={TOTALS} total={2400} onSelect={onSelect} />,
    );
    fireEvent.click(container.querySelectorAll(".recharts-pie-sector")[0]);
    expect(onSelect).toHaveBeenCalledWith("Food & Dining");
  });
});

describe("DailySpend", () => {
  it("pins the y-axis baseline at zero so bars do not float", () => {
    const { container } = render(<DailySpend series={SERIES} breakdown={{}} />);
    const axis = container.querySelector(".recharts-yAxis");
    expect(axis).not.toBeNull();
    const ticks = Array.from(axis!.querySelectorAll(".recharts-cartesian-axis-tick-value")).map(
      (t) => t.textContent,
    );
    expect(ticks[0]).toBe("₹0");
    expect(ticks.some((t) => t?.startsWith("-") || t?.startsWith("−"))).toBe(false);
  });

  it("clears the tooltip when the pointer leaves the plot", () => {
    const { container } = render(<DailySpend series={SERIES} breakdown={{}} />);
    const plot = container.querySelector("[data-chart-surface]")!;
    fireEvent.mouseMove(plot, { clientX: 100, clientY: 100 });
    fireEvent.pointerLeave(plot);
    fireEvent.mouseLeave(plot);
    expect(container.querySelector(".recharts-tooltip-wrapper [data-chart-tooltip]")).toBeNull();
  });

  it("renders a bar per day including zero days, so gaps stay visible", () => {
    const { container } = render(<DailySpend series={SERIES} breakdown={{}} />);
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBe(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- charts`
Expected: FAIL — `Failed to resolve import "@/components/charts/ChartFrame"`.

- [ ] **Step 3: Create `frontend/src/components/charts/chartTheme.ts`**

```ts
import type { CSSProperties } from "react";

/** Axes and grid recede; the data is the only thing with contrast (spec §10). */
export const CHART_GRID = {
  stroke: "var(--border)",
  strokeDasharray: "0",
  vertical: false,
} as const;

export const CHART_AXIS = {
  stroke: "transparent",
  tickLine: false,
  axisLine: false,
} as const;

export const axisTickStyle: CSSProperties = {
  fill: "var(--text-muted)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};

/** Bars and arcs are neutral until hovered; --accent is never used in charts. */
export const BAR_FILL = "var(--ramp-6)";
export const BAR_FILL_ACTIVE = "var(--ramp-2)";
```

- [ ] **Step 4: Create `frontend/src/components/charts/ChartTooltip.tsx`**

```tsx
import type { ReactNode } from "react";

export type TooltipRow = { label: string; value: string; color?: string };

/**
 * One tooltip shape for every chart. Recharts passes `active`/`payload`;
 * the caller supplies the rows so each chart controls its own copy.
 */
export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div
      data-chart-tooltip
      className="pointer-events-none min-w-[168px] rounded-[8px] border border-border-strong bg-elevated px-3 py-2.5"
      style={{ boxShadow: "var(--shadow-tooltip)" }}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-text-2">
              {r.color && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: r.color }}
                  aria-hidden
                />
              )}
              {r.label}
            </span>
            <span className="font-medium text-text">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-text-muted">{footer}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/charts/ChartFrame.tsx`**

```tsx
import type { ReactNode } from "react";
import { EmptyState } from "@/components/data/EmptyState";

/**
 * The only chrome a chart gets: a title row and a plot area. No card border
 * stacked inside another card border (spec §8).
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  action,
  height = 280,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  action?: ReactNode;
  height?: number;
  empty?: { title: string; body?: string };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          {subtitle && <p className="text-[12px] text-text-2">{subtitle}</p>}
        </div>
        {action}
      </header>

      {empty ? (
        <EmptyState title={empty.title} body={empty.body} />
      ) : (
        <>
          <div style={{ height }}>{children}</div>
          {legend && <div className="mt-4">{legend}</div>}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/charts/CategoryDonut.tsx`**

```tsx
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { categoryColor } from "@/lib/categories";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";

type Datum = { name: string; value: number };

export function CategoryDonut({
  totals,
  total,
  onSelect,
  selected,
}: {
  totals: Record<string, number>;
  total: number;
  onSelect?: (cat: string) => void;
  selected?: string | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const data: Datum[] = Object.entries(totals).map(([name, value]) => ({ name, value }));

  return (
    <div
      data-chart-surface
      className="relative h-full w-full"
      onMouseLeave={() => setHovered(null)}
      onPointerLeave={() => setHovered(null)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="66%"
            outerRadius="94%"
            paddingAngle={1.5}
            stroke="none"
            isAnimationActive
            animationDuration={420}
            onMouseEnter={(_, i) => setHovered(data[i].name)}
            onClick={(_, i) => onSelect?.(data[i].name)}
          >
            {data.map((d) => {
              const dim = (hovered && hovered !== d.name) || (selected && selected !== d.name);
              return (
                <Cell
                  key={d.name}
                  fill={categoryColor(d.name)}
                  fillOpacity={dim ? 0.28 : 1}
                  style={{
                    cursor: onSelect ? "pointer" : "default",
                    transition: "fill-opacity 140ms ease-out",
                  }}
                />
              );
            })}
          </Pie>
          <Tooltip
            active={hovered != null}
            cursor={false}
            wrapperStyle={{ outline: "none" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as Datum | undefined;
              if (!p) return null;
              const share = total > 0 ? (p.value / total) * 100 : 0;
              return (
                <ChartTooltip
                  title={p.name}
                  rows={[
                    { label: "Spent", value: formatCurrency(p.value), color: categoryColor(p.name) },
                    { label: "Share", value: `${share.toFixed(1)}%` },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Total
        </span>
        <span className="text-[22px] font-semibold tracking-[-0.02em] text-text">
          {formatCurrency(total)}
        </span>
        <span className="text-[12px] text-text-2">
          {data.length} {data.length === 1 ? "category" : "categories"}
        </span>
      </div>
    </div>
  );
}
```

`formatCompactCurrency` is imported for the legend variant added in Task 14; if lint flags it as unused at this point, drop the import and add it back there.

- [ ] **Step 7: Create `frontend/src/components/charts/DailySpend.tsx`**

```tsx
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryColor } from "@/lib/categories";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { BAR_FILL, BAR_FILL_ACTIVE, CHART_AXIS, CHART_GRID, axisTickStyle } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export type DaySeriesPoint = { day: number; amount: number };

export function DailySpend({
  series,
  breakdown,
  onSelectDay,
}: {
  series: DaySeriesPoint[];
  breakdown: Record<number, Record<string, number>>;
  onSelectDay?: (day: number) => void;
}) {
  const [activeDay, setActiveDay] = useState<number | null>(null);

  return (
    <div
      data-chart-surface
      className="h-full w-full"
      onMouseLeave={() => setActiveDay(null)}
      onPointerLeave={() => setActiveDay(null)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={series}
          margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
          onMouseMove={(s) => {
            const d = s?.activePayload?.[0]?.payload as DaySeriesPoint | undefined;
            setActiveDay(d ? d.day : null);
          }}
          onClick={(s) => {
            const d = s?.activePayload?.[0]?.payload as DaySeriesPoint | undefined;
            if (d) onSelectDay?.(d.day);
          }}
        >
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="day" {...CHART_AXIS} tick={axisTickStyle} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            {...CHART_AXIS}
            tick={axisTickStyle}
            width={56}
            // Pinning the floor at 0 is the negative-baseline fix. Without it
            // Recharts infers a domain that dips below zero and the bars float.
            domain={[0, "dataMax"]}
            allowDataOverflow={false}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
          />
          <Tooltip
            active={activeDay != null}
            cursor={{ fill: "var(--surface-2)" }}
            wrapperStyle={{ outline: "none" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as DaySeriesPoint | undefined;
              if (!p) return null;
              const cats = Object.entries(breakdown[p.day] ?? {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
              return (
                <ChartTooltip
                  title={`Day ${p.day}`}
                  rows={[
                    { label: "Total", value: formatCurrency(p.amount) },
                    ...cats.map(([c, v]) => ({
                      label: c,
                      value: formatCurrency(v),
                      color: categoryColor(c),
                    })),
                  ]}
                  footer={onSelectDay ? "Click to filter transactions" : undefined}
                />
              );
            }}
          />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={420} maxBarSize={22}>
            {series.map((d) => (
              <Cell
                key={d.day}
                fill={activeDay === d.day ? BAR_FILL_ACTIVE : BAR_FILL}
                style={{ cursor: onSelectDay ? "pointer" : "default", transition: "fill 140ms ease-out" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npm run test -- charts`
Expected: PASS, all three groups.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/charts frontend/src/tests/charts.test.tsx
git commit -m "feat(frontend): add chart frame, shared tooltip, donut and daily spend"
```

---

### Task 13: SpendTrend and CategoryLegend

**Files:**
- Create: `frontend/src/components/charts/SpendTrend.tsx`, `CategoryLegend.tsx`
- Test: `frontend/src/tests/spendTrend.test.tsx`

**Interfaces:**
- Consumes: `StoredAnalysis` from `@/lib/types`; `parseStatementDate`, `formatCurrency`, `formatCompactCurrency` from `@/lib/format`; `totalSpent`, `normaliseTransactions`, `excludeSelfTransfers` from `@/lib/derive`; chart theme from `./chartTheme`
- Produces:
  - `trendSeries(history: StoredAnalysis[]): { label: string; total: number; id: string }[]` (exported from `SpendTrend.tsx`)
  - `<SpendTrend history bank? onSelect? />`
  - `<CategoryLegend totals total onSelect? selected? max? />`

Spec §4 gap 1: the backend has no cross-statement trend endpoint, so the trend is computed client-side from the analyses already returned by `fetchUserAnalyses`. With fewer than two statements for the bank, the component renders nothing — no invented series.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/spendTrend.test.tsx`:

```tsx
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendTrend, trendSeries } from "@/components/charts/SpendTrend";
import { CategoryLegend } from "@/components/charts/CategoryLegend";
import type { StoredAnalysis } from "@/lib/types";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 200 });
});

const analysis = (id: string, created: string, bank: string, amounts: number[]): StoredAnalysis => ({
  id,
  created_at: created,
  bank,
  period: "01 May – 29 May 2026",
  transactions: amounts.map((amount, i) => ({
    date: `2026-05-0${i + 1}`,
    description: `Merchant ${i}`,
    amount,
    category: "Shopping",
    type: "debit",
  })),
  insights: [],
});

describe("trendSeries", () => {
  it("orders statements oldest first, so the line reads left to right", () => {
    const out = trendSeries([
      analysis("b", "2026-06-02T00:00:00Z", "ICICI", [200]),
      analysis("a", "2026-05-02T00:00:00Z", "ICICI", [100]),
    ]);
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
    expect(out.map((p) => p.total)).toEqual([100, 200]);
  });

  it("excludes self transfers from each point, matching the headline figure", () => {
    const a = analysis("a", "2026-05-02T00:00:00Z", "ICICI", [100]);
    a.transactions.push({
      date: "2026-05-09",
      description: "Moved to savings",
      amount: 5000,
      category: "Self Transfer",
      type: "debit",
    });
    expect(trendSeries([a])[0].total).toBe(100);
  });
});

describe("SpendTrend", () => {
  it("renders nothing with a single statement — no fabricated trend", () => {
    const { container } = render(
      <SpendTrend history={[analysis("a", "2026-05-02T00:00:00Z", "ICICI", [100])]} bank="ICICI" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a line once two statements for the bank exist", () => {
    const { container } = render(
      <SpendTrend
        history={[
          analysis("a", "2026-05-02T00:00:00Z", "ICICI", [100]),
          analysis("b", "2026-06-02T00:00:00Z", "ICICI", [200]),
        ]}
        bank="ICICI"
      />,
    );
    expect(container.querySelector(".recharts-line")).not.toBeNull();
  });

  it("ignores statements from a different bank", () => {
    const { container } = render(
      <SpendTrend
        history={[
          analysis("a", "2026-05-02T00:00:00Z", "ICICI", [100]),
          analysis("b", "2026-06-02T00:00:00Z", "HDFC", [200]),
        ]}
        bank="ICICI"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("CategoryLegend", () => {
  it("lists categories largest first with their share", () => {
    render(
      <CategoryLegend totals={{ Transport: 800, "Food & Dining": 1200 }} total={2000} />,
    );
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows[0]).toContain("Food & Dining");
    expect(rows[0]).toContain("60.0%");
    expect(rows[1]).toContain("Transport");
  });

  it("collapses the tail into a single Other row past the cap", () => {
    render(
      <CategoryLegend
        totals={{ A: 100, B: 90, C: 80, D: 70, E: 60 }}
        total={400}
        max={3}
      />,
    );
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- spendTrend`
Expected: FAIL — `Failed to resolve import "@/components/charts/SpendTrend"`.

- [ ] **Step 3: Create `frontend/src/components/charts/SpendTrend.tsx`**

```tsx
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StoredAnalysis } from "@/lib/types";
import { excludeSelfTransfers, normaliseTransactions, totalSpent } from "@/lib/derive";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { CHART_AXIS, axisTickStyle } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export type TrendPoint = { label: string; total: number; id: string };

/**
 * There is no backend trend endpoint (spec §4 gap 1), so the series is built
 * from the analyses the history call already returned.
 */
export function trendSeries(history: StoredAnalysis[]): TrendPoint[] {
  return [...history]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((a) => ({
      id: a.id,
      label: a.period || new Date(a.created_at).toLocaleDateString("en-IN", { month: "short" }),
      total: totalSpent(excludeSelfTransfers(normaliseTransactions(a.transactions))),
    }));
}

export function SpendTrend({
  history,
  bank,
  onSelect,
}: {
  history: StoredAnalysis[];
  bank?: string;
  onSelect?: (id: string) => void;
}) {
  const points = trendSeries(bank ? history.filter((h) => h.bank === bank) : history);

  // One point is not a trend. Render nothing rather than a flat invented line.
  if (points.length < 2) return null;

  return (
    <div data-chart-surface className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 6, right: 4, bottom: 0, left: -20 }}
          onClick={(s) => {
            const p = s?.activePayload?.[0]?.payload as TrendPoint | undefined;
            if (p) onSelect?.(p.id);
          }}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ramp-2)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--ramp-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" {...CHART_AXIS} tick={axisTickStyle} minTickGap={24} />
          <YAxis
            {...CHART_AXIS}
            tick={axisTickStyle}
            width={52}
            domain={[0, "dataMax"]}
            allowDataOverflow={false}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            wrapperStyle={{ outline: "none" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as TrendPoint | undefined;
              if (!active || !p) return null;
              return <ChartTooltip title={p.label} rows={[{ label: "Spent", value: formatCurrency(p.total) }]} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--ramp-2)"
            strokeWidth={2}
            fill="url(#trend-fill)"
            dot={{ r: 2.5, fill: "var(--ramp-2)", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "var(--ramp-1)", strokeWidth: 0 }}
            isAnimationActive
            animationDuration={420}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

The gradient here is a data fill under a line, which spec §2 permits; it is not a decorative background wash.

- [ ] **Step 4: Create `frontend/src/components/charts/CategoryLegend.tsx`**

```tsx
import { useState } from "react";
import { categoryColor } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Replaces Recharts' default legend, which cannot show share or totals. */
export function CategoryLegend({
  totals,
  total,
  onSelect,
  selected,
  max = 6,
}: {
  totals: Record<string, number>;
  total: number;
  onSelect?: (cat: string) => void;
  selected?: string | null;
  max?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const shown = expanded ? sorted : sorted.slice(0, max);
  const hidden = sorted.length - shown.length;

  return (
    <div>
      <ul className="flex flex-col gap-px">
        {shown.map(([cat, value]) => {
          const share = total > 0 ? (value / total) * 100 : 0;
          const dim = selected != null && selected !== cat;
          const Row = onSelect ? "button" : "div";
          return (
            <li key={cat}>
              <Row
                {...(onSelect ? { type: "button" as const, onClick: () => onSelect(cat) } : {})}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-[13px]",
                  onSelect && "transition-colors duration-[140ms] hover:bg-surface-2",
                  dim && "opacity-45",
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: categoryColor(cat) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-text-2">{cat}</span>
                <span className="shrink-0 font-medium text-text">{formatCurrency(value)}</span>
                <span className="w-12 shrink-0 text-right text-text-muted">{share.toFixed(1)}%</span>
              </Row>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 px-2 text-[12px] text-text-muted transition-colors duration-[140ms] hover:text-text"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- spendTrend`
Expected: PASS, all three groups.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/charts frontend/src/tests/spendTrend.test.tsx
git commit -m "feat(frontend): add cross-statement spend trend and category legend"
```

---

## Phase 7 — Dashboard

### Task 14: PeriodSelector and the Overview view

**Files:**
- Create: `frontend/src/components/data/PeriodSelector.tsx`, `frontend/src/views/Overview.tsx`
- Test: `frontend/src/tests/overview.test.tsx`

**Interfaces:**
- Consumes: everything from `@/lib/derive`, `@/lib/format`, `@/components/data/*`, `@/components/charts/*`; `useAnalysis` from `@/context/AnalysisContext`
- Produces:
  - `type Period = "7D" | "30D" | "90D" | "ALL" | { from: string; to: string }`
  - `periodRange(period, txns): { from: Date; to: Date } | null` (exported from `PeriodSelector.tsx`)
  - `applyPeriod(txns, period): Transaction[]`
  - `<PeriodSelector value onChange available />`
  - `<Overview />`

Spec §4 gap 2: a statement covers one month, so `90D` is meaningless on a single statement. The selector only offers ranges the loaded data can actually satisfy — options wider than the statement are omitted, not disabled-with-tooltip.

Spec §9 hierarchy: one hero figure at 40px, a lightweight metric row beneath it, then the donut and the daily chart side by side at ≥1024px. Nothing else competes.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/overview.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeriodSelector, applyPeriod, periodRange } from "@/components/data/PeriodSelector";
import type { Transaction } from "@/lib/types";

const txn = (date: string, amount = 100): Transaction => ({
  date,
  description: "Merchant",
  amount,
  category: "Shopping",
  type: "debit",
});

describe("periodRange", () => {
  it("anchors to the newest transaction, not to today", () => {
    const range = periodRange("7D", [txn("2026-05-01"), txn("2026-05-20")]);
    expect(range!.to.toISOString().slice(0, 10)).toBe("2026-05-20");
    expect(range!.from.toISOString().slice(0, 10)).toBe("2026-05-13");
  });

  it("returns null for ALL", () => {
    expect(periodRange("ALL", [txn("2026-05-01")])).toBeNull();
  });

  it("returns null when there are no dated transactions", () => {
    expect(periodRange("7D", [])).toBeNull();
  });
});

describe("applyPeriod", () => {
  it("keeps everything for ALL", () => {
    const t = [txn("2026-05-01"), txn("2026-05-28")];
    expect(applyPeriod(t, "ALL")).toHaveLength(2);
  });

  it("keeps only the trailing window", () => {
    const t = [txn("2026-05-01"), txn("2026-05-26"), txn("2026-05-28")];
    expect(applyPeriod(t, "7D")).toHaveLength(2);
  });

  it("honours a custom range inclusively at both ends", () => {
    const t = [txn("2026-05-01"), txn("2026-05-10"), txn("2026-05-20")];
    const out = applyPeriod(t, { from: "2026-05-01", to: "2026-05-10" });
    expect(out).toHaveLength(2);
  });
});

describe("PeriodSelector", () => {
  it("hides ranges the loaded statement cannot cover", () => {
    render(<PeriodSelector value="ALL" onChange={vi.fn()} available={["7D", "30D", "ALL"]} />);
    expect(screen.getByRole("button", { name: "7D" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "90D" })).toBeNull();
  });

  it("marks the active range for assistive tech", () => {
    render(<PeriodSelector value="30D" onChange={vi.fn()} available={["7D", "30D", "ALL"]} />);
    expect(screen.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the chosen range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PeriodSelector value="ALL" onChange={onChange} available={["7D", "30D", "ALL"]} />);
    await user.click(screen.getByRole("button", { name: "7D" }));
    expect(onChange).toHaveBeenCalledWith("7D");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- overview`
Expected: FAIL — `Failed to resolve import "@/components/data/PeriodSelector"`.

- [ ] **Step 3: Create `frontend/src/components/data/PeriodSelector.tsx`**

```tsx
import type { Transaction } from "@/lib/types";
import { parseStatementDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export type PresetPeriod = "7D" | "30D" | "90D" | "ALL";
export type Period = PresetPeriod | { from: string; to: string };

const DAYS: Record<Exclude<PresetPeriod, "ALL">, number> = { "7D": 7, "30D": 30, "90D": 90 };

function newestDate(txns: Transaction[]): Date | null {
  let newest: Date | null = null;
  for (const t of txns) {
    const d = parseStatementDate(t.date);
    if (d && (!newest || d > newest)) newest = d;
  }
  return newest;
}

/**
 * Anchors to the newest transaction rather than today, because a statement is
 * uploaded weeks after it closes — anchoring to now would empty every window.
 */
export function periodRange(period: Period, txns: Transaction[]): { from: Date; to: Date } | null {
  if (period === "ALL") return null;
  if (typeof period === "object") {
    const from = parseStatementDate(period.from);
    const to = parseStatementDate(period.to);
    return from && to ? { from, to } : null;
  }
  const to = newestDate(txns);
  if (!to) return null;
  const from = new Date(to);
  from.setDate(from.getDate() - DAYS[period]);
  return { from, to };
}

export function applyPeriod(txns: Transaction[], period: Period): Transaction[] {
  const range = periodRange(period, txns);
  if (!range) return txns;
  return txns.filter((t) => {
    const d = parseStatementDate(t.date);
    return d ? d >= range.from && d <= range.to : false;
  });
}

/** Only ranges the loaded statement can actually cover (spec §4 gap 2). */
export function availablePeriods(txns: Transaction[]): PresetPeriod[] {
  const dates = txns.map((t) => parseStatementDate(t.date)).filter((d): d is Date => d != null);
  if (dates.length < 2) return ["ALL"];
  const span =
    (Math.max(...dates.map((d) => d.getTime())) - Math.min(...dates.map((d) => d.getTime()))) /
    86_400_000;
  const out: PresetPeriod[] = [];
  if (span > 7) out.push("7D");
  if (span > 30) out.push("30D");
  if (span > 90) out.push("90D");
  out.push("ALL");
  return out;
}

const LABEL: Record<PresetPeriod, string> = { "7D": "7D", "30D": "30D", "90D": "90D", ALL: "All" };

export function PeriodSelector({
  value,
  onChange,
  available,
}: {
  value: Period;
  onChange: (p: Period) => void;
  available: PresetPeriod[];
}) {
  if (available.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Period"
      className="inline-flex items-center gap-0.5 rounded-[8px] border border-border bg-surface-2 p-0.5"
    >
      {available.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p)}
            className={cn(
              "rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors duration-[140ms]",
              active ? "bg-surface text-text" : "text-text-muted hover:text-text-2",
            )}
          >
            {LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}
```

The active pill uses `bg-surface`, not the accent — the accent's four roles do not include segmented controls.

- [ ] **Step 4: Create `frontend/src/views/Overview.tsx`**

```tsx
import { useMemo, useState } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  categoryTotals,
  dailyBreakdown,
  dailySeries,
  excludeSelfTransfers,
  findComparisonBaseline,
  normaliseTransactions,
  selfTransferTotal,
  sparklinePoints,
  spendDelta,
  topVendors,
  totalSpent,
} from "@/lib/derive";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Metric } from "@/components/data/Metric";
import { MetricGroup } from "@/components/data/MetricGroup";
import { CountUp } from "@/components/data/CountUp";
import { PageHeader } from "@/components/data/PageHeader";
import { PeriodSelector, applyPeriod, availablePeriods, type Period } from "@/components/data/PeriodSelector";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { CategoryLegend } from "@/components/charts/CategoryLegend";
import { DailySpend } from "@/components/charts/DailySpend";
import { SpendTrend } from "@/components/charts/SpendTrend";
import { dashboardHref } from "@/lib/router";

export function Overview() {
  const { analysis, history, isSignedIn } = useAnalysis();
  const [period, setPeriod] = useState<Period>("ALL");

  const all = useMemo(() => normaliseTransactions(analysis?.transactions ?? []), [analysis]);
  const scoped = useMemo(() => applyPeriod(all, period), [all, period]);
  const spendable = useMemo(() => excludeSelfTransfers(scoped), [scoped]);

  const total = useMemo(() => totalSpent(spendable), [spendable]);
  const totals = useMemo(() => categoryTotals(spendable), [spendable]);
  const series = useMemo(() => dailySeries(spendable), [spendable]);
  const breakdown = useMemo(() => dailyBreakdown(spendable), [spendable]);
  const vendors = useMemo(() => topVendors(spendable, 5), [spendable]);
  const transfers = useMemo(() => selfTransferTotal(scoped), [scoped]);

  const baseline = useMemo(
    () => (analysis ? findComparisonBaseline(analysis, history, isSignedIn) : null),
    [analysis, history, isSignedIn],
  );
  const delta = useMemo(() => spendDelta(total, baseline), [total, baseline]);

  const busiest = series.length ? series.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;
  const periods = useMemo(() => availablePeriods(all), [all]);

  // The single trigger for every count-up on this view.
  const animateKey = `${analysis?.id ?? "local"}:${JSON.stringify(period)}`;

  if (!analysis) return null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description={[analysis.bank, analysis.period].filter(Boolean).join(" · ")}
        actions={<PeriodSelector value={period} onChange={setPeriod} available={periods} />}
      />

      {/* Hero: one figure, unmistakably the largest thing on the page. */}
      <section className="flex flex-col gap-5">
        <Metric
          label="Total spent"
          size="hero"
          value={<CountUp value={total} formatter={formatCurrency} animateKey={animateKey} />}
          delta={
            delta
              ? { percent: delta.percent, absolute: delta.absolute, label: "vs previous statement" }
              : undefined
          }
        />
        {history.length > 1 && (
          <SpendTrend history={history} bank={analysis.bank} />
        )}
      </section>

      <MetricGroup>
        <Metric label="Transactions" value={formatNumber(spendable.length)} size="sm" />
        <Metric
          label="Largest day"
          value={busiest ? formatCurrency(busiest.amount) : "—"}
          note={busiest ? `Day ${busiest.day}` : undefined}
          size="sm"
          sparkline={sparklinePoints(series)}
        />
        <Metric
          label="Top merchant"
          value={vendors[0] ? formatCurrency(vendors[0].total) : "—"}
          note={vendors[0]?.name}
          size="sm"
        />
      </MetricGroup>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ChartFrame
          title="Where it went"
          subtitle={transfers > 0 ? `Excludes ${formatCurrency(transfers)} in self transfers` : undefined}
          height={260}
          legend={
            <CategoryLegend
              totals={totals}
              total={total}
              onSelect={(cat) => {
                window.location.hash = `${dashboardHref("transactions")}?category=${encodeURIComponent(cat)}`;
              }}
            />
          }
          empty={
            Object.keys(totals).length === 0
              ? { title: "No spend in this period", body: "Try a wider range." }
              : undefined
          }
        >
          <CategoryDonut
            totals={totals}
            total={total}
            onSelect={(cat) => {
              window.location.hash = `${dashboardHref("transactions")}?category=${encodeURIComponent(cat)}`;
            }}
          />
        </ChartFrame>

        <ChartFrame
          title="Daily spend"
          subtitle="Every day in the period, including days with no spend"
          height={260}
          empty={series.length === 0 ? { title: "No dated transactions" } : undefined}
        >
          <DailySpend
            series={series}
            breakdown={breakdown}
            onSelectDay={(day) => {
              window.location.hash = `${dashboardHref("transactions")}?day=${day}`;
            }}
          />
        </ChartFrame>
      </div>
    </div>
  );
}
```

The two `"—"` fallbacks are for a genuinely empty period and are the only dashes on the view; every other absent value omits its element entirely.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- overview`
Expected: PASS, all three groups.

- [ ] **Step 6: Wire the route**

In `App.jsx`, render `<Overview />` for `route.tab === "overview"` inside `<AppShell>`. The existing `<ExpenseManager>` stays mounted for tabs not yet migrated, so nothing regresses mid-migration.

- [ ] **Step 7: Verify both themes**

Run `npm run dev`, load a statement, toggle the theme. Confirm the hero figure is the accent in both, the donut arcs read as a gold→graphite ramp, and no chart element uses the accent.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/Overview.tsx frontend/src/components/data/PeriodSelector.tsx frontend/src/tests/overview.test.tsx frontend/src/App.jsx
git commit -m "feat(frontend): add overview dashboard with hero figure and period selector"
```

---

## Phase 8 — Transactions

### Task 15: TransactionTable and the ledger toolbar

**Files:**
- Create: `frontend/src/views/Transactions.tsx`, `frontend/src/components/data/TransactionTable.tsx`, `frontend/src/components/data/LedgerToolbar.tsx`, `frontend/src/components/data/CategorySelect.tsx`
- Test: `frontend/src/tests/transactions.test.tsx`

**Interfaces:**
- Consumes: `filterAndSort`, `normaliseTransactions` from `@/lib/derive`; `formatCurrency`, `formatDate`, `normaliseMerchant` from `@/lib/format`; `CATEGORY_ORDER`, `categoryColor` from `@/lib/categories`; `Table` primitives from `@/components/ui/table`
- Produces:
  - `<TransactionTable rows onRowClick? sort onSortChange onCategoryChange />`
  - `<LedgerToolbar query onQuery category onCategory sort onSort count total />`
  - `<CategorySelect value onChange size? />`
  - `<Transactions />`

This replaces `ExpenseManager`'s transaction table. Both edit paths must survive verbatim: `handleUpdateTransaction(index, field, value)` for a single row, and `handleBatchUpdateCategory(desc, newCat)` fired from `Toast`'s apply-all.

Row density is 44px (spec §13). The header is sticky. Amounts are right-aligned, tabular, and monospaced.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/transactions.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionTable } from "@/components/data/TransactionTable";
import { LedgerToolbar } from "@/components/data/LedgerToolbar";
import type { Transaction } from "@/lib/types";

const ROWS: (Transaction & { index: number })[] = [
  { index: 0, date: "2026-05-03", description: "Swiggy (Bangalore)", amount: 480, category: "Food & Dining", type: "debit" },
  { index: 1, date: "2026-05-11", description: "Uber", amount: 220, category: "Transport", type: "debit" },
];

describe("TransactionTable", () => {
  it("renders one row per transaction", () => {
    render(<TransactionTable rows={ROWS} sort="date-desc" onSortChange={vi.fn()} onCategoryChange={vi.fn()} />);
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
  });

  it("shows the cleaned merchant name, not the raw description", () => {
    render(<TransactionTable rows={ROWS} sort="date-desc" onSortChange={vi.fn()} onCategoryChange={vi.fn()} />);
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
  });

  it("right-aligns amounts in tabular figures", () => {
    const { container } = render(
      <TransactionTable rows={ROWS} sort="date-desc" onSortChange={vi.fn()} onCategoryChange={vi.fn()} />,
    );
    const cell = container.querySelector("[data-amount-cell]")!;
    expect(cell.className).toContain("text-right");
    expect(cell.className).toContain("font-mono");
  });

  it("reports a category edit with the original index, not the display position", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(
      <TransactionTable
        rows={[ROWS[1], ROWS[0]]}
        sort="amount-desc"
        onSortChange={vi.fn()}
        onCategoryChange={onCategoryChange}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "Shopping");
    expect(onCategoryChange).toHaveBeenCalledWith(1, "Shopping", "Uber");
  });

  it("opens the drawer when a row is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <TransactionTable rows={ROWS} sort="date-desc" onSortChange={vi.fn()} onCategoryChange={vi.fn()} onRowClick={onRowClick} />,
    );
    await user.click(screen.getByText("Swiggy"));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("opens the drawer from the keyboard", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <TransactionTable rows={ROWS} sort="date-desc" onSortChange={vi.fn()} onCategoryChange={vi.fn()} onRowClick={onRowClick} />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    rows[0].focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalled();
  });
});

describe("LedgerToolbar", () => {
  it("states how many rows are showing out of how many", () => {
    render(
      <LedgerToolbar
        query=""
        onQuery={vi.fn()}
        category="All"
        onCategory={vi.fn()}
        sort="date-desc"
        onSort={vi.fn()}
        count={12}
        total={40}
      />,
    );
    expect(screen.getByText("12 of 40")).toBeInTheDocument();
  });

  it("reports typed search text", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(
      <LedgerToolbar
        query=""
        onQuery={onQuery}
        category="All"
        onCategory={vi.fn()}
        sort="date-desc"
        onSort={vi.fn()}
        count={0}
        total={0}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "uber");
    expect(onQuery).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- transactions`
Expected: FAIL — `Failed to resolve import "@/components/data/TransactionTable"`.

- [ ] **Step 3: Create `frontend/src/components/data/CategorySelect.tsx`**

```tsx
import { CATEGORY_ORDER, categoryColor } from "@/lib/categories";
import { cn } from "@/lib/cn";

/**
 * A native select. Keeps keyboard and mobile behaviour correct for free, and
 * matches the control the current ExpenseManager already ships.
 */
export function CategorySelect({
  value,
  onChange,
  className,
  ariaLabel = "Category",
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "max-w-[168px] truncate rounded-[8px] border border-transparent bg-transparent py-1 pl-1.5 pr-1 text-[12px]",
        "transition-colors duration-[140ms] hover:border-border hover:bg-surface-2",
        "focus-visible:border-border-strong",
        className,
      )}
      style={{ color: categoryColor(value) }}
    >
      {CATEGORY_ORDER.map((c) => (
        <option key={c} value={c} style={{ color: "var(--text)", background: "var(--surface)" }}>
          {c}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/data/TransactionTable.tsx`**

```tsx
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatCurrency, formatDate, normaliseMerchant } from "@/lib/format";
import { Monogram } from "./Monogram";
import { CategorySelect } from "./CategorySelect";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/cn";

export type LedgerRow = Transaction & { index: number };
export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function TransactionTable({
  rows,
  sort,
  onSortChange,
  onCategoryChange,
  onRowClick,
}: {
  rows: LedgerRow[];
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  /** index is the position in the ORIGINAL array — the edit handlers need it. */
  onCategoryChange: (index: number, next: string, description: string) => void;
  onRowClick?: (row: LedgerRow) => void;
}) {
  const toggle = (field: "date" | "amount") => {
    const desc = `${field}-desc` as SortKey;
    const asc = `${field}-asc` as SortKey;
    onSortChange(sort === desc ? asc : desc);
  };

  const Arrow = ({ field }: { field: "date" | "amount" }) => {
    if (!sort.startsWith(field)) return null;
    const Icon = sort.endsWith("desc") ? ArrowDown : ArrowUp;
    return <Icon className="size-3" aria-hidden />;
  };

  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-[112px]">
            <button
              type="button"
              onClick={() => toggle("date")}
              className="inline-flex items-center gap-1 transition-colors duration-[140ms] hover:text-text"
            >
              Date <Arrow field="date" />
            </button>
          </TH>
          <TH>Merchant</TH>
          <TH className="w-[184px]">Category</TH>
          <TH className="w-[128px] text-right">
            <button
              type="button"
              onClick={() => toggle("amount")}
              className="inline-flex items-center gap-1 transition-colors duration-[140ms] hover:text-text"
            >
              Amount <Arrow field="amount" />
            </button>
          </TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR
            key={`${row.index}-${row.date}`}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            className={cn(
              "h-11 transition-colors duration-[140ms]",
              onRowClick && "cursor-pointer hover:bg-surface-2",
            )}
          >
            <TD className="text-[12px] text-text-muted">{formatDate(row.date)}</TD>
            <TD>
              <span className="flex min-w-0 items-center gap-2.5">
                <Monogram desc={row.description} cat={row.category} size={26} />
                <span className="min-w-0 truncate text-[13px] text-text">
                  {normaliseMerchant(row.description)}
                </span>
              </span>
            </TD>
            <TD>
              <CategorySelect
                value={row.category}
                onChange={(next) => onCategoryChange(row.index, next, row.description)}
              />
            </TD>
            <TD data-amount-cell className="text-right font-mono text-[13px] font-medium text-text">
              {formatCurrency(row.amount)}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
```

Passing `row.index` — not the map position — is what keeps `handleUpdateTransaction` correct after sorting. Getting this wrong silently recategorises the wrong transaction.

- [ ] **Step 5: Create `frontend/src/components/data/LedgerToolbar.tsx`**

```tsx
import { Search } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import type { SortKey } from "./TransactionTable";

export function LedgerToolbar({
  query,
  onQuery,
  category,
  onCategory,
  sort,
  onSort,
  count,
  total,
}: {
  query: string;
  onQuery: (q: string) => void;
  category: string;
  onCategory: (c: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  count: number;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input
          type="search"
          value={query}
          placeholder="Search merchants"
          aria-label="Search transactions"
          onChange={(e) => onQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <select
        aria-label="Filter by category"
        value={category}
        onChange={(e) => onCategory(e.target.value)}
        className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[12px] text-text-2 transition-colors duration-[140ms] hover:border-border-strong"
      >
        <option value="All">All categories</option>
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort transactions"
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[12px] text-text-2 transition-colors duration-[140ms] hover:border-border-strong"
      >
        <option value="date-desc">Newest first</option>
        <option value="date-asc">Oldest first</option>
        <option value="amount-desc">Largest first</option>
        <option value="amount-asc">Smallest first</option>
      </select>

      <span className="ml-auto shrink-0 text-[12px] tabular-nums text-text-muted">
        {count} of {total}
      </span>
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/views/Transactions.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { filterAndSort, normaliseTransactions } from "@/lib/derive";
import { parseStatementDate } from "@/lib/format";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyState } from "@/components/data/EmptyState";
import { LedgerToolbar } from "@/components/data/LedgerToolbar";
import { TransactionTable, type LedgerRow, type SortKey } from "@/components/data/TransactionTable";
import { TransactionDrawer } from "@/components/data/TransactionDrawer";
import { routeQuery } from "@/lib/router";

export function Transactions() {
  const { analysis, updateTransaction } = useAnalysis();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [day, setDay] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [open, setOpen] = useState<LedgerRow | null>(null);

  // Deep links from the donut and the daily chart arrive as hash query params.
  useEffect(() => {
    const q = routeQuery(window.location.hash);
    if (q.category) setCategory(decodeURIComponent(q.category));
    if (q.day) setDay(Number(q.day));
  }, []);

  const all = useMemo(() => normaliseTransactions(analysis?.transactions ?? []), [analysis]);

  const rows: LedgerRow[] = useMemo(() => {
    const indexed = all.map((t, index) => ({ ...t, index }));
    const byDay =
      day == null
        ? indexed
        : indexed.filter((t) => parseStatementDate(t.date)?.getDate() === day);
    return filterAndSort(byDay, { query, category, sort }) as LedgerRow[];
  }, [all, query, category, sort, day]);

  if (!analysis) return null;

  const filtered = query !== "" || category !== "All" || day != null;

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={day != null ? `Day ${day}` : undefined}
      />

      <LedgerToolbar
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
        sort={sort}
        onSort={setSort}
        count={rows.length}
        total={all.length}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No transactions match" : "No transactions"}
          body={filtered ? "Try a different category or clear the search." : undefined}
          actionLabel={filtered ? "Clear filters" : undefined}
          onAction={
            filtered
              ? () => {
                  setQuery("");
                  setCategory("All");
                  setDay(null);
                }
              : undefined
          }
        />
      ) : (
        <TransactionTable
          rows={rows}
          sort={sort}
          onSortChange={setSort}
          onCategoryChange={(index, next, description) =>
            updateTransaction(index, "category", next, description)
          }
          onRowClick={setOpen}
        />
      )}

      <TransactionDrawer row={open} onClose={() => setOpen(null)} />
    </div>
  );
}
```

`routeQuery(hash)` parses the part after `?` into a plain object; add it to `lib/router.ts` alongside `parseRoute` with the signature `routeQuery(hash: string): Record<string, string>`.

`updateTransaction(index, field, value, description)` is the context wrapper around the existing `handleUpdateTransaction`; the fourth argument is what `Toast` needs to offer apply-all.

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd frontend && npm run test -- transactions`
Expected: PASS, both groups.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/Transactions.tsx frontend/src/components/data frontend/src/lib/router.ts frontend/src/tests/transactions.test.tsx
git commit -m "feat(frontend): add transactions ledger with search, filter and sort"
```

---

### Task 16: TransactionDrawer

**Files:**
- Create: `frontend/src/components/data/TransactionDrawer.tsx`, `frontend/src/components/data/DetailRow.tsx`
- Modify: `frontend/src/components/Toast.jsx` → `Toast.tsx` (tokens and types only; behaviour unchanged)
- Test: `frontend/src/tests/drawer.test.tsx`

**Interfaces:**
- Consumes: `LedgerRow` from `./TransactionTable`; `merchantContext` from `@/lib/derive`; `formatCurrency`, `formatLongDate`, `normaliseMerchant` from `@/lib/format`; `Sheet` primitives from `@/components/ui/sheet`; `drawerRight` variants from `@/lib/motion`
- Produces:
  - `<TransactionDrawer row onClose />`
  - `<DetailRow label value mono? />`

Spec §4 gap 3 is binding here. The brief's mock shows a time (`8:42 PM`), a masked card (`•••• 4821`), a reference number and a status. **The pipeline extracts none of these.** Every one of those rows is omitted — not shown blank, not shown with a placeholder. What the drawer does show, all of it real: date, amount, category (editable), the raw description as extracted, and merchant context computed from the loaded statement (times seen, total with this merchant, first and last seen, share of total spend).

The drawer is a right-side sheet at ≥768px and a bottom sheet below it.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/drawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionDrawer } from "@/components/data/TransactionDrawer";
import type { LedgerRow } from "@/components/data/TransactionTable";

const ROW: LedgerRow = {
  index: 0,
  date: "2026-05-03",
  description: "Swiggy (Bangalore)",
  amount: 480,
  category: "Food & Dining",
  type: "debit",
};

describe("TransactionDrawer", () => {
  it("renders nothing when no row is selected", () => {
    const { container } = render(<TransactionDrawer row={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the real extracted fields", () => {
    render(<TransactionDrawer row={ROW} onClose={vi.fn()} />);
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("₹480")).toBeInTheDocument();
    expect(screen.getByText("3 May 2026")).toBeInTheDocument();
  });

  it("omits fields the pipeline never extracts — no blanks, no placeholders", () => {
    render(<TransactionDrawer row={ROW} onClose={vi.fn()} />);
    expect(screen.queryByText(/card/i)).toBeNull();
    expect(screen.queryByText(/reference/i)).toBeNull();
    expect(screen.queryByText("••••")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("shows the raw description separately from the cleaned name", () => {
    render(<TransactionDrawer row={ROW} onClose={vi.fn()} />);
    expect(screen.getByText("Swiggy (Bangalore)")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TransactionDrawer row={ROW} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("is a labelled dialog", () => {
    render(<TransactionDrawer row={ROW} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- drawer`
Expected: FAIL — `Failed to resolve import "@/components/data/TransactionDrawer"`.

- [ ] **Step 3: Create `frontend/src/components/data/DetailRow.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <span className="shrink-0 text-[12px] text-text-muted">{label}</span>
      <span className={cn("min-w-0 text-right text-[13px] text-text", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/data/TransactionDrawer.tsx`**

```tsx
import { useAnalysis } from "@/context/AnalysisContext";
import { merchantContext, normaliseTransactions } from "@/lib/derive";
import { formatCurrency, formatLongDate, normaliseMerchant } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategorySelect } from "./CategorySelect";
import { DetailRow } from "./DetailRow";
import { Monogram } from "./Monogram";
import type { LedgerRow } from "./TransactionTable";

export function TransactionDrawer({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const { analysis, updateTransaction } = useAnalysis();
  if (!row) return null;

  const all = normaliseTransactions(analysis?.transactions ?? []);
  const ctx = merchantContext(row.description, all);
  const clean = normaliseMerchant(row.description);

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="sr-only">{clean}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-5 pt-2">
          <Monogram desc={row.description} cat={row.category} size={40} />
          <p className="mt-3 text-[15px] font-semibold text-text">{clean}</p>
          <p className="font-mono text-[28px] font-semibold leading-tight tracking-[-0.02em] text-text">
            {formatCurrency(row.amount)}
          </p>
        </div>

        <div className="mt-5 divide-y divide-border px-5">
          <DetailRow label="Date" value={formatLongDate(row.date)} />
          <DetailRow
            label="Category"
            value={
              <CategorySelect
                value={row.category}
                onChange={(next) => updateTransaction(row.index, "category", next, row.description)}
                className="max-w-none"
              />
            }
          />
          <DetailRow label="Type" value={row.type === "credit" ? "Credit" : "Debit"} />
          {/* Raw text as the extractor saw it — useful when the clean name is wrong. */}
          <DetailRow label="As extracted" value={row.description} mono />
        </div>

        {ctx.count > 1 && (
          <div className="mt-6 px-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              This merchant
            </p>
            <div className="divide-y divide-border">
              <DetailRow label="Transactions" value={`${ctx.count} in this statement`} />
              <DetailRow label="Total" value={formatCurrency(ctx.total)} />
              <DetailRow label="Average" value={formatCurrency(ctx.average)} />
              <DetailRow label="First seen" value={formatLongDate(ctx.first)} />
              <DetailRow label="Last seen" value={formatLongDate(ctx.last)} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

Radix's `Sheet` gives focus trap, Escape, scroll lock and the labelled `role="dialog"` for free. Below `sm` the content spans the full width; the `side="bottom"` variant is applied by a media query in Task 22's responsive pass.

- [ ] **Step 5: Convert `Toast.jsx` to `Toast.tsx`**

Rename the file and add types. Keep every behaviour: the 8s auto-dismiss, the apply-one and apply-all buttons, and the `Check`/`X`/`Layers` icons. Only the styling changes — swap the hardcoded colours for `bg-elevated`, `border-border-strong`, `shadow-[var(--shadow-overlay)]`, and give it the `sheetUp` variant from `lib/motion.ts`. Confirm with `grep -rn "Toast" frontend/src` that every import still resolves.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npm run test -- drawer`
Expected: PASS, all six cases.

- [ ] **Step 7: Verify apply-all end to end**

`npm run dev`, open a statement, change a category on a merchant that appears more than once, confirm the toast offers "Apply to all N", click it, confirm every matching row updates. This is the behaviour `handleBatchUpdateCategory` provides and it must not regress.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/data frontend/src/tests/drawer.test.tsx
git rm frontend/src/components/Toast.jsx
git add frontend/src/components/Toast.tsx
git commit -m "feat(frontend): add transaction detail drawer with merchant context"
```

---

## Phase 9 — Vendors, Insights, Rewards

### Task 17: Vendors view

**Files:**
- Create: `frontend/src/views/Vendors.tsx`, `frontend/src/components/data/VendorRow.tsx`, `frontend/src/components/data/ShareBar.tsx`
- Test: `frontend/src/tests/vendors.test.tsx`

**Interfaces:**
- Consumes: `vendorStats`, `topVendors`, `recurringPayees`, `normaliseTransactions`, `excludeSelfTransfers`, `totalSpent` from `@/lib/derive`
- Produces:
  - `<ShareBar value max color? />`
  - `<VendorRow vendor max total onClick? />`
  - `<Vendors />`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/vendors.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareBar } from "@/components/data/ShareBar";
import { VendorRow } from "@/components/data/VendorRow";

const VENDOR = {
  name: "Swiggy",
  total: 2400,
  count: 6,
  category: "Food & Dining",
  average: 400,
  first: "2026-05-02",
  last: "2026-05-27",
};

describe("ShareBar", () => {
  it("scales width against the largest value, not the total", () => {
    const { container } = render(<ShareBar value={50} max={200} />);
    expect((container.firstChild as HTMLElement).querySelector("span")).toHaveStyle({ width: "25%" });
  });

  it("clamps to full width when value equals max", () => {
    const { container } = render(<ShareBar value={200} max={200} />);
    expect((container.firstChild as HTMLElement).querySelector("span")).toHaveStyle({ width: "100%" });
  });

  it("survives a zero max without producing NaN", () => {
    const { container } = render(<ShareBar value={0} max={0} />);
    expect((container.firstChild as HTMLElement).querySelector("span")).toHaveStyle({ width: "0%" });
  });
});

describe("VendorRow", () => {
  it("shows the merchant, its total and its visit count", () => {
    render(<VendorRow vendor={VENDOR} max={2400} total={10000} />);
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("₹2,400")).toBeInTheDocument();
    expect(screen.getByText("6 transactions")).toBeInTheDocument();
  });

  it("singularises a one-off merchant", () => {
    render(<VendorRow vendor={{ ...VENDOR, count: 1 }} max={2400} total={10000} />);
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
  });

  it("drills into the filtered ledger when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<VendorRow vendor={VENDOR} max={2400} total={10000} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("Swiggy");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- vendors`
Expected: FAIL — `Failed to resolve import "@/components/data/ShareBar"`.

- [ ] **Step 3: Create `frontend/src/components/data/ShareBar.tsx`**

```tsx
export function ShareBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <span
        className="block h-full rounded-full transition-[width] duration-[420ms] ease-out"
        style={{ width: `${pct}%`, background: color ?? "var(--ramp-6)" }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/data/VendorRow.tsx`**

```tsx
import type { VendorStat } from "@/lib/derive";
import { categoryColor } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { Monogram } from "./Monogram";
import { ShareBar } from "./ShareBar";

export function VendorRow({
  vendor,
  max,
  total,
  onClick,
}: {
  vendor: VendorStat;
  max: number;
  total: number;
  onClick?: (name: string) => void;
}) {
  const share = total > 0 ? (vendor.total / total) * 100 : 0;
  const Row = onClick ? "button" : "div";

  return (
    <Row
      {...(onClick ? { type: "button" as const, onClick: () => onClick(vendor.name) } : {})}
      className="flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors duration-[140ms] hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <Monogram desc={vendor.name} cat={vendor.category} size={30} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium text-text">{vendor.name}</span>
          <span className="text-[12px] text-text-muted">
            {vendor.count} {vendor.count === 1 ? "transaction" : "transactions"} · avg{" "}
            {formatCurrency(vendor.average)}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-[13px] font-medium text-text">
            {formatCurrency(vendor.total)}
          </span>
          <span className="text-[12px] tabular-nums text-text-muted">{share.toFixed(1)}%</span>
        </div>
      </div>
      <ShareBar value={vendor.total} max={max} color={categoryColor(vendor.category)} />
    </Row>
  );
}
```

- [ ] **Step 5: Create `frontend/src/views/Vendors.tsx`**

```tsx
import { useMemo } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  excludeSelfTransfers,
  normaliseTransactions,
  recurringPayees,
  topVendors,
  totalSpent,
  vendorStats,
} from "@/lib/derive";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyState } from "@/components/data/EmptyState";
import { VendorRow } from "@/components/data/VendorRow";
import { Metric } from "@/components/data/Metric";
import { MetricGroup } from "@/components/data/MetricGroup";
import { dashboardHref } from "@/lib/router";

export function Vendors() {
  const { analysis } = useAnalysis();

  const txns = useMemo(
    () => excludeSelfTransfers(normaliseTransactions(analysis?.transactions ?? [])),
    [analysis],
  );
  const stats = useMemo(() => vendorStats(txns), [txns]);
  const top = useMemo(() => topVendors(txns, 20), [txns]);
  const recurring = useMemo(() => recurringPayees(txns, 8), [txns]);
  const total = useMemo(() => totalSpent(txns), [txns]);

  const drill = (name: string) => {
    window.location.hash = `${dashboardHref("transactions")}?q=${encodeURIComponent(name)}`;
  };

  if (!analysis) return null;

  const max = top[0]?.total ?? 0;
  const concentration = total > 0 ? (top.slice(0, 5).reduce((s, v) => s + v.total, 0) / total) * 100 : 0;

  return (
    <div>
      <PageHeader title="Vendors" description="Where your money goes, by merchant" />

      {top.length === 0 ? (
        <EmptyState title="No merchants yet" body="Upload a statement to see merchant breakdowns." />
      ) : (
        <div className="flex flex-col gap-8">
          <MetricGroup>
            <Metric label="Merchants" value={String(stats.length)} size="sm" />
            <Metric
              label="Top 5 concentration"
              value={`${concentration.toFixed(0)}%`}
              note="of total spend"
              size="sm"
            />
            <Metric
              label="Recurring payees"
              value={String(recurring.length)}
              note="seen more than once"
              size="sm"
            />
          </MetricGroup>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-text">All merchants</h2>
            <div className="divide-y divide-border rounded-[12px] border border-border bg-surface">
              {top.map((v) => (
                <VendorRow key={v.name} vendor={v} max={max} total={total} onClick={drill} />
              ))}
            </div>
          </section>

          {recurring.length > 0 && (
            <section>
              <h2 className="mb-1 text-[15px] font-semibold text-text">Recurring</h2>
              <p className="mb-3 text-[12px] text-text-2">
                Merchants billed more than once in this statement
              </p>
              <div className="divide-y divide-border rounded-[12px] border border-border bg-surface">
                {recurring.map((v) => (
                  <VendorRow key={v.name} vendor={v} max={recurring[0].total} total={total} onClick={drill} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
```

`LedgerToolbar`'s search is driven by the `q` param, so add `if (q.q) setQuery(decodeURIComponent(q.q))` to the deep-link effect in `Transactions.tsx`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npm run test -- vendors`
Expected: PASS, both groups.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/Vendors.tsx frontend/src/components/data frontend/src/tests/vendors.test.tsx
git commit -m "feat(frontend): add vendors view with share bars and recurring payees"
```

---

### Task 18: Insights view

**Files:**
- Create: `frontend/src/views/Insights.tsx`, `frontend/src/components/data/InsightCard.tsx`
- Test: `frontend/src/tests/insights.test.tsx`

**Interfaces:**
- Consumes: `Insight` from `@/lib/types`; `categoryIcon`, `categoryColor` from `@/lib/categories`; `dashboardHref` from `@/lib/router`
- Produces:
  - `insightTone(insight): "neutral" | "positive" | "caution"` (exported from `InsightCard.tsx`)
  - `insightTarget(insight): string | null`
  - `<InsightCard insight index />`
  - `<Insights />`

The backend returns insights with an emoji `icon`, a raw hex `color` and a `badge`. Spec §5 forbids emoji and §3 forbids off-palette hexes. **The data is not changed** — the emoji and hex are simply not rendered. Tone is derived from the badge text, and the icon comes from the insight's category when it names one, falling back to a neutral glyph.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/insights.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InsightCard, insightTone, insightTarget } from "@/components/data/InsightCard";
import type { Insight } from "@/lib/types";

const insight = (over: Partial<Insight> = {}): Insight => ({
  title: "Food is your largest category",
  description: "You spent ₹4,200 on Food & Dining across 14 transactions.",
  icon: "🍔",
  color: "#ff5722",
  badge: "Top category",
  ...over,
});

describe("insightTone", () => {
  it("reads a warning badge as caution", () => {
    expect(insightTone(insight({ badge: "High spend" }))).toBe("caution");
  });

  it("reads a saving badge as positive", () => {
    expect(insightTone(insight({ badge: "Saved" }))).toBe("positive");
  });

  it("defaults to neutral", () => {
    expect(insightTone(insight({ badge: "Top category" }))).toBe("neutral");
  });

  it("is neutral when the badge is missing", () => {
    expect(insightTone(insight({ badge: undefined }))).toBe("neutral");
  });
});

describe("insightTarget", () => {
  it("links to the filtered ledger when the text names a known category", () => {
    expect(insightTarget(insight())).toContain("category=Food%20%26%20Dining");
  });

  it("returns null when no category is named", () => {
    expect(insightTarget(insight({ title: "You saved money", description: "Nice." }))).toBeNull();
  });
});

describe("InsightCard", () => {
  it("renders the title and body from the backend verbatim", () => {
    render(<InsightCard insight={insight()} index={0} />);
    expect(screen.getByText("Food is your largest category")).toBeInTheDocument();
    expect(
      screen.getByText("You spent ₹4,200 on Food & Dining across 14 transactions."),
    ).toBeInTheDocument();
  });

  it("never renders the emoji the backend supplies", () => {
    const { container } = render(<InsightCard insight={insight()} index={0} />);
    expect(container.textContent).not.toContain("🍔");
  });

  it("never applies the raw hex the backend supplies", () => {
    const { container } = render(<InsightCard insight={insight()} index={0} />);
    expect(container.innerHTML).not.toContain("#ff5722");
  });

  it("renders the badge as text", () => {
    render(<InsightCard insight={insight()} index={0} />);
    expect(screen.getByText("Top category")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- insights`
Expected: FAIL — `Failed to resolve import "@/components/data/InsightCard"`.

- [ ] **Step 3: Create `frontend/src/components/data/InsightCard.tsx`**

```tsx
import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/types";
import { CATEGORY_ORDER, categoryColor, categoryIcon } from "@/lib/categories";
import { dashboardHref } from "@/lib/router";
import { cn } from "@/lib/cn";

export type InsightTone = "neutral" | "positive" | "caution";

const CAUTION = /high|over|spike|increase|alert|watch|exceed/i;
const POSITIVE = /save|saved|saving|lower|down|reduc|good|great/i;

/** Derived from the badge text; the backend's hex colour is deliberately ignored. */
export function insightTone(insight: Insight): InsightTone {
  const badge = insight.badge ?? "";
  if (CAUTION.test(badge)) return "caution";
  if (POSITIVE.test(badge)) return "positive";
  return "neutral";
}

/** Deep-links into the filtered ledger when the copy names a known category. */
export function insightTarget(insight: Insight): string | null {
  const text = `${insight.title} ${insight.description}`;
  const hit = CATEGORY_ORDER.find((c) => c !== "Other" && text.includes(c));
  return hit ? `${dashboardHref("transactions")}?category=${encodeURIComponent(hit)}` : null;
}

const TONE_CLASS: Record<InsightTone, string> = {
  neutral: "text-text-2",
  positive: "text-success",
  caution: "text-danger",
};

export function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const tone = insightTone(insight);
  const target = insightTarget(insight);
  const text = `${insight.title} ${insight.description}`;
  const cat = CATEGORY_ORDER.find((c) => c !== "Other" && text.includes(c));
  const Icon = cat ? categoryIcon(cat) : Lightbulb;

  const body = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{
          color: cat ? categoryColor(cat) : "var(--text-muted)",
          background: cat
            ? `color-mix(in srgb, ${categoryColor(cat)} 12%, transparent)`
            : "var(--surface-2)",
        }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-text">{insight.title}</span>
          {insight.badge && (
            <span
              className={cn(
                "rounded-full border border-border px-1.5 py-px text-[11px] font-medium",
                TONE_CLASS[tone],
              )}
            >
              {insight.badge}
            </span>
          )}
        </span>
        <span className="text-[13px] leading-[1.55] text-text-2">{insight.description}</span>
      </span>
    </>
  );

  const shared = "flex w-full items-start gap-3 px-4 py-4 text-left";

  return target ? (
    <a
      href={target}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(shared, "transition-colors duration-[140ms] hover:bg-surface-2")}
    >
      {body}
    </a>
  ) : (
    <div style={{ animationDelay: `${index * 40}ms` }} className={shared}>
      {body}
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/views/Insights.tsx`**

```tsx
import { useAnalysis } from "@/context/AnalysisContext";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyState } from "@/components/data/EmptyState";
import { InsightCard } from "@/components/data/InsightCard";

export function Insights() {
  const { analysis } = useAnalysis();
  if (!analysis) return null;

  const insights = analysis.insights ?? [];

  return (
    <div>
      <PageHeader title="Insights" description="Patterns found in this statement" />

      {insights.length === 0 ? (
        <EmptyState
          title="No insights for this statement"
          body="Insights appear once there are enough transactions to find a pattern."
        />
      ) : (
        <div className="divide-y divide-border rounded-[12px] border border-border bg-surface">
          {insights.map((insight, i) => (
            <InsightCard key={`${insight.title}-${i}`} insight={insight} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- insights`
Expected: PASS, all three groups.

- [ ] **Step 6: Confirm no emoji reaches the DOM**

`grep -rn "insight.icon\|\.icon}" frontend/src/views frontend/src/components` should return nothing. The field stays in the data and is never rendered.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/Insights.tsx frontend/src/components/data/InsightCard.tsx frontend/src/tests/insights.test.tsx
git commit -m "feat(frontend): add insights view with tone derivation and ledger deep links"
```

---

### Task 19: Rewards view

**Files:**
- Create: `frontend/src/views/Rewards.tsx`, `frontend/src/components/data/RewardsHero.tsx`
- Delete: `frontend/src/components/RewardsPanel.jsx`
- Test: `frontend/src/tests/rewards.test.tsx`

**Interfaces:**
- Consumes: `rewardStats`, `hasRewardPoints`, `totalRewardPoints`, `normaliseTransactions` from `@/lib/derive`; `formatCurrency`, `formatNumber` from `@/lib/format`
- Produces:
  - `POINT_VALUE_INR = 1` (exported from `RewardsHero.tsx`)
  - `<RewardsHero points animateKey />`
  - `<Rewards />`

Spec §4 gap 5: the pipeline reports point counts but no conversion rate. The brief asks for "Estimated value ₹549", so the rate is surfaced as a **visibly stated assumption** — the label reads "Estimated at ₹1 per point" directly beneath the figure — rather than presenting a derived rupee amount as fact. The constant lives in one place so it can be corrected once a real rate is available.

`RewardsPanel.jsx` is replaced wholesale: its `shimmerGold` animation, `starPulse`, `✦` glyph, gradient hero and 48px gradient-clipped number are all forbidden by spec §2 and §5. The points data and the per-transaction breakdown carry over unchanged.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/rewards.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RewardsHero, POINT_VALUE_INR } from "@/components/data/RewardsHero";

describe("RewardsHero", () => {
  it("shows the point total from the statement", () => {
    render(<RewardsHero points={549} animateKey="a" />);
    expect(screen.getByText("549")).toBeInTheDocument();
  });

  it("states the assumed rate rather than presenting the value as fact", () => {
    render(<RewardsHero points={549} animateKey="a" />);
    expect(screen.getByText("₹549")).toBeInTheDocument();
    expect(screen.getByText(/Estimated at ₹1 per point/i)).toBeInTheDocument();
  });

  it("derives the value from the single rate constant", () => {
    expect(POINT_VALUE_INR).toBe(1);
  });

  it("uses no decorative glyphs", () => {
    const { container } = render(<RewardsHero points={549} animateKey="a" />);
    expect(container.textContent).not.toContain("✦");
    expect(container.textContent).not.toContain("★");
  });

  it("renders nothing at zero points, rather than an empty hero", () => {
    const { container } = render(<RewardsHero points={0} animateKey="a" />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- rewards`
Expected: FAIL — `Failed to resolve import "@/components/data/RewardsHero"`.

- [ ] **Step 3: Create `frontend/src/components/data/RewardsHero.tsx`**

```tsx
import { formatCurrency, formatNumber } from "@/lib/format";
import { CountUp } from "./CountUp";

/**
 * The pipeline gives point counts but no conversion rate (spec §4 gap 5).
 * One rupee per point is an assumption, stated on screen and defined once here.
 */
export const POINT_VALUE_INR = 1;

export function RewardsHero({ points, animateKey }: { points: number; animateKey: string }) {
  if (points <= 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        Reward points earned
      </span>
      <span
        data-hero="true"
        className="font-mono text-[40px] font-semibold leading-[44px] tracking-[-0.02em] text-accent"
      >
        <CountUp value={points} formatter={formatNumber} animateKey={animateKey} />
      </span>
      <span className="flex flex-wrap items-baseline gap-2 text-[13px]">
        <span className="text-text-2">
          Estimated value <span className="font-medium text-text">{formatCurrency(points * POINT_VALUE_INR)}</span>
        </span>
        <span className="text-[12px] text-text-muted">Estimated at ₹1 per point</span>
      </span>
    </section>
  );
}
```

- [ ] **Step 4: Create `frontend/src/views/Rewards.tsx`**

```tsx
import { useMemo } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { normaliseTransactions, rewardStats } from "@/lib/derive";
import { formatCurrency, formatNumber, normaliseMerchant } from "@/lib/format";
import { categoryColor } from "@/lib/categories";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyState } from "@/components/data/EmptyState";
import { Metric } from "@/components/data/Metric";
import { MetricGroup } from "@/components/data/MetricGroup";
import { RewardsHero } from "@/components/data/RewardsHero";
import { ShareBar } from "@/components/data/ShareBar";
import { Monogram } from "@/components/data/Monogram";

export function Rewards() {
  const { analysis } = useAnalysis();

  const txns = useMemo(() => normaliseTransactions(analysis?.transactions ?? []), [analysis]);
  const stats = useMemo(() => rewardStats(txns, analysis?.total_reward_points), [txns, analysis]);

  if (!analysis) return null;

  if (stats.total <= 0) {
    return (
      <div>
        <PageHeader title="Rewards" />
        <EmptyState
          title="No reward points in this statement"
          body="Points appear here when the statement reports them."
        />
      </div>
    );
  }

  const max = stats.earners[0]?.points ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Rewards" description={analysis.period} />

      <RewardsHero points={stats.total} animateKey={analysis.id ?? "local"} />

      <MetricGroup>
        <Metric
          label="Earning transactions"
          value={formatNumber(stats.earningCount)}
          note={`of ${formatNumber(txns.length)}`}
          size="sm"
        />
        <Metric
          label="Points per ₹100"
          value={stats.perHundred != null ? stats.perHundred.toFixed(2) : "—"}
          size="sm"
        />
        <Metric
          label="Best single earn"
          value={stats.best ? formatNumber(stats.best.points) : "—"}
          note={stats.best ? normaliseMerchant(stats.best.description) : undefined}
          size="sm"
        />
      </MetricGroup>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-text">Where the points came from</h2>
        <div className="divide-y divide-border rounded-[12px] border border-border bg-surface">
          {stats.earners.map((e) => (
            <div key={`${e.description}-${e.date}`} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex items-center gap-3">
                <Monogram desc={e.description} cat={e.category} size={28} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] text-text">
                    {normaliseMerchant(e.description)}
                  </span>
                  <span className="text-[12px] text-text-muted">{formatCurrency(e.amount)}</span>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-medium text-text">
                  {formatNumber(e.points)} pts
                </span>
              </div>
              <ShareBar value={e.points} max={max} color={categoryColor(e.category)} />
            </div>
          ))}
        </div>
        {stats.declaredExceedsSum && (
          <p className="mt-2 text-[12px] text-text-muted">
            The statement reports {formatNumber(stats.total)} points in total; the rows above account
            for {formatNumber(stats.summed)}.
          </p>
        )}
      </section>
    </div>
  );
}
```

The reconciliation note is the honest reading of `rewardStats`'s "declared total wins" rule: when the statement's own total exceeds the sum of per-transaction points, the gap is stated rather than silently absorbed.

`rewardStats` must therefore return `{ total, summed, declaredExceedsSum, earners, earningCount, perHundred, best }`. Confirm this matches the signature written in Task 5; if Task 5 defined fewer fields, extend it there and re-run its test.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- rewards`
Expected: PASS, all five cases.

- [ ] **Step 6: Remove the old panel**

`grep -rn "RewardsPanel" frontend/src` — remove every import, then delete the file. Confirm `npm run build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/Rewards.tsx frontend/src/components/data/RewardsHero.tsx frontend/src/tests/rewards.test.tsx
git rm frontend/src/components/RewardsPanel.jsx
git commit -m "feat(frontend): rebuild rewards view with stated point valuation"
```

---

## Phase 10 — Upload and processing

### Task 20: Upload experience with real progress

**Files:**
- Create: `frontend/src/views/Upload.tsx`, `frontend/src/components/data/Dropzone.tsx`, `frontend/src/components/data/ProgressStages.tsx`, `frontend/src/components/data/PasswordPrompt.tsx`
- Modify: `frontend/src/App.jsx` (progress state shape only — the SSE callback body is preserved verbatim)
- Test: `frontend/src/tests/upload.test.tsx`

**Interfaces:**
- Consumes: `toHuman` from `@/lib/errors`; `analyzeStatementsV2` from `@/services/geminiService` (unchanged)
- Produces:
  - `type Stage = "upload" | "convert" | "extract" | "categorise" | "redact"`
  - `type StageState = { stage: Stage; status: "pending" | "active" | "done"; detail?: string }`
  - `stagesFromEvent(event, data): { stage: Stage; detail: string }` (exported from `ProgressStages.tsx`)
  - `<Dropzone files onFiles onRemove disabled />`
  - `<ProgressStages current detail />`
  - `<PasswordPrompt fileName onSubmit onCancel incorrect? />`
  - `<Upload />`

Spec §27 forbids fake progress. The five stages map onto the SSE events the backend already emits, so each one advances only when the server says so:

| SSE event | Stage | Detail from payload |
|---|---|---|
| *(request sent)* | `upload` | file count |
| `page_converted` | `convert` | `page ${data.page} of ${data.total}` |
| `page_extracted` | `extract` | `page ${data.index} of ${data.total} · ${data.transactionsCount} found` |
| `finalizing` | `redact` | `data.message` |
| *(resolve)* | done | — |

`categorise` has no dedicated event; it is marked active when `finalizing` arrives and `done` on resolve. There is no timer-driven advance anywhere.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/upload.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressStages, stagesFromEvent } from "@/components/data/ProgressStages";
import { Dropzone } from "@/components/data/Dropzone";
import { PasswordPrompt } from "@/components/data/PasswordPrompt";
import { Upload } from "@/views/Upload";
import { renderWithAnalysis } from "@/tests/helpers/renderWithAnalysis";

describe("stagesFromEvent", () => {
  it("maps page_converted to the convert stage with real page numbers", () => {
    expect(stagesFromEvent("page_converted", { page: 2, total: 6, file: "may.pdf" })).toEqual({
      stage: "convert",
      detail: "may.pdf · page 2 of 6",
    });
  });

  it("maps page_extracted with the transaction count the server reported", () => {
    expect(stagesFromEvent("page_extracted", { index: 3, total: 6, transactionsCount: 11 })).toEqual({
      stage: "extract",
      detail: "page 3 of 6 · 11 found",
    });
  });

  it("maps finalizing to the redact stage using the server message", () => {
    expect(stagesFromEvent("finalizing", { message: "Redacting PII" })).toEqual({
      stage: "redact",
      detail: "Redacting PII",
    });
  });

  it("returns null for an unknown event rather than guessing", () => {
    expect(stagesFromEvent("something_else", {})).toBeNull();
  });
});

describe("ProgressStages", () => {
  it("marks earlier stages done and later ones pending", () => {
    const { container } = render(<ProgressStages current="extract" detail="page 1 of 4" />);
    const states = Array.from(container.querySelectorAll("[data-stage]")).map((el) =>
      el.getAttribute("data-status"),
    );
    expect(states).toEqual(["done", "done", "active", "pending", "pending"]);
  });

  it("shows the detail supplied by the server", () => {
    render(<ProgressStages current="extract" detail="page 1 of 4 · 7 found" />);
    expect(screen.getByText("page 1 of 4 · 7 found")).toBeInTheDocument();
  });

  it("announces progress to assistive tech", () => {
    render(<ProgressStages current="convert" detail="page 1 of 4" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("Dropzone", () => {
  it("accepts a dropped PDF", async () => {
    const onFiles = vi.fn();
    render(<Dropzone files={[]} onFiles={onFiles} onRemove={vi.fn()} />);
    const input = screen.getByLabelText(/choose files/i);
    const file = new File(["x"], "may.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    expect(onFiles).toHaveBeenCalled();
  });

  it("lists queued files with a remove control", () => {
    render(
      <Dropzone
        files={[new File(["x"], "may.pdf", { type: "application/pdf" })]}
        onFiles={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("may.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove may.pdf/i })).toBeInTheDocument();
  });
});

describe("PasswordPrompt", () => {
  it("names the file that needs the password", () => {
    render(<PasswordPrompt fileName="may.pdf" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/may\.pdf/)).toBeInTheDocument();
  });

  it("submits the entered password", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PasswordPrompt fileName="may.pdf" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/password/i), "hunter2");
    await user.click(screen.getByRole("button", { name: /unlock/i }));
    expect(onSubmit).toHaveBeenCalledWith("hunter2");
  });

  it("says the password was wrong on a retry", () => {
    render(<PasswordPrompt fileName="may.pdf" onSubmit={vi.fn()} onCancel={vi.fn()} incorrect />);
    expect(screen.getByText(/that password did not work/i)).toBeInTheDocument();
  });
});

describe("Upload view", () => {
  it("renders the dropzone and the analyse action in its idle state", () => {
    renderWithAnalysis(<Upload />);
    expect(screen.getByRole("button", { name: /analyse/i })).toBeDisabled();
    expect(screen.getByText(/account numbers are redacted/i)).toBeInTheDocument();
  });

  it("keeps the sample-data affordance and calls loadSample", async () => {
    const user = userEvent.setup();
    const { value } = renderWithAnalysis(<Upload />);
    await user.click(screen.getByRole("button", { name: /sample data/i }));
    expect(value.loadSample).toHaveBeenCalled();
  });

  it("shows progress instead of the form while analysing", () => {
    renderWithAnalysis(<Upload />, { analyzing: true, stage: "extract", stageDetail: "page 2 of 6" });
    expect(screen.queryByRole("button", { name: /analyse/i })).not.toBeInTheDocument();
    expect(screen.getByText("page 2 of 6")).toBeInTheDocument();
  });

  it("shows the password prompt when the backend asks for one", () => {
    renderWithAnalysis(<Upload />, { passwordFor: { fileName: "may.pdf", fileIndex: 0 } });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows a mapped sentence, never the raw error, on failure", () => {
    renderWithAnalysis(<Upload />, { error: new Error("ECONNREFUSED 10.0.0.4:8787") });
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- upload`
Expected: FAIL — `Failed to resolve import "@/components/data/ProgressStages"`.

- [ ] **Step 3: Create `frontend/src/components/data/ProgressStages.tsx`**

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type Stage = "upload" | "convert" | "extract" | "categorise" | "redact";

const ORDER: Stage[] = ["upload", "convert", "extract", "categorise", "redact"];

const LABEL: Record<Stage, string> = {
  upload: "Uploading statement",
  convert: "Converting pages",
  extract: "Reading transactions",
  categorise: "Categorising spend",
  redact: "Redacting personal data",
};

/**
 * Every stage advance comes from a server event. There is no timer anywhere in
 * this file — spec §27 forbids progress the backend has not confirmed.
 */
export function stagesFromEvent(
  event: string,
  data: Record<string, unknown>,
): { stage: Stage; detail: string } | null {
  if (event === "page_converted") {
    const file = data.file ? `${data.file} · ` : "";
    return { stage: "convert", detail: `${file}page ${data.page} of ${data.total}` };
  }
  if (event === "page_extracted") {
    return {
      stage: "extract",
      detail: `page ${data.index} of ${data.total} · ${data.transactionsCount} found`,
    };
  }
  if (event === "finalizing") {
    return { stage: "redact", detail: String(data.message ?? "Finalising") };
  }
  return null;
}

export function ProgressStages({ current, detail }: { current: Stage; detail?: string }) {
  const at = ORDER.indexOf(current);

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-px">
      {ORDER.map((stage, i) => {
        const status = i < at ? "done" : i === at ? "active" : "pending";
        return (
          <div
            key={stage}
            data-stage={stage}
            data-status={status}
            className="flex items-center gap-3 py-2.5"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-[240ms]",
                status === "done" && "border-success bg-success/12 text-success",
                status === "active" && "border-accent text-accent",
                status === "pending" && "border-border text-text-muted",
              )}
            >
              {status === "done" ? (
                <Check className="size-3" aria-hidden />
              ) : status === "active" ? (
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "text-[13px] transition-colors duration-[240ms]",
                  status === "pending" ? "text-text-muted" : "text-text",
                )}
              >
                {LABEL[stage]}
              </span>
              {status === "active" && detail && (
                <span className="text-[12px] tabular-nums text-text-2">{detail}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

The active dot is the only accent use here and it counts against the "primary action" role, so no other accent element may appear on the processing screen.

- [ ] **Step 4: Create `frontend/src/components/data/Dropzone.tsx`**

```tsx
import { useRef, useState } from "react";
import { FileText, Upload as UploadIcon, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dropzone({
  files,
  onFiles,
  onRemove,
  disabled,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const accept = (list: FileList | null) => {
    if (!list) return;
    onFiles(Array.from(list).filter((f) => f.type === "application/pdf"));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) accept(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-[12px] border border-dashed px-6 py-12 text-center",
          "transition-colors duration-[140ms]",
          over ? "border-accent bg-surface-2" : "border-border bg-surface",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <UploadIcon className="size-5 text-text-muted" aria-hidden />
        <p className="text-[14px] font-medium text-text">Drop your statement here</p>
        <p className="text-[12px] text-text-2">PDF only. Password-protected files are supported.</p>
        <label className="mt-1 cursor-pointer text-[13px] font-medium text-text-2 underline decoration-border underline-offset-4 transition-colors duration-[140ms] hover:text-text">
          Choose files
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            multiple
            disabled={disabled}
            className="sr-only"
            onChange={(e) => accept(e.target.files)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-[12px] border border-border bg-surface">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13px] text-text">{f.name}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-text-muted">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="shrink-0 rounded-[6px] p-1 text-text-muted transition-colors duration-[140ms] hover:bg-surface-2 hover:text-text"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/data/PasswordPrompt.tsx`**

```tsx
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordPrompt({
  fileName,
  onSubmit,
  onCancel,
  incorrect,
}: {
  fileName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  incorrect?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <Lock className="size-4 text-text-muted" aria-hidden />
        <p className="text-[14px] font-medium text-text">This statement is password protected</p>
      </div>
      <p className="text-[13px] text-text-2">
        Enter the password for <span className="font-mono text-text">{fileName}</span>. It is used
        only to open the file and is never stored.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Password
        </span>
        <Input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={incorrect || undefined}
        />
      </label>

      {incorrect && (
        <p role="alert" className="text-[12px] text-danger">
          That password did not work. Check it and try again.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={value === ""}>
          Unlock
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create `frontend/src/views/Upload.tsx`**

```tsx
import { useState } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { PageHeader } from "@/components/data/PageHeader";
import { ErrorState } from "@/components/data/ErrorState";
import { Dropzone } from "@/components/data/Dropzone";
import { PasswordPrompt } from "@/components/data/PasswordPrompt";
import { ProgressStages } from "@/components/data/ProgressStages";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function Upload() {
  const {
    analyze,
    analyzing,
    stage,
    stageDetail,
    error,
    passwordFor,
    submitPassword,
    cancelPassword,
    loadSample,
  } = useAnalysis();
  const [files, setFiles] = useState<File[]>([]);

  if (analyzing) {
    return (
      <div className="mx-auto max-w-[440px] py-10">
        <PageHeader title="Analysing your statement" description="This usually takes under a minute." />
        <ProgressStages current={stage} detail={stageDetail} />
      </div>
    );
  }

  if (passwordFor) {
    return (
      <div className="mx-auto max-w-[440px] py-10">
        <PasswordPrompt
          fileName={passwordFor.fileName}
          incorrect={passwordFor.incorrect}
          onSubmit={submitPassword}
          onCancel={cancelPassword}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[520px] py-6">
      <PageHeader title="Upload a statement" description="Credit card or bank statement, as a PDF." />

      {error && <div className="mb-4"><ErrorState error={error} onRetry={() => analyze(files)} /></div>}

      <Dropzone
        files={files}
        onFiles={(f) => setFiles((prev) => [...prev, ...f])}
        onRemove={(i) => setFiles((prev) => prev.filter((_, x) => x !== i))}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        {/* Understated, single mention — spec §28 forbids stacking security badges. */}
        <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
          <ShieldCheck className="size-3.5" aria-hidden />
          Account numbers are redacted before analysis.
        </p>
        <Button onClick={() => analyze(files)} disabled={files.length === 0}>
          Analyse
        </Button>
      </div>

      {/*
        Carries over `handleUseSample` from App.jsx:101 — the constraint list
        forbids removing existing functionality, and this is the only way to
        see the dashboard without a statement. Ghost, not primary: uploading
        real data is the intended path.
      */}
      <div className="mt-6 border-t border-border pt-5 text-center">
        <Button variant="ghost" size="sm" onClick={loadSample}>
          Explore with sample data
        </Button>
        <p className="mt-1.5 text-[12px] text-text-muted">
          A real anonymised statement, so you can see the analysis before uploading yours.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Move the progress state into the context**

In `App.jsx`, replace the `progressMessage` string with `stage`/`stageDetail` state. **Keep the SSE callback body exactly as it is** and derive the new state from it:

```js
const result = await analyzeStatementsV2(files, pdfPasswords, ({ event, data }) => {
  const mapped = stagesFromEvent(event, data);
  if (mapped) {
    setStage(mapped.stage);
    setStageDetail(mapped.detail);
  }
}, token);
```

Set `stage` to `"upload"` before the call and `"categorise"` immediately after the last `finalizing` event resolves. Every other line of `handleAnalyze` — the token fetch, the password map, the error branches, `setAnalysis` — stays byte-identical.

Add the two new state variables next to the existing ones, replacing the placeholders Task 9 put in the context value:

```js
const [stage, setStage] = useState("upload");
const [stageDetail, setStageDetail] = useState(undefined);
```

Task 9 already wired `stage`, `stageDetail` and `loadSample: handleUseSample` into `analysisContextValue`, so nothing changes there — `handleUseSample` at `App.jsx:101` is passed through untouched. Its body already sets `{ id: "sample", ...SAMPLE_DATA }` and navigates to `#/dashboard`, which is exactly what the CTA needs. Do not reimplement it.

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npm run test -- upload`
Expected: PASS, all five groups.

- [ ] **Step 9: Verify against the real backend**

Start the backend, upload a genuine multi-page statement, and watch the stage list. Each stage must advance only as its event arrives — if any stage lights up before the server reports it, the mapping is wrong. Then upload a password-protected PDF and confirm the prompt appears, a wrong password shows the retry copy, and the right one proceeds. Finally click "Explore with sample data" and confirm it still lands on the dashboard with the sample analysis — spec §20 phase 11 gate.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/views/Upload.tsx frontend/src/components/data frontend/src/App.jsx frontend/src/tests/upload.test.tsx
git commit -m "feat(frontend): rebuild upload flow with server-driven progress stages"
```

---

## Phase 11 — Admin console

### Task 21: Admin shell, stats and analyses table

**Files:**
- Modify: `frontend/src/components/admin/AdminDashboard.jsx` → `AdminDashboard.tsx`
- Create: `frontend/src/components/admin/AdminShell.tsx`, `AdminStats.tsx`, `AnalysesTable.tsx`, `RedactionBadge.tsx`
- Test: `frontend/src/tests/admin.test.tsx`

**Interfaces:**
- Consumes: `fetchAnalyses`, `fetchStats`, `deleteAnalysis`, `fetchAnalysis`, `updateAnalysis`, `logCsvExport` from `../../services/apiService` (**unchanged**); `Metric`, `MetricGroup`, `SkeletonTable`, `EmptyState`, `ErrorState` from `@/components/data/*`; `Table` primitives
- Produces:
  - `<AdminShell tab onTab onSettings onLogout>{children}</AdminShell>`
  - `<AdminStats stats loading />`
  - `<RedactionBadge redacted />`
  - `<AnalysesTable rows loading onView onDelete onExport />`

Every data call, the CSV builder, the delete confirmation flow and the settings modal keep working exactly as they do now. What changes is presentation, plus three defects fixed on the way:

1. **`colSpan={6}` on the empty row spans six of seven columns** (`AdminDashboard.jsx:309`), so the empty message is misaligned. Corrected to the real column count.
2. **The redaction badge renders a 🔒 emoji** (`AdminDashboard.jsx:320`), which spec §5 forbids. Replaced with a Lucide `ShieldCheck` and text.
3. **`"N/A"` is displayed for a missing top bank** (`AdminDashboard.jsx:267`). Spec §9 says omit the affordance; the metric is not rendered when the value is absent.

Spec §4 gap 6: the API returns no per-analysis processing status, so **no status column is added**. The brief's Processing/Completed/Failed chips would require inventing state the backend does not track. The redaction flag, which *is* real, is surfaced instead.

Spec §4 gap 7: there is no storage-usage or queue-depth endpoint, so those admin cards from the brief are omitted rather than filled with plausible numbers.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/admin.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysesTable } from "@/components/admin/AnalysesTable";
import { AdminStats } from "@/components/admin/AdminStats";
import { RedactionBadge } from "@/components/admin/RedactionBadge";

const ROWS = [
  {
    id: "a1",
    created_at: "2026-05-30T14:42:00Z",
    period: "01 May – 29 May 2026",
    account_holder: "Diganta Sarma",
    bank: "ICICI Credit Card",
    is_redacted: true,
    transaction_count: 14,
    total_spent: 20447.45,
  },
];

describe("AdminStats", () => {
  it("omits the top-bank metric when the API has no value", () => {
    render(<AdminStats stats={{ total_analyses: 3, total_transactions: 40, total_spend_tracked: 100 }} />);
    expect(screen.queryByText("N/A")).toBeNull();
    expect(screen.queryByText("Top Bank")).toBeNull();
  });

  it("shows the top-bank metric when the API supplies one", () => {
    render(
      <AdminStats
        stats={{ total_analyses: 3, total_transactions: 40, total_spend_tracked: 100, top_bank: "ICICI" }}
      />,
    );
    expect(screen.getByText("ICICI")).toBeInTheDocument();
  });

  it("shows skeletons while loading, not zeros", () => {
    const { container } = render(<AdminStats stats={null} loading />);
    expect(container.querySelectorAll(".shimmer").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).toBeNull();
  });
});

describe("RedactionBadge", () => {
  it("uses no emoji", () => {
    const { container } = render(<RedactionBadge redacted />);
    expect(container.textContent).not.toContain("🔒");
    expect(screen.getByText("Redacted")).toBeInTheDocument();
  });

  it("renders nothing when the record is not redacted", () => {
    const { container } = render(<RedactionBadge redacted={false} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("AnalysesTable", () => {
  it("spans every column in the empty row", () => {
    const { container } = render(
      <AnalysesTable rows={[]} onView={vi.fn()} onDelete={vi.fn()} onExport={vi.fn()} />,
    );
    const headerCount = container.querySelectorAll("thead th").length;
    const empty = container.querySelector("tbody td[colspan]")!;
    expect(Number(empty.getAttribute("colspan"))).toBe(headerCount);
  });

  it("renders one row per analysis with the holder and bank", () => {
    render(<AnalysesTable rows={ROWS} onView={vi.fn()} onDelete={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByText("Diganta Sarma")).toBeInTheDocument();
    expect(screen.getByText("ICICI Credit Card")).toBeInTheDocument();
  });

  it("shows Unknown for a redacted holder rather than the literal REDACTED", () => {
    render(
      <AnalysesTable
        rows={[{ ...ROWS[0], account_holder: "REDACTED" }]}
        onView={vi.fn()}
        onDelete={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    expect(screen.queryByText("REDACTED")).toBeNull();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("passes the analysis id to view and delete", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onDelete = vi.fn();
    render(<AnalysesTable rows={ROWS} onView={onView} onDelete={onDelete} onExport={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /view details/i }));
    expect(onView).toHaveBeenCalledWith("a1");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("a1");
  });

  it("shows a table skeleton while loading", () => {
    const { container } = render(
      <AnalysesTable rows={[]} loading onView={vi.fn()} onDelete={vi.fn()} onExport={vi.fn()} />,
    );
    expect(container.querySelectorAll("[data-skeleton-row]").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- admin`
Expected: FAIL — `Failed to resolve import "@/components/admin/AnalysesTable"`.

- [ ] **Step 3: Create `frontend/src/components/admin/RedactionBadge.tsx`**

```tsx
import { ShieldCheck } from "lucide-react";

export function RedactionBadge({ redacted }: { redacted: boolean }) {
  if (!redacted) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-[11px] text-success">
      <ShieldCheck className="size-3" aria-hidden />
      Redacted
    </span>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/admin/AdminStats.tsx`**

```tsx
import { formatCurrency, formatNumber } from "@/lib/format";
import { Metric } from "@/components/data/Metric";
import { MetricGroup } from "@/components/data/MetricGroup";
import { SkeletonMetric } from "@/components/data/Skeleton";

export type AdminStatsShape = {
  total_analyses?: number;
  total_transactions?: number;
  total_spend_tracked?: number;
  top_bank?: string;
};

export function AdminStats({ stats, loading }: { stats: AdminStatsShape | null; loading?: boolean }) {
  if (loading || !stats) {
    return (
      <MetricGroup>
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </MetricGroup>
    );
  }

  return (
    <MetricGroup>
      <Metric label="Analyses" value={formatNumber(stats.total_analyses ?? 0)} size="sm" />
      <Metric label="Transactions" value={formatNumber(stats.total_transactions ?? 0)} size="sm" />
      <Metric label="Spend tracked" value={formatCurrency(stats.total_spend_tracked ?? 0)} size="sm" />
      {/* Rendered only when the API actually returns it — no "N/A" cell. */}
      {stats.top_bank ? <Metric label="Top bank" value={stats.top_bank} size="sm" /> : null}
    </MetricGroup>
  );
}
```

`MetricGroup` (Task 10) already drops `null`/`false` children, so pass the p95 cell conditionally rather than building the children array by hand.

- [ ] **Step 5: Create `frontend/src/components/admin/AnalysesTable.tsx`**

```tsx
import { Download, Eye, Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SkeletonTable } from "@/components/data/Skeleton";
import { RedactionBadge } from "./RedactionBadge";

export type AdminAnalysis = {
  id: string;
  created_at: string;
  period?: string;
  account_holder?: string;
  bank?: string;
  is_redacted?: boolean;
  transaction_count?: number;
  total_spent?: number;
};

const COLUMNS = ["Date", "Period", "Account holder", "Transactions", "Total spent", "Actions"] as const;

export function AnalysesTable({
  rows,
  loading,
  onView,
  onDelete,
  onExport,
}: {
  rows: AdminAnalysis[];
  loading?: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-text">Stored analyses</h2>
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Download className="size-3.5" aria-hidden /> Export CSV
        </Button>
      </header>

      {loading ? (
        <SkeletonTable rows={6} cols={COLUMNS.length} />
      ) : (
        <Table>
          <THead>
            <TR>
              {COLUMNS.map((c) => (
                <TH
                  key={c}
                  className={c === "Total spent" ? "text-right" : c === "Actions" ? "text-center" : undefined}
                >
                  {c}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                {/* Spans every column — the old markup said 6 for 7 columns. */}
                <TD colSpan={COLUMNS.length} className="py-10 text-center text-[13px] text-text-muted">
                  No analyses stored yet.
                </TD>
              </TR>
            ) : (
              rows.map((a) => {
                const holder =
                  a.account_holder && a.account_holder !== "REDACTED" ? a.account_holder : "Unknown";
                const when = new Date(a.created_at);
                return (
                  <TR key={a.id} className="h-12">
                    <TD className="text-[12px] text-text-muted">
                      <span className="block text-text-2">{when.toLocaleDateString("en-IN")}</span>
                      <span className="tabular-nums">
                        {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TD>
                    <TD className="text-[12px] text-text-2">{a.period}</TD>
                    <TD>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-text">{holder}</span>
                        <span className="flex items-center gap-1.5">
                          {a.bank && <span className="text-[12px] text-text-muted">{a.bank}</span>}
                          <RedactionBadge redacted={!!a.is_redacted} />
                        </span>
                      </span>
                    </TD>
                    <TD className="text-[13px] tabular-nums text-text-2">
                      {formatNumber(a.transaction_count ?? 0)}
                    </TD>
                    <TD className="text-right font-mono text-[13px] text-text">
                      {formatCurrency(a.total_spent ?? 0)}
                    </TD>
                    <TD className="text-center">
                      <span className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`View details for ${holder}`}
                          onClick={() => onView(a.id)}
                        >
                          <Eye className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete analysis for ${holder}`}
                          onClick={() => onDelete(a.id)}
                          className="text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </span>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}
    </section>
  );
}
```

The `Time` column is folded into `Date` as a second line, dropping one column without losing a value.

- [ ] **Step 6: Create `frontend/src/components/admin/AdminShell.tsx`**

```tsx
import type { ReactNode } from "react";
import { BarChart3, FileText, LogOut, ScrollText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type AdminTab = "analyses" | "audit" | "api";

const TABS: { key: AdminTab; label: string; icon: typeof FileText }[] = [
  { key: "analyses", label: "Analyses", icon: FileText },
  { key: "audit", label: "Audit log", icon: ScrollText },
  { key: "api", label: "API usage", icon: BarChart3 },
];

export function AdminShell({
  tab,
  onTab,
  onSettings,
  onLogout,
  children,
}: {
  tab: AdminTab;
  onTab: (t: AdminTab) => void;
  onSettings: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-text">Admin</span>
            <span className="text-[12px] text-text-muted">Expense Manager</span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="#/"
              className="rounded-[8px] px-2.5 py-1.5 text-[13px] text-text-2 transition-colors duration-[140ms] hover:bg-surface-2 hover:text-text"
            >
              Back to app
            </a>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={onSettings}>
              <Settings className="size-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="size-3.5" aria-hidden /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-8">
        <div
          role="tablist"
          aria-label="Admin sections"
          className="mb-6 inline-flex gap-0.5 rounded-[8px] border border-border bg-surface-2 p-0.5"
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => onTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors duration-[140ms]",
                tab === key ? "bg-surface text-text" : "text-text-muted hover:text-text-2",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Rewrite `AdminDashboard.jsx` as `AdminDashboard.tsx`**

Keep every hook, every handler and every service call byte-for-byte: `loadData`, `handleExportCSV` (including the `logCsvExport` call), `handleViewAnalysis`, `confirmDelete`, `handleLogout`, and the `AdminSettingsModal` / `ConfirmToast` mounts. Replace only the returned markup with `<AdminShell>` wrapping `<AdminStats>`, `<AnalysesTable>`, `<AuditLogTab />` and `<ApiUsageTab />`. Delete the local `StatCard`, `StatCardSkeleton` and `TableRowSkeleton` functions — they are superseded.

- [ ] **Step 8: Retokenise the remaining admin files**

For `AdminLogin.jsx`, `AdminSettingsModal.jsx`, `ConfirmToast.jsx`, `AuditLogTab.jsx`, `ApiUsageTab.jsx`, substitute throughout:

| Old | New |
|---|---|
| `#020617`, `#0f172a` | `var(--bg)`, `var(--surface)` |
| `#f8fafc`, `#e2e8f0` | `var(--text)` |
| `#cbd5e1`, `#94a3b8` | `var(--text-2)` |
| `#64748b` | `var(--text-muted)` |
| `#fbbf24` | `var(--accent)` — only on the primary action; elsewhere `var(--text-2)` |
| `#34d399` | `var(--success)` |
| `#fca5a5`, `#7f1d1d` | `var(--danger)` |
| `#60a5fa` | `var(--info)` |
| `rgba(255,255,255,0.05)` | `var(--border)` |
| `"DM Mono, monospace"` | `var(--font-mono)` |
| `borderRadius: "16px"` | `var(--radius-lg)` |

Then `grep -rn "#0f172a\|#fbbf24\|#020617\|DM Mono" frontend/src/components/admin` must return nothing.

- [ ] **Step 9: Add p50/p95 to `ApiUsageTab`**

Spec §19 asks for latency percentiles. If the endpoint returns per-call durations, compute p50 and p95 client-side from that array and render them as two `Metric`s. If it does not, **render neither** — do not derive a percentile from an average. Check the actual response shape first with `grep -n "fetchApiUsage\|latency\|duration" frontend/src/services/apiService.js`.

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend && npm run test -- admin`
Expected: PASS, all three groups.

- [ ] **Step 11: Verify the admin flows by hand**

Log in, confirm the stats row, the analyses table, CSV export (file downloads and the audit log records it), view details, delete with confirmation, the settings modal, and both other tabs. Nothing may 404 or throw.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/admin frontend/src/tests/admin.test.tsx
git rm frontend/src/components/admin/AdminDashboard.jsx
git commit -m "feat(frontend): rebuild admin console shell, stats and analyses table"
```

---

## Phase 12 — Command palette

### Task 22: ⌘K command palette

**Files:**
- Create: `frontend/src/components/shell/CommandPalette.tsx`, `frontend/src/lib/commands.ts`
- Test: `frontend/src/tests/palette.test.tsx`

**Interfaces:**
- Consumes: `cmdk` (installed with the shadcn `command` primitive in Task 7); `DASHBOARD_TABS`, `dashboardHref` from `@/lib/router`; `topVendors`, `normaliseTransactions` from `@/lib/derive`
- Produces:
  - `type Command = { id: string; label: string; group: string; hint?: string; run: () => void }`
  - `buildCommands(ctx): Command[]` (exported from `commands.ts`)
  - `<CommandPalette open onOpenChange />`

Groups, in order: Navigate (the six dashboard tabs), Merchants (top 8 from the loaded statement, each opening the filtered ledger), Categories (only categories present in the data), Actions (upload a statement, toggle theme, export CSV when an analysis is loaded).

Every entry is generated from real state. When no analysis is loaded the Merchants and Categories groups are absent — not empty headings.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/palette.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { buildCommands } from "@/lib/commands";
import type { Transaction } from "@/lib/types";

const txns: Transaction[] = [
  { date: "2026-05-02", description: "Swiggy (BLR)", amount: 400, category: "Food & Dining", type: "debit" },
  { date: "2026-05-04", description: "Uber", amount: 200, category: "Transport", type: "debit" },
];

const ctx = {
  transactions: txns,
  hasAnalysis: true,
  navigate: vi.fn(),
  toggleTheme: vi.fn(),
  exportCsv: vi.fn(),
};

describe("buildCommands", () => {
  it("always offers navigation to every dashboard tab", () => {
    const nav = buildCommands({ ...ctx, transactions: [], hasAnalysis: false }).filter(
      (c) => c.group === "Navigate",
    );
    expect(nav.map((c) => c.label)).toEqual([
      "Overview",
      "Transactions",
      "Vendors",
      "Insights",
      "Rewards",
      "Upload",
    ]);
  });

  it("builds merchant commands from the loaded statement", () => {
    const merchants = buildCommands(ctx).filter((c) => c.group === "Merchants");
    expect(merchants.map((c) => c.label)).toContain("Swiggy");
    expect(merchants.map((c) => c.label)).toContain("Uber");
  });

  it("lists only categories that appear in the data", () => {
    const cats = buildCommands(ctx).filter((c) => c.group === "Categories");
    expect(cats.map((c) => c.label)).toEqual(["Food & Dining", "Transport"]);
    expect(cats.map((c) => c.label)).not.toContain("Healthcare");
  });

  it("omits merchant and category groups with no analysis loaded", () => {
    const cmds = buildCommands({ ...ctx, transactions: [], hasAnalysis: false });
    expect(cmds.some((c) => c.group === "Merchants")).toBe(false);
    expect(cmds.some((c) => c.group === "Categories")).toBe(false);
  });

  it("offers CSV export only when an analysis is loaded", () => {
    expect(buildCommands(ctx).some((c) => c.id === "export-csv")).toBe(true);
    expect(
      buildCommands({ ...ctx, hasAnalysis: false }).some((c) => c.id === "export-csv"),
    ).toBe(false);
  });

  it("runs the navigate callback with the right route", () => {
    const navigate = vi.fn();
    const cmds = buildCommands({ ...ctx, navigate });
    cmds.find((c) => c.label === "Vendors")!.run();
    expect(navigate).toHaveBeenCalledWith("#/dashboard/vendors");
  });

  it("gives every command a unique id", () => {
    const ids = buildCommands(ctx).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- palette`
Expected: FAIL — `Failed to resolve import "@/lib/commands"`.

- [ ] **Step 3: Create `frontend/src/lib/commands.ts`**

```ts
import type { Transaction } from "./types";
import { DASHBOARD_TABS, dashboardHref } from "./router";
import { normaliseTransactions, topVendors } from "./derive";

export type Command = {
  id: string;
  label: string;
  group: "Navigate" | "Merchants" | "Categories" | "Actions";
  hint?: string;
  run: () => void;
};

export type CommandContext = {
  transactions: Transaction[];
  hasAnalysis: boolean;
  navigate: (hash: string) => void;
  toggleTheme: () => void;
  exportCsv: () => void;
};

const TAB_LABEL: Record<string, string> = {
  overview: "Overview",
  transactions: "Transactions",
  vendors: "Vendors",
  insights: "Insights",
  rewards: "Rewards",
  upload: "Upload",
};

/** Everything here is derived from loaded state — nothing is hardcoded. */
export function buildCommands(ctx: CommandContext): Command[] {
  const out: Command[] = DASHBOARD_TABS.map((tab) => ({
    id: `nav-${tab}`,
    label: TAB_LABEL[tab],
    group: "Navigate" as const,
    run: () => ctx.navigate(dashboardHref(tab)),
  }));

  if (ctx.hasAnalysis && ctx.transactions.length > 0) {
    const txns = normaliseTransactions(ctx.transactions);

    for (const v of topVendors(txns, 8)) {
      out.push({
        id: `merchant-${v.name}`,
        label: v.name,
        group: "Merchants",
        hint: `${v.count} ${v.count === 1 ? "transaction" : "transactions"}`,
        run: () => ctx.navigate(`${dashboardHref("transactions")}?q=${encodeURIComponent(v.name)}`),
      });
    }

    const seen: string[] = [];
    for (const t of txns) if (!seen.includes(t.category)) seen.push(t.category);
    for (const cat of seen) {
      out.push({
        id: `category-${cat}`,
        label: cat,
        group: "Categories",
        run: () =>
          ctx.navigate(`${dashboardHref("transactions")}?category=${encodeURIComponent(cat)}`),
      });
    }
  }

  out.push({
    id: "upload",
    label: "Upload a statement",
    group: "Actions",
    run: () => ctx.navigate(dashboardHref("upload")),
  });
  out.push({
    id: "toggle-theme",
    label: "Toggle theme",
    group: "Actions",
    run: ctx.toggleTheme,
  });
  if (ctx.hasAnalysis) {
    out.push({ id: "export-csv", label: "Export transactions as CSV", group: "Actions", run: ctx.exportCsv });
  }

  return out;
}
```

- [ ] **Step 4: Create `frontend/src/components/shell/CommandPalette.tsx`**

```tsx
import { useEffect, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAnalysis } from "@/context/AnalysisContext";
import { buildCommands, type Command } from "@/lib/commands";
import { useTheme } from "@/components/shell/ThemeToggle";

export function CommandPalette({
  open,
  onOpenChange,
  onExportCsv,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onExportCsv: () => void;
}) {
  const { analysis } = useAnalysis();
  const { toggle } = useTheme();

  // ⌘K on macOS, Ctrl+K elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const commands = useMemo(
    () =>
      buildCommands({
        transactions: analysis?.transactions ?? [],
        hasAnalysis: !!analysis,
        navigate: (hash) => {
          window.location.hash = hash;
        },
        toggleTheme: toggle,
        exportCsv: onExportCsv,
      }),
    [analysis, toggle, onExportCsv],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of commands) {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()];
  }, [commands]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search merchants, categories or pages…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.group} ${c.label}`}
                onSelect={() => {
                  c.run();
                  onOpenChange(false);
                }}
              >
                <span className="flex-1">{c.label}</span>
                {c.hint && <span className="text-[12px] text-text-muted">{c.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

`useTheme` is the hook exported alongside `ThemeToggle` in Task 9; if Task 9 kept the theme state local, lift it into a small `ThemeContext` in that file and export `useTheme` before writing this component.

- [ ] **Step 5: Mount it**

In `App.jsx`, render `<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onExportCsv={handleExportCsv} />` inside `AppShell`. Wire the topbar's ⌘K button to `setPaletteOpen(true)`.

Keep the ⌘K / Ctrl+K keydown listener here in `App.jsx` rather than inside `CommandPalette`. Task 26 puts the palette behind `React.lazy`, and a listener that only exists once the chunk has loaded would swallow the very first shortcut press.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npm run test -- palette`
Expected: PASS, all seven cases.

- [ ] **Step 7: Verify the shortcut by hand**

`npm run dev`. Press ⌘K (or Ctrl+K), confirm it opens; type a merchant name, press Enter, confirm the ledger opens filtered to that merchant. Press ⌘K again to close. Confirm the shortcut does nothing while a text input is focused inside a dialog.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/shell/CommandPalette.tsx frontend/src/lib/commands.ts frontend/src/App.jsx frontend/src/tests/palette.test.tsx
git commit -m "feat(frontend): add command palette driven by loaded statement data"
```

---

## Phase 13 — Cross-cutting passes

### Task 23: Motion system

**Files:**
- Create: `frontend/src/components/shell/SmoothScroll.tsx`, `frontend/src/components/shell/PageTransition.tsx`, `frontend/src/hooks/useReveal.ts`
- Modify: `frontend/src/lib/motion.ts` (add `REVEAL`), `frontend/src/components/shell/AppShell.tsx`
- Test: `frontend/src/tests/motion.test.tsx`

**Interfaces:**
- Consumes: `framer-motion`, `gsap`, `gsap/ScrollTrigger`, `lenis`
- Produces:
  - `<SmoothScroll>{children}</SmoothScroll>`
  - `<PageTransition routeKey>{children}</PageTransition>`
  - `useReveal<T extends HTMLElement>(options?): RefObject<T>`

Install first: `npm i framer-motion gsap lenis`.

The three libraries have non-overlapping jobs (spec §14). Framer Motion owns presence and layout — route transitions, the nav indicator, drawer and sheet entry. GSAP + ScrollTrigger owns staged reveals of long sections as they scroll into view. Lenis owns the scroll feel itself. No component uses two of them for the same effect.

Every one of them must be inert under `prefers-reduced-motion`. That is the single hardest thing to get right here, so each has an explicit test.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/motion.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { duration, prefersReducedMotion, fadeUp } from "@/lib/motion";

function mockMotionPreference(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("reduced motion", () => {
  beforeEach(() => mockMotionPreference(false));

  it("reports the preference from the media query", () => {
    mockMotionPreference(true);
    expect(prefersReducedMotion()).toBe(true);
    mockMotionPreference(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("collapses every duration to zero when motion is reduced", () => {
    mockMotionPreference(true);
    expect(duration("fast")).toBe(0);
    expect(duration("standard")).toBe(0);
    expect(duration("complex")).toBe(0);
  });

  it("returns real durations otherwise, in seconds", () => {
    expect(duration("fast")).toBeCloseTo(0.14);
    expect(duration("standard")).toBeCloseTo(0.24);
    expect(duration("complex")).toBeCloseTo(0.42);
  });

  it("never animates position when motion is reduced", () => {
    mockMotionPreference(true);
    expect(fadeUp().initial).toEqual({ opacity: 1, y: 0 });
  });

  it("animates position normally otherwise", () => {
    expect(fadeUp().initial).toEqual({ opacity: 0, y: 8 });
  });
});

describe("SmoothScroll", () => {
  it("does not start Lenis when motion is reduced", async () => {
    mockMotionPreference(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { SmoothScroll } = await import("@/components/shell/SmoothScroll");
    render(<SmoothScroll><div /></SmoothScroll>);
    expect(raf).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- motion`
Expected: FAIL — `duration` collapses are not implemented, or `SmoothScroll` does not resolve.

- [ ] **Step 3: Extend `frontend/src/lib/motion.ts`**

Append:

```ts
/** GSAP reveal defaults — one place, so every staged section matches. */
export const REVEAL = {
  y: 16,
  opacity: 0,
  duration: MS.complex / 1000,
  ease: "power3.out",
  stagger: 0.06,
  start: "top 88%",
} as const;
```

Confirm `duration()` already returns `0` under reduced motion and `fadeUp()` returns `{ opacity: 1, y: 0 }` for both `initial` and `animate` in that case. If `fadeUp` was written as a constant object rather than a function in Task 6, convert it to a function now and update the two call sites.

- [ ] **Step 4: Create `frontend/src/components/shell/SmoothScroll.tsx`**

```tsx
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Momentum scrolling. Skipped entirely under reduced motion — hijacking the
 * scroll is exactly what that preference asks us not to do.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ duration: 0.9, smoothWheel: true });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 5: Create `frontend/src/components/shell/PageTransition.tsx`**

```tsx
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DURATION, EASE, useReducedMotion } from "@/lib/motion";

/** 180–300ms cross-fade with a small rise. Never a slide — spec §22. */
export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : DURATION.standard, ease: EASE.out }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Create `frontend/src/hooks/useReveal.ts`**

```ts
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { REVEAL, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Staggers direct children into view once, as the container scrolls up.
 * Attach to long stacked sections only — never to a table body.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        y: REVEAL.y,
        opacity: REVEAL.opacity,
        duration: REVEAL.duration,
        ease: REVEAL.ease,
        stagger: REVEAL.stagger,
        scrollTrigger: { trigger: el, start: REVEAL.start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return ref;
}
```

`gsap.context(...).revert()` restores the original inline styles on unmount, which is what stops a half-revealed section from getting stuck at `opacity: 0` when the route changes mid-animation.

- [ ] **Step 7: Wire the shell**

In `AppShell.tsx`, wrap the content area in `<SmoothScroll>` and the routed view in `<PageTransition routeKey={routeKey(route)}>`, importing `routeKey` from `@/lib/router`. Use the helper, not `route.tab` — `tab` is `undefined` on the upload, history and admin routes, which would give them all the same `key` and suppress the cross-fade between them. Apply `useReveal` to the stacked sections in `Vendors`, `Insights` and `Rewards` only — the dashboard already animates through `CountUp` and the charts, and stacking a third mechanism there would double-animate.

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npm run test -- motion`
Expected: PASS, both groups.

- [ ] **Step 9: Verify reduced motion by hand**

Enable "Reduce motion" in the OS, reload, and confirm: no scroll smoothing, no route cross-fade, no reveal stagger, no count-up (figures render final immediately), no drawer slide (it appears in place). Disable it and confirm everything returns.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/shell frontend/src/hooks frontend/src/lib/motion.ts frontend/src/tests/motion.test.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add motion system with smooth scroll, page transitions and reveals"
```

---

### Task 24: Responsive pass

**Files:**
- Modify: every file under `frontend/src/components/shell/`, `frontend/src/components/data/`, `frontend/src/views/`
- Create: `frontend/src/components/data/TransactionCards.tsx`
- Test: `frontend/src/tests/responsive.test.tsx`

**Interfaces:**
- Produces: `<TransactionCards rows onRowClick onCategoryChange />`

Spec §31 lists seven widths: 1440, 1280, 1024, 768, 480, 390, 375. The rules per breakpoint:

| Width | Behaviour |
|---|---|
| ≥1440 | Content capped at 1280px, centred; sidebar expanded |
| 1280 | Same layout, no cap effect |
| 1024 | Sidebar collapses to icons; charts stay side by side |
| 768 | Sidebar hidden, bottom nav appears; charts stack |
| 480 | Ledger switches from table to cards; drawer becomes a bottom sheet |
| 390 | Metric group goes to one column; hero drops to 32px |
| 375 | No horizontal scroll anywhere; every tap target ≥44px |

The ledger table cannot survive at 480px — six columns in 480px is unreadable at any font size. Below `sm` it is replaced by a card list carrying the same data and the same edit affordance.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/responsive.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionCards } from "@/components/data/TransactionCards";
import type { LedgerRow } from "@/components/data/TransactionTable";

const ROWS: LedgerRow[] = [
  { index: 0, date: "2026-05-03", description: "Swiggy (BLR)", amount: 480, category: "Food & Dining", type: "debit" },
];

describe("TransactionCards", () => {
  it("shows the same fields the table shows", () => {
    render(<TransactionCards rows={ROWS} onCategoryChange={vi.fn()} />);
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("₹480")).toBeInTheDocument();
    expect(screen.getByText("3 May")).toBeInTheDocument();
  });

  it("keeps the category editable on mobile", () => {
    render(<TransactionCards rows={ROWS} onCategoryChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("gives each card a tap target of at least 44px", () => {
    const { container } = render(<TransactionCards rows={ROWS} onRowClick={vi.fn()} onCategoryChange={vi.fn()} />);
    const card = container.querySelector("[data-txn-card]") as HTMLElement;
    expect(card.className).toContain("min-h-[56px]");
  });

  it("reports the original index on edit, as the table does", async () => {
    const onCategoryChange = vi.fn();
    render(<TransactionCards rows={[{ ...ROWS[0], index: 7 }]} onCategoryChange={onCategoryChange} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    select.value = "Shopping";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onCategoryChange).toHaveBeenCalledWith(7, "Shopping", "Swiggy (BLR)");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- responsive`
Expected: FAIL — `Failed to resolve import "@/components/data/TransactionCards"`.

- [ ] **Step 3: Create `frontend/src/components/data/TransactionCards.tsx`**

```tsx
import { formatCurrency, formatDate, normaliseMerchant } from "@/lib/format";
import { Monogram } from "./Monogram";
import { CategorySelect } from "./CategorySelect";
import type { LedgerRow } from "./TransactionTable";

export function TransactionCards({
  rows,
  onRowClick,
  onCategoryChange,
}: {
  rows: LedgerRow[];
  onRowClick?: (row: LedgerRow) => void;
  onCategoryChange: (index: number, next: string, description: string) => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-[12px] border border-border bg-surface">
      {rows.map((row) => (
        <li key={`${row.index}-${row.date}`}>
          <div
            data-txn-card
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            className="flex min-h-[56px] items-center gap-3 px-3 py-2.5"
          >
            <Monogram desc={row.description} cat={row.category} size={32} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] text-text">{normaliseMerchant(row.description)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted">{formatDate(row.date, { short: true })}</span>
                <CategorySelect
                  value={row.category}
                  onChange={(next) => onCategoryChange(row.index, next, row.description)}
                />
              </div>
            </div>
            <span className="shrink-0 font-mono text-[13px] font-medium text-text">
              {formatCurrency(row.amount)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

`formatDate(date, { short: true })` renders `3 May` (no year). Add the option to `format.ts` and extend its test in Task 4 with a case for it.

- [ ] **Step 4: Swap table for cards below `sm`**

In `Transactions.tsx`:

```tsx
<div className="hidden sm:block">
  <TransactionTable {...tableProps} />
</div>
<div className="sm:hidden">
  <TransactionCards rows={rows} onRowClick={setOpen} onCategoryChange={handleCategoryChange} />
</div>
```

Both render the same `rows`, so sorting and filtering stay in sync automatically.

- [ ] **Step 5: Make the drawer a bottom sheet below `sm`**

In `TransactionDrawer.tsx`, read a `useMediaQuery("(min-width: 640px)")` hook and pass `side={wide ? "right" : "bottom"}`. Create the hook at `frontend/src/hooks/useMediaQuery.ts` using `matchMedia` with an `addEventListener("change")` subscription and an initial value read in `useState`'s initialiser so there is no flash on mount.

- [ ] **Step 6: Apply the breakpoint rules**

- `AppShell`: `mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8`
- `Sidebar`: `hidden md:flex`, and force the collapsed variant at `lg` and below via `useMediaQuery("(max-width: 1024px)")`
- `MobileNav`: `md:hidden`
- `Overview`'s chart grid: already `grid-cols-1 lg:grid-cols-[...]` — verify it stacks at 768
- `MetricGroup`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — verify one column at 390
- Hero `Metric`: add `max-[400px]:text-[32px] max-[400px]:leading-[36px]`
- `PageHeader`: already wraps; verify the actions drop below the title at 375

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd frontend && npm run test -- responsive`
Expected: PASS, all four cases.

- [ ] **Step 8: Check all seven widths by hand**

In devtools, step through 1440, 1280, 1024, 768, 480, 390 and 375. At each: no horizontal scrollbar, no clipped text, no overlapping elements, every button at least 44×44 below 768. Record anything broken and fix it before committing.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components frontend/src/views frontend/src/hooks frontend/src/tests/responsive.test.tsx
git commit -m "feat(frontend): responsive pass across all seven breakpoints"
```

---

### Task 25: Accessibility pass

**Files:**
- Create: `frontend/src/components/shell/SkipLink.tsx`, `frontend/src/tests/a11y.test.tsx`
- Modify: `frontend/src/components/shell/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx`, `frontend/src/index.css`

**Interfaces:**
- Consumes: `jest-axe` (install: `npm i -D jest-axe @types/jest-axe`)
- Produces: `<SkipLink />`

Spec §32 requirements, each with a test rather than a manual promise: keyboard reachability, visible focus, labelled controls, live regions for async state, and contrast.

Colour contrast is checked against the exact palette values from spec §5, in code, so a future token edit that breaks WCAG AA fails the build rather than shipping.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/a11y.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Metric } from "@/components/data/Metric";
import { EmptyState } from "@/components/data/EmptyState";
import { TransactionTable } from "@/components/data/TransactionTable";
import { SkipLink } from "@/components/shell/SkipLink";

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette contrast", () => {
  const dark = { bg: "#08090D", surface: "#0D1017", text: "#F5F7FA", text2: "#9AA3B2", muted: "#697386", accent: "#E3B341" };
  const light = { bg: "#FBFBFA", surface: "#FFFFFF", text: "#0B0D12", text2: "#4B5565", muted: "#6F7A8B", accent: "#A9761B" };

  it("body text clears AA in dark mode", () => {
    expect(contrast(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark.text2, dark.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("body text clears AA in light mode", () => {
    expect(contrast(light.text, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.text2, light.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text clears AA for large text in both modes", () => {
    expect(contrast(dark.muted, dark.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(light.muted, light.bg)).toBeGreaterThanOrEqual(3);
  });

  it("the accent is legible on its own background in both modes", () => {
    expect(contrast(dark.accent, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.accent, light.bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("axe", () => {
  it("finds no violations in a metric", async () => {
    const { container } = render(<Metric label="Total spent" value="₹2,381" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("finds no violations in an empty state", async () => {
    const { container } = render(<EmptyState title="Nothing here" body="Upload a statement." />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("finds no violations in the ledger", async () => {
    const { container } = render(
      <TransactionTable
        rows={[
          { index: 0, date: "2026-05-03", description: "Swiggy", amount: 480, category: "Food & Dining", type: "debit" },
        ]}
        sort="date-desc"
        onSortChange={() => {}}
        onCategoryChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SkipLink", () => {
  it("targets the main region", () => {
    const { container } = render(<SkipLink />);
    expect(container.querySelector("a")).toHaveAttribute("href", "#main");
  });

  it("is hidden until focused", () => {
    const { container } = render(<SkipLink />);
    expect(container.querySelector("a")!.className).toContain("sr-only");
    expect(container.querySelector("a")!.className).toContain("focus:not-sr-only");
  });
});
```

Register the matcher in `src/tests/setup.ts`:

```ts
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- a11y`
Expected: FAIL — `Failed to resolve import "@/components/shell/SkipLink"`.

- [ ] **Step 3: Create `frontend/src/components/shell/SkipLink.tsx`**

```tsx
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-[8px] border border-border-strong bg-elevated px-3 py-2 text-[13px] text-text focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>
  );
}
```

- [ ] **Step 4: Apply the landmark structure**

In `AppShell.tsx`: `<SkipLink />` first, then `<Sidebar>` inside `<nav aria-label="Main">`, `<Topbar>` inside `<header>`, and the routed view inside `<main id="main" tabIndex={-1}>`. `tabIndex={-1}` is what lets the skip link actually move focus.

- [ ] **Step 5: Audit every interactive element**

Run this and fix each hit:

```bash
grep -rn "onClick" frontend/src/components frontend/src/views | grep -v "aria-label\|>{" 
```

Rules: an icon-only control needs `aria-label`; a `div` with `onClick` becomes a `button` or gains `role` + `tabIndex` + a keydown handler; a toggle carries `aria-pressed`; a disclosure carries `aria-expanded`.

- [ ] **Step 6: Add the live regions**

- Upload progress: `role="status" aria-live="polite"` — already in `ProgressStages`
- Errors: `role="alert"` — already in `ErrorState`
- Toast: add `role="status" aria-live="polite"`
- Ledger result count: wrap the "12 of 40" span in `aria-live="polite"` so filtering announces

- [ ] **Step 7: Verify focus visibility**

The `:focus-visible` rule from Task 2 gives a 2px accent outline at 2px offset. Tab through every view and confirm the ring is visible on every control against both `--surface` and `--surface-2`. This is the third sanctioned accent role.

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npm run test -- a11y`
Expected: PASS, all three groups. If a contrast assertion fails, the palette is wrong — fix the token, not the test.

- [ ] **Step 9: Keyboard walkthrough**

With the mouse untouched: Tab from page load to the skip link, into the nav, through the topbar, into the ledger; open a row with Enter; close the drawer with Escape; open the palette with ⌘K, navigate with arrows, select with Enter. Every step must be possible and every focused element visible.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components frontend/src/tests/a11y.test.tsx frontend/src/tests/setup.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): accessibility pass with contrast, landmark and axe coverage"
```

---

### Task 26: Performance pass

**Files:**
- Modify: `frontend/src/App.jsx`, `frontend/vite.config.js`
- Create: `frontend/src/components/data/LazyChart.tsx`
- Test: `frontend/src/tests/perf.test.tsx`

**Interfaces:**
- Produces: `<LazyChart height>{children}</LazyChart>`

Spec §33 targets. Three concrete changes, in the order they pay off:

1. **Route-split the admin console and Recharts.** The admin bundle is dead weight for every non-admin visitor, and Recharts is the single largest dependency. Both become `React.lazy` imports.
2. **Defer chart mount until visible.** `LazyChart` uses `IntersectionObserver` to hold a skeleton until the chart scrolls into view, so the daily chart does not block the hero.
3. **Split the vendor chunk** so the React runtime caches independently of app code.

Virtualisation is deliberately **not** added: the largest observed analysis is 60 rows, and `react-window` would cost more in complexity and broken `Ctrl+F` than it saves. Revisit past ~300 rows.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/perf.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LazyChart } from "@/components/data/LazyChart";

let observed: (entries: Partial<IntersectionObserverEntry>[]) => void;

beforeEach(() => {
  window.IntersectionObserver = vi.fn().mockImplementation((cb) => {
    observed = cb;
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }) as unknown as typeof IntersectionObserver;
});

describe("LazyChart", () => {
  it("shows a skeleton before the chart is visible", () => {
    const { container } = render(
      <LazyChart height={240}>
        <div data-testid="chart" />
      </LazyChart>,
    );
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(container.querySelectorAll(".shimmer").length).toBeGreaterThan(0);
  });

  it("mounts the chart once it intersects", () => {
    render(
      <LazyChart height={240}>
        <div data-testid="chart" />
      </LazyChart>,
    );
    observed([{ isIntersecting: true }]);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("reserves the final height so nothing shifts on mount", () => {
    const { container } = render(
      <LazyChart height={240}>
        <div data-testid="chart" />
      </LazyChart>,
    );
    expect(container.firstChild).toHaveStyle({ height: "240px" });
  });

  it("renders immediately when IntersectionObserver is unavailable", () => {
    // @ts-expect-error deliberately removing the API
    delete window.IntersectionObserver;
    render(
      <LazyChart height={240}>
        <div data-testid="chart" />
      </LazyChart>,
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm run test -- perf`
Expected: FAIL — `Failed to resolve import "@/components/data/LazyChart"`.

- [ ] **Step 3: Create `frontend/src/components/data/LazyChart.tsx`**

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SkeletonChart } from "./Skeleton";

/** Holds the final height from the first paint, so mounting shifts nothing. */
export function LazyChart({ height, children }: { height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible || !ref.current || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ height }}>
      {visible ? children : <SkeletonChart height={height} />}
    </div>
  );
}
```

- [ ] **Step 4: Route-split in `App.jsx`**

```jsx
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AdminLogin = lazy(() => import("./components/admin/AdminLogin"));
const Overview = lazy(() => import("./views/Overview").then((m) => ({ default: m.Overview })));
const Transactions = lazy(() => import("./views/Transactions").then((m) => ({ default: m.Transactions })));
const Vendors = lazy(() => import("./views/Vendors").then((m) => ({ default: m.Vendors })));
const Insights = lazy(() => import("./views/Insights").then((m) => ({ default: m.Insights })));
const Rewards = lazy(() => import("./views/Rewards").then((m) => ({ default: m.Rewards })));
const CommandPalette = lazy(() =>
  import("./components/shell/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);
```

Wrap the routed area in `<Suspense fallback={<SkeletonTable rows={6} cols={4} />}>`. `Upload` stays eagerly imported — it is the first screen a new visitor sees and lazy-loading it would add a spinner to the critical path.

The palette (spec §18 names it explicitly) pulls in `cmdk` and only ever renders after a deliberate ⌘K or a click on the search trigger, so mount it behind its own boundary with **no fallback** — a skeleton for an overlay that has not opened yet would flash on screen:

```jsx
{paletteOpen && (
  <Suspense fallback={null}>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
  </Suspense>
)}
```

Keep the ⌘K keydown listener in `App.jsx`, not inside `CommandPalette` — the listener has to exist before the chunk loads or the first shortcut press does nothing.

- [ ] **Step 5: Split the vendor chunk**

In `vite.config.js`, add to `build`:

```js
rollupOptions: {
  output: {
    manualChunks: {
      react: ["react", "react-dom"],
      charts: ["recharts"],
      motion: ["framer-motion", "gsap", "lenis"],
    },
  },
},
```

- [ ] **Step 6: Wrap the charts**

In `Overview.tsx`, wrap `<CategoryDonut>` and `<DailySpend>` in `<LazyChart height={260}>`. Leave `SpendTrend` eager — it sits in the hero and is above the fold.

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd frontend && npm run test -- perf`
Expected: PASS, all four cases.

- [ ] **Step 8: Measure**

```bash
cd frontend && npm run build
```

Record the reported chunk sizes. The initial JS chunk (excluding lazy routes) should be under 200 KB gzipped. Then run a Lighthouse pass on the built preview (`npm run preview`) and record Performance, Accessibility and Best Practices. If Accessibility is below 100, fix it here rather than deferring.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/App.jsx frontend/vite.config.js frontend/src/components/data/LazyChart.tsx frontend/src/views/Overview.tsx frontend/src/tests/perf.test.tsx
git commit -m "perf(frontend): route-split admin and charts, defer offscreen chart mount"
```

---

### Task 27: Decommission ExpenseManager and final QA

**Files:**
- Delete: `frontend/src/components/ExpenseManager.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/index.css`
- Test: `frontend/src/tests/app.test.tsx`

**Interfaces:** none new — this task removes code and proves nothing regressed.

`ExpenseManager.jsx` has been progressively emptied by Tasks 14–19. This task confirms every one of its responsibilities has a new home, then removes it. If any behaviour is still only in that file, it is ported here before deletion — **not dropped**.

- [ ] **Step 1: Inventory what is left**

```bash
grep -n "const \|function \|useMemo\|useState\|onClick\|onChange" frontend/src/components/ExpenseManager.jsx
```

For each result, name the file that now owns it. The expected mapping:

| Old responsibility | New home |
|---|---|
| `CAT_META` | `lib/categories.ts` |
| `TRANSACTIONS` normalisation | `lib/derive.ts` → `normaliseTransactions` |
| `categoryTotals`, `totalSpent` | `lib/derive.ts` |
| `dailyData` | `lib/derive.ts` → `dailySeries`, `dailyBreakdown` |
| `vendorMap`, `topVendors`, `recurringPayees` | `lib/derive.ts` |
| Transaction table + filters | `views/Transactions.tsx` |
| Donut + bar charts | `components/charts/*` |
| Insight cards | `views/Insights.tsx` |
| Rewards panel mount | `views/Rewards.tsx` |
| Theme toggle | `components/shell/ThemeToggle.tsx` |
| Category edit + toast | `views/Transactions.tsx` + `Toast.tsx` |

Anything not on this list must be ported before Step 4.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/tests/app.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

vi.mock("@/services/geminiService", () => ({
  analyzeStatements: vi.fn(),
  analyzeStatementsV2: vi.fn(),
}));

describe("App routing", () => {
  beforeEach(() => {
    window.location.hash = "";
    sessionStorage.clear();
  });

  it("renders the shell without an analysis loaded", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());
  });

  it("does not redirect during render when hitting an admin route", async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
    window.location.hash = "#/admin/dashboard";
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/admin/login"));
    expect(errors.filter((e) => String(e).includes("Cannot update"))).toHaveLength(0);
    spy.mockRestore();
  });

  it("sends an authenticated admin away from the login route", async () => {
    sessionStorage.setItem("admin_token", "t");
    window.location.hash = "#/admin/login";
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/admin/dashboard"));
  });

  it("falls back to overview for an unknown dashboard sub-route", async () => {
    window.location.hash = "#/dashboard/nonsense";
    render(<App />);
    await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd frontend && npm run test -- app`
Expected: FAIL — the render-phase redirect logs a React warning, or `ExpenseManager` still mounts and throws without data.

- [ ] **Step 4: Remove the file and its imports**

```bash
grep -rn "ExpenseManager" frontend/src
```

Remove every import and mount, then delete the file. `App.jsx` should now route straight to the `views/` components.

- [ ] **Step 5: Clean the stylesheet**

Delete any rule in `index.css` that no longer matches anything. Verify with:

```bash
grep -rn "app-card-bg\|app-toggle-bg\|app-shimmer-bg\|counter\|spin-glow\|pulse-glow" frontend/src
```

Every `--app-*` variable with zero remaining consumers is removed; the compatibility layer added in Task 2 was scaffolding for the migration and its job is done here. `@keyframes shimmer` and `.shimmer` stay — the skeletons use them.

- [ ] **Step 6: Run the full suite**

```bash
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```

All four must pass. A failure here is a real regression, not a flaky test.

- [ ] **Step 7: Full manual QA against spec §21**

Walk the whole product with a real statement and confirm each item:

- [ ] Upload a PDF; all five stages advance from server events
- [ ] Upload a password-protected PDF; prompt appears, wrong password shows retry copy, right one proceeds
- [ ] Overview: one hero figure, delta present only with a prior statement for the same bank
- [ ] Period selector offers only ranges the data covers; changing it re-animates the hero once
- [ ] Donut click deep-links into the filtered ledger
- [ ] Daily chart click filters to that day; tooltip clears on pointer-out
- [ ] Ledger: search, category filter, both sorts; row opens the drawer
- [ ] Drawer shows only real fields; no card number, no reference, no status
- [ ] Category edit persists; apply-all updates every matching row
- [ ] Vendors: share bars, recurring section, drill-through
- [ ] Insights: no emoji, no raw hex, deep links work
- [ ] Rewards: point total, stated valuation, per-transaction breakdown
- [ ] Admin: login, stats, table, CSV export, view, delete, settings, audit log, API usage
- [ ] ⌘K: opens, searches merchants and categories, navigates
- [ ] Theme toggle: every view correct in both modes
- [ ] Reduced motion: no scroll smoothing, no transitions, no count-up
- [ ] All seven breakpoints: no horizontal scroll, no clipping
- [ ] Keyboard-only: every action reachable, focus always visible
- [ ] Zero emoji anywhere in the interface
- [ ] Zero raw error strings on screen; disconnect the backend and confirm the copy is human

- [ ] **Step 8: Commit**

```bash
git add frontend/src frontend/src/tests/app.test.tsx
git rm frontend/src/components/ExpenseManager.jsx
git commit -m "refactor(frontend): decommission ExpenseManager and clean legacy tokens"
```

---

## Verification

The plan is complete when all of the following hold from a clean checkout:

```bash
cd frontend && npm ci && npm run lint && npm run typecheck && npm run test && npm run build
```

- `npm run lint` — no errors, no warnings
- `npm run typecheck` — no errors
- `npm run test` — every suite green
- `npm run build` — succeeds; initial JS chunk under 200 KB gzipped
- Lighthouse on `npm run preview` — Accessibility 100, Performance ≥ 90
- Every item in Task 27 Step 7 checked
- `git log --oneline` shows one commit per task, in order
- No file under `backend/`, `frontend/src/services/`, `frontend/src/auth/` or `vercel.json` modified
