const express = require('express');
const cors = require('cors');
const math = require('mathjs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// In-memory conversation storage
const conversations = {};
const usedJokes = {}; // Track used jokes per session

// Enhanced AI responses with more personality and features
const responses = {
  greetings: [
    "Hello! 👋 I'm your AI Assistant Pro, ready to help with calculations, answer questions, and chat about anything!",
    "Hi there! 🌟 I'm your intelligent assistant. I can calculate, tell jokes, and have meaningful conversations.",
    "Greetings! 🤖 I'm AI Assistant Pro, your go-to helper for math, questions, and friendly chats."
  ],
  about: [
    "I'm AI Assistant Pro, an advanced conversational AI! I can perform complex calculations, tell jokes, provide information, and engage in natural conversations. I'm here to make your day easier and more fun! 🚀",
    "I'm your AI companion! I excel at mathematics, can share jokes, answer questions, and provide helpful information. Let's explore what I can do for you! 💡"
  ],
  jokes: [
    "Why did the math book look sad? Because it had too many problems! 📚😄",
    "Why was the equal sign so humble? Because it knew it wasn't less than or greater than anything! ⚖️😄",
    "What do you call a number that can't keep still? A roamin' numeral! 🔢🏃‍♂️",
    "Why did the computer go to therapy? It had too many bytes of emotional baggage! 💻🛋️"
  ],
  time: [
    `The current time is ${new Date().toLocaleTimeString()} ⏰`,
    `It's currently ${new Date().toLocaleTimeString()} according to your system clock 🕐`
  ],
  help: [
    "I can help you with:\n• 📊 Mathematical calculations (e.g., 'Calculate 25 + 37')\n• 😂 Jokes and entertainment\n• 🕐 Time and date information\n• 💬 General conversation\n• ❓ Answering questions\n\nJust type what you need!",
    "Here's what I can do:\n• 🔢 Solve math problems\n• 😄 Tell jokes\n• 🕒 Give current time\n• 💭 Have conversations\n• 📝 Provide information\n\nTry asking me anything!"
  ],
  default: [
    "That's interesting! Tell me more about that. 🤔",
    "I understand. What else would you like to know? 💭",
    "Thanks for sharing that with me. Is there anything specific you'd like help with? 🤗"
  ],
  farewell: [
    "Goodbye! 👋 It was great chatting with you. Come back anytime!",
    "See you later! Have a wonderful day! 🌞",
    "Take care! Looking forward to our next conversation! 🤖"
  ]
};

// Analyze message for math calculation
const handleCalculation = (message) => {
  const calcRegex = /calculate (.+)/i;
  const match = message.match(calcRegex);
  if (match) {
    try {
      const result = math.evaluate(match[1]);
      return `The result of ${match[1]} is ${result}.`;
    } catch {
      return "Sorry, I couldn't perform that calculation.";
    }
  }
  return null;
};

// Analyze message for special queries
const handleSpecialQueries = (message, sessionId) => {
  const lower = message.toLowerCase();

  if (/(hello|hi|hey)/.test(lower)) {
    return randomResponse(responses.greetings);
  }
  if (/(who are you|about you)/.test(lower)) {
    return randomResponse(responses.about);
  }
  if (/(joke|funny)/.test(lower)) {
    // Avoid repeating jokes in the same session
    if (!usedJokes[sessionId]) usedJokes[sessionId] = new Set();
    const available = responses.jokes.filter(j => !usedJokes[sessionId].has(j));
    if (available.length === 0) {
      usedJokes[sessionId].clear();
      return randomResponse(responses.jokes);
    }
    const joke = randomResponse(available);
    usedJokes[sessionId].add(joke);
    return joke;
  }
  if (/(time|current time)/.test(lower)) {
    return randomResponse(responses.time);
  }
  if (/(help|what can you do)/.test(lower)) {
    return randomResponse(responses.help);
  }
  if (/(bye|goodbye|see you)/.test(lower)) {
    return randomResponse(responses.farewell);
  }
  return null;
};

const randomResponse = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Get a simple conversational reply
const getSimpleResponse = (message) => {
  return randomResponse(responses.default);
};

// Chat API endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required.' });
    }

    if (!conversations[sessionId]) {
      conversations[sessionId] = [];
    }

    conversations[sessionId].push({ role: 'user', content: message });

    // Check for calculation
    let response = handleCalculation(message);
    if (!response) {
      // Check for special queries
      response = handleSpecialQueries(message, sessionId);
    }
    if (!response) {
      // Otherwise, fallback default response
      response = getSimpleResponse(message);
    }

    conversations[sessionId].push({ role: 'assistant', content: response });

    // Limit conversation history to last 50 messages
    if (conversations[sessionId].length > 50) {
      conversations[sessionId] = conversations[sessionId].slice(-50);
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Local AI Assistant is running',
    version: '1.0.0',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local AI Assistant server running on port ${PORT}`);
});
