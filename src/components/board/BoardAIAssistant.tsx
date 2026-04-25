"use client";
import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const ACCENT    = "#6366f1";
const ACCENT2   = "#8b5cf6";
const ACCENT_BG = "rgba(99,102,241,0.07)";
const ACCENT_BORDER = "rgba(99,102,241,0.25)";

const SUGGESTED_QUESTIONS = [
  "Tóm tắt tình hình kinh doanh hiện tại",
  "Hợp đồng nào đang chậm tiến độ?",
  "Win rate báo giá đang ở mức bao nhiêu?",
  "Tổng công nợ hợp đồng hiện là bao nhiêu?",
];

// ── Simple inline markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const isBullet = /^[*-] /.test(line);
    const lineText = isBullet ? line.slice(2) : line;
    const parts = lineText.split(/\*\*(.*?)\*\*/g);
    const inlineNodes: React.ReactNode[] = parts.map((part, pi) =>
      pi % 2 === 1
        ? <strong key={pi} style={{ fontWeight: 700, color: ACCENT }}>{part}</strong>
        : part
    );
    if (isBullet) {
      return (
        <div key={li} style={{ display: "flex", gap: 8, marginTop: li === 0 ? 0 : 5 }}>
          <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>•</span>
          <span>{inlineNodes}</span>
        </div>
      );
    }
    if (line === "") return <div key={li} style={{ height: 5 }} />;
    return <div key={li} style={{ marginTop: li === 0 ? 0 : 3 }}>{inlineNodes}</div>;
  });
}

export function BoardAIAssistant() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [idCounter, setIdCounter] = useState(1);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const hasUserMessage = messages.some(m => m.role === "user");

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;
    const userId = idCounter;
    const assistantId = idCounter + 1;
    setIdCounter(c => c + 2);
    setInput("");
    const newMessages = [...messages, { id: userId, role: "user" as const, content: userText }];
    setMessages([...newMessages, { id: assistantId, role: "assistant", content: "", loading: true }]);
    setLoading(true);
    try {
      const history = newMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/board/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: history.slice(0, -1) }),
      });
      const json = await res.json();
      const reply = json.success ? json.reply : `Lỗi: ${json.error}`;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: reply, loading: false } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Lỗi kết nối: ${String(e)}`, loading: false } : m));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); setMessages([]); }, 280);
  };

  return (
    <>
      <style>{`
        @keyframes ai-fab-in   { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ai-panel-in { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes ai-msg-in   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes ai-panel-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(24px) scale(0.97); } }
        .ai-panel-closing { animation: ai-panel-out 0.26s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes ai-pulse    { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); } 60% { box-shadow: 0 0 0 10px rgba(99,102,241,0); } }
        @keyframes typing-dot  { 0%,80%,100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }
        .ai-fab        { animation: ai-fab-in 0.22s cubic-bezier(0.34,1.56,0.64,1); }
        .ai-fab-pulse  { animation: ai-pulse 2s ease-in-out infinite; }
        .ai-panel      { animation: ai-panel-in 0.28s cubic-bezier(0.4,0,0.2,1); }
        .ai-msg        { animation: ai-msg-in 0.2s ease; }
        .ai-dot        { display:inline-block; width:7px; height:7px; border-radius:50%; background:${ACCENT}; animation:typing-dot 1.2s infinite; margin: 0 2px; }
        .ai-dot:nth-child(2) { animation-delay:.2s; }
        .ai-dot:nth-child(3) { animation-delay:.4s; }
        .ai-suggest:hover { background: ${ACCENT_BG} !important; border-color: ${ACCENT} !important; }
        .ai-send:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* Floating button — chỉ hiện khi chat đóng */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="ai-fab ai-fab-pulse"
          title="Trợ lý AI Ban Giám đốc"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 1200,
            width: 56, height: 56, borderRadius: "50%", border: "none",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff", cursor: "pointer", fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 24px rgba(99,102,241,0.45)",
            transition: "transform 0.2s, opacity 0.2s",
          }}
        >🤖</button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`ai-panel${closing ? " ai-panel-closing" : ""}`} style={{
          position: "fixed", bottom: 0, right: 24, zIndex: 1199,
          width: 420, maxHeight: "calc(100vh - 24px)",
          background: "var(--card)", borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.16)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)",
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0, fontSize: 24,
              background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}33)`,
              border: `1.5px solid ${ACCENT_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Trợ lý AI</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Ban Giám đốc · Dữ liệu thực tế
              </p>
            </div>
            <button onClick={handleClose} style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--muted)", cursor: "pointer", color: "var(--muted-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }}>✕</button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Welcome screen */}
            {!hasUserMessage && (
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>🤖</div>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
                  Xin chào! Tôi là Trợ lý AI
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)" }}>
                  Chuyên hỗ trợ <span style={{ color: ACCENT, fontWeight: 700 }}>Ban Giám đốc</span> phân tích dữ liệu kinh doanh
                </p>
              </div>
            )}

            {/* Suggested questions */}
            {!hasUserMessage && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                  💡 Gợi ý nhanh
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button key={i} className="ai-suggest" onClick={() => sendMessage(q)} style={{
                      padding: "10px 14px", borderRadius: 12,
                      border: `1px solid ${ACCENT_BORDER}`,
                      background: "var(--background)", cursor: "pointer", textAlign: "left",
                      fontSize: 12.5, color: "var(--foreground)",
                      transition: "all 0.15s", fontWeight: 500,
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map(msg => (
                <div key={msg.id} className="ai-msg" style={{
                  display: "flex", gap: 8,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, fontSize: 16,
                      background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}33)`,
                      border: `1px solid ${ACCENT_BORDER}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user"
                      ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`
                      : "var(--muted)",
                    color: msg.role === "user" ? "#fff" : "var(--foreground)",
                    fontSize: 13, lineHeight: 1.6,
                  }}>
                    {msg.loading
                      ? <span><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>
                      : <div>{renderMarkdown(msg.content)}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "10px 14px 6px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... (Enter để gửi)"
                rows={1}
                style={{
                  flex: 1, resize: "none", padding: "9px 13px",
                  border: `1.5px solid ${input ? ACCENT : "var(--border)"}`,
                  borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                  outline: "none", background: "var(--background)",
                  color: "var(--foreground)", maxHeight: 90, overflowY: "auto",
                  transition: "border-color 0.15s",
                }}
              />
              <button
                className="ai-send"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 11, border: "none",
                  background: loading || !input.trim() ? "var(--muted)" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  color: loading || !input.trim() ? "var(--muted-foreground)" : "#fff",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, flexShrink: 0, transition: "all 0.15s",
                }}
              >▶</button>
            </div>
            <p style={{ margin: "6px 0 8px", fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>
              Trí tuệ nhân tạo · Dữ liệu được lọc theo phòng ban &amp; quyền hạn
            </p>
          </div>
        </div>
      )}
    </>
  );
}
