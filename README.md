# 🃏 Fair Play — Self-Hosted

A live-synced home management app for two partners, based on the Fair Play Method by Eve Rodsky.

## What it does

- Deal 30 household cards across Home, Kids, Out & Wellbeing categories
- Assign each card to a partner with a shared "standard" for what done looks like
- Live sync — changes on one device appear on the other every 4 seconds
- Activity feed showing who changed what and when
- Rebalance tab for your monthly check-in conversations

---

## Setup (takes 2 minutes)

### Requirements
- [Node.js](https://nodejs.org) installed (any version 14+)

### Steps

1. **Unzip this folder** somewhere on your computer or server

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

## Hosting online (so you can access from anywhere)

For access outside your home network, deploy to any of these for free:

### Option A: Railway (easiest)
1. Create account at [railway.app](https://railway.app)
2. New project → Deploy from GitHub (upload this folder first)
3. Done — you get a public URL like `https://fair-play-abc123.railway.app`

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

All your card assignments are saved in `data.json` in the same folder as `server.js`. Back this file up occasionally — it's your whole shared state.

---

## Customising

Want to add more cards? Edit the `CARDS` array in `public/index.html`. Each card needs:
```js
{ id: 31, name: "Card Name", emoji: "🏠", category: "Home",
  cpe: ["Conceive step", "Plan step", "Execute step"] }
```

---

Made with ♥ using the Fair Play Method by Eve Rodsky.
