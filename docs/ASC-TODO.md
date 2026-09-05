# App Store Connect — exactly what to do

Four jobs. Only #1 blocks the 1.2.1 release; the rest fix things that are
already wrong on the live listing. Roughly 30 minutes total.

Sign in at <https://appstoreconnect.apple.com> → **My Apps → Buyout**.

---

## 1. Leaderboard localizations — fixes `*MISSING TITLE*`

**Why:** both leaderboards exist and the app finds them. Neither has a
Localization row, so Game Center has no name to display and falls back to
`*MISSING TITLE* <internal id>`. Creating a leaderboard is not enough.

**Where:** Buyout → **Services** tab → **Game Center** → **Leaderboards**

Do this **twice**, once per leaderboard:

### Leaderboard A — `buyout.fortune.best`

1. Click the leaderboard whose ID is `buyout.fortune.best`
   (shown as `*MISSING TITLE* 56551873` or `56551874`)
2. Confirm these, and correct them if they differ:
   - **Leaderboard Reference Name**: `Best Fortune`
   - **Score Format Type**: `Money` → `Integer (no decimals)`
   - **Score Submission Type**: `Best Score`
   - **Sort Order**: `High to Low`
3. Under **Leaderboard Localization**, click **＋ (Add)**
4. Fill in:
   | Field | Value |
   |---|---|
   | Language | **English (U.S.)** |
   | Display Name | `Best Fortune` |
   | Score Format | `$1,000,000` (money, no decimals) |
   | Score Format Suffix | *leave blank* |
   | Image | 512×512 px, required — see note below |
5. **Save**

### Leaderboard B — `buyout.wins.career`

Same steps, with:

| Field | Value |
|---|---|
| Leaderboard Reference Name | `Career Wins` |
| Score Format Type | `Integer` |
| Display Name | `Career Wins` |
| Score Format | `1,000` |

**On the image:** ASC will not let you save a localization without one. Two are
ready in the repo, in the same tile language as the achievement art — flat
company colour, one Playfair glyph, rotated corner code:

| Leaderboard | File |
|---|---|
| Best Fortune | `mobile/design/lb-fortune.png` (green, **F**, L1) |
| Career Wins | `mobile/design/lb-wins.png` (red, **W**, L2) |

They deliberately avoid `$`, which the Tycoon achievement already uses — two
near-identical tiles in one Game Center list is a bad tell.

**Verify:** reopen the app → Settings → Game Center → **Check Game Center
setup**. It should report both leaderboards found with no missing IDs. Then
open the Game Center overlay — the names should replace `*MISSING TITLE*`.

Scores already submitted are **not** lost. They attach to the leaderboard ID,
not its title, and appear the moment the localization exists.

---

## 2. Privacy and Support URLs

**Why:** they point into `/Buyout/`, which is the app repository's Pages site.
The real site is now at the domain root — which is where `app-ads.txt` has to
live for AdMob, and where the *correct* privacy policy now lives.

The old URLs redirect, so nothing is broken today. This is tidy-up.

**Where:** Buyout → **App Information** (left sidebar, under General)

| Field | Change to |
|---|---|
| Privacy Policy URL | `https://jordanyeats.github.io/privacy.html` |

**Where:** Buyout → the **1.2.1 version page** (left sidebar)

| Field | Change to |
|---|---|
| Support URL | `https://jordanyeats.github.io/support.html` |
| Marketing URL | `https://jordanyeats.github.io/` |

**Set the Marketing URL even though it is optional.** Apple currently reports
your developer website as `…/Buyout/privacy.html` — a privacy page standing in
as the developer site. AdMob derives the domain it crawls for `app-ads.txt`
from that value. It resolves to the right host either way, but pointing it at
the site root removes any doubt.

---

## 3. Version 1.2.1 — the release itself

**Where:** Buyout → **＋ Version or Platform** → **iOS** → `1.2.1`

1. **What's New in This Version** — paste from `docs/APP-STORE-LISTING.md`,
   section "What's New (1.2.1)"
2. **Build** — select **1.2.1 (14)**. Do **not** pick 1.2.0 (13); it is missing
   the majority-tie bonus fix.
3. Screenshots: unchanged, already correct
4. **Age Rating**: no change — confirm **Advertising = Yes** is still set. This
   was the literal cause of the 2.3.6 rejection.
5. **App Privacy**: no change. Nothing about data collection differs in 1.2.1.
6. **App Review Information → Notes**: paste from `docs/APP-REVIEW-NOTES.md`

**Test on TestFlight before you submit for review.** Work through
`docs/RELEASE-1.2-CHECKLIST.md` — it is ordered so the most informative check
comes first. The Game Center, ads, and purchase fixes have never run on a
device.

---

## 4. In-App Purchase — check its state

**Why:** if the Remove Ads product is not in a purchasable state, the app cannot
fix that, and Settings → Advertising → Diagnostics will read *"Remove Ads
product: not returned by the App Store"*.

**Where:** Buyout → **Monetization → In-App Purchases**

- `com.jordanyeats.buyout.removeads` should be **Ready to Submit** or
  **Approved** — not *Missing Metadata*
- If *Missing Metadata*, it is usually a missing **review screenshot** or
  localized description
- An IAP not yet approved must be **attached to the 1.2.1 version** to be
  reviewed alongside it

---

## Not in ASC

**AdMob** → *Check for updates* again tomorrow. `app-ads.txt` is live and
correct — verified byte for byte, right publisher id, `text/plain`, no BOM.
Google's crawler is simply slow: the UI claims "a few moments" but 24 hours to
several days is normal. Nothing to change unless it is still failing after
about three days.
