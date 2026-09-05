# 1.2 Release Checklist — deck packs, and three things that were broken

1.2 is mostly a fix release wearing a feature's clothes. The features (deck
packs, the drawer, the merger wrap copy) are verified. The fixes — Game Center
sign-in, ad loading, and the Remove Ads purchase — are **not verified on a
device**, because none of them can be: they need real Game Center, real AdMob
fill, and a real StoreKit sandbox.

**So: TestFlight first, and work the verification list below before promoting
to the App Store.** Shipping this straight to production would be guessing.

## What changed in the binary

- Native Swift changed (`modules/buyout-game-center/ios/`), so this needs a
  full native build. There is no OTA path for it.
- Deck packs, stored in `AsyncStorage` under `buyout.pack.v1`. New installs and
  upgrades both default to Standard, which is the 1.1 behaviour.
- `GameOptions` gained `cleanCount` and `pack`. Options are part of the save
  file and a save replays from seed + action log, so **in-progress 1.1 saves
  resume correctly** — they simply carry no pack and read as Standard.
- Career stats gained `pack` and `ranked` per record. Old records carry
  neither; played with cards on they are treated as Standard, which is what
  they were.

## Verify on TestFlight, in this order

- [ ] **Settings → Game Center → "Check Game Center setup"**. This is the whole
      reason it exists. It asks Game Center which of our IDs it actually knows
      about and names any it does not.
      - All green → the sign-in bug was the entire problem, and it is fixed.
      - Names missing IDs → App Store Connect config, not code. Create them
        from the table in docs/GAMECENTER-SETUP.md.
- [ ] Sign-in happens at launch without tapping anything, and Settings shows
      "Signed in as …". This is the specific 1.1 failure: the sheet could not
      be presented at cold launch and sign-in then hung forever.
- [ ] Finish a Standard game → the fortune appears on the leaderboard.
- [ ] Finish an Easy game → nothing posts, and no honor unlocks.
- [ ] Settings → Advertising → Diagnostics: "Remove Ads product" shows a price,
      not "not returned by the App Store". If it does not, the IAP is not in a
      purchasable state in ASC — the code cannot fix that.
- [ ] Buy Remove Ads with a sandbox account. Then Restore on a second device.
- [ ] Finish two games in one session and wait out the 8-minute gap → an
      interstitial appears. Diagnostics shows whether one is loaded, so a
      no-show can be told apart from a no-fill.
- [ ] Trigger a merger while holding shares in the company being acquired:
      the wrap reads "Shareholder value for X has increased by $N per share",
      and the acquired shares appear under "In the drawer".

## App Store Connect

- [ ] New version 1.2.0, "What's New" from docs/APP-STORE-LISTING.md
- [ ] No metadata changes needed otherwise — advertising, privacy, and age
      rating answers from 1.1 all still hold. Nothing about data collection
      changed in this release.
- [ ] Screenshots unchanged and still current.

## Known, deliberate

- `androidAppId` in app.json is still Google's public test ID. Harmless while
  iOS-only; it must be replaced before any Android release.
- Ad frequency is unchanged: never before the second finished game of a
  session, and at most one every 8 minutes. This makes ads easy to mistake for
  broken during testing, which is what Diagnostics is for.
- Leaderboard scores now come from Standard games only. Nobody's existing
  entry drops — Game Center keeps the best score ever submitted — but a
  personal best set in a cards-off game will no longer be re-submitted.
- The hosted privacy and support pages route contact through the GitHub issue
  tracker. **Redeploy GitHub Pages** or the old personal address stays live.
