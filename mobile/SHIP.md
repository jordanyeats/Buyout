# Shipping Buyout to the App Store

What exists: a complete Expo (React Native) app in `mobile/` — the deterministic
engine, the broadsheet UI, AI opponents, haptics, and crash-proof auto-save
(seed + action log replayed on launch). TypeScript clean; web export verified.

## Run it on your iPhone today (no Apple account needed)

```bash
cd mobile
npm install
npx expo start
```

Install **Expo Go** from the App Store on your phone, scan the QR code from the
terminal, and play. This is the iterate-on-design loop — changes hot-reload.

## Open it in Xcode (you have Xcode installed)

Expo generates the native iOS project on demand — it isn't checked in. One command
does everything (generate native project, install CocoaPods, build, launch simulator):

```bash
cd mobile
npm install
npx expo run:ios          # add --device to target your plugged-in iPhone
```

If CocoaPods is missing, install it first: `brew install cocoapods` (or `sudo gem install cocoapods`).

After that, the native project lives at `mobile/ios/` — open
`mobile/ios/Buyout.xcworkspace` in Xcode (the .xcworkspace, not the .xcodeproj)
for signing settings, archive builds, and profiling. Day-to-day, you rarely need
Xcode open: `npx expo start` + Expo Go is the faster iteration loop, and
`npx expo run:ios` rebuilds the native shell when native deps change.

**Game Center (the one roadmap item needing your Mac):** in Xcode, select the
Buyout target → Signing & Capabilities → + Capability → Game Center, and create
matching achievement IDs in App Store Connect. The app's local achievements
("Honors" in The Record screen) are engine-checked and ready to mirror into
GC achievement reports when you wire it.

## Get it on TestFlight (needs accounts)

1. **Apple Developer Program** — enroll at developer.apple.com ($99/year).
   Use the same Apple ID you'll manage the app with.
2. **Expo account** — free, at expo.dev. Then:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure          # creates eas.json, links the project
   eas build --platform ios     # cloud build; EAS walks you through certificates
   eas submit --platform ios    # uploads to App Store Connect / TestFlight
   ```
   EAS handles signing certificates and provisioning profiles for you —
   answer "yes" when it offers to manage credentials.
3. In **App Store Connect** (appstoreconnect.apple.com): create the app record
   (bundle ID `com.jordanyeats.buyout`, already set in app.json), add yourself
   as a TestFlight tester, install, play.

## Before the public App Store listing

- **Screenshots** for 6.7" and 6.1" iPhones (and iPad if keeping tablet support).
- **App icon**: replace `assets/icon.png` — this is where a designer pass earns
  its money. The masthead "B" in Playfair on parchment is the obvious direction.
- **Privacy**: the app collects nothing and has no network calls — declare
  "Data Not Collected" in App Store Connect. Genuine selling point; say it in
  the description.
- **Age rating**: 4+. Simulated stock trading is not gambling in Apple's
  questionnaire.
- **`ITSAppUsesNonExemptEncryption` is already false** in app.json — skips the
  export-compliance question on every build.
- **The classic merger game's name must not appear** in the app name, subtitle,
  keywords, description, or screenshots — nor anywhere in this repository.
  (See docs/ROADMAP.md, legal section.)
- **IP attorney consult** before the public listing goes live. TestFlight with a
  handful of testers is lower-stakes; public release is the line.

## What's deliberately not in v1 yet (roadmap Phase 2-3)

Interactive tutorial · simulation-strength AI tier · stats & history ·
iPad-optimized layout · sound design · Game Center. The engine and save
format already support all of it.

## Font licensing note

Playfair Display and Source Sans 3 are SIL Open Font License — free for
commercial apps, bundled via @expo-google-fonts. If a designer later swaps in
commercial faces, verify app-embedding licenses specifically.
