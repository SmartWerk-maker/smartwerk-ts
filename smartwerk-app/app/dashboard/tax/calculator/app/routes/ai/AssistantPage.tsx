import { useState } from "react";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getInitialMessages(): ChatMessage[] {
  const saved = localStorage.getItem("smartwerk_ai_prompt");

  if (!saved) return [];

  return [
    {
      role: "system",
      content: saved,
    },
    {
      role: "assistant",
      content:
        "Hi! I’m your SmartWerk tax assistant. I can explain this warning or help you understand what to do next.",
    },
  ];
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // 🔧 TEMP mock AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "This is a placeholder AI response. Here I will explain the warning in simple Dutch tax terms and suggest what you can do next.",
        },
      ]);
    }, 600);
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <h1>💬 SmartWerk AI Assistant</h1>

      {/* CHAT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 8,
                background:
                  m.role === "user"
                    ? "#d9edf7"
                    : m.role === "assistant"
                    ? "#e8f5e9"
                    : "#eee",
                fontSize: 14,
                whiteSpace: "pre-wrap",
                maxWidth: "90%",
              }}
            >
              <strong style={{ fontSize: 12 }}>
                {m.role === "system"
                  ? "Context"
                  : m.role === "assistant"
                  ? "AI"
                  : "You"}
                :
              </strong>
              <div>{m.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this warning or your taxes…"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            border: "none",
            background: "#007bff",
            color: "white",
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}