# TrackMySpend 2.0 — Real-Time 3D Student Finance World

TrackMySpend 2.0 is a single-canvas, real-time 3D personal finance and expense tracker built with **Vite + React 18 + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`) + Zustand + GSAP + Maath**.

**Prime Rule — Real Data Only:** There is zero seed/demo data, zero hardcoded numbers, and zero mock charts. Everything shown across all 10 3D stations and Simple View is computed from pure functions in `src/lib/calc.ts` driven solely by the user's real inputs stored locally under `trackmyspend-v3` (legacy `trackmyspend-v2` is automatically purged on first load).

## Quick Start

```bash
npm i
npm run dev
```

Verification & production commands:

```bash
npm run check:no-mock   # Fails if seed.*, unauthorized Math.random(), or hardcoded ₹ values exist
npm test                # Vitest unit tests for src/lib/calc.ts
npm run typecheck       # Strict TypeScript check (no implicit any)
npm run build           # Runs check:no-mock + tsc -b + vite build
```

## 10-Station Guided User Flow

0. **Intro (`Intro.tsx`)** — Clean title safe zone above lowered translucent rings, gradient smartphone screen (showing user's real balance once Money setup is completed), and the Capsule Glass **"Get started"** CTA button.
1. **Money (`Money.tsx`)** — Asks *"How much money do you have right now?"* with `₹` prefix, optional monthly income/allowance, period presets (*This month* / *Until a date I choose*), and optional overall spending limit. Scrolling past Station 1 is locked until saved, with lock icons (`🔒`) and a *"Enter your money to continue"* hint on the dock.
2. **Add (`AddExpense.tsx`)** — Two-column in-world glass workspace: Expense/Income form (validated positive amount up to ₹10,00,00,000 with max 2 decimals, date capped at today, Cash/UPI/Card, optional note) paired with a live newest-first list with inline Edit & Delete and entry counter.
3. **Overview (`Overview.tsx`)** — Three glass panels (**Current Balance**, **Spent This Period**, **Safe To Spend / Day**) computed strictly by `computeOverview()`, with pulsing health orbs and an empty-entries CTA.
4. **Budgets (`BudgetRings.tsx`)** — Concentric liquid-light rings strictly for user-budgeted categories (`<80%` green, `80–100%` amber, `>100%` red), empty ghost frame when no budgets exist, unbudgeted spent list with *"Set budget"* actions, and in-world editor.
5. **Analytics (`Analytics.tsx`)** — Unified `getWindow(range)` for Week (7d), Month (30d), and Semester (180d) ending today: bars include zero-spend days, cyan 7-day moving average line computed from the exact same bars, and a 3D donut whose percentages sum to **100.00%**.
6. **Goals (`Goals.tsx`)** — Starts empty; create glass cylinder jars with custom GLSL sine-wave emerald liquid shaders. Deposits transfer out of `currentBalance` (capped at `currentBalance`), withdrawals return funds (capped at `saved`), 100% triggers a celebration halo, and confirmed deletion returns saved funds to `currentBalance`.
7. **History (`Transactions.tsx`)** — Non-overlapping card row (`1.26×` card-width spacing), centered active card, dynamic filter chips only for categories present in real data, search bar, drag/wheel/arrow-key navigation, ellipsis truncation with hover tooltip, and 180° flip Edit/Delete with confirmation.
8. **Insights (`Insights.tsx`)** — Rule-based insights (`Need 3+ days of data` for daily avg/projection/runway, `Need 14 days of data` for week-over-week), saving suggestions restricted strictly to flexible categories (`Food`, `Entertainment`, `Shopping`, `Transport`, `Other`), plus readable glass **Subscriptions** cards with *"Auto-log on due date"*.
9. **Outro (`Outro.tsx`)** — High-altitude world overview with **Export CSV**, **Export JSON Backup**, **Import JSON Backup**, typed `"RESET"` confirmation (wiping persisted data and returning to Step 2 Money), Effects toggle (`High` / `Low`), and a visible **`Data: local only`** badge.

## Decisions

- **No Optional Demo Mode:** Skipped optional Demo Mode so the app strictly enforces real user data with zero mock fixtures anywhere outside `src/lib/calc.test.ts`.
- **`daysElapsed` and `daysLeft` Definition:** `daysElapsed = max(1, daysBetween(periodStart, today))` and `daysLeft = max(0, daysBetween(today, periodEnd))` using local calendar dates via `Date.UTC` to avoid DST/timezone drift across month and year rollovers.
- **Exact 100% Donut Allocation:** `computeExactDonut()` uses the Largest Remainder Method at 2-decimal precision (`10,000` basis points) so slice percentages always sum to `100.00%`.
- **Fixed Viewport HTML Portal (`WorldHtml.tsx`):** `@react-three/drei`'s `<ScrollControls>` rebinds R3F `events.connected` to the scrolling container, which shifts `position: absolute; top: 0` `<Html>` overlays off-screen on stations > 0. Portalling all in-world `<Html transform>` layers into a fixed viewport `.html-portal` div keeps every form crisp, interactive, and accurately matrix-tracked at every station.
- **Zero Ghost Overlap Isolation:** `ActiveStations` mounts only `Math.abs(current - idx) <= 1` (plus all stations during the Station 9 aerial pull-back), while `StationGroup` fades opacity to `0` and sets `visible = false` beyond `0.78` station steps, and `<WorldHtml>` mounts only when `selectedStation === index`.
- **GSAP Real-Time Flights:** `gsap.ticker.lagSmoothing(0)` ensures camera flights finish in consistent wall-clock time even on lower-FPS GPUs.

## Acceptance Test Results (Verified End-to-End via Headless Chrome)

Executed manually & automatically against `http://localhost:5180/` with zero console errors:

1. **Clear site data & legacy purge:** Legacy `trackmyspend-v2` automatically deleted (`v2Gone: true`), 0 mock numbers anywhere, Goals/History/Subscriptions/Budgets empty, scroll locked on Money (`lockedCount: 8`). ✅
2. **Money setup (`₹10,000`, end of month):** Scroll unlocked (`lockedCount: 0`), Overview displayed `Current Balance: ₹10,000`, `Spent This Period: ₹0`. ✅
3. **Add 3 real expenses (`Food ₹250`, `Transport ₹100`, `Rent ₹3,000`):** Current Balance updated to `₹6,650`, Spent `₹3,350`, History showed exactly 3 entries, Analytics Week donut showed **Rent 89.55%**, **Food 7.46%**, **Transport 2.99%** (sum = `100.00%`), Budgets showed 0 rings. ✅
4. **Food budget (`₹500`) + extra `Food ₹300`:** Ring showed `₹250 / ₹500 (50%)` green, then immediately updated to `₹550 / ₹500 (110%)` red after adding `₹300`. ✅
5. **Goal transfer (`Laptop`, target `₹20,000`):** Depositing `₹1,000` reduced Current Balance from `₹6,350` to `₹5,350`; withdrawing `₹1,000` returned Current Balance to `₹6,350`. ✅
6. **Delete Rent (`₹3,000`):** Current Balance immediately returned to `₹9,350`, Spent updated to `₹650`, and Safe To Spend / Day updated to `₹1,558.33`. ✅
7. **Reload & Typed `RESET`:** Reloading persisted exact state (`₹9,350` / `₹650` / `₹1,558.33`); typing `RESET` cleared all data (`txCount: 0`, `setupComplete: false`) and re-locked scroll at the Money station (`lockedCountAfterReset: 8`). ✅
