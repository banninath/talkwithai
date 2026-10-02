import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import sessionRoutes from './routes/session.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ===== Security middleware =====

// Trust proxy — required for correct req.ip when deployed behind
// reverse proxies (Render, Vercel, etc.). Without this, all requests
// appear to come from the proxy's IP, making rate limiting useless.
app.set('trust proxy', 1);

// Secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — only allow the frontend origin
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// Body parser with size limit (prevents oversized request abuse)
app.use(express.json({ limit: '10kb' }));

// ===== Routes =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', sessionRoutes);

// ===== Error handling =====

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 500 — never expose stack traces or internal details
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