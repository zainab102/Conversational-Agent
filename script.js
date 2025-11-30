(() => {
  // DOM elements
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const formEl = document.getElementById('input-form');
  const typingIndicatorEl = document.getElementById('typing-indicator');
  const newChatBtn = document.getElementById('new-chat-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const memoryToggle = document.getElementById('memory-toggle');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  // State
  let messages = [];
  let memoryEnabled = memoryToggle.checked;
  const maxMemoryMessages = 10;
  let isTyping = false;
  let typingTimeout = null;
  let searchTimeout = null;
  let emojiPickerVisible = false;
  let settingsModalVisible = false;

  // Load messages and settings from localStorage
  function loadFromStorage() {
    try {
      const storedMessages = localStorage.getItem('chat_messages');
      if (storedMessages) {
        messages = JSON.parse(storedMessages);
      } else {
        messages = [];
      }
      memoryEnabled = localStorage.getItem('chat_memory_enabled') !== 'false';
      memoryToggle.checked = memoryEnabled;
      // Load dark mode preference
      const darkMode = localStorage.getItem('chat_dark_mode') === 'true';
      if (darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
      } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.checked = false;
      }
    } catch (e) {
      messages = [];
    }
  }

  // Save messages and settings to localStorage
  function saveToStorage() {
    if (memoryEnabled) {
      const toStore = messages.slice(-maxMemoryMessages);
      localStorage.setItem('chat_messages', JSON.stringify(toStore));
    } else {
      localStorage.removeItem('chat_messages');
    }
    localStorage.setItem('chat_memory_enabled', memoryEnabled);
    localStorage.setItem('chat_dark_mode', darkModeToggle.checked);
  }

  // Add message to list and render
  function addMessage(role, content) {
    messages.push({ role, content, timestamp: Date.now(), reactions: {} });
    renderMessages();
    saveToStorage();
  }

  // Toggle reaction on message
  function toggleReaction(index, reaction) {
    if (!messages[index].reactions) messages[index].reactions = {};
    messages[index].reactions[reaction] = !messages[index].reactions[reaction];
    renderMessages();
    saveToStorage();
  }

  // Render messages in the chat window
  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach((msg) => {
      const li = document.createElement('li');
      li.classList.add('message', msg.role === 'user' ? 'user' : 'assistant');
      li.textContent = msg.content;
      messagesEl.appendChild(li);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Show/hide typing indicator with improved control to avoid typing loop
  function setTyping(on) {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
    if (on) {
      typingIndicatorEl.hidden = false;
      typingTimeout = setTimeout(() => {
        typingIndicatorEl.hidden = true;
        typingTimeout = null;
      }, 8000); // stop typing after 8 seconds max
    } else {
      typingIndicatorEl.hidden = true;
    }
  }

  // Clear chat and storage
  function clearChat() {
    messages = [];
    saveToStorage();
    renderMessages();
  }

  // Utility to get random element from array
  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Pattern-based conversation engine with intent detection and context handling
  function getReply(input, contextMsgs) {
    const normalized = input.trim().toLowerCase();

    // Greetings intent with multiple variations
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(greet => normalized.includes(greet))) {
      return randomChoice([
        "Hi there! 👋 How can I assist you today?",
        "Hello! 😊 What can I do for you?",
        "Hey! Ready to chat and help you out."
      ]);
    }

    // How are you + what's up intent
    if (/how are you|what'?s up/.test(normalized)) {
      return randomChoice([
        "I'm doing great, thank you! How about you?",
        "I'm here and ready to help! What's on your mind?",
        "All systems running smoothly! How can I assist?"
      ]);
    }

    // Farewell intent
    const farewells = ['bye', 'goodbye', 'see you', 'farewell', 'later'];
    if (farewells.some(farewell => normalized.includes(farewell))) {
      return randomChoice([
        "Goodbye! 👋 Feel free to come back anytime.",
        "See you later! Don't hesitate to chat again.",
        "Take care! I'll be here when you need me."
      ]);
    }

    // Help intent
    if (/help|what can you do/.test(normalized)) {
      return randomChoice([
        "I can help you with calculations, jokes, time info, search, weather, and chatting naturally. Try me!",
        "Need assistance? I do math, tell jokes, provide time, weather info, search mockups, and chat smoothly.",
        "Want to chat or get info? I can calculate, joke, tell time, and more. Just ask!"
      ]);
    }

    // Time intent - returns real local time
    if (/time/.test(normalized)) {
      return `The current time is ${new Date().toLocaleTimeString()} ⏰`;
    }

    // Joke intents:
    const jokesList = [
      "Why did the math book look sad? Because it had too many problems! 📚😄",
      "Why was the equal sign so humble? Because it knew it wasn't less than or greater than anything! ⚖️😄",
      "What do you call a number that can't keep still? A roamin' numeral! 🔢🏃‍♂️",
      "Why did the computer go to therapy? It had too many bytes of emotional baggage! 💻🛋️",
      "Why don't programmers like nature? It has too many bugs! 🐛",
      "How does a computer get drunk? It takes screenshots! 🍻",
      "Why do Java developers wear glasses? Because they don't C#! 👓",
      "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
      "Why was the math lecture so long? The professor kept going off on a tangent! 📝",
      "Why did the chicken join a band? Because it had the drumsticks! 🥁"
    ];

    if (normalized.includes('joke')) {
      // Check if user requested multiple jokes
      const matches = normalized.match(/(\d+)\s+jokes/);
      if (matches) {
        // Number of jokes requested, limit to 10 max
        const count = Math.min(parseInt(matches[1], 10), 10);
        let response = '';
        for (let i = 0; i < count; i++) {
          response += `${i + 1}. ${jokesList[i]}\n`;
        }
        return response.trim();
      } else {
        return randomChoice(jokesList);
      }
    }

    // Calculation intent - safe evaluation
    if (/^(calculate|what is|solve|evaluate|compute|what's|whats|how much is|how many is|what are|what's the result of)/.test(normalized) || /^[-+/*\d\s().]+$/.test(normalized)) {
      try {
        // Extract math expression
        const expr = normalized.replace(/^(calculate|what is|solve|evaluate|compute|what's|whats|how much is|how many is|what are|what's the result of)\s*/, '');
        // Validate only safe characters allowed
        if (/[^-+/*\d().\s]/.test(expr)) {
          return "Sorry, I can only evaluate simple math expressions.";
        }
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        if (result === undefined || Number.isNaN(result)) {
          return "Sorry, I couldn't calculate that.";
        }
        return `The result is ${result}.`;
      } catch (e) {
        return "Sorry, I couldn't calculate that.";
      }
    }

    // Weather intent - simulated with city
    if (/weather in /.test(normalized)) {
      const city = input.substring(input.toLowerCase().indexOf('weather in ') + 11).trim();
      if (city.length > 0) {
        return `The weather in ${city} is sunny with a high of 25°C and a low of 15°C.`;
      }
      return "Please specify a city to get the weather info.";
    }

    // Search intent - simulated search results
    if (/search for /.test(normalized)) {
      const query = input.substring(input.toLowerCase().indexOf('search for ') + 11).trim();
      if (query.length > 0) {
        return `Search results for "${query}":\n1. Example result 1\n2. Example result 2\n3. Example result 3`;
      }
      return "Please specify a search query.";
    }

    // Handle simple Q&A (basic canned questions)
    const qaMap = {
      "what's your name": ["I'm your friendly Conversational Agent! 😊", "You can call me Conversational Agent."],
      "who created you": ["I was created by a helpful developer! 👩‍💻", "Your developer made me to chat with you."],
      "what can you do": [
        "I can chat with you, tell jokes, calculate math, give time info, and more!",
        "I'm here to help you with questions, jokes, calculations, and friendly conversations."
      ],
      "how old are you": [
        "I don't have an age, but I am always learning!",
        "I'm timeless 😊"
      ]
    };

    for (const question in qaMap) {
      if (normalized.includes(question)) {
        return randomChoice(qaMap[question]);
      }
    }

    // Multi-turn context-aware fallback - if user repeats previous message, respond differently
    if (contextMsgs.length >= 2) {
      const lastUserMessage = contextMsgs.filter(m => m.role === 'user').slice(-2, -1)[0];
      if (lastUserMessage && lastUserMessage.content.toLowerCase() === normalized) {
        return "You've just said that. What else can I help you with?";
      }
    }

    // Default fallback - varied responses to avoid repetitiveness
    const fallbackResponses = [
      "I'm here to help! Could you please rephrase that?",
      "I'm not sure I understand, please try asking in a different way.",
      "Can you elaborate on that?",
      "Let's try a different question or topic!"
    ];
    return randomChoice(fallbackResponses);
  }

  // Handle form submission
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = inputEl.value.trim();
    if (!input) return;
    addMessage('user', input);
    inputEl.value = '';
    setTyping(true);
    isTyping = true;

    setTimeout(() => {
      const reply = getReply(input, messages);
      addMessage('assistant', reply);
      setTyping(false);
      isTyping = false;
    }, 1200);
  });

  // Handle enter key press to send message (without Shift+Enter)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // Handle new chat button
  newChatBtn.addEventListener('click', () => {
    clearChat();
  });

  // Clear chat button
  clearChatBtn.addEventListener('click', () => {
    clearChat();
  });

  // Handle memory toggle
  memoryToggle.addEventListener('change', () => {
    memoryEnabled = memoryToggle.checked;
    if (!memoryEnabled) {
      localStorage.removeItem('chat_messages');
    } else {
      saveToStorage();
    }
  });

  // Handle export conversation button
  const exportChatBtn = document.getElementById('export-chat-btn');
  exportChatBtn.addEventListener('click', () => {
    if (messages.length === 0) {
      alert('No conversation to export.');
      return;
    }
    let text = '';
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      text += `${role}: ${msg.content}\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Handle persona customization
  const personaNameInput = document.getElementById('persona-name-input');
  const personaStyleSelect = document.getElementById('persona-style-select');

  // Load and apply persona settings from storage
  function loadPersona() {
    const name = localStorage.getItem('persona_name') || 'Assistant';
    const style = localStorage.getItem('persona_style') || 'default';
    personaNameInput.value = name;
    personaStyleSelect.value = style;
  }

  // Save persona settings to storage
  function savePersona() {
    localStorage.setItem('persona_name', personaNameInput.value.trim() || 'Assistant');
    localStorage.setItem('persona_style', personaStyleSelect.value);
  }

  // Enhance assistant message rendering with persona details
  function renderMessages() {
    messagesEl.innerHTML = '';
    const personaName = personaNameInput.value.trim() || 'Assistant';
    const personaStyle = personaStyleSelect.value;

    // Simple markdown to HTML converter - supports bold, italic, code, links
    function markdownToHTML(text) {
      if (!text) return '';
      // Escape HTML special chars
      text = text.replace(/&/g, "&amp;").replace(/</g, "<").replace(/>/g, ">");
      // Bold **text**
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Inline code `code`
      text = text.replace(/`(.+?)`/g, '<code>$1</code>');
      // Links [text](url)
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      // Line breaks
      text = text.replace(/\n/g, '<br>');
      return text;
    }

    messages.forEach((msg) => {
      const li = document.createElement('li');
      li.classList.add('message', msg.role === 'user' ? 'user' : 'assistant');
      if (msg.role === 'assistant') {
        li.classList.add(`assistant-${personaStyle}`);
        // Render persona name in bold and markdown content
        li.innerHTML = `<strong>${personaName}:</strong> ` + markdownToHTML(msg.content);
      } else {
        li.textContent = msg.content;
      }
      messagesEl.appendChild(li);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Persona input events to save and re-render messages
  personaNameInput.addEventListener('input', () => {
    savePersona();
    renderMessages();
  });

  personaStyleSelect.addEventListener('change', () => {
    savePersona();
    renderMessages();
    updateConversationStats();
  });

  personaNameInput.addEventListener('input', () => {
    savePersona();
    renderMessages();
    updateConversationStats();
  });

  // Track conversation stats elements
  const statTotal = document.getElementById('stat-total');
  const statUser = document.getElementById('stat-user');
  const statAssistant = document.getElementById('stat-assistant');
  const statLength = document.getElementById('stat-length');

  // Update conversation statistics display
  function updateConversationStats() {
    const totalMsgs = messages.length;
    const userMsgs = messages.filter(msg => msg.role === 'user').length;
    const assistantMsgs = messages.filter(msg => msg.role === 'assistant').length;
    const avgLength = totalMsgs === 0 ? 0 : Math.round(messages.reduce((acc, msg) => acc + msg.content.length, 0) / totalMsgs);

    statTotal.textContent = totalMsgs;
    statUser.textContent = userMsgs;
    statAssistant.textContent = assistantMsgs;
    statLength.textContent = avgLength;
  }

  // Modify setMessages to update stats on change
  function setMessages(newMessages) {
    messages = newMessages;
    renderMessages();
    updateConversationStats();
    saveToStorage();
  }

  // Initialize load persona and stats
  loadPersona();
  updateConversationStats();

  // Voice input and speech synthesis
  const voiceBtn = document.getElementById('voice-btn');
  let recognition;
  let recognizing = false;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      recognizing = true;
      voiceBtn.textContent = '🛑 Stop Recording';
    };

    recognition.onend = () => {
      recognizing = false;
      voiceBtn.textContent = '🎙️ Start Recording';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      inputEl.value = transcript;
      inputEl.focus();
    };
  } else {
    voiceBtn.disabled = true;
    voiceBtn.textContent = 'Voice Not Supported';
  }

  voiceBtn.addEventListener('click', () => {
    if (recognizing) {
      recognition.stop();
      return;
    }
    recognition.start();
  });

  function speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }

  // Redefine setMessages to include speech synthesis for assistant messages
  const originalSetMessages = setMessages;
  setMessages = (newMessages) => {
    originalSetMessages(newMessages);

    // Speak the last assistant message content
    const lastMsg = newMessages[newMessages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      speak(lastMsg.content);
    }
  };

  darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('chat_dark_mode', darkModeToggle.checked);
  });

  // Handle enter key press to send message (without Shift+Enter)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // Emoji picker functionality
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const emojiGrid = document.getElementById('emoji-grid');

  const emojis = ['😀', '😂', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '👋', '🙌', '🤝', '💯', '⭐', '🌟', '💡'];

  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.addEventListener('click', () => {
      inputEl.value += emoji;
      inputEl.focus();
      toggleEmojiPicker();
    });
    emojiGrid.appendChild(span);
  });

  function toggleEmojiPicker() {
    emojiPickerVisible = !emojiPickerVisible;
    emojiPicker.classList.toggle('hidden', !emojiPickerVisible);
  }

  emojiBtn.addEventListener('click', toggleEmojiPicker);

  // Close emoji picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
      emojiPicker.classList.add('hidden');
      emojiPickerVisible = false;
    }
  });

  // Quick replies functionality
  const quickRepliesEl = document.getElementById('quick-replies');
  const quickReplies = [
    "Tell me a joke",
    "What's the time?",
    "How are you?",
    "What can you do?",
    "Calculate 2+2"
  ];

  function renderQuickReplies() {
    quickRepliesEl.innerHTML = '';
    quickReplies.forEach(reply => {
      const btn = document.createElement('button');
      btn.classList.add('quick-reply-btn');
      btn.textContent = reply;
      btn.addEventListener('click', () => {
        inputEl.value = reply;
        formEl.dispatchEvent(new Event('submit', { cancelable: true }));
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  // Settings modal functionality
  const settingsBtn = document.getElementById('settings-btn');

  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.classList.add('settings-modal');
    modal.innerHTML = `
      <div class="settings-content">
        <button class="settings-close">&times;</button>
        <h3>Settings</h3>
        <label for="settings-max-memory">Max Memory Messages:</label>
        <input type="number" id="settings-max-memory" min="1" max="100" value="${maxMemoryMessages}">
        <label for="settings-typing-delay">Typing Delay (ms):</label>
        <input type="number" id="settings-typing-delay" min="100" max="5000" value="1200">
        <label for="settings-auto-scroll">Auto-scroll to bottom:</label>
        <input type="checkbox" id="settings-auto-scroll" checked>
        <button id="settings-save">Save Settings</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.settings-close');
    const saveBtn = modal.querySelector('#settings-save');

    closeBtn.addEventListener('click', () => {
      modal.remove();
      settingsModalVisible = false;
    });

    saveBtn.addEventListener('click', () => {
      const maxMemory = parseInt(modal.querySelector('#settings-max-memory').value);
      const typingDelay = parseInt(modal.querySelector('#settings-typing-delay').value);
      const autoScroll = modal.querySelector('#settings-auto-scroll').checked;

      // Save settings (you can extend localStorage saving here)
      showNotification('Settings saved!');
      modal.remove();
      settingsModalVisible = false;
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        settingsModalVisible = false;
      }
    });
  }

  settingsBtn.addEventListener('click', () => {
    if (!settingsModalVisible) {
      createSettingsModal();
      settingsModalVisible = true;
    }
  });

  // Notification system
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Theme switching functionality
  const themeSelect = document.getElementById('theme-select');
  const body = document.body;

  function setTheme(theme) {
    // Remove all theme classes
    body.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest', 'theme-lavender');
    // Add the selected theme class
    if (theme !== 'default') {
      body.classList.add(`theme-${theme}`);
    }
    // Save to localStorage
    localStorage.setItem('chat_theme', theme);
    // Update select value
    themeSelect.value = theme;
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('chat_theme') || 'default';
  setTheme(savedTheme);

  // Add event listener to theme select
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    setTheme(theme);
    showNotification(`Theme changed to ${theme}`);
  });

  // Initialize app
  loadFromStorage();
  renderMessages();
  renderQuickReplies();
})();
