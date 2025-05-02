// backend/controllers/ChatController.js
const ChatService = require('../gemini/ChatService');

const handleChat = async (req, res, next) => {
    const { message, history } = req.body;
    const user = req.user; // Get the full user object from middleware

    if (!user) {
        // This shouldn't happen if authenticateToken is working correctly
        return res.status(401).json({ message: 'Authentication error.' });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ message: 'Message content is required.' });
    }
    if (history && !Array.isArray(history)) {
        return res.status(400).json({ message: 'Invalid history format. Expected an array.' });
    }

    try {
        console.log(`[ChatController] Received chat message from user ${user._id}`);
        // Pass the full user object to the service
        const result = await ChatService.handleUserMessage(user, message, history || []);

        if (!result || !result.response) {
            throw new Error('Chat service returned an invalid response.');
        }

        res.json(result);

    } catch (error) {
        console.error('[ChatController] Error handling chat message:', error);
        res.status(500).json({ message: error.message || 'Failed to process chat message.' });
    }
};

module.exports = {
    handleChat,
};