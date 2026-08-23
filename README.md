# Game Hub

A homescreen for your game wiki apps, starting with the Mobile Legends wiki —
backed by a real hosted database instead of the browser's `localStorage`.
Everything MLBB-related (heroes, skins, attributes, tier list, upcoming
releases) lives in a PostgreSQL database on the server, so:

- Storage is no longer capped by the browser's ~5-10MB `localStorage` quota.
- Anyone who visits the site sees the same data — it's a shared, hosted app,
  not something living in one browser.
- Visitors can browse everything freely; only an admin (password-protected)
  can add, edit, or delete entries. The server enforces this — a visitor
  can't bypass it from the browser console.
- Images are still just URLs (hotlinked), exactly like before — no upload
  pipeline needed.

## How it works

- `server.js` — an Express API with one table, `app_data(key, value)`. It
  mirrors how the original app used `localStorage`: each key (heroes, skins,
  etc.) maps to one JSON string value. `GET` routes are public; `PUT`/`DELETE`
  require a valid admin login token. It also serves everything in `public/`
  as static files, so any page you drop in there (`mlbb.html`, `crk.html`,
  etc.) is reachable at that same path once deployed.
- `public/index.html` — the homescreen. A splash screen leads into a game
  select grid (stored in the browser's `localStorage`, since it's just your
  personal shortcuts list, not shared app data). Click a tile to open that
  game's page. Use the **+** tile to add a new game (name, emoji or logo
  image URL, and the filename it should link to, e.g. `crk.html`), and hover
  a tile to edit or remove it. Ships with placeholder tiles for MLBB, Cookie
  Run: Kingdom, Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero —
  edit or delete the ones you're not using yet.
- `public/mlbb.html` — your MLBB wiki app (unchanged). Every `localStorage`
  call in it was already replaced with a `DB` object that loads all data from
  `/api/data` on page load and syncs writes back to the server. A small
  `ADMIN` object handles login/logout.
- `public/images/` — empty by default. Drop logo images here
  (`mlbb-logo.jpg`, `crk-logo.jpg`, etc., matching the `img` path each tile
  points to) and the homescreen will use them; tiles fall back to an emoji
  automatically if no image is set or it fails to load.

## 1. Choose where the database lives

Render's own free PostgreSQL **expires and gets deleted after 30 days** — not
what you want for a database that's supposed to stick around. Two better free
options that don't expire:

- **[Neon](https://neon.tech)** — free tier, ~0.5GB storage, serverless Postgres. Recommended.
- **[Supabase](https://supabase.com)** — free tier, 500MB storage, includes a Postgres database.

Either way, sign up, create a project, and copy the **connection string**
(it'll look like `postgres://user:password@host/dbname?sslmode=require`).

## 2. Choose where the app runs

**[Render](https://render.com)** is a good default — free web hosting, no
credit card needed. (The web *service* free tier doesn't expire, only their
free *database* does — which is why we're using Neon/Supabase for the
database instead.)

## 3. Deploy

### Push this project to GitHub

```bash
cd mlbb-hub
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on GitHub and push it there.

### Generate your admin password hash

You'll need Node installed locally for this one step:

```bash
npm install
node hash-password.js "choose-a-strong-password"
```

This prints something like:

```
ADMIN_PASSWORD_HASH=$2a$10$abc123...
```

Copy that whole hash — you'll paste it into Render's environment variables
next. (Your actual password is never stored anywhere, only this hash.)

### Create the web service on Render

1. In the Render dashboard: **New → Web Service**, connect your GitHub repo.
2. Build command: `npm install`
3. Start command: `node server.js`
4. Under **Environment**, add these variables:
   - `DATABASE_URL` — the connection string from Neon/Supabase (step 1)
   - `JWT_SECRET` — any long random string, e.g. run
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     locally and paste the output
   - `ADMIN_PASSWORD_HASH` — the hash you generated above
5. Deploy. Render gives you a live URL (e.g. `https://mlbb-hub.onrender.com`).

The server creates its database table automatically on first boot and seeds
default attribute options — no manual SQL needed.

### Try it

- Visit your Render URL — you should see the app, fully browsable, with a
  "Viewing (read-only)" badge in the sidebar.
- Click **Admin Sign In**, enter the password you chose, and you should be
  able to add/edit/delete again, now saving to the shared database.

## Notes & limitations

- **Free tier sleep**: Render's free web services spin down after 15 minutes
  of inactivity; the first request after that takes 30-60 seconds to wake up.
  Fine for a personal wiki, less fine if you want instant loads all the time
  — in that case a $7/mo Render Starter instance removes the sleep.
- **Database size**: Neon's free tier gives ~0.5GB, Supabase ~500MB — vastly
  more than the old ~5-10MB browser limit, and plenty for hero/skin text data
  plus image *links* (not the images themselves).
- **UI gating isn't exhaustive**: the most common edit/add/delete controls are
  hidden for non-admin visitors, but a few obscure editing paths deep in
  forms may still be visible (though clicking them will fail — the server
  rejects any write without a valid admin session either way). If you spot
  one that bothers you, it's a small CSS/JS tweak to hide it too.
- **Backups**: use the existing "Backup & Database" button (admin only) to
  export a JSON snapshot any time — handy before big changes.
- **Changing the admin password**: just generate a new hash with
  `node hash-password.js "new-password"` and update `ADMIN_PASSWORD_HASH` in
  Render's environment variables.

## Migrating from your old Render deployment

Since you already have MLBB data live in a database on the old account:

1. On the **old** site, sign in as admin → **Backup & Database** → **Export
   Backup**. This saves a JSON snapshot of everything currently in the DB.
2. Set up the **new** Neon project and Render service as described above and
   deploy this project.
3. On the **new** site, sign in as admin (same password, since
   `ADMIN_PASSWORD_HASH` is whatever you set in the new service's env vars —
   reuse the same hash, or generate a fresh one) → **Backup & Database** →
   **Import Backup** → select the JSON file from step 1.
4. Once you've confirmed the new site looks right, you can delete the old
   Render service and old database.

You do **not** need to reuse the old Neon/Supabase database — a fresh one on
your new account is fine, since the import step repopulates it.

## Running locally

```bash
npm install
cp .env.example .env
# edit .env: paste your DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD_HASH
node server.js
```

Then open http://localhost:3000
