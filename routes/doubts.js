// ============================
// DOUBTS ROUTES (Post / List / Answer / Resolve)
// ============================

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const db      = require('../db/database');

const SECRET = 'peertutor_secret_2024';

// ── MIDDLEWARE: verify token ──────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── GET all open doubts (anyone logged in) ────────────
router.get('/', auth, (req, res) => {
  const doubts = db.prepare(`
    SELECT d.*, u.name as junior_name, u.branch
    FROM doubts d
    JOIN users u ON d.junior_id = u.id
    ORDER BY d.created_at DESC
  `).all();
  res.json(doubts);
});

// ── POST a new doubt (juniors only) ──────────────────
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'junior') return res.status(403).json({ error: 'Only juniors can post doubts' });
  const { title, description, subject } = req.body;
  if (!title || !description || !subject) return res.status(400).json({ error: 'All fields required' });

  const result = db.prepare(`
    INSERT INTO doubts (title, description, subject, junior_id)
    VALUES (?, ?, ?, ?)
  `).run(title, description, subject, req.user.id);

  res.json({ id: result.lastInsertRowid, message: 'Doubt posted!' });
});

// ── GET single doubt with its answers ────────────────
router.get('/:id', auth, (req, res) => {
  const doubt = db.prepare('SELECT d.*, u.name as junior_name FROM doubts d JOIN users u ON d.junior_id=u.id WHERE d.id=?').get(req.params.id);
  if (!doubt) return res.status(404).json({ error: 'Not found' });

  const answers = db.prepare(`
    SELECT a.*, u.name as senior_name, u.rating
    FROM answers a JOIN users u ON a.senior_id=u.id
    WHERE a.doubt_id = ?
  `).all(req.params.id);

  res.json({ ...doubt, answers });
});

// ── POST an answer (seniors only) ────────────────────
router.post('/:id/answer', auth, (req, res) => {
  if (req.user.role !== 'senior') return res.status(403).json({ error: 'Only seniors can answer' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Answer content required' });

  db.prepare('INSERT INTO answers (doubt_id, senior_id, content) VALUES (?,?,?)').run(req.params.id, req.user.id, content);
  db.prepare('UPDATE doubts SET senior_id=?, status="assigned" WHERE id=? AND status="open"').run(req.user.id, req.params.id);

  res.json({ message: 'Answer posted!' });
});

// ── RESOLVE doubt + rate senior (junior only) ────────
router.post('/:id/resolve', auth, (req, res) => {
  if (req.user.role !== 'junior') return res.status(403).json({ error: 'Only juniors can resolve' });
  const { stars, senior_id } = req.body;

  const doubt = db.prepare('SELECT * FROM doubts WHERE id=? AND junior_id=?').get(req.params.id, req.user.id);
  if (!doubt) return res.status(404).json({ error: 'Doubt not found' });

  db.prepare('UPDATE doubts SET status="resolved" WHERE id=?').run(req.params.id);

  if (stars && senior_id) {
    db.prepare('INSERT INTO ratings (senior_id,junior_id,doubt_id,stars) VALUES(?,?,?,?)').run(senior_id, req.user.id, req.params.id, stars);
    const avg = db.prepare('SELECT AVG(stars) as avg FROM ratings WHERE senior_id=?').get(senior_id);
    db.prepare('UPDATE users SET rating=? WHERE id=?').run(+(avg.avg.toFixed(1)), senior_id);
  }
  res.json({ message: 'Doubt resolved!' });
});

// ── GET all seniors ───────────────────────────────────
router.get('/list/seniors', auth, (req, res) => {
  const seniors = db.prepare('SELECT id,name,branch,year,bio,rating FROM users WHERE role="senior" ORDER BY rating DESC').all();
  res.json(seniors);
});

module.exports = router;
