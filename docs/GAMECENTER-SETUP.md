# Game Center Setup — App Store Connect

The app code posts to these exact IDs. Create them in
ASC → your app → Services → Game Center.
(IDs use only letters, digits, periods, underscores — ASC forbids hyphens.)

## Leaderboards (both: Classic, integer, "High to Low" sort)

| ID | Reference name | Score format |
|---|---|---|
| `buyout.fortune.best` | Best Fortune | Money ($) — integer, no decimals |
| `buyout.wins.career` | Career Wins | Integer |

Leaderboard localization (English U.S.): name "Best Fortune" / "Career Wins",
score format suffix optional.

## Achievements — full localization copy-paste table

All: 10 points, achievable once, visible. Localization = English (U.S.).
Image files are in ~/Downloads/buyout-achievements/, named to match.

| ID | Display Name (≤30) | Pre-earned Description (≤120) | Earned Description (≤120) | Image |
|---|---|---|---|---|
| `buyout.honor.victor` | Closing Bell | Win your first game. | You won your first game — the market took notice. | ach-victor.png |
| `buyout.honor.tycoon` | Tycoon | Finish a game with $500,000 or more. | You closed the books on a fortune of half a million dollars. | ach-tycoon.png |
| `buyout.honor.landslide` | Landslide | Win with double the runner-up's fortune. | You won with double the runner-up's fortune. A rout. | ach-landslide.png |
| `buyout.honor.shark_slayer` | Shark Slayer | Beat a Shark-level AI. | You out-swam the Shark. | ach-shark-slayer.png |
| `buyout.honor.serial_founder` | Serial Founder | Found four companies in one game. | Four companies founded in a single game. | ach-serial-founder.png |
| `buyout.honor.card_shark` | Card Shark | Win with the merger deck in play. | You won with the merger deck in play — luck favored the prepared. | ach-card-shark.png |
| `buyout.honor.purist` | The Purist | Win with the merger deck disabled. | You won a pure game — no cards, no luck, all board. | ach-purist.png |
| `buyout.honor.full_table` | Full Table | Win a six-player game. | You beat a full table of five rivals. | ach-full-table.png |

## Notes

- The Game Center capability is declared in the app's entitlements
  (app.json → ios.entitlements); EAS syncs the capability at build time
  (enabled manually on the App ID 2026-08-10).
- Sign-in is attempted at launch; manual sign-in + View leaderboards live
  in Settings → Game Center. Scores/achievements post after each finished
  game and re-sync fully on sign-in.
- Test with a sandbox Apple ID via TestFlight.
- These can also be created programmatically via the App Store Connect API
  (gameCenterAchievements + localizations + image upload) with an API key —
  ask Claude.
