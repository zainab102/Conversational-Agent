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
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const apiModeToggle = document.getElementById('api-mode-toggle');
  const apiStatusEl = document.getElementById('api-status');
  const importChatBtn = document.getElementById('import-chat-btn');
  const importChatFile = document.getElementById('import-chat-file');

  // State
  let messages = [];
  let memoryEnabled = memoryToggle.checked;
  let maxMemoryMessages = 10;
  let typingDelayMs = 1200;
  let autoScrollEnabled = true;
  let apiModeEnabled = false;
  let typingTimeout = null;
  let emojiPickerVisible = false;
  let settingsModalVisible = false;
  const chatSessionId = localStorage.getItem('chat_session_id') || `session-${Date.now()}`;
  localStorage.setItem('chat_session_id', chatSessionId);

  const SETTINGS_KEYS = {
    memoryLimit: 'chat_max_memory_messages',
    typingDelay: 'chat_typing_delay_ms',
    autoScroll: 'chat_auto_scroll',
    apiMode: 'chat_api_mode'
  };

  // Handle persona customization
  const personaNameInput = document.getElementById('persona-name-input');
  const personaStyleSelect = document.getElementById('persona-style-select');

  // Track conversation stats elements
  const statTotal = document.getElementById('stat-total');
  const statUser = document.getElementById('stat-user');
  const statAssistant = document.getElementById('stat-assistant');
  const statLength = document.getElementById('stat-length');

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setApiStatus() {
    if (apiModeEnabled) {
      apiStatusEl.textContent = 'Using server API mode';
      apiStatusEl.classList.add('online');
    } else {
      apiStatusEl.textContent = 'Using local assistant engine';
      apiStatusEl.classList.remove('online');
    }
  }

  // Load messages and settings from localStorage
  function loadFromStorage() {
    try {
      const storedMessages = localStorage.getItem('chat_messages');
      messages = storedMessages ? JSON.parse(storedMessages) : [];

      memoryEnabled = localStorage.getItem('chat_memory_enabled') !== 'false';
      memoryToggle.checked = memoryEnabled;

      const darkMode = localStorage.getItem('chat_dark_mode') === 'true';
      if (darkMode) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        darkModeToggle.checked = true;
      } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        darkModeToggle.checked = false;
      }

      maxMemoryMessages = clamp(parseInt(localStorage.getItem(SETTINGS_KEYS.memoryLimit), 10) || 10, 1, 100);
      typingDelayMs = clamp(parseInt(localStorage.getItem(SETTINGS_KEYS.typingDelay), 10) || 1200, 100, 5000);
      autoScrollEnabled = localStorage.getItem(SETTINGS_KEYS.autoScroll) !== 'false';
      apiModeEnabled = localStorage.getItem(SETTINGS_KEYS.apiMode) === 'true';
      apiModeToggle.checked = apiModeEnabled;
      setApiStatus();
    } catch {
      messages = [];
      maxMemoryMessages = 10;
      typingDelayMs = 1200;
      autoScrollEnabled = true;
      apiModeEnabled = false;
      apiModeToggle.checked = false;
      setApiStatus();
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
    localStorage.setItem(SETTINGS_KEYS.memoryLimit, maxMemoryMessages);
    localStorage.setItem(SETTINGS_KEYS.typingDelay, typingDelayMs);
    localStorage.setItem(SETTINGS_KEYS.autoScroll, autoScrollEnabled);
    localStorage.setItem(SETTINGS_KEYS.apiMode, apiModeEnabled);
  }

  // Utility to get random element from array
  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

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

  function updateConversationStats() {
    const totalMsgs = messages.length;
    const userMsgs = messages.filter((msg) => msg.role === 'user').length;
    const assistantMsgs = messages.filter((msg) => msg.role === 'assistant').length;
    const avgLength = totalMsgs === 0
      ? 0
      : Math.round(messages.reduce((acc, msg) => acc + msg.content.length, 0) / totalMsgs);

    statTotal.textContent = totalMsgs;
    statUser.textContent = userMsgs;
    statAssistant.textContent = assistantMsgs;
    statLength.textContent = avgLength;
  }

  function markdownToHTML(text) {
    if (!text) return '';

    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/`(.+?)`/g, '<code>$1</code>');
    escaped = escaped.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return escaped.replace(/\n/g, '<br>');
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  // Toggle reaction on message
  function toggleReaction(index, reaction) {
    if (!messages[index].reactions) messages[index].reactions = {};
    messages[index].reactions[reaction] = !messages[index].reactions[reaction];
    renderMessages();
    saveToStorage();
  }

  function copyMessage(index) {
    const content = messages[index]?.content || '';
    if (!content) return;

    if (!navigator.clipboard) {
      showNotification('Clipboard not available');
      return;
    }

    navigator.clipboard.writeText(content)
      .then(() => showNotification('Message copied'))
      .catch(() => showNotification('Copy failed'));
  }

  function editMessage(index) {
    const current = messages[index];
    if (!current) return;

    const updated = window.prompt('Edit message:', current.content);
    if (updated === null) return;

    const trimmed = updated.trim();
    if (!trimmed) {
      showNotification('Message cannot be empty');
      return;
    }

    messages[index].content = trimmed;
    messages[index].edited = true;
    messages[index].timestamp = Date.now();
    renderMessages();
    updateConversationStats();
    renderSearchResults(searchInput.value.trim());
    saveToStorage();
  }

  function deleteMessage(index) {
    messages.splice(index, 1);
    renderMessages();
    updateConversationStats();
    renderSearchResults(searchInput.value.trim());
    saveToStorage();
  }

  function renderSearchResults(query) {
    searchResults.innerHTML = '';
    if (!query) return;

    const normalized = query.toLowerCase();
    const matches = messages
      .map((msg, index) => ({ ...msg, index }))
      .filter((msg) => msg.content.toLowerCase().includes(normalized))
      .slice(-8)
      .reverse();

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('search-result-item');
      empty.textContent = 'No messages found';
      searchResults.appendChild(empty);
      return;
    }

    matches.forEach((msg) => {
      const item = document.createElement('div');
      item.classList.add('search-result-item');
      const role = msg.role === 'user' ? 'You' : (personaNameInput.value.trim() || 'Assistant');
      item.textContent = `${role}: ${msg.content.slice(0, 80)}${msg.content.length > 80 ? '...' : ''}`;
      item.addEventListener('click', () => {
        const target = messagesEl.children[msg.index];
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.outline = '2px solid var(--bubble-user)';
        setTimeout(() => {
          target.style.outline = 'none';
        }, 1400);
      });
      searchResults.appendChild(item);
    });
  }

  // Render messages in the chat window
  function renderMessages() {
    messagesEl.innerHTML = '';
    const personaName = personaNameInput.value.trim() || 'Assistant';
    const personaStyle = personaStyleSelect.value;

    messages.forEach((msg, index) => {
      const li = document.createElement('li');
      li.classList.add('message', msg.role === 'user' ? 'user' : 'assistant');

      const content = document.createElement('div');
      if (msg.role === 'assistant') {
        li.classList.add(`assistant-${personaStyle}`);
        content.innerHTML = `<strong>${personaName}:</strong> ${markdownToHTML(msg.content)}`;
      } else {
        content.textContent = msg.content;
      }
      li.appendChild(content);

      const meta = document.createElement('div');
      meta.classList.add('message-timestamp');
      meta.textContent = `${formatTimestamp(msg.timestamp)}${msg.edited ? ' · edited' : ''}`;
      li.appendChild(meta);

      const actions = document.createElement('div');
      actions.classList.add('message-actions');

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.classList.add('message-action-btn');
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => copyMessage(index));
      actions.appendChild(copyBtn);

      if (msg.role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.classList.add('message-action-btn');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editMessage(index));
        actions.appendChild(editBtn);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.classList.add('message-action-btn', 'danger');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteMessage(index));
      actions.appendChild(deleteBtn);

      li.appendChild(actions);

      const reactions = document.createElement('div');
      reactions.classList.add('message-reactions');
      ['👍', '👎'].forEach((reaction) => {
        const btn = document.createElement('button');
        btn.classList.add('reaction-btn');
        if (msg.reactions?.[reaction]) {
          btn.classList.add('active');
        }
        btn.textContent = reaction;
        btn.type = 'button';
        btn.addEventListener('click', () => toggleReaction(index, reaction));
        reactions.appendChild(btn);
      });
      li.appendChild(reactions);

      messagesEl.appendChild(li);
    });

    if (autoScrollEnabled) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }

  // Add message to list and render
  function addMessage(role, content) {
    messages.push({ role, content, timestamp: Date.now(), reactions: {} });
    renderMessages();
    updateConversationStats();
    renderSearchResults(searchInput.value.trim());
    saveToStorage();

    if (role === 'assistant') {
      speak(content);
    }
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
      }, 8000);
    } else {
      typingIndicatorEl.hidden = true;
    }
  }

  // Clear chat and storage
  function clearChat() {
    messages = [];
    saveToStorage();
    renderMessages();
    updateConversationStats();
    renderSearchResults(searchInput.value.trim());
  }

  async function getAssistantReply(input) {
    if (!apiModeEnabled) {
      return getReply(input, messages);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId: chatSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from API.';
    } catch (error) {
      console.error(error);
      showNotification('API unavailable. Falling back to local mode reply.');
      return getReply(input, messages);
    }
  }

  // Pattern-based conversation engine with intent detection and context handling
  function getReply(input, contextMsgs) {
    const normalized = input.trim().toLowerCase();

    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some((greet) => normalized.includes(greet))) {
      return randomChoice([
        'Hi there! 👋 How can I assist you today?',
        'Hello! 😊 What can I do for you?',
        'Hey! Ready to chat and help you out.'
      ]);
    }

    if (/how are you|what'?s up/.test(normalized)) {
      return randomChoice([
        "I'm doing great, thank you! How about you?",
        "I'm here and ready to help! What's on your mind?",
        'All systems running smoothly! How can I assist?'
      ]);
    }

    const farewells = ['bye', 'goodbye', 'see you', 'farewell', 'later'];
    if (farewells.some((farewell) => normalized.includes(farewell))) {
      return randomChoice([
        'Goodbye! 👋 Feel free to come back anytime.',
        "See you later! Don't hesitate to chat again.",
        "Take care! I'll be here when you need me."
      ]);
    }

    if (/help|what can you do/.test(normalized)) {
      return randomChoice([
        'I can help you with calculations, jokes, time info, search, weather, and chatting naturally. Try me!',
        'Need assistance? I do math, tell jokes, provide time, weather info, search mockups, and chat smoothly.',
        'Want to chat or get info? I can calculate, joke, tell time, and more. Just ask!'
      ]);
    }

    if (/time/.test(normalized)) {
      return `The current time is ${new Date().toLocaleTimeString()} ⏰`;
    }

    const jokesList = [
      'Why did the math book look sad? Because it had too many problems! 📚😄',
      "Why was the equal sign so humble? Because it knew it wasn't less than or greater than anything! ⚖️😄",
      "What do you call a number that can't keep still? A roamin' numeral! 🔢🏃‍♂️",
      'Why did the computer go to therapy? It had too many bytes of emotional baggage! 💻🛋️',
      "Why don't programmers like nature? It has too many bugs! 🐛",
      'How does a computer get drunk? It takes screenshots! 🍻',
      "Why do Java developers wear glasses? Because they don't C#! 👓",
      'Why did the scarecrow win an award? Because he was outstanding in his field! 🌾',
      'Why was the math lecture so long? The professor kept going off on a tangent! 📝',
      'Why did the chicken join a band? Because it had the drumsticks! 🥁'
    ];

    if (normalized.includes('joke')) {
      const matches = normalized.match(/(\d+)\s+jokes/);
      if (matches) {
        const count = Math.min(parseInt(matches[1], 10), 10);
        let response = '';
        for (let i = 0; i < count; i++) {
          response += `${i + 1}. ${jokesList[i]}\n`;
        }
        return response.trim();
      }
      return randomChoice(jokesList);
    }

    if (
      /^(calculate|what is|solve|evaluate|compute|what's|whats|how much is|how many is|what are|what's the result of)/.test(normalized) ||
      /^[-+/*\d\s().]+$/.test(normalized)
    ) {
      try {
        const expr = normalized.replace(
          /^(calculate|what is|solve|evaluate|compute|what's|whats|how much is|how many is|what are|what's the result of)\s*/,
          ''
        );

        if (/[^-+/*\d().\s]/.test(expr)) {
          return 'Sorry, I can only evaluate simple math expressions.';
        }

        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        if (result === undefined || Number.isNaN(result)) {
          return "Sorry, I couldn't calculate that.";
        }
        return `The result is ${result}.`;
      } catch {
        return "Sorry, I couldn't calculate that.";
      }
    }

    if (/weather in /.test(normalized)) {
      const city = input.substring(input.toLowerCase().indexOf('weather in ') + 11).trim();
      if (city.length > 0) {
        return `The weather in ${city} is sunny with a high of 25°C and a low of 15°C.`;
      }
      return 'Please specify a city to get the weather info.';
    }

    if (/search for /.test(normalized)) {
      const query = input.substring(input.toLowerCase().indexOf('search for ') + 11).trim();
      if (query.length > 0) {
        return `Search results for "${query}":\n1. Example result 1\n2. Example result 2\n3. Example result 3`;
      }
      return 'Please specify a search query.';
    }

    const qaMap = {
      "what's your name": ['I\'m your friendly Conversational Agent! 😊', 'You can call me Conversational Agent.'],
      'who created you': ['I was created by a helpful developer! 👩‍💻', 'Your developer made me to chat with you.'],
      'what can you do': [
        'I can chat with you, tell jokes, calculate math, give time info, and more!',
        'I\'m here to help you with questions, jokes, calculations, and friendly conversations.'
      ],
      'how old are you': [
        "I don't have an age, but I am always learning!",
        "I'm timeless 😊"
      ]
    };

    for (const question in qaMap) {
      if (normalized.includes(question)) {
        return randomChoice(qaMap[question]);
      }
    }

    if (contextMsgs.length >= 2) {
      const lastUserMessage = contextMsgs.filter((m) => m.role === 'user').slice(-2, -1)[0];
      if (lastUserMessage && lastUserMessage.content.toLowerCase() === normalized) {
        return "You've just said that. What else can I help you with?";
      }
    }

    const fallbackResponses = [
      "I'm here to help! Could you please rephrase that?",
      "I'm not sure I understand, please try asking in a different way.",
      'Can you elaborate on that?',
      "Let's try a different question or topic!"
    ];
    return randomChoice(fallbackResponses);
  }

  // Handle form submission
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = inputEl.value.trim();
    if (!input) return;

    addMessage('user', input);
    inputEl.value = '';
    setTyping(true);

    await new Promise((resolve) => setTimeout(resolve, typingDelayMs));
    const reply = await getAssistantReply(input);
    addMessage('assistant', reply);
    setTyping(false);
  });

  // Handle enter key press to send message (without Shift+Enter)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // Handle new chat button
  newChatBtn.addEventListener('click', clearChat);

  // Clear chat button
  clearChatBtn.addEventListener('click', clearChat);

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

    const payload = {
      exportedAt: new Date().toISOString(),
      persona: {
        name: personaNameInput.value.trim() || 'Assistant',
        style: personaStyleSelect.value
      },
      messages
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importChatBtn.addEventListener('click', () => {
    importChatFile.click();
  });

  importChatFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.messages)) {
        throw new Error('Invalid format');
      }

      messages = parsed.messages
        .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
          reactions: msg.reactions || {},
          edited: Boolean(msg.edited)
        }));

      if (parsed.persona?.name) {
        personaNameInput.value = parsed.persona.name;
      }
      if (parsed.persona?.style) {
        personaStyleSelect.value = parsed.persona.style;
      }

      savePersona();
      renderMessages();
      updateConversationStats();
      renderSearchResults(searchInput.value.trim());
      saveToStorage();
      showNotification('Conversation imported');
    } catch {
      showNotification('Invalid conversation file');
    } finally {
      importChatFile.value = '';
    }
  });

  apiModeToggle.addEventListener('change', () => {
    apiModeEnabled = apiModeToggle.checked;
    setApiStatus();
    saveToStorage();
    showNotification(apiModeEnabled ? 'API mode enabled' : 'API mode disabled');
  });

  // Persona input events to save and re-render messages
  personaNameInput.addEventListener('input', () => {
    savePersona();
    renderMessages();
    renderSearchResults(searchInput.value.trim());
  });

  personaStyleSelect.addEventListener('change', () => {
    savePersona();
    renderMessages();
  });

  // Voice input
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

  // Emoji picker functionality
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const emojiGrid = document.getElementById('emoji-grid');

  const emojis = ['😀', '😂', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '👋', '🙌', '🤝', '💯', '⭐', '🌟', '💡'];

  emojis.forEach((emoji) => {
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

  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmojiPicker();
  });

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
    'Tell me a joke',
    "What's the time?",
    'How are you?',
    'What can you do?',
    'Calculate 2+2'
  ];

  function renderQuickReplies() {
    quickRepliesEl.innerHTML = '';
    quickReplies.forEach((reply) => {
      const btn = document.createElement('button');
      btn.classList.add('quick-reply-btn');
      btn.textContent = reply;
      btn.type = 'button';
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
        <button class="settings-close" aria-label="Close settings">&times;</button>
        <h3>Settings</h3>
        <label for="settings-max-memory">Max Memory Messages:</label>
        <input type="number" id="settings-max-memory" min="1" max="100" value="${maxMemoryMessages}">
        <label for="settings-typing-delay">Typing Delay (ms):</label>
        <input type="number" id="settings-typing-delay" min="100" max="5000" value="${typingDelayMs}">
        <label for="settings-auto-scroll">Auto-scroll to bottom:</label>
        <input type="checkbox" id="settings-auto-scroll" ${autoScrollEnabled ? 'checked' : ''}>
        <button id="settings-save" type="button">Save Settings</button>
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
      const maxMemoryInput = parseInt(modal.querySelector('#settings-max-memory').value, 10);
      const typingDelayInput = parseInt(modal.querySelector('#settings-typing-delay').value, 10);
      const autoScrollInput = modal.querySelector('#settings-auto-scroll').checked;

      maxMemoryMessages = clamp(Number.isNaN(maxMemoryInput) ? 10 : maxMemoryInput, 1, 100);
      typingDelayMs = clamp(Number.isNaN(typingDelayInput) ? 1200 : typingDelayInput, 100, 5000);
      autoScrollEnabled = autoScrollInput;

      saveToStorage();
      showNotification('Settings saved');
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
    body.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest', 'theme-lavender');
    if (theme !== 'default') {
      body.classList.add(`theme-${theme}`);
    }

    localStorage.setItem('chat_theme', theme);
    themeSelect.value = theme;
  }

  const savedTheme = localStorage.getItem('chat_theme') || 'default';
  setTheme(savedTheme);

  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    setTheme(theme);
    showNotification(`Theme changed to ${theme}`);
  });

  // Search in chat history
  searchInput.addEventListener('input', () => {
    renderSearchResults(searchInput.value.trim());
  });

  // Initialize app
  loadPersona();
  loadFromStorage();
  renderMessages();
  renderQuickReplies();
  updateConversationStats();
  renderSearchResults('');
})();
