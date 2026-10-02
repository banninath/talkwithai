import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import sessionRoutes from './routes/session.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ===== Middleware =====

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

app.use(express.json());

// ===== Routes =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', sessionRoutes);

// ===== Error handling =====

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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