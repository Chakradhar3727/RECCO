# P9 — Android Chrome Testing Checklist

> **Adapted from iOS/Safari (original P9) to Android Chrome**
> All tests should be performed on a physical Android device running Chrome 90+.

## Pre-requisites
- [ ] Physical Android device (Android 10+ recommended)
- [ ] Chrome browser updated to latest version
- [ ] App deployed to a HTTPS URL (localhost won't trigger all mobile features)
- [ ] Supabase email OTP configured with Resend

---

## Test 1: Numeric Keyboard on OTP Fields
**Pages to test:**
- `/(auth)/admin/login` — Step 3 (6-digit OTP)
- `/(auth)/aggregator/login` — 4-digit PIN field
- `/(auth)/aggregator/register` — Step 2 (6-digit OTP) + Step 3 (4-digit PIN)
- `/(auth)/recycler/login` — Step 2 (6-digit OTP)
- `/(auth)/pibo/login` — Step 2 (6-digit OTP)
- `/(auth)/pro/login` — Step 2 (6-digit OTP)

**Expected behavior:**
- [ ] Tapping any OTP/PIN input opens the **numeric keyboard** (0-9 only)
- [ ] No alphabetic characters can be entered
- [ ] Auto-advance works: typing a digit moves focus to the next box
- [ ] Backspace works: deletes current digit and moves focus back

**HTML attributes verified:**
```html
<input type="text" inputMode="numeric" pattern="[0-9]*" />
```

---

## Test 2: OTP Autofill from Email
**Steps:**
1. Start Admin login → enter email → enter password
2. Check email on the Android device
3. When OTP email arrives, check for:
   - [ ] Android Chrome's "Copy OTP" suggestion in the notification
   - [ ] `autoComplete="one-time-code"` triggers the OTP autofill bar above keyboard
   - [ ] Pasting the OTP fills all 6 boxes correctly

---

## Test 3: Virtual Keyboard Behavior
**Expected behavior (with `interactiveWidget: "resizes-content"`):**
- [ ] When keyboard opens, the page content resizes (not gets pushed up)
- [ ] OTP input boxes remain visible above the keyboard
- [ ] No horizontal scrolling occurs on any login page
- [ ] Closing keyboard restores the original layout

---

## Test 4: Viewport & Zoom
**Expected behavior (with `userScalable: false`, `maximumScale: 1`):**
- [ ] Double-tapping an input does NOT zoom in
- [ ] Pinch-to-zoom is disabled on login pages
- [ ] Font sizes are readable at 1x scale (min 16px on inputs)

---

## Test 5: Lockout Countdown Timer
**Steps:**
1. Admin: enter wrong password 3 times → lockout screen
2. Aggregator: enter wrong PIN 5 times → lockout screen

**Expected behavior:**
- [ ] Countdown timer displays correctly
- [ ] Timer counts down in real-time (MM:SS format)
- [ ] Page reloads automatically when timer reaches 00:00

---

## Test 6: Phone Number Auto-linking Prevention
**Expected behavior (with `formatDetection: { telephone: false }`):**
- [ ] 6-digit OTP codes are NOT auto-linked as phone numbers
- [ ] User IDs like `AGG-XXXXX-123456` are NOT auto-linked
- [ ] No unexpected blue underlines on numeric strings

---

## Sign-off
| Test | Status | Tester | Date |
|------|--------|--------|------|
| Numeric Keyboard | | | |
| OTP Autofill | | | |
| Virtual Keyboard | | | |
| Viewport & Zoom | | | |
| Lockout Timer | | | |
| Phone Auto-linking | | | |
