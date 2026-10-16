# Pink Oven Rush: project guide

Everything about how the game works, how it's built, and how it gets to `oven-rush.start.ng`.

## 1. The game

You run the counter at **tt's pink oven**, a Lagos cookie and boba shop. Customers walk in and queue at one of three spots along the counter, each with a ticket of 1 to 3 items.

- **Picking up:** tap a shelf (or press `1`–`6`). The baker walks there and adds that item to the tray, which holds 3.
- **Serving:** tap a customer or their ticket (or `Q` `W` `E`). The baker walks to the counter. Every tray item that's still on the ticket is handed over; the rest stay on the tray.
- **Wrong item:** if nothing on the tray is on their ticket, they lose 15% of their patience and the combo resets.
- **Bin:** empties the tray (`X`).
- **Patience:** each customer's bar drains while they wait. At zero they storm off and you lose a heart.
- **The shift ends** after 90 seconds, or when all 3 hearts are gone.

### Scoring

| What | Points |
| --- | --- |
| Each item handed over | 40 |
| Finishing an order | 60 |
| Tip | up to 80 × the customer's tip rate, scaled by how much patience they had left |
| Combo | finish orders in a row with over 45% patience left: +20 per step (from the 2nd), up to +200 |

A serve with over 60% patience left counts as **perfect**.

### Difficulty

It ramps up over the shift. In the first 18 seconds orders have 1 item. After that they can have 2 or 3, customers arrive more often (every 5.2 s at first, every 2.4 s by the end, plus a random 0–1.4 s), and patience starts shorter (25 s at first, 16 s by the end, times the customer's patience rate, plus 5 s per extra item).

## 2. The characters

**The baker** is the player's start.ng character, built from their `style`. Guests use start.ng's shared guest look. The apron (hot pink, cream, mint or plum) is a game-only extra picked on the menu. Clicking the baker on the menu makes them wave.

**The customers** live in `src/characters.js`. Each has a personality, a want (their `favourite` item, which they order 60% of the time as their first item), a surprise, a patience rate and a tip rate:

| Customer | Personality | Wants | Surprise |
| --- | --- | --- | --- |
| Mama Nkechi | warm, calls you "my dear" | biscoff for her grandchildren | the taro boba is secretly for her |
| Tunde | always on a call | milk tea before standup | he's the HNG mentor reviewing your PRs |
| Kemi | a student counting coins | white choc to share | on stipend day she tips big for a fast serve |
| Chef Femi | rival baker "just browsing" | choc chip to "study" | admits your cookies beat his |
| Little Ayo | a polite kid | the pinkest drink (strawberry) | pays with a jar of coins |
| DJ Spinz | hype radio voice | taro boba for the booth | gives the shop a live shout-out |
| Grandpa Olu | slow, kind, full of stories | milk tea "like 1975" | he owned the building when it was a bookshop |
| Aunty Bisi | always filming | something pretty (strawberry) | she's a food blogger with 200k followers |

Each customer has lines for arriving, being served, a wrong item and giving up. The **surprise** line plays when you serve them perfectly and their order includes their favourite. To add a customer, copy an entry in `src/characters.js`.

## 3. start.ng setup

All of it follows https://start.ng/docs.md.

- **Connect page:** `src/platform.js` opens a hidden `start.ng/connect` iframe and talks to it with `postMessage`. Replies are accepted only when `e.origin` is start.ng, `e.source` is that iframe and the `requestId` matches.
- **Where start.ng is:** on `*.start.ng` it's `https://start.ng`; on `*.start.localhost` it's `http://start.localhost:5173` (local testing); anywhere else the game plays as a guest and says sign-in isn't available.
- **Who's playing:** `startng:whoami` on load, and again on `visibilitychange` and window `focus`. Checks with no answer are ignored. If the look changes mid-shift, the baker is rebuilt when the shift ends.
- **Sign in:** `https://start.ng/?return_to=<this page>`. The `#startng_session=…` that comes back is tidied out of the address (the connect page doesn't need it).
- **Menu:** signed in, it greets the player by name with `@account`. Signed out, it shows **Sign in with start.ng** and **Play as guest**. With `?guest` it skips that question.
- **Player card:** top left, the `face` picture, name and `@account` (or "Not signed in").
- **Leaderboard:** `startng.json` declares `score` (ranked first) and `orders`. At the end of a shift, signed-in players send `startng:score` with exactly `{ score, orders }`, both whole numbers. The end screen shows "New best" and the rank, and the top 10 (`startng:leaderboard`) highlights the player's row by `player_id`.
- **Style fields** with missing or unknown values fall back to sensible defaults (`normalizeStyle` in `src/human.js`).

### The 3D character

`src/human.js` is a port of `src/three/human.ts` from https://github.com/Cybertron-HNG/startng-fe (branch `dev`, commit `6cb4e9a`, which added the wave, blinking and smile), from TypeScript to plain JavaScript. The look is unchanged. Oven Rush adds, separately marked in the file: a walk cycle and a tray-carrying pose (`update(t, { walk, phase, carry })`), and `spine`/`arms` in the returned object so the game can attach its apron and tray.

## 4. Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, import map for three.js `0.160.0` (jsDelivr) |
| `src/main.js` | Renderer, cameras (one for wide screens, one for phones held upright), input, labels, HUD, menu, end screen, start.ng flow, `?debug` tools |
| `src/game.js` | The `Shift` class: rules, customers, tray, serving, scoring, difficulty |
| `src/world.js` | The bakery model, item models, station layout, lights |
| `src/human.js` | start.ng's character builder plus walk and carry poses |
| `src/characters.js` | Customer data |
| `src/items.js` | Menu items and their colours |
| `src/platform.js` | start.ng connect page helpers |
| `src/style.css` | Styles (menu, HUD, tickets, phone layout) |
| `startng.json` | Leaderboard columns |
| `cover.png` | 1600×1000 cover |
| `tools/cover.html` | Renders the cover from the real scene |

## 5. Running it locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There's no start.ng on `localhost`, so it's guest only. Useful extras:

- `?debug` exposes `window.ovenRush` (the shift, `startShift()`, `setTime(s)`, `end()`, and `step(seconds)`, which runs the game at 60 fps without waiting).
- **Testing sign-in locally:** browsers send `*.start.localhost` to your own computer. Serve the game and open `http://oven-rush.start.localhost:8000`; the game then looks for start.ng at `http://start.localhost:5173`. Run a local start.ng there, or a small stand-in page at `/connect/` that answers `startng:whoami`, `startng:score` and `startng:leaderboard` as the docs describe.
- **Re-rendering the cover:** serve the folder, then capture `tools/cover.html?export` (it prints the finished PNG as a data URL), for example with a headless Chromium browser's `--dump-dom`, and save it as `cover.png`.

## 6. Putting it live and updating it

1. Push to the public repo `Hassanat-t/oven-rush`.
2. Check: `POST https://api.start.ng/games/check` with `{"repo_url":"https://github.com/Hassanat-t/oven-rush","name":"oven-rush"}`. 200 = ready (read any `warnings`), 422 = fix the listed `errors`.
3. Publish: `POST https://api.start.ng/games/publish` with the same body. The first time it replies 202 with an `approve_url`. Open it, sign in to start.ng, and say yes to "Put oven-rush live?" (the link works once, for 30 days).
4. After that, every push to `main` updates `oven-rush.start.ng` within a minute or two. If a push has a problem, the game stays on its last good version and **Your games** on the start.ng profile shows why.

## 7. What was and wasn't tested

**Tested** (desktop 1280×800 and phone 375×812, in Chromium):

- The menu, a full shift, the end screen, Play again and back to Menu
- Picking up, serving, partial orders, scoring, tips, combos and perfect serves; customers storming off and hearts running out
- The phone camera and layout; no sideways scrolling
- **Through the real `platform.js`**, against a local stand-in for start.ng's connect page on `start.localhost`:
  - signed in (greeting, player card, the character's style on the baker)
  - signed out (sign-in and guest buttons, the shared guest look)
  - `?guest`
  - saving a run ("New best", rank) and the leaderboard with the player's row highlighted
  - tidying `#startng_session` out of the address

**Not tested yet:**

- **Real start.ng** sign-in, score saving and leaderboard. These only work once the game is live at `oven-rush.start.ng`.
- Real phones (only phone-sized browser windows), Safari and Firefox.
- Signing out on start.ng while the game is open (the re-check code runs, but the stand-in can't change accounts mid-session).
