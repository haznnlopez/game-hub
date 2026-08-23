// ============================================================================
// MLBB Hub — backend server
// Express API + static file host, backed by PostgreSQL.
//
// Data model: a single table `app_data(key TEXT PRIMARY KEY, value TEXT,
// updated_at TIMESTAMPTZ)`. This mirrors how the original app used
// localStorage (one string value per key), so the whole dataset can be as
// large as your database allows instead of being capped by the browser's
// ~5-10MB localStorage quota.
//
// Reads are public. Writes require an admin JWT obtained via POST /api/login.
// ============================================================================

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt hash, see README
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Set it to your PostgreSQL connection string (see .env.example).",
  );
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET. Set it to any long random string.");
  process.exit(1);
}
if (!ADMIN_PASSWORD_HASH) {
  console.error(
    "Missing ADMIN_PASSWORD_HASH. Run `node hash-password.js <password>` to generate one (see README).",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Most free Postgres hosts (Render, Neon, Supabase, Railway) require SSL.
  ssl: DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

// The frontend auto-fills these defaults into the "attributes" record the
// first time it runs, which would otherwise trigger a write attempt (and an
// unwanted login prompt) for ordinary read-only visitors on a brand-new,
// empty database. Seeding them here means that never has to happen.
const DEFAULT_ATTRIBUTES = {
  roles: ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"],
  collectibleRarities: [
    "Common",
    "Exceptional",
    "Deluxe",
    "Exquisite",
    "Grand",
    "Supreme",
  ],
  skinRarities: ["Basic", "Elite", "Special", "Epic", "Legend", "Collector"],
  lanes: ["EXP Lane", "Gold Lane", "Mid Lane", "Roam", "Jungle"],
  specialties: [
    "Burst",
    "Crowd Control",
    "Regen",
    "Push",
    "Poke",
    "Guard",
    "Charge",
    "Support",
    "Initiator",
    "Damage",
  ],
  skillCategories: [
    "Damage",
    "Crowd Control",
    "Mobility",
    "Buff",
    "Debuff",
    "Heal/Shield",
    "Passive",
  ],
};

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `INSERT INTO app_data (key, value)
     VALUES ('game_hub_mlbb_attributes', $1)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_ATTRIBUTES)],
  );
  console.log("Database ready.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // generous limit; raise if you paste huge JSON

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post("/api/login", async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "Password required" });

  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "Incorrect password" });

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") throw new Error("not admin");
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

// ---------------------------------------------------------------------------
// Data API
// mirrors the old localStorage key/value interface: GET returns strings,
// PUT accepts { value: string }.
// ---------------------------------------------------------------------------

// Public: fetch everything in one call (used on page load).
app.get("/api/data", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT key, value FROM app_data");
    const out = {};
    rows.forEach((r) => (out[r.key] = r.value));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Public: fetch a single key.
app.get("/api/data/:key", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM app_data WHERE key = $1",
      [req.params.key],
    );
    res.json({ key: req.params.key, value: rows[0] ? rows[0].value : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin only: upsert a key.
app.put("/api/data/:key", requireAdmin, async (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== "string" && value !== null) {
    return res.status(400).json({ error: "value must be a string or null" });
  }
  try {
    await pool.query(
      `INSERT INTO app_data (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [req.params.key, value],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin only: delete a key.
app.delete("/api/data/:key", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM app_data WHERE key = $1", [
      req.params.key,
    ]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Game hub — auto-detect games
// The homescreen (public/index.html) calls this instead of hardcoding a
// game list. It scans public/ for .html files (besides index.html itself)
// and pairs each one with a logo image from public/images/, if one exists
// matching the filename (e.g. mlbb.html -> images/mlbb-logo.jpg,
// images/mlbb.png, etc.). Public, since it's just a directory listing.
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];

// "cook-run-kingdom" / "cook_run_kingdom" / "cookRunKingdom" -> "Cook Run Kingdom"
function prettifyName(base) {
  const spaced = base
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Looks for an image whose basename matches the html file's basename,
// trying a few common suffixes and every supported extension.
function findLogoImage(base, imageFiles) {
  const candidates = [`${base}-logo`, `${base}_logo`, base, `${base}-icon`];
  for (const candidate of candidates) {
    for (const ext of IMAGE_EXTENSIONS) {
      const target = (candidate + ext).toLowerCase();
      const match = imageFiles.find((f) => f.toLowerCase() === target);
      if (match) return "images/" + match;
    }
  }
  return null;
}

app.get("/api/games", (req, res) => {
  try {
    const publicDir = path.join(__dirname, "public");
    const imagesDir = path.join(publicDir, "images");

    const htmlFiles = fs
      .readdirSync(publicDir)
      .filter(
        (f) =>
          f.toLowerCase().endsWith(".html") &&
          f.toLowerCase() !== "index.html",
      );

    const imageFiles = fs.existsSync(imagesDir)
      ? fs.readdirSync(imagesDir)
      : [];

    const games = htmlFiles
      .sort((a, b) => a.localeCompare(b))
      .map((file) => {
        const base = file.replace(/\.html$/i, "");
        return {
          file,
          name: prettifyName(base),
          img: findLogoImage(base, imageFiles),
        };
      });

    res.json({ games });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not read the public folder" });
  }
});

// ---------------------------------------------------------------------------
// Static frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`MLBB Hub listening on port ${PORT}`));
  })
  .catch((e) => {
    console.error("Failed to initialize database:", e);
    process.exit(1);
  });
