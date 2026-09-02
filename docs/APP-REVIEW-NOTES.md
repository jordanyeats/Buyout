# App Review Notes — paste into App Store Connect → App Review Information

## App purpose
Buyout is a strategy board game about simulated stock and merger trading in a
fictional setting, played entirely against AI opponents. It is not a finance app
and involves no real or simulated gambling, wagering, or real-money trading.

The app contains advertising; the Age Rating questionnaire answers **Yes** to
"Advertising" accordingly.

## Access instructions and test credentials
1. Launch the app.
2. Tap Start game (optionally set player names — stored locally only).
3. Play against the AI; save/quit and resume from the main screen; view stats
   under "The record"; the tutorial is under "Learn the game".

Test account: none — the app has no accounts or login.

## Advertising and in-app purchase
The free edition shows **Google AdMob interstitials** between games. Placement
is deliberately light: never after the first game of a session, and at most one
every 8 minutes — so a short review session may not surface one. There are no
banner ads anywhere.

A single non-consumable in-app purchase, **Remove Ads**
(`com.jordanyeats.buyout.removeads`), permanently disables all advertising.
Both it and **Restore Purchases** are in Settings → the Back Office.

On first launch the app runs Google's UMP consent flow where required, then the
iOS **App Tracking Transparency** prompt. Declining is fully supported — ads
simply stay non-personalized and the game is otherwise identical.

## External services
Google AdMob (ads) and the App Store (in-app purchase) only. No backend of our
own, no analytics, no push notifications, no accounts. Gameplay is offline; all
saves, stats, and player names persist on-device (local storage). Audio via
expo-audio, haptics via expo-haptics, fonts bundled.

## Permissions
One: the ATT tracking prompt, shown once at first launch for ad measurement.
The app requests no other permissions.

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
