// ============================
// DATABASE SETUP (Phase 2)
// Creates all tables automatically
// ============================

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'peertutor.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── CREATE TABLES ──────────────────────────────────────

// Users Table (both Seniors & Juniors)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('senior','junior')),
    branch      TEXT    NOT NULL,
    year        INTEGER NOT NULL,
    bio         TEXT    DEFAULT '',
    rating      REAL    DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Doubts Table
db.exec(`
  CREATE TABLE IF NOT EXISTS doubts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    subject     TEXT    NOT NULL,
    junior_id   INTEGER NOT NULL REFERENCES users(id),
    senior_id   INTEGER REFERENCES users(id),
    status      TEXT    DEFAULT 'open' CHECK(status IN ('open','assigned','resolved')),
    created_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Answers Table
db.exec(`
  CREATE TABLE IF NOT EXISTS answers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    doubt_id   INTEGER NOT NULL REFERENCES doubts(id),
    senior_id  INTEGER NOT NULL REFERENCES users(id),
    content    TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

// Ratings Table
db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id  INTEGER NOT NULL REFERENCES users(id),
    junior_id  INTEGER NOT NULL REFERENCES users(id),
    doubt_id   INTEGER NOT NULL REFERENCES doubts(id),
    stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

console.log('✅ Database ready — all tables created');
module.exports = db;
