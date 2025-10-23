"use client";
import { useState } from "react";

export default function Demo() {
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState("");
  const [receiptId, setReceiptId] = useState("");

  async function startRun() {
    setStatus("starting...");
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: "demo-org",
        customer_id: "cust_123",
        invoice_id: "inv_123",
        input: { prompt: "Recover failed payment for cust_123" }
      }),
    });
    const json = await res.json();
    setRunId(json.run_id || "");
    setStatus(`run ${json.status || "error"}`);
  }

  async function makeReceipt() {
    setStatus("creating receipt...");
    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, amount_cents: 2500, currency: "USD" }),
    });
    const json = await res.json();
    setReceiptId(json.receipt_id || "");
    setStatus(json.receipt_id ? "receipt created" : "receipt error");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Revcover Demo: Runs → Receipts</h1>
      <button onClick={startRun} style={{ padding: 10, marginRight: 10 }}>Start Run</button>
      <button onClick={makeReceipt} disabled={!runId} style={{ padding: 10 }}>Create Receipt</button>
      <div style={{ marginTop: 16 }}>
        <div>Run ID: {runId || "—"}</div>
        <div>Receipt ID: {receiptId || "—"}</div>
        <div>Status: {status || "—"}</div>
      </div>
    </main>
  );
}
