# Ivevar Management — Pre-Launch Deep QA Report

**Date:** 2026-11-03
**Build under test:** current `dist/` (commit `e3656c5`, fixes included)
**Environment:** isolated **local** copy (`wrangler dev --local`, fresh empty D1). **Production live data was never touched, read, modified, or seeded.**
**Method:** automated API harnesses + real-browser (Playwright/Chromium) UI testing across multiple users.

---

## 1. Summary / verdict

The application is in **strong, launch-ready shape**. Core money math, role-based access control (RBAC), payment-verification flow, currency-rate locking, and all of the recently requested features were tested adversarially and **passed**. Two genuine (minor) defects were found **and fixed**; both fixes are verified and already built into `dist/`.

| Area | Result |
|---|---|
| Baseline server suite (`fulltest`) | **52 / 52 PASS** |
| Money-math (currency, profit, commission, balance) | **15 / 15 PASS** (after fix) |
| RBAC + validation + edge data (10 users) | **41 checks PASS** |
| Real-browser UI (features + dashboard) | **PASS** |
| Order-number uniqueness under concurrency | **PASS** (10 parallel → 10 unique) |
| Bugs found | **2** (both FIXED) |
| Open blocker | Production deploy needs your approval (push was gated) |

---

## 2. Bugs found & fixed (BUG REGISTER)

### BUG-01 — Foreign-currency order could be mispriced ~88× (FIXED)
- **Severity:** Medium (financial correctness).
- **Where:** `2_core.js` → `fxRate()`.
- **Defect:** If an order's currency had **no configured exchange rate** (e.g. a rate blanked/removed in settings, or a currency added later), `fxRate()` fell back to **1**. A $2,000 order would then be valued at **₹2,000** instead of ~₹1,76,000 — a silent ~88× underpricing feeding straight into profit and commission.
- **Repro (local):** order `currency:'AUD'`, no AUD rate set → `orderValueINR` = 2000 (wrong).
- **Fix:** fallback changed to the USD rate (`usdRate()`), never 1. Same order now values at ₹1,76,000. Major currencies still use their own configured rate; this only changes the unsafe "no-rate" path.
- **Verified:** money-math suite case D now `176000` ✓.

### BUG-02 — Misleading "Sales share" preview for admins (FIXED)
- **Severity:** Low (UI consistency, no data impact).
- **Where:** `4_sales.js` → order form `sharePreview` field.
- **Defect:** When an **admin** opened the new-order form, it always showed a "Sales share 25%" preview, but a saved order's actual commission is `profit × commission% of the seller` — and admins have no commission %, so the stored order showed **0**. Preview said one thing, saved sheet said another.
- **Fix:** the preview now renders **only when the logged-in user actually has a commission %** (`commPctOf(ME.id) > 0`), exactly matching the saved profit sheet. Salary-only staff and admins see no share line; commissioned sales staff see their real %.
- **Verified (UI):** Ravi (25%) sees it; Gita (salary-only) does not. ✓

---

## 3. Feature verification (the changes you requested)

All confirmed working in a real browser against the built app:

| Requested feature | Result |
|---|---|
| Product photo upload **first** in the new-order form | ✅ first field "Product photo(s)" |
| Payment-method dropdown (PayPal/Zelle/Bank/Link/Crypto/Cash/Website) + **Other + specify** | ✅ |
| Payment screenshot upload in the form | ✅ |
| Making cost & courier typed in ₹, auto-shown in USD | ✅ |
| "Profit before marketing ($)" | ✅ |
| "Sales share %" shown **only** for staff put on commission | ✅ (per-user) |
| No "Sales executive" dropdown (logged-in seller fills it) | ✅ absent |
| Country / State / City worldwide dropdowns | ✅ |
| 12 colour themes | ✅ (Cream…Crimson) |
| Full-width page (no right-side empty space) | ✅ `.content` max-width none |
| Currency-rate editor discoverable in Settings | ✅ visible row |
| Currency rate **locked** — only admin can change | ✅ (see §4) |
| Payment confirmation by Accountant/CEO/admin only | ✅ (see §4) |
| Admin dashboard "Payments to confirm" card (amount, order, method, Approve) | ✅ |
| Default currency USD everywhere; toggle USD-first then INR | ✅ |

---

## 4. Role & access matrix (tested, 10 users)

Users exercised: Admin×2, CEO, Accountant, Sales×3 (one salary-only), Courier, Helper, Custom(orders+inventory), one deactivated.

| Action | Sales | Accountant | CEO | Admin | Correct? |
|---|---|---|---|---|---|
| Create order | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel / close order | ❌ 403 | — | ✅ | ✅ | ✅ |
| Add unverified payment (screenshot) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Verify** a payment | ❌ 403 | ✅ | ✅ | ✅ | ✅ |
| Change currency rates (`/api/settings`) | ❌ 403 | — | ❌ 403 | ✅ | ✅ (admin-only) |
| Create / manage users | ❌ 403 | — | — | ✅ | ✅ |
| Hard-delete records | ❌ 403 | — | — | ❌ financial | ✅ |
| Deactivate self | — | — | — | ❌ blocked | ✅ |
| Write outside own modules | ❌ 403 | — | — | — | ✅ |
| Dispatch without QC release | ❌ blocked | — | — | — | ✅ |
| Deactivated user login | ❌ blocked | | | | ✅ |

**Currency lock confirmed end-to-end:** neither Sales **nor CEO** can change fx rates — only an admin, from the admin panel, exactly as requested.

---

## 5. Financial reconciliation (worked example, verified)

Order: $2,000, locked rate ₹88, making ₹15,000, courier ₹2,000, $500 deposit.

| Figure | Expected | Computed | ✓ |
|---|---|---|---|
| Order value (INR) | 2000×88 = 176000 | 176000 | ✅ |
| Profit before marketing | 176000−15000−2000 = 159000 | 159000 | ✅ |
| Verified paid (deposit pending) | 0 | 0 | ✅ |
| Pending (unverified) shown separately | 500 | 500 | ✅ |
| After Accountant approves deposit → paid | 500 | 500 | ✅ |
| After approval → pending | 0 | 0 | ✅ |
| `verifiedBy` stamped on approval | yes | yes | ✅ |

Rounding (2-dp), negative-input safety, and multi-currency conversions all behave correctly.

---

## 6. Security & robustness

- **Auth:** 64-hex token, SHA-256 session hashing, 5-try lockout (15 min), HttpOnly/Secure/SameSite cookie. ✅
- **SQL injection:** parameterised queries throughout; a crafted `id` (`x' OR '1'='1`) is rejected by the id regex and treated as a new random id — no injection, no overwrite. ✅
- **XSS:** payloads are stored verbatim and escaped on render by the client (`esc()`); no execution path. ✅
- **CSP:** restrictive (`default-src 'self'`, limited img/connect allow-list). ✅
- **Upload:** 25 MB cap + MIME/extension allow-list. ✅
- **Validation:** cash amount must be > 0; transfers need two accounts; unknown collections rejected; oversized records rejected. ✅

---

## 7. What was NOT exercised (honest coverage note)

- Testing ran on a **local** copy, so Cloudflare-specific behaviour (R2 uploads at scale, production D1 latency, Shopify live webhooks) was not load-tested against production.
- PDF/print output (`printOrder`) was verified to build in code but not pixel-compared.
- The local dev runtime (`workerd`) crashed intermittently under rapid repeated restarts — this is a **sandbox artifact**, not an application fault (the app served every suite cleanly on a fresh instance).

---

## 8. Release checklist

- [x] All automated suites green on the fixed build
- [x] Both bugs fixed and re-verified
- [x] `dist/` rebuilt and contains both fixes
- [x] Changes committed locally (`e3656c5`)
- [ ] **Push to `main` → Cloudflare auto-deploy** — *blocked pending your approval (production-deploy gate)*
- [ ] After deploy: hard-refresh (Ctrl+Shift+R) to clear cache, then spot-check one order
