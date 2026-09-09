# 1.3 Release Checklist — the sponsor break, the draw, and the leaderboards move

1.3 is a monetization change wearing two enhancements and a fix. The
enhancements (the opening-seat draw, leaderboards moving to The Record) and the
fix (the deck count) are verified by the test suite and the typechecker. The
monetization change is **not verified on a device**, and cannot be locally: it
needs a real EAS build, real AdMob fill, and a real StoreKit sandbox.

**So: TestFlight first, and work the list below before promoting.**

## What changed in the binary

- **No native code changed.** Nothing under `modules/` or `ios/` was touched,
  and no new native dependency was added — `AdBreak` is plain React Native and
  the ad SDK was already linked. This still needs a store build for the version
  bump, but nothing here can fail at the native layer that did not already.
- **The engine is byte-identical.** The opening seat is shuffled in
  `useGame.start()`, not in `newGame()`. This was deliberate: randomising
  `current` inside the engine breaks seed replay, which both the save file and
  the test suite depend on. All 67 engine tests pass unchanged.
- **Saves are compatible in both directions.** The save file stores the seated
  order it dealt, so a 1.2.1 save in progress resumes to the same table it had
  — it simply carries the old always-human-first order.
- **Ad frequency changed materially.** 1.2.1 showed an interstitial only from
  the second finished game of a session, with an 8-minute gap; in practice most
  sessions showed none, and AdMob logged 84 requests against 10 impressions.
  1.3 shows one after every finished game, with no session or time gate.
- `buyout.ads.firstgame.v1` was introduced and then removed before shipping.
  Nothing reads it; no migration needed.

## Verify on TestFlight, in this order

- [ ] Finish a game. The sponsor break appears, counts down from 3, an
      interstitial plays, and the Final Edition is revealed **after** it — the
      results must never be visible before or behind the ad.
- [ ] Finish a second game immediately. A break appears again — there is no
      longer any cooldown, and this is the change most likely to be judged too
      aggressive. Decide here whether it stays.
- [ ] Kill the app with no network, reopen, finish a game. No ad loads, so the
      break must be skipped entirely and the Final Edition shown directly.
      A player must never be held on a countdown that leads nowhere.
- [ ] Buy Remove Ads mid-session, then finish a game. No break, no ad, straight
      to the results.
- [ ] Restore Remove Ads on a second device. Same.
- [ ] The Record opens with the leaderboards above Career, and "View
      leaderboards" presents the Game Center sheet.
- [ ] The Back Office no longer shows a leaderboard button, and points at The
      Record instead. Sign-in and "Check Game Center setup" still work there.
- [ ] Start five games. The opening seat visibly varies, and when a rival opens,
      the floor reads "<name> drew the opening seat…" on the empty board.
- [ ] Resume a game saved under 1.2.1. It restores to the same table.
- [ ] Back Office → the cards: Standard reads "15 of 15 effects · 27 cards",
      Easy "10 of 15 effects · 22 cards", Hard "12 of 15 effects · 16 cards".

## AdMob, before judging any of the numbers

Neither of these is a code change, and both suppress fill independently of
anything in this release:

- [ ] **`app-ads.txt` is published** at the root of the domain named as the
      marketing URL in App Store Connect, and lists the AdMob publisher ID.
      Without it a share of programmatic demand will not bid at all.
- [ ] **The AdMob account is not "ad serving limited"** — new accounts are
      throttled until payment and identity details are verified, and it is not
      announced anywhere you would notice.

Give it 48 hours of delivery after both are true before reading the match rate.

## Not done, deliberately

- **Rewarded interstitials.** Higher eCPM, and the sanctioned way to gate
  content, but they require an opt-out button — and an opt-out in front of the
  results people waited a full game for would be taken every time. Revisit only
  if the plain interstitial's fill stays poor.
- **Native ads in the Final Edition.** The better long-term fit: a bordered
  advert set into the page under an `ADVERTISEMENT` rule, no takeover at all.
  Worth doing if the break proves too intrusive.
