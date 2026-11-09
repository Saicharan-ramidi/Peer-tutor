// ============================
// SERVER ENTRY POINT (server.js)
// ============================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));  // serve frontend

// ── ROUTES ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doubts', require('./routes/doubts'));

// ── CATCH-ALL: serves index.html for any other route ─
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Peer Tutor running at http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to stop\n');
});
