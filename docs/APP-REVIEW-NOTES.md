# App Review Notes — paste into App Store Connect → App Review Information

## App purpose
Buyout is a strategy board game about simulated stock and merger trading in a
fictional setting, played entirely against AI opponents. It is not a finance app
and involves no real or simulated gambling, wagering, or real-money trading.

## Access instructions and test credentials
1. Launch the app.
2. Tap Start game (optionally set player names — stored locally only).
3. Play against the AI; save/quit and resume from the main screen; view stats
   under "The record"; the tutorial is under "Learn the game".

Test account: none — the app has no accounts or login.

## External services
None. The app is 100% offline: no backend, no analytics, no ads, no third-party
data SDKs, no push notifications, no in-app purchases. All persistence is
on-device (local storage). Audio via expo-audio, haptics via expo-haptics,
fonts bundled. If no network activity is observed during review, that is
expected behavior, not a defect.

## Permissions
The app requests no permissions and shows no permission prompts.

## Regional differences
This app works the same in every region.

## Regulated industry documentation
Not applicable. The in-game "stock market" is a fictional board-game mechanic
with no real money, no wagering, no odds-based purchases, and no financial
services.

---

Optional but recommended: attach a screen recording captured on a physical
iPhone (launch → new game → a merger → settlement), and a second one on iPad
since the app is universal.
