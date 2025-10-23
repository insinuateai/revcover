"use client";
import { useState } from "react";

export default function DemoPage() {
  const [runId, setRunId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRun() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/runs", { method: "POST" });
      const data = await res.json();
      setRunId(data.run_id || "No run id returned");
      setMessage("Run started successfully!");
    } catch (e) {
      setMessage("Run failed: " + e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReceipt() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/receipts", { method: "POST" });
      const data = await res.json();
      setReceiptId(data.receipt_id || "No receipt id returned");
      setMessage("Receipt created successfully!");
    } catch (e) {
      setMessage("Receipt failed: " + e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Revcover Demo</h1>
      <button onClick={handleRun} disabled={loading}>Start Run</button>
      <button onClick={handleReceipt} disabled={loading} style={{ marginLeft: "1rem" }}>
        Create Receipt
      </button>
      <p>{message}</p>
      {runId && <p><strong>Run ID:</strong> {runId}</p>}
      {receiptId && <p><strong>Receipt ID:</strong> {receiptId}</p>}
    </main>
  );
}
