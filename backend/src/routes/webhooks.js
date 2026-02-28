const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const { processWebhook } = require('../services/webhookHandler');

const router = express.Router();

/**
 * Verify the GitHub webhook signature (HMAC-SHA256).
 * Compares the x-hub-signature-256 header against a computed HMAC of the raw body.
 */
function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', config.githubWebhookSecret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/webhooks/github
 * Receives GitHub webhook events. Uses HMAC signature verification (not session auth).
 * The express.raw() middleware gives us the raw Buffer for signature verification.
 */
router.post(
  '/api/v1/webhooks/github',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    // Verify HMAC signature
    if (!verifySignature(req.body, signature)) {
      console.warn(`[webhook] signature verification failed (delivery: ${deliveryId})`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the raw body
    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    // Respond immediately — process asynchronously
    res.status(200).json({ ok: true });

    try {
      await processWebhook(event, payload);
    } catch (err) {
      console.error(`[webhook] error processing ${event} (delivery: ${deliveryId}): ${err.message}`);
    }
  }
);

module.exports = router;
