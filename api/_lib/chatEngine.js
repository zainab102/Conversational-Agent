const math = require('mathjs');

const conversations = {};
const usedJokes = {};

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
  help: [
    "I can help you with:\n• 📊 Mathematical calculations (e.g., 'Calculate 25 + 37')\n• 😂 Jokes and entertainment\n• 🕐 Time and date information\n• 💬 General conversation\n• ❓ Answering questions\n\nJust type what you need!"
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

function randomResponse(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function handleCalculation(message) {
  const calcRegex = /calculate (.+)/i;
  const match = message.match(calcRegex);
  if (!match) return null;

  try {
    const result = math.evaluate(match[1]);
    return `The result of ${match[1]} is ${result}.`;
  } catch {
    return "Sorry, I couldn't perform that calculation.";
  }
}

function handleSpecialQueries(message, sessionId) {
  const lower = message.toLowerCase();

  if (/(hello|hi|hey)/.test(lower)) return randomResponse(responses.greetings);
  if (/(who are you|about you)/.test(lower)) return randomResponse(responses.about);
  if (/(help|what can you do)/.test(lower)) return randomResponse(responses.help);
  if (/(bye|goodbye|see you)/.test(lower)) return randomResponse(responses.farewell);
  if (/(time|current time)/.test(lower)) {
    return `The current time is ${new Date().toLocaleTimeString()} ⏰`;
  }

  if (/(joke|funny)/.test(lower)) {
    if (!usedJokes[sessionId]) usedJokes[sessionId] = new Set();

    const available = responses.jokes.filter((j) => !usedJokes[sessionId].has(j));
    if (available.length === 0) {
      usedJokes[sessionId].clear();
      return randomResponse(responses.jokes);
    }

    const joke = randomResponse(available);
    usedJokes[sessionId].add(joke);
    return joke;
  }

  return null;
}

function getChatResponse(message, sessionId) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  conversations[sessionId].push({ role: 'user', content: message });

  let response = handleCalculation(message);
  if (!response) response = handleSpecialQueries(message, sessionId);
  if (!response) response = randomResponse(responses.default);

  conversations[sessionId].push({ role: 'assistant', content: response });

  if (conversations[sessionId].length > 50) {
    conversations[sessionId] = conversations[sessionId].slice(-50);
  }

  return response;
}

module.exports = { getChatResponse };
