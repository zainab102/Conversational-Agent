const { getChatResponse } = require('./_lib/chatEngine');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId } = req.body || {};
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId are required.' });
  }

  try {
    const response = getChatResponse(message, sessionId);
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
