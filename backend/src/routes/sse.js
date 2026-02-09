const express = require('express');
const { ensureAuthenticated } = require('../auth/middleware');
const { addClient } = require('../services/sseManager');

const router = express.Router();

/**
 * GET /api/v1/events — SSE stream for real-time sync updates.
 */
router.get('/api/v1/events', ensureAuthenticated, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial keepalive
  res.write(':ok\n\n');

  addClient(res);

  // Keepalive every 30 seconds to prevent proxy timeouts
  const keepalive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepalive);
  });
});

module.exports = router;
