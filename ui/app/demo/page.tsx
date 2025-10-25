"use client";
import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function Demo() {
  const [runId, setRunId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [status, setStatus] = useState("");

  async function startRun() {
    setStatus("starting...");
    const res = await fetch(apiUrl("/api/runs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: "demo", customer_id: "c1" })
    });
    const json = await res.json();
    setRunId(json.run_id);
    setStatus(json.status);
  }
  async function makeReceipt() {
    if (!runId) return;
    setStatus("creating receipt...");
    const res = await fetch(apiUrl("/api/receipts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId })
    });
    const json = await res.json();
    setReceiptId(json.receipt_id);
    setStatus(json.status);
  }


  return (
    <main>
      <h1>Revcover Demo</h1>
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <button onClick={startRun}>Start Run</button>
        <button onClick={makeReceipt} disabled={!runId}>Create Receipt</button>
      </div>
      <div>Run ID: {runId || "—"}</div>
      <div>Receipt ID: {receiptId || "—"}</div>
      <div>Status: {status || "—"}</div>
    </main>
  );
}
