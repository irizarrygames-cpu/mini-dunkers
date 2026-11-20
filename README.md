# Mini Dunkers

Arcade basketball for phones and computers: the basketball twin of Mini Strikers, a separate game
with its own link, its own accounts and its own app. Pick one of the top 20 countries when you sign
up, play the bots (quick match, the cup, training, PRO MATCH, Club Career, the 3-point contest and
free throws, skill challenges) or play real people online. Every online win is 3 league points for
your country.

## Running it

Needs Node 24. No install step.

```bash
node server.js 8460
```

Then open <http://localhost:8460>. `server.js` serves the game **and** runs accounts, saving, the
league table and online games. `MS_DATA_FILE` points accounts at a throwaway file for tests.

## How it plays

- **Move** (joystick / WASD), **SPRINT**, **PASS** (hold for a lob; a lob to a team-mate by the rim is
  an alley-oop), **SHOOT** (with the ball near the rim: a dunk or a layup; further out: hold, and let go
  at the top of the meter, the green), **SKILL** (crossover, spin, burst, stepback, hesitation), **STEAL**
  (without the ball), and **SHOOT without the ball jumps** to block or rebound. A full **ULT** sets you
  on fire: a windmill or tomahawk dunk by the rim, a fadeaway or a skyhook further out.
- A basket is 2 points, 3 from behind the arc. Games are two minutes; level at the buzzer goes to
  overtime, and the next basket wins.
- **PRO MATCH** (2v2 and 3v3): the real rules on a court with more room round it: out of bounds and
  inbounds, a 12-second shot clock, and fouls (a reach-in that misses, now and then): on a shooter,
  free throws. `js/rules.js`.
- **The 3-point contest and free throws** (`js/penalty.js`, `server/pens.js`): five shots each round
  the arc, corner to corner, or from the line, taking turns, then sudden death. It is all in the
  release: the meter fills at a slightly different speed every shot.

## Playing online

- **PLAY ONLINE** queues you for 1v1, 2v2 or 3v3 (and PRO MATCH). It waits about 12 seconds for real
  players, then fills the empty spots with bots. **CREATE ROOM** makes a code for friends.
- The server runs every online game (the real engine, 120 steps a second) and streams it over a
  WebSocket. Your own player is predicted on your device so the controls answer at once; a jump shot
  leaves your hands along the same arc the server uses (`shotPos`), and every screen draws a shot's
  arc from the server's `shot` event.

## Putting it online

It is its own Render web service (`mini-dunkers.onrender.com`), built from its own GitHub repo
(`mini-dunkers`): Build `npm install`, Start `node server.js`, health check `/api/health`.

One thing is typed in by hand in Render's dashboard: **`DATABASE_URL`**, a Postgres connection string
(Neon's free plan works). It is never in the repo. Without it accounts go in `data.json`, which a
free instance wipes whenever it restarts. The table is `dunkers_users` (never `strikers_users`), so
it can share a database with Mini Strikers without touching it.

After a deploy, `/api/health` reports `build` (bump `BUILD` in `server.js`) and `storage`.

## The Android app

`app/` builds the signed `.aab` for Google Play: see `PUBLISHING.md`. The app id is
`com.irizarrygames.minidunkers`.

## Tools

The node suite (run them all before a deploy):

- `node tools/contestscan.js`: the 3-point contest and free throws: the game and the server agree on
  every number; how often each release drops; whole contests at three skill levels.
- `node tools/rulesscan.js`: PRO MATCH: out of bounds, the shot clock, fouls, free throws, and whole
  bot games (about a minute).
- `node tools/proscan.js`: PRO MATCH online: queues, rooms, inbounds, against the real server code.
- `node tools/netscan.js [matches]`: fuzzed online games on the server engine, invariant checks.
- `node tools/fuzzscan.js`: every message type with junk in every field: the server never throws.
- `node tools/i18nscan.js`: every line the game shows has a translation in all 11 languages.
- The rest (`authscan`, `socialscan`, `rankedscan`, `cupscan`, `missionscan`, `passscan`,
  `emotescan`, ...) cover accounts, friends, ranked, cups, missions, the season pass and emotes.
- `node tools/make-icons.js`: draws the app icons (a flaming basketball).
