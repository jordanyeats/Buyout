# 1.1 Release Checklist — the ads flip

Everything that must change TOGETHER when the ad-supported 1.1 ships.
Do none of it while 1.0 is live-as-submitted; do all of it in one pass.

## Jordan — accounts & console

- [ ] AdMob (admob.google.com): create app "Buyout" (iOS) → copy the **App ID**
      (`ca-app-pub-…~…`) and create two ad units: **Banner** (home) and
      **Interstitial** (game end). Send all three IDs to Claude.
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

- [x] react-native-google-mobile-ads config plugin (currently **Google test
      App IDs** — swap `androidAppId`/`iosAppId` in app.json)
- [x] Banner on home (broadsheet "Advertisement" slot) — swap
      `TestIds.ADAPTIVE_BANNER` in `src/components/AdSlot.tsx`
- [x] Interstitial at game end — never the first game of a session, ≥8 min
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
