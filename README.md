# 🃏 Fair Play — Self-Hosted

A live-synced home management app for two partners, based on the Fair Play Method by Eve Rodsky.

## What it does

- Build a shared **card bank** for your household — start empty, add only the cards that matter to you
- Two ways to add: pick from a built-in library of 100 premade cards (bulk-select supported), or build a custom card from scratch
- Every card is fully editable — name, emoji, category, and the three-step CPE breakdown (Conceive · Plan · Execute)
- Assign each card to a partner — or to **both**, for the few you genuinely carry together — with a shared "standard" for what done looks like
- Filter the deck by partner and by category at the same time — two name pills above the category row
- Live sync — changes on one device appear on the other every 4 seconds
- Activity feed showing who changed what and when
- Rebalance tab for your monthly check-in conversations
- Hover any card to reveal an × and remove it from the bank (with confirmation)
- **Optional push reminders via Pushcut** — schedule a daily / weekly / monthly nudge on any assigned card; the server fires a webhook at the right time and Pushcut delivers a native iOS push to the card's owner — or to **both partners** if
  the card is shared. Tapping the notification opens that card straight away

---

## Setup (takes 2 minutes)

### Requirements
- [Node.js](https://nodejs.org) installed (any version 14+)

### Steps

1. **Clone or unzip this folder** somewhere on your computer or server

2. **Start the server:**
   ```
   node server.js
   ```
   You'll see:
   ```
   ✅ Fair Play is running at http://localhost:3000
   ```

3. **Open the app** in your browser:
   ```
   http://localhost:3000
   ```

4. **Your partner opens the same URL** on their device
   - If you're on the same home Wi-Fi, they use your local IP instead of localhost
   - Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Example: `http://192.168.1.42:3000`

---

## How to use it

1. **Set up players** — enter both partners' names and pick which one is you.
2. **Build your bank** — tap the **+** button:
   - **From the library** → tap to select any number of premade cards, then "Add N cards to bank" in one go. Use "Select all" to grab a whole category at once.
   - **Build a custom card** → start from scratch with your own name, emoji, category, and CPE steps.
3. **Tweak cards** — open any card → **Edit card details** to change name, emoji, category, or the CPE breakdown. Edits apply everywhere that card appears.
4. **Deal cards** — tap a card → pick the owner, write a shared "standard" for what done looks like.
   Tap **both** names to make it a shared card: it shows both initials on the deal
   grid and counts as **half a card** toward each partner's load.
5. **Filter the deck** — tap a partner's pill under the **Cards** heading to see only their cards; tap it again to clear. Shared cards show under both names. Person and category stack, so "Taylor + Home" shows just her Home cards, and the person pill narrows search results too.
6. **Remove cards** — hover a card to reveal the × in the top-left corner, then confirm. Any assignment on it is cleared too.
7. **Track & rebalance** — check the **Tracker** tab to see who owns what and the load split, or the **Rebalance** tab to one-tap swap cards between partners. Shared cards are marked *Shared* in Rebalance and have no swap button — open the card itself to change who's on it.

---

## Hosting online (so you can access from anywhere)

For access outside your home network, deploy to any of these for free:

### Option A: Railway (easiest)
1. Create account at [railway.app](https://railway.app)
2. New project → Deploy from GitHub
3. Done — you get a public URL like `https://fair-play-abc123.railway.app`
4. Add a Railway **Volume** mounted at `/data` so your `data.json` survives redeploys

### Option B: Render
1. Create account at [render.com](https://render.com)
2. New Web Service → connect your repo
3. Start command: `node server.js`

### Option C: Your own VPS (Hetzner, DigitalOcean etc.)
1. Upload files via SFTP
2. Run `node server.js` (or use `pm2` to keep it running)
3. Point your domain or use the server IP

---

## Data

All your shared state lives in `data.json`:

- `p1`, `p2` — partner names
- `customCards` — every card in your bank (whether you pulled it from the library or built from scratch). Library-sourced cards keep a `sourceId` reference so the picker can show an "In bank" badge.
- `cards` — assignments, keyed by card id: `{ owner, standard, changedBy, changedAt, reminders }`.
  `owner` is `'p1'`, `'p2'`, or `'both'` (a shared card owned by each partner; its
  reminder fires to both configured webhooks).
- `activity` — recent change log

The server reads/writes `/data/data.json` if a `/data` directory exists (e.g. a Railway Volume), otherwise it falls back to `data.json` next to `server.js`. Back this file up occasionally — it's your whole shared state.

### Reminder deep links

Tapping a reminder notification opens the app directly on that card. The server
builds the link from its own public URL:

- On Railway this is automatic — `RAILWAY_PUBLIC_DOMAIN` is used as-is.
- Anywhere else (or to override), set `APP_BASE_URL`, e.g.
  `APP_BASE_URL=https://fairplay.example.com`.

If neither is set, reminders still send normally — they just aren't tappable.
The startup log tells you which state you're in:

```
   Reminder deep links: https://fairplay.example.com/?card=…
   Reminder deep links: OFF (set APP_BASE_URL to enable tap-to-open)
```

The link is `/?card=<cardId>`; the app opens that card's sheet and strips the
parameter, so a refresh won't reopen it. If the link opens in a browser that has
never seen the app, you'll pick which partner you are first and then land on the
card.

### Resetting

In the app, **⋯ → Reset all data** wipes everything back to empty. It requires the reset password — set in `server.js` (`const RESET_PASSWORD = '…'`).

---

## Push notification reminders (optional)

Each assigned card can carry a reminder rule. The server checks once a minute, and when the schedule matches it POSTs to a per-partner Pushcut webhook — Pushcut then delivers a real iOS push.

### One-time Pushcut setup (per phone)

1. Install [Pushcut](https://www.pushcut.io) on each iPhone
2. Open Pushcut → **Notifications** → tap **+** → name it something like "FairPlay"
3. Tap the new notification → copy the **Webhook URL**
4. Repeat on the second phone

### In Fair Play

1. Open **⋯ → Settings → Notifications → Edit**
2. Paste each partner's webhook URL into their field
3. Set the **Timezone** field (an IANA name like `America/New_York`, `Europe/London`, or `Australia/Sydney`) — reminders fire at that zone's wall-clock time. Defaults to UTC, which is what Railway uses by default.
4. Tap **Send test notification** for each phone to confirm the webhook works
5. Save

### Per-card reminders

Open any assigned card → flip the **Reminder** toggle and pick **Daily / Weekly / Monthly**, a time, and (for weekly/monthly) which day. Save the card. A 🔔 appears on the card tile and a "Daily · 9:00am" line shows up in the **Tracker** tab.

The server is resilient to short outages: if a reminder's scheduled minute is missed, it fires up to ~10 minutes later. After firing, `lastFired` is persisted immediately so a restart can't cause a duplicate.

---

## Customising the library

The 100 premade cards — the canonical Fair Play deck, split across Home / Kids /
Out / Wellbeing / Wild — live in the `LIBRARY` array in `public/index.html`. To add
more options to the picker:
```js
{ id: 101, name: "Card Name", emoji: "🏠", category: "Home",
  cpe: ["Conceive step", "Plan step", "Execute step"] }
```
Existing users will see new library entries the next time they open the **From the library** picker. (Library entries are just templates — they only enter a household's bank when a user explicitly adds them.)

---

Made with ♥ using the Fair Play Method by Eve Rodsky.
