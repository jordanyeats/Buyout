# Game Center Setup — App Store Connect

The app code posts to these exact IDs. Create them in
ASC → your app → Services → Game Center.

## Leaderboards (both: Classic, integer, "High to Low" sort)

| ID | Reference name | Score format |
|---|---|---|
| `buyout.fortune.best` | Best Fortune | Money ($) — integer, no decimals |
| `buyout.wins.career` | Career Wins | Integer |

## Achievements (all: 10 points suggested, achievable once, visible)

| ID | Title | Description (player-facing) |
|---|---|---|
| `buyout.honor.victor` | Closing Bell | Win your first game. |
| `buyout.honor.tycoon` | Tycoon | Finish a game with $500,000 or more. |
| `buyout.honor.landslide` | Landslide | Win with double the runner-up's fortune. |
| `buyout.honor.shark-slayer` | Shark Slayer | Beat a Shark-level AI. |
| `buyout.honor.serial-founder` | Serial Founder | Found four companies in one game. |
| `buyout.honor.card-shark` | Card Shark | Win with the merger deck in play. |
| `buyout.honor.purist` | The Purist | Win with the merger deck disabled. |
| `buyout.honor.full-table` | Full Table | Win a six-player game. |

Each needs a 512×512 image — ask Claude to generate the set in the tile
style when you're ready.

## Notes

- The Game Center capability is declared in the app's entitlements
  (app.json → ios.entitlements); EAS syncs the capability to the App ID
  automatically at build time.
- In-app behavior: sign-in is attempted at launch (standard for GC games);
  there's also a manual sign-in row in Settings → Game Center. Scores and
  achievements post after each finished game and re-sync on sign-in, so
  progress earned while signed out is not lost.
- Test with a sandbox Apple ID via TestFlight; leaderboards can take a few
  minutes to show first scores.
