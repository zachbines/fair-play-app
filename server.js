const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Use /data directory if it exists (Railway Volume), otherwise fall back to local
const DATA_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Reset password — change this to something only you know
const RESET_PASSWORD = 'reset';

const EMPTY_DATA = { p1: '', p2: '', cards: {}, activity: [], customCards: [], settings: {} };

// Init data file if missing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2));
  console.log(`📁 Data file created at: ${DATA_FILE}`);
} else {
  console.log(`📁 Using existing data file at: ${DATA_FILE}`);
}

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) { return { ...EMPTY_DATA }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API: GET /api/data
  if (pathname === '/api/data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readData()));
    return;
  }

  // API: POST /api/data
  if (pathname === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        writeData(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  // API: GET /api/settings — webhook URLs + timezone
  if (pathname === '/api/settings' && req.method === 'GET') {
    const data = readData();
    const settings = data.settings || {};
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      p1Webhook: settings.p1Webhook || '',
      p2Webhook: settings.p2Webhook || '',
      timezone: settings.timezone || 'UTC',
    }));
    return;
  }

  // API: POST /api/settings
  if (pathname === '/api/settings' && req.method === 'POST') {
    try {
      const incoming = await readBody(req);
      const data = readData();
      data.settings = {
        ...(data.settings || {}),
        p1Webhook: typeof incoming.p1Webhook === 'string' ? incoming.p1Webhook.trim() : (data.settings?.p1Webhook || ''),
        p2Webhook: typeof incoming.p2Webhook === 'string' ? incoming.p2Webhook.trim() : (data.settings?.p2Webhook || ''),
        timezone:  typeof incoming.timezone  === 'string' ? incoming.timezone.trim()  : (data.settings?.timezone  || 'UTC'),
      };
      if (!data.settings.timezone) data.settings.timezone = 'UTC';
      writeData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400);
      res.end('Bad request');
    }
    return;
  }

  // API: POST /api/test-webhook — fires a test push to one of the configured webhooks
  if (pathname === '/api/test-webhook' && req.method === 'POST') {
    try {
      const { who, sound } = await readBody(req);
      const data = readData();
      const urls = webhooksForOwner(data.settings, who);
      if (!urls.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'No webhook configured for that partner' }));
        return;
      }
      const payload = {
        title: 'Fair Play',
        text: sound ? `🔊 Sound preview: ${sound}` : '🔔 Test notification — your webhook is working',
      };
      // Preview the picked sound; omit to hear the notification's configured sound.
      if (sound) payload.sound = sound;
      const results = await Promise.all(urls.map(u => postWebhook(u, payload)));
      const ok = results.some(Boolean);
      res.writeHead(ok ? 200 : 502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok }));
    } catch (e) {
      res.writeHead(400);
      res.end('Bad request');
    }
    return;
  }

  // API: POST /api/reset  — wipes all data back to empty state
  if (pathname === '/api/reset' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { password } = JSON.parse(body);
        if (password !== RESET_PASSWORD) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Wrong password' }));
          return;
        }
        writeData({ ...EMPTY_DATA });
        console.log('🔄 Data reset by user');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  // Serve static files
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
    return;
  }
  if (pathname === '/app-icon.png') {
    serveFile(res, path.join(__dirname, 'public', 'app-icon.png'), 'image/png');
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ Fair Play is running at http://localhost:${PORT}`);
  console.log(`   Data stored at: ${DATA_FILE}`);
  console.log(`   Reset password: ${RESET_PASSWORD}\n`);
  startReminderScheduler();
});


// ─────────────────────────────────────────────────────────────────────
//  Reminder scheduler
// ─────────────────────────────────────────────────────────────────────
//  Runs once a minute, aligned to the minute boundary. Plain Node — no
//  cron dependency. Compares "now" against each card's reminder rule in
//  the user-configured timezone and POSTs to Pushcut on match.

const FIRE_WINDOW_MINUTES = 10;  // if we miss a tick, we can still fire up to 10 min late

// Build "current time" parts in the configured timezone.
function nowInTimezone(tz) {
  const tzSafe = tz || 'UTC';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tzSafe,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      weekday: 'long',
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type)?.value;
    let hour = get('hour');
    if (hour === '24') hour = '00'; // some impls report 24 for midnight
    return {
      time: `${hour}:${get('minute')}`,
      day: (get('weekday') || '').toLowerCase(),
      dayOfMonth: parseInt(get('day'), 10),
      dateKey: `${get('year')}-${get('month')}-${get('day')}`,
      monthKey: `${get('year')}-${get('month')}`,
      tz: tzSafe,
    };
  } catch (e) {
    // Bad timezone string — fall back silently to UTC
    if (tzSafe !== 'UTC') return nowInTimezone('UTC');
    throw e;
  }
}

function dateKeyInTz(ts, tz) {
  if (!ts) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = fmt.formatToParts(new Date(ts));
    const get = (type) => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch (e) { return null; }
}

function monthKeyInTz(ts, tz) {
  if (!ts) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit',
    });
    const parts = fmt.formatToParts(new Date(ts));
    const get = (type) => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}`;
  } catch (e) { return null; }
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return -1;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

// True if scheduled time has just passed within the firing window
function withinFiringWindow(scheduledTime, currentTime) {
  const sched = timeToMinutes(scheduledTime);
  const now = timeToMinutes(currentTime);
  if (sched < 0 || now < 0) return false;
  const delta = now - sched;
  return delta >= 0 && delta < FIRE_WINDOW_MINUTES;
}

async function postWebhook(webhookUrl, payload) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Webhook ${maskWebhook(webhookUrl)} returned ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Webhook ${maskWebhook(webhookUrl)} failed:`, e.message);
    return false;
  }
}

// Webhook targets for a card owner. 'both' is a shared card: each partner gets
// the push, so it resolves to every configured webhook rather than just one.
function webhooksForOwner(settings, owner) {
  const urls = owner === 'both'
    ? [settings?.p1Webhook, settings?.p2Webhook]
    : [owner === 'p1' ? settings?.p1Webhook : settings?.p2Webhook];
  return urls.filter(Boolean);
}

function maskWebhook(u) {
  if (!u) return '(none)';
  return u.length > 40 ? u.slice(0, 30) + '…' + u.slice(-6) : u;
}

async function checkAndFireReminders() {
  const data = readData();
  const tz = data.settings?.timezone || 'UTC';
  const now = nowInTimezone(tz);

  const cards = data.cards || {};
  for (const cardId of Object.keys(cards)) {
    const card = cards[cardId];
    if (!card || !card.reminders || !card.reminders.enabled) continue;
    if (!card.owner) continue;

    // A shared ('both') card reminds each partner, so this is a list of targets.
    const webhookUrls = webhooksForOwner(data.settings, card.owner);
    if (!webhookUrls.length) continue;

    const r = card.reminders;
    if (!withinFiringWindow(r.time, now.time)) continue;

    let shouldFire = false;
    if (r.frequency === 'daily') {
      shouldFire = dateKeyInTz(r.lastFired, tz) !== now.dateKey;
    } else if (r.frequency === 'weekly') {
      shouldFire = now.day === r.dayOfWeek && dateKeyInTz(r.lastFired, tz) !== now.dateKey;
    } else if (r.frequency === 'monthly') {
      const targetDom = Math.min(Math.max(parseInt(r.dayOfMonth, 10) || 1, 1), 28);
      shouldFire = now.dayOfMonth === targetDom && monthKeyInTz(r.lastFired, tz) !== now.monthKey;
    }
    if (!shouldFire) continue;

    const customCard = (data.customCards || []).find(c => String(c.id) === String(cardId));
    const cardName = customCard?.name || 'Task';
    const cardEmoji = customCard?.emoji || '🔔';

    console.log(`⏰ Firing reminder for "${cardName}" → ${card.owner} (${webhookUrls.map(maskWebhook).join(', ')})`);
    const payload = {
      title: 'Fair Play',
      text: `${cardEmoji} ${cardName} is due today`,
    };
    // Per-card sound from the reminder dropdown; omit to let the Pushcut
    // notification play its own configured sound.
    if (card.reminders && card.reminders.sound) payload.sound = card.reminders.sound;
    const results = await Promise.all(webhookUrls.map(u => postWebhook(u, payload)));
    // Mark fired if any target got it — retrying would re-notify whoever already
    // received it. Only a total failure leaves lastFired untouched for next tick.
    if (!results.some(Boolean)) continue;

    // Re-read just before write to minimize race with concurrent /api/data POSTs
    const fresh = readData();
    if (fresh.cards && fresh.cards[cardId] && fresh.cards[cardId].reminders) {
      fresh.cards[cardId].reminders.lastFired = Date.now();
      writeData(fresh);
    }
  }
}

function startReminderScheduler() {
  const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
  console.log(`⏰ Reminder scheduler armed (first tick in ${Math.round(msUntilNextMinute / 1000)}s)`);
  setTimeout(() => {
    runTick();
    setInterval(runTick, 60_000);
  }, msUntilNextMinute);
}

async function runTick() {
  try { await checkAndFireReminders(); }
  catch (e) { console.error('Reminder tick failed:', e); }
}
