"use client";

/**
 * AI Chat page — business Q&A chatbot.
 *
 * Sends questions to the Claude API via the FastAPI backend.
 * Shows a "not yet implemented" message gracefully — the endpoint stub is in place.
 */

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What drove my profit decline last week?",
  "Which product has the best margin?",
  "Should I increase the price of my top seller?",
  "What's causing my revenue to drop?",
  "Which products are at risk of stockout?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm BusinessPilot AI. I can answer questions about your sales, profit, inventory, and product performance using your uploaded data.\n\nThe AI chat endpoint is coming in Phase 6. In the meantime, visit the **Dashboard** to see AI-generated decline analysis for your flagged products.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      let reply = "";
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || data.detail || "Response received.";
      } else {
        const err = await res.json().catch(() => ({}));
        reply = err.detail || `Backend returned ${res.status}. Make sure the FastAPI server is running.`;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Could not reach the backend. Make sure the FastAPI server is running on port 8000 (cd backend && uvicorn main:app --reload --port 8000).",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function fmtTime(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", height: "calc(100dvh - 80px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>AI Chat</h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: 6, fontSize: "0.875rem" }}>
          Ask questions about your business performance in plain English.
        </p>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingRight: 4,
          marginBottom: 16,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))"
                    : "rgba(255 255 255 / 0.08)",
                border: "1px solid rgba(255 255 255 / 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                flexShrink: 0,
              }}
            >
              {msg.role === "user" ? "👤" : "🤖"}
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: "75%" }}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, hsl(255 82% 55%), hsl(280 70% 48%))"
                      : "rgba(255 255 255 / 0.05)",
                  border: msg.role === "assistant" ? "1px solid rgba(255 255 255 / 0.08)" : "none",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  color: "var(--foreground)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", marginTop: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                {fmtTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255 255 255 / 0.08)", border: "1px solid rgba(255 255 255 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🤖</div>
            <div style={{ padding: "14px 18px", background: "rgba(255 255 255 / 0.05)", border: "1px solid rgba(255 255 255 / 0.08)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 1, 2].map(n => (
                <div key={n} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--foreground-muted)", animation: `bounce 1.2s ease ${n * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
            Try asking:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  fontSize: "0.8rem",
                  padding: "6px 12px",
                  background: "rgba(255 255 255 / 0.04)",
                  border: "1px solid rgba(255 255 255 / 0.10)",
                  borderRadius: 8,
                  color: "var(--foreground-muted)",
                  cursor: "pointer",
                  transition: "border-color 0.12s, color 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139 92 246 / 0.40)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255 255 255 / 0.10)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input); }}
        style={{ display: "flex", gap: 10, flexShrink: 0 }}
      >
        <input
          id="chat-input"
          className="auth-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your business…"
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button
          id="chat-send-btn"
          type="submit"
          disabled={!input.trim() || isLoading}
          style={{
            padding: "0 20px",
            background: "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            opacity: !input.trim() || isLoading ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          ↑
        </button>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
