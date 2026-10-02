const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const sessionRoutes = require('./routes/session.js');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ===== Middleware =====

// Security headers
// crossOriginResourcePolicy set to cross-origin so the frontend can fetch from us
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — only allow requests from the frontend origin
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// Body parser for JSON requests
app.use(express.json());

// ===== Routes =====

// Health check — verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Session routes (Phase 7 will implement real session creation)
app.use('/api', sessionRoutes);

// ===== Error handling =====

// 404 — resource not found
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 500 — unhandled errors (never expose stack traces)
app.use((err, req, res, next) => {
  console.error('[TalkWithAI Backend] Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

// ===== Start server =====

app.listen(PORT, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │ TalkWithAI Backend                          │');
  console.log('  └─────────────────────────────────────────────┘');
  console.log(`  → Server:    http://localhost:${PORT}`);
  console.log(`  → Frontend:  ${FRONTEND_ORIGIN}`);
  console.log(`  → Health:    http://localhost:${PORT}/health`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});