const express = require('express');
const router = express.Router();

/**
 * POST /api/session
 *
 * Creates a new voice conversation session.
 *
 * Phase 5: Placeholder — returns 501 Not Implemented.
 * Phase 7: Will request ephemeral credential from Gemini Live API.
 * Phase 8: Will return session config + ephemeral token to frontend.
 */
router.post('/session', (req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Session creation will be implemented in Phase 7.',
  });
});

module.exports = router;