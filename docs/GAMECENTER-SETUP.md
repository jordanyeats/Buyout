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

## What posts, and when

Deck packs are chosen in Settings → The merger deck. They decide what reaches
Game Center:

| Deck | Honors | Leaderboards |
|---|---|---|
| Standard | yes | yes |
| Hard | yes | no |
| Easy | no | no |
| Custom | no | no |
| Merger deck off | yes | no |

Only the full Standard deck posts scores, so both global tables compare games
played with the same deck. Honors also count on Hard, and on games played with
no deck at all — the latter matters because The Purist ("win with the merger
deck disabled") can only be earned that way.

No new leaderboard IDs are needed for this: the two boards above stay as they
are, and everything else is simply not submitted.

## Notes

- The Game Center capability is declared in the app's entitlements
  (app.json → ios.entitlements); EAS syncs the capability at build time
  (enabled manually on the App ID 2026-08-10).
- The native authenticate handler is installed once at launch and its result
  arrives as an event, not a promise. The earlier version awaited a promise
  that only resolved if the sign-in sheet could be presented — at cold launch
  it frequently could not, and sign-in then hung for the life of the process.
- Manual sign-in + View leaderboards live in Settings → Game Center. Scores and
  achievements post after each eligible finished game and re-sync on sign-in.
- **Settings → Game Center → "Check Game Center setup"** asks Game Center which
  of the IDs above it actually knows about, and names any it does not. Run it
  first whenever posting appears to do nothing — it separates a code bug from
  missing App Store Connect configuration, which are otherwise identical from
  the app's side.
- Test with a sandbox Apple ID via TestFlight.
- These can also be created programmatically via the App Store Connect API
  (gameCenterAchievements + localizations + image upload) with an API key —
  ask Claude.
