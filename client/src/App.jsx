import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const USER_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/147/147144.png";
const ASSISTANT_AVATAR_URL =
  "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your AI assistant. How can I help you today?",
      id: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const messageEndRef = useRef(null);

  const sessionId = "default";

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", content: input, id: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setTyping(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: input,
        sessionId,
        messages,
      });
      const assistantMessage = {
        role: "assistant",
        content: response.data.response || "Sorry, no response.",
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Failed to fetch response.",
          id: Date.now() + 1,
        },
      ]);
    }
    setLoading(false);
    setTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 text-white">
      <header className="bg-transparent p-6 flex items-center justify-center text-3xl font-bold tracking-wide shadow-lg">
        ChatGPT Clone — AI Conversational Agent
      </header>
      <main className="flex-grow overflow-y-auto px-6 py-8 space-y-6 max-w-4xl mx-auto">
        {messages.length === 0 && (
          <p className="text-center italic text-gray-300">
            Start the conversation...
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex max-w-3xl mx-auto ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <img
                src={ASSISTANT_AVATAR_URL}
                alt="Assistant"
                className="w-12 h-12 rounded-full mr-4 self-end shadow-lg"
              />
            )}
            <div
              className={`rounded-2xl p-5 max-w-xs break-words whitespace-pre-wrap shadow-md ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 text-gray-100"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <img
                src={USER_AVATAR_URL}
                alt="User"
                className="w-12 h-12 rounded-full ml-4 self-end shadow-lg"
              />
            )}
          </div>
        ))}
        {typing && (
          <div className="flex max-w-3xl mx-auto justify-start animate-pulse">
            <img
              src={ASSISTANT_AVATAR_URL}
              alt="Assistant"
              className="w-12 h-12 rounded-full mr-4 self-end shadow-lg"
            />
            <div className="rounded-2xl p-5 max-w-xs bg-gray-900 text-gray-100 select-none shadow-md">
              AI is typing...
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </main>
      <footer className="bg-gray-900 p-6 flex items-center space-x-5 max-w-4xl mx-auto">
        <textarea
          rows={1}
          className="flex-grow rounded-3xl bg-gray-800 text-white p-4 resize-none placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-600 transition-shadow duration-300"
          placeholder="Type a message (Shift + Enter for new line)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="bg-purple-600 hover:bg-purple-700 px-6 py-4 rounded-3xl font-semibold shadow-lg disabled:opacity-50 transition-colors duration-300"
          onClick={sendMessage}
          disabled={loading}
          aria-label="Send message"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </footer>
    </div>
  );
}
