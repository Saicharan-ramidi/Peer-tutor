// ============================
// AUTH ROUTES (Login / Register)
// ============================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const SECRET = 'peertutor_secret_2024';

// ── REGISTER ──────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password, role, branch, year, bio } = req.body;

  if (!name || !email || !password || !role || !branch || !year) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashed = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, branch, year, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, hashed, role, branch, parseInt(year), bio || '');
    const token = jwt.sign({ id: result.lastInsertRowid, role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastInsertRowid, name, email, role, branch, year } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
