# 1.1 Release Checklist — the ads flip

Everything that must change TOGETHER when the ad-supported 1.1 ships.
Do none of it while 1.0 is live-as-submitted; do all of it in one pass.

## Rejection — 2.3.6, submission 143ffa61, reviewed 26 Aug 2026

Build 1.1.0 (10) was rejected on metadata alone: the Age Rating questionnaire
said the app has no advertising while the binary ships AdMob. **No new build is
required** — fix the ASC metadata, reply in Resolution Center, resubmit the same
build. Do the other metadata items below in the same pass; the listing copy
still claims "No ads. No in-app purchases." and would draw a second rejection.

- [ ] **ASC → App Information → Age Rating → Edit → Advertising = Yes** (the
      literal rejection; everything else here is prevention)
- [ ] Promo text + description: replace the 1.0 "no ads / no purchases" copy
      with the STRAIGHT DEALING wording in docs/APP-STORE-LISTING.md
- [ ] Review notes: re-paste from docs/APP-REVIEW-NOTES.md (the old text told
      the reviewer there are no ads, no IAP, and no permission prompts)

## Jordan — accounts & console

- [ ] AdMob (admob.google.com): create app "Buyout" (iOS) → copy the **App ID**
      (`ca-app-pub-…~…`) and create one ad unit: **Interstitial** (game end).
      Send both IDs to Claude.
- [ ] App Store Connect → Features → In-App Purchases: create **Non-Consumable**
      - Product ID: `com.jordanyeats.buyout.removeads`
      - Reference name: Remove Ads
      - Price: pick tier (suggest $2.99)
      - Display name: "Remove Ads" · Description: "Permanently removes all
        advertising from Buyout."
      - Add a review screenshot (Settings screen showing the Remove Ads row)
- [ ] ASC → App Privacy: update from "Data Not Collected" to declare AdMob's
      collection (Identifiers → Device ID, used for Advertising; Usage Data →
      Ad interactions). Answer "used for tracking" = Yes (ATT is implemented).
- [ ] GitHub Pages: replace `docs/privacy.html` with `docs/privacy-1.1.html`
      (rename) in the release commit.

## Code (Claude) — done in v1.1.0 scaffold, pending real IDs

- [x] Real AdMob IDs in. iOS App ID `…9842723539475080~4065568163`, interstitial
      unit `…9842723539475080/7683530345`. Dev builds still use `TestIds` via
      `__DEV__`, so only release builds request live ads.
      **androidAppId is still Google's test ID** — harmless while iOS-only, but
      it must be replaced before any Android release.
- [x] Privacy manifest: `NSPrivacyTracking: true` plus DeviceID and
      AdvertisingData collected-data entries (third-party advertising,
      tracking = true) and the AdMob tracking domains listed explicitly.
      Build 11 failed validation with **ITMS-91064 (invalid tracking
      information)** because it had `NSPrivacyTracking: true` with an EMPTY
      `NSPrivacyTrackingDomains`. Apple requires the two to agree: tracking
      true demands a non-empty domain list. Do not empty that array while
      tracking is true, however the SDK declares its own manifest.
- [x] ATT answer now actually drives ad personalization: `requestNonPersonalized
      AdsOnly` mirrors the ATT status instead of being hardcoded true. Previously
      the prompt was cosmetic and contradicted the in-app copy.
- [x] react-native-google-mobile-ads config plugin wired up
- [x] Interstitial at game end (no banners anywhere, per Jordan) — never the first game of a session, ≥8 min
      apart — swap `TestIds.INTERSTITIAL` in `src/store/monetize.ts`
- [x] UMP consent → ATT prompt → SDK init ordering
- [x] Remove Ads purchase + Restore in Settings (expo-iap), price from store
- [x] In-app privacy fine print rewritten for the ads era

## Listing copy edits at 1.1 (docs/APP-STORE-LISTING.md deltas)

- Promo text: drop "no ads"; suggest: "…Fully offline gameplay. Free for a
  limited time — one purchase removes ads forever."
- Description "NO NONSENSE" section becomes:
  "STRAIGHT DEALING — Fully offline gameplay. No accounts. No analytics of
  our own. The free edition shows the occasional ad; one purchase removes
  them forever."
- What's New (1.1): new home desk, Game Center (if it lands in 1.1), and
  "Buyout is now free with ads — Remove Ads available in the Back Office."

## Review notes update

Remove the "no ads" sentence; add: "The free edition shows AdMob ads with
ATT + UMP consent. A non-consumable IAP (Remove Ads) disables them;
Restore Purchases is in Settings."
