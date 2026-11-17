<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Audit & fixes — branch `fix/audit-findings` (2026-11-10)

Three full-repo audits were run on `develop`. Every finding below was fixed on `fix/audit-findings`, then covered by tests. Keep these rules when you change the related code.

## Rules future changes must keep

### Payments (`src/controllers/transactionController.ts`, `src/app/api/transactions/generate`, `src/app/api/webhooks/midtrans`)
- The charge amount comes from the server: `PLAN_PRICES[subscription.planType]` in `transactions/generate/route.ts`. Never read `amount` from the request body. Keep the prices in sync with `PLAN_CONFIG` in `src/components/subscription/payment/payment-screen.tsx`.
- `verifyMidtransSignature` returns `false` when `MIDTRANS_SERVER_KEY` is empty, and compares with `timingSafeEqual`.
- The webhook and the status polling both go through `resolveTransactionStatus` and `applyTransactionStatus`. Do not copy the status mapping again.
- A transaction is never marked COMPLETED when `gross_amount` differs from the stored `transaction.amount`.
- COMPLETED is final. A late or replayed `expire`/`pending` notification is ignored.
- On COMPLETED, `applyTransactionStatus` also syncs `TransactionLedger`, activates an UNPAID subscription, and calls `lockCurrentWeeklyBox`. This creates deliveries even if the user closed the payment tab.

### Subscriptions (`src/controllers/subscriptionController.ts`)
- `GET /api/subscriptions`: only admins get the subscriber list. Everyone else gets `{ data: [], goals }`.
- `planType` and `servings` can change only while the status is UNPAID. `goalId` can always change.
- Cancelling does not set CANCELLED right away. It sets `endDate` (end of cycle, month-end clamped by `addMonthsClamped`).
- There is no cron job. `refreshSubscriptionStatus(userId)` does the time-based transitions (endDate passed → CANCELLED, pausedUntil passed → ACTIVE). Call it before reading or acting on a subscription's status; `getMySubscription` and `lockCurrentWeeklyBox` already do.
- `Subscription.userId` is unique, so re-subscribing after a cancel reuses the same row with `upsert`.

### Weekly box, meals, deliveries
- The only meal-save path is `POST /api/subscriptions/weekly-menu` → `saveWeeklyMenuSelections`. It checks `status === 'PENDING_SELECTION'`, `selectionDeadline` not passed, and recipes in that week's menu. The unused duplicates `/api/meal-selections` and `/api/weekly-menu` were deleted; don't add a second save path.
- `skipWeeklyBox` uses a conditional `updateMany where status = PENDING_SELECTION` (409 if a lock won) and refuses after `selectionDeadline`.
- `lockCurrentWeeklyBox` requires an ACTIVE subscription (402 otherwise). It claims the box with a conditional `updateMany`, so a double lock creates deliveries once. It uses `AddressSchedule` per day+meal, with the default address as fallback.
- Times of day use Jakarta time (UTC+7): use `atJakartaTime` / `addDays` / `jakartaDayOfWeek` from `src/lib/week.ts`, never `setHours` or `getDay()`. "Today" for deliveries and admin KPIs is `atJakartaTime(new Date(), 0)`. Deliveries are 11:30 (lunch) and 17:30 (dinner); the deadline is Sunday 18:00. Known limit: week boundaries (`getStartOfWeek`) still use the server clock, and moving them needs a data migration.

### Stock, ledger, purchase orders
- Stock changes are atomic: `{ increment }` or a conditional `updateMany`. Never read stock, add to it, then write the total back.
- `fulfillPO` claims the PO with `updateMany where status in [DRAFT, CONFIRMED]`. A second fulfill gets 409 and adds no stock.
- Ledger `code` is `@unique`: build it from `crypto.randomUUID().slice(0, 8)`, never from a 4-digit random number.
- Numeric input is checked with `Number.isFinite`, not `isNaN`, so `"Infinity"` is rejected.
- Bulk import writes a ledger row in the same transaction as each stock update.
- Nutritionists can set the initial stock of a new ingredient, but `PATCH /api/nutritionist/ingredients/[id]` ignores `stockKg`. A stale form value would overwrite restocks. Stock changes go through admin restock/adjust-stock.

### Admin, auth, uploads
- Role checks go through `src/lib/auth.ts`: `verifyRole(userId, role)` (ADMIN also passes NUTRITIONIST, same as `src/proxy.ts`) or `verifyRequestRole(req, role)` / `verifyAdminRequest(req)`. Do not add another local `verifyAdmin` / `verifyNutritionist` copy.
- When an admin edits a delivery's address, create a new `Address` row (`label: 'Manual Admin'`, `isDefault: false`). Never `update` the customer's saved address.
- An admin menu edit matches the meal selection by `dayOfWeek` + `mealType`, and matches the recipe name exactly (`equals`).
- `GET` admin deliveries must not write anything. The old backfill was removed.
- A recipe used by a weekly menu or a meal selection cannot be deleted (409). Otherwise its `RecipeIngredient` rows are deleted first, in the same transaction.
- `/api/upload` needs a NUTRITIONIST or ADMIN session, accepts only jpeg/png/webp/gif up to 5 MB, and takes the extension from the MIME type. Known limit: it writes to `public/uploads`, which is read-only on Vercel.
- Google OAuth uses a `state` cookie (`oauth_state`) that the callback checks. It requires `email_verified` from Google. When it links to an existing account that never verified its email, it clears that account's password, because whoever registered it may not own the email.
- Password reset tokens are stored as SHA-256 hashes. The email gets the raw token. Never log the reset link.
- Route handlers read the session through `getSessionUserId` (`src/lib/session.ts`), not their own `jwtVerify`.
- An address used by a delivery cannot be deleted (`Delivery.addressId` has no `onDelete`): the API returns 409.
- `src/proxy.ts` matcher includes `/subscription/:path*`, so subscription pages require login.

### Forecast service (`services/forecasting`)
- `/forecast`, `/forecast/save` and `/forecast/actual` require the header `X-Internal-Key: $FORECAST_INTERNAL_KEY`. The Next.js side sends it from `forecastingController.ts`. `/health` stays open. CORS was removed.
- When several farmers sell one ingredient, only the cheapest farmer gets the deficit.
- `database.py` forces the `postgresql+psycopg2://` driver, because SQLAlchemy 2.1 otherwise expects psycopg v3.

### Database and config
- No hardcoded database URL anywhere. `src/lib/prisma.ts` throws when `DATABASE_URL` is missing, on the first query (the client is created lazily, so `next build` can collect page data without the variable). Scripts in `scripts/` read `process.env.DATABASE_URL`; run them with `node --env-file=.env scripts/<name>.js`.
- Every schema change needs a migration. `prisma/migrations/20261110000000_catch_up_schema_drift` adds what was earlier applied to prod with `db push` (Recipe nutrition columns, PO forecast columns, `IngredientLedger.purchaseOrderId`, `AddressSchedule`, enum `PO_FULFILLMENT`). It is idempotent (`IF NOT EXISTS`), so it is a no-op on prod.

### Admin and nutritionist panels (UI rework, 2026-11-17)
- Both panels use `PortalShell` and `PageHeader` from `src/components/operations/portal-shell.tsx` (sidebar layout). Styles live in `role-portal-screen.module.css`. In that file, `.actionCard` is the primary button and `.tabButton` is the secondary button; the old names were kept because many tabs use them.
- No emoji anywhere in the panels, and no hand-written `<svg>`. Use `lucide-react` icons.
- Show only numbers that come from the database. The hardcoded KPIs, fallbacks (`|| 128`, `|| 14850`, `Math.max(1, …)`) and placeholder cards were removed. Do not add them back.
- `GET /api/admin/ledgers/ingredients` returns `kpis: { currentStockKg, lowStockCount }` only. `getAdminReports` still computes invented deltas and rates; the UI no longer shows them.
- Activity icons from `getAdminDashboardStats` are the keys `user`, `delivery`, `payment` (not emoji).
- Prediksi AI: a CONFIRMED PO gets a "Terima panen" button that opens `FulfillModal` and calls `POST /api/admin/forecast/[poId]/fulfill` with `actualReceivedQtyKg`. Ported from `feat/DFA` into the panel styles; that branch's own copies of `ForecastingPage`, `FarmerGroup` and `IngredientRow` are superseded.

### Customer flow (rework, 2026-11-17)
- Checkout pages (select-plan, delivery-address, weekly-menu, payment) use `CheckoutLayout` from `src/components/subscription/checkout-layout.tsx` (step indicator Paket, Alamat, Menu, Bayar). Signed-in pages (subscription, delivery, payment history, profile and its subpages) use `CustomerPage` from `src/components/ui/customer-page.tsx`.
- Customer UI is Indonesian, with no emoji and no hand-written `<svg>`; use `lucide-react`.
- The delivery address form takes recipient name and phone (pre-filled from `/api/auth/me`, never from `profileMockData`) and only offers DKI JAKARTA, JAWA BARAT and BANTEN (`SERVICE_PROVINCES`).
- `applyTransactionStatus(id, status, paymentMethod?)` creates the `TransactionLedger` row (code `TRX-xxxxxxxx`, reference `INV/FF/<order tail>`) when none exists yet, so Snap payments show up in admin Pencatatan.
- Delivery ETA follows the meal slot: lunch about 11.30, dinner about 17.30 WIB (`slotTime` in `deliveryController.ts`). One `Delivery` row exists per portion, so the tracking page groups them per meal with a portion count.
- `src/proxy.ts` also protects `/onboarding` and `/delivery`; role redirects go to `/unauthorized`.
- Known mismatch, not fixed on purpose: select-plan multiplies the price by servings (`calculatePrice`), but the server charges the flat `PLAN_PRICES`. The team must pick one.

## Environment variables
- `DATABASE_URL`: required. Set it in `.env` locally and in Vercel project settings.
- `FORECAST_INTERNAL_KEY`: required. Use the same random value for the Next.js app and the Python service, or forecasting returns 401.
- `MIDTRANS_SERVER_KEY`: required. If it is empty, every webhook is rejected.

## Tests
- `tests/unit/flows/*.test.ts` (522 tests) cover payment, subscriptions, weekly box and meals, admin and stock, auth and uploads. They mock `@/lib/prisma` and never touch a database. `jose` is ESM-only and fails to load under this Jest config, so these tests mock `@/lib/session`.
- `tests/unit/guard-test-db.ts` stops Jest unless `DATABASE_URL` points at localhost, because the older `tests/unit/*.test.ts` write real rows.
- Run the mocked tests: `DATABASE_URL=postgresql://u:p@localhost:5432/x npx jest tests/unit/flows`
- Python (47 tests): `python -I -m pytest services/forecasting/tests -q`. Install `services/forecasting/requirements.txt` plus `pytest httpx` first.
- ESLint allows `require()` in `tests/**`, because `jest.mock` factories need it.

## Removed
`src/app/api/test`, `src/app/api/test-kpi`, the `auth/verify-email` stub, the unused `src/app/api/meal-selections` and `src/app/api/weekly-menu` (with `mealSelectionController`, `weeklyMenuController`, `schemas/mealSelection`), stray `ts_errors*.txt` / `remaining_routes.txt`, the dead `createTransaction`, `src/lib/cache.ts`, `scratch/`, the one-off `scripts/fix-jsx*.js` and `scripts/update-*.js`, the unused landing sections in `src/components/landing/` (the landing page lives entirely in `src/app/page.tsx`; only `navbar` and `footer` remain) plus `ui/cta-button`, `hooks/use-cta-navigation` and their constants/animations/types, the one-off DB scripts (`apply-*`, `add-*`, `check-*`, `get-real-ingredients`, `fix-active-subscriptions`, `run-unit-tests`), the unused dependencies `jsonwebtoken`, `googleapis`, `jsqr`, `midtrans-client`, `qrcode` (+ their `@types`), and `playwright-report/` from git (now in `.gitignore`).
Third pass: the never-reachable email-verification UI in `auth-screen.tsx` and its stub `api/auth/resend-verification`, `components/delivery/delivery-mock-data.ts` (only its types were used; they now live in `delivery-types.ts`), the uncalled `api/deliveries/[id]` + `getDeliveryById`, unused `ui/check-icon` and `ui/star-row`, unused `src/types/*` files (only `address` and `NutritionalProfileData` remain), `schemas/transaction.ts`, `getWeekRange`, and four copies of the day-of-week mapping (now `jakartaDayOfWeek`).
`src/middleware.ts` was renamed to `src/proxy.ts` (function `proxy`), the Next 16 convention.

## Still open
- The old database password is still in git history. Rotate it in Supabase.
- `xlsx@0.18.5` has known advisories. It only parses files in the admin's browser.
- A meal save can race with a lock: the status check runs outside the transaction.
- No code path writes `USER_PURCHASE` ingredient-ledger rows any more (only the deleted, never-called `saveMealSelection` did). Add it to `saveWeeklyMenuSelections` if the ledger should show customer usage.
- Bulk import does not write a ledger row for newly created ingredients.
- Snap token reuse does not check whether the token has expired.
- Upload storage on Vercel (see above).
- A password reset does not end existing sessions (JWT lives 7 days, no server check).
- No rate limit on login or forgot-password.
- Nutritionists can edit or delete a weekly menu after customers picked meals from it.
