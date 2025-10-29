'use client';
import { useState } from "react";

export default function ChatPage() {
  const [text, setText] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!text.trim()) return;
    const message = text.trim();
    setText("");
    setLog((l) => [...l, `You: ${message}`]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          userId: "demo-user",
          orgId: process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setLog((l) => [...l, `Helix: ${data.reply}`]);
    } catch (e: any) {
      setLog((l) => [...l, `Error: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Helix Chat (Phase-1)</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Say something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #333" }}
        />
        <button onClick={send} disabled={loading} style={{ padding: "12px 16px" }}>
          {loading ? "…" : "Send"}
        </button>
      </div>
      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: "1px solid #222" }}>
        {log.map((l, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            {l}
          </div>
        ))}
      </div>
    </main>
  );
}
