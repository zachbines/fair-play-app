# 🃏 Fair Play — Self-Hosted

A live-synced home management app for two partners, based on the Fair Play Method by Eve Rodsky.

## What it does

- Build a shared **card bank** for your household — start empty, add only the cards that matter to you
- Two ways to add: pick from a built-in library of 30 premade cards (bulk-select supported), or build a custom card from scratch
- Every card is fully editable — name, emoji, category, and the three-step CPE breakdown (Conceive · Plan · Execute)
- Assign each card to a partner with a shared "standard" for what done looks like
- Live sync — changes on one device appear on the other every 4 seconds
- Activity feed showing who changed what and when
- Rebalance tab for your monthly check-in conversations
- Hover any card to reveal an × and remove it from the bank (with confirmation)

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
5. **Remove cards** — hover a card to reveal the × in the top-left corner, then confirm. Any assignment on it is cleared too.
6. **Track & rebalance** — check the **Tracker** tab to see who owns what and the load split, or the **Rebalance** tab to one-tap swap cards between partners.

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
- `cards` — assignments (which card belongs to which partner, plus the agreed standard)
- `activity` — recent change log

The server reads/writes `/data/data.json` if a `/data` directory exists (e.g. a Railway Volume), otherwise it falls back to `data.json` next to `server.js`. Back this file up occasionally — it's your whole shared state.

### Resetting

In the app, **⋯ → Reset all data** wipes everything back to empty. It requires the reset password — set in `server.js` (`const RESET_PASSWORD = '…'`).

---

## Customising the library

The 30 premade cards live in the `LIBRARY` array in `public/index.html`. To add more options to the picker:
```js
{ id: 31, name: "Card Name", emoji: "🏠", category: "Home",
  cpe: ["Conceive step", "Plan step", "Execute step"] }
```
Existing users will see new library entries the next time they open the **From the library** picker. (Library entries are just templates — they only enter a household's bank when a user explicitly adds them.)

---

Made with ♥ using the Fair Play Method by Eve Rodsky.
