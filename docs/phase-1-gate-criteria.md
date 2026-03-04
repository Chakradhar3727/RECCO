# Phase 1 Gate Criteria (Patch 13)

> **Purpose:** This checklist defines the exact pass/fail criteria for each verification gate.
> ALL gates must pass before Phase 1 is marked complete and Phase 2 can begin.

---

## Gate G1 — Supabase Auth Configuration
- [x] `NEXT_PUBLIC_SUPABASE_URL` is set and accessible
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set and valid
- [x] `SUPABASE_SERVICE_ROLE_KEY` is set (used only in server-side code)
- [x] Supabase Auth email provider is enabled
- [x] Resend API key is configured in Supabase dashboard for OTP emails

## Gate G2 — Middleware Route Protection
- [x] Unauthenticated access to `/admin` redirects to `/(auth)/admin/login`
- [x] Unauthenticated access to `/aggregator` redirects to `/(auth)/aggregator/login`
- [x] Unauthenticated access to `/recycler` redirects to `/(auth)/recycler/login`
- [x] Unauthenticated access to `/pibo` redirects to `/(auth)/pibo/login`
- [x] Unauthenticated access to `/pro` redirects to `/(auth)/pro/login`
- [x] Public routes (`/`, `/pickup`, `/delivery`, `/verify`) are accessible without auth
- [x] `/api/auth/callback` is excluded from middleware matcher (P12)
- [x] Static assets (`/_next/static`, favicon, manifest) are excluded (P12)

## Gate G3 — Admin Login Flow
- [x] Admin email validation rejects non-allowed emails (P10 fail-closed)
- [x] Admin email validation returns error when `ADMIN_ALLOWED_EMAILS` is empty (P10)
- [x] Password verification works with correct credentials
- [x] 3 failed password attempts locks the account for 60 minutes (P1)
- [x] Lockout countdown timer displays and auto-refreshes
- [x] OTP is sent to admin email after successful password
- [x] 6-digit OTP verification grants access to `/admin`
- [x] Only 1 active admin session per user (previous sessions deactivated)
- [x] Admin session timeout after 15 minutes of inactivity (P2)
- [x] Expired admin session redirects to login with `?reason=timeout`

## Gate G4 — Aggregator Login Flow
- [x] Login with email/User ID + 4-digit PIN works
- [x] 5 failed PIN attempts locks the account for 30 minutes
- [x] Lockout countdown displays correctly
- [x] Numeric keyboard appears on PIN input (P7)
- [x] Forgot PIN sends OTP and allows PIN reset (P3)
- [x] PIN reset invalidates ALL existing sessions globally (P3)

## Gate G5 — Aggregator Registration Flow
- [x] Email → OTP verification → name + PIN → User ID generation
- [x] Generated User ID follows format: `AGG-<prefix>-<6digits>`
- [x] User can log in immediately after registration with new User ID + PIN

## Gate G6 — Recycler Login Flow
- [x] Login with email + password works
- [x] OTP is sent after password verification
- [x] 6-digit OTP verification grants access to `/recycler`

## Gate G7 — Recycler Registration Flow
- [x] 6-step registration flow completes end-to-end
- [x] CPCB registration number shows format warning (P11) — not blocking
- [x] Bank details are encrypted with AES-256-GCM before storage (P6)
- [x] Encrypted payload has `iv`, `ciphertext`, `tag` fields
- [x] Registration submits with status `PENDING_ADMIN_REVIEW`

## Gate G8 — PIBO Login Flow
- [x] Login with email + password works
- [x] OTP verification grants access to `/pibo`

## Gate G9 — PIBO Registration Flow
- [x] User ID generated atomically using PostgreSQL sequence/fallback (P4)
- [x] User ID follows format: `PIBO-<TYPE>-<YY>-<SEQ>`
- [x] No duplicate User IDs under concurrent registration

## Gate G10 — PRO Login Flow
- [x] Login with email + password works
- [x] OTP verification grants access to `/pro`

## Gate G11 — PRO Registration Flow
- [x] User ID uses CPCB last-6 characters, not org name (P5)
- [x] User ID follows format: `PRO-<CPCB6>-<STATE>-<SEQ>`
- [x] Bank details are encrypted (P6) — same as Recycler

## Gate G12 — OTP/PIN Component (P7)
- [x] `inputMode="numeric"` renders numeric keyboard on Android Chrome
- [x] `pattern="[0-9]*"` accepted by HTML validation
- [x] `autoComplete="one-time-code"` triggers OTP autofill on Android
- [x] Auto-advance on digit entry works
- [x] Backspace navigates to previous box
- [x] Paste fills all boxes and triggers `onComplete`
- [x] Error state shows red border and message

## Gate G13 — Bank Encryption (P6)
- [x] `BANK_DETAILS_ENCRYPTION_KEY` is 64 hex chars (32 bytes)
- [x] Missing key throws descriptive error
- [x] Encrypt → decrypt round-trip returns original data
- [x] Encrypted payload is stored as JSONB in database

## Gate G14 — Android Chrome Testing (P9)
- [ ] All items in `docs/p9-android-testing-checklist.md` pass (Requires physical device)
- [x] Numeric keyboard appears on all OTP/PIN inputs (Confirmed in code via attributes)
- [ ] Virtual keyboard resizes content (not pushes viewport) (Requires physical test)
- [ ] No zoom on input focus (Requires physical test)

## Gate G15 — Environment Variables
- [x] `ADMIN_ALLOWED_EMAILS` contains at least one valid email
- [x] `BANK_DETAILS_ENCRYPTION_KEY` is set and 64 chars
- [x] `.env.example` has placeholders for all required vars

## Gate G16 — Build Verification
- [x] `npx next build` compiles without webpack errors
- [x] Type checking passes (no TS errors)
- [x] 56+ static pages generated

## Gate G17 — QR Generation Trigger (P15)
- [x] QR generation function exists but is NOT called during registration
- [x] QR code is generated ONLY after admin approval (trigger point documented)
- [x] `generateFacilityQR()` utility accepts facility ID and returns QR data

---

## Sign-off

| Gate | Status | Verifier | Date |
|------|--------|----------|------|
| Gate | Status | Verifier | Date |
|------|--------|----------|------|
| G1 | ✅ PASS | Validation Script | Mar 3 |
| G2 | ✅ PASS | Validation Script | Mar 3 |
| G3 | ✅ PASS | Validation Script | Mar 3 |
| G4 | ✅ PASS | Validation Script | Mar 3 |
| G5 | ✅ PASS | Validation Script | Mar 3 |
| G6 | ✅ PASS | Validation Script | Mar 3 |
| G7 | ✅ PASS | Validation Script | Mar 3 |
| G8 | ✅ PASS | Validation Script | Mar 3 |
| G9 | ✅ PASS | Validation Script | Mar 3 |
| G10 | ✅ PASS | Validation Script | Mar 3 |
| G11 | ✅ PASS | Validation Script | Mar 3 |
| G12 | ✅ PASS | Validation Script | Mar 3 |
| G13 | ✅ PASS | Validation Script | Mar 3 |
| G14 | ⚠️ PENDING | Manual Android QA | TBD |
| G15 | ✅ PASS | Validation Script | Mar 3 |
| G16 | ✅ PASS | Build Output (`next build`) | Mar 3 |
| G17 | ✅ PASS | Database Trigger Verification | Mar 3 |
