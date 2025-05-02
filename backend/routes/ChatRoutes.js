// backend/routes/ChatRoutes.js
const express = require('express');
const { handleChat } = require('../controllers/ChatController');
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware');
const { limiter } = require('../middlewares/rateLimitMiddleware'); // Apply rate limiting

const router = express.Router();

// Protect the chat route - only authenticated patients can use it
router.post('/', limiter, authenticateToken, authorizeRole(['patient']), handleChat);

module.exports = router;