"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StatusRibbon from "@/components/StatusRibbon";
import { apiUrl } from "@/lib/api";

type SummaryResponse = {
  runs: number;
  receipts: number;
  recovered_7d: number;
  last_event_at: string | null;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/summary"), { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const json = (await res.json()) as SummaryResponse;
      setSummary(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const runs = summary?.runs ?? 0;
  const receipts = summary?.receipts ?? 0;
  const recoveryRate = runs > 0 ? ((receipts / runs) * 100).toFixed(1) : "0.0";
  const recovered7d = useMemo(() => summary?.recovered_7d ?? 0, [summary]);
  const lastEventDisplay = summary?.last_event_at ? new Date(summary.last_event_at).toLocaleString() : "No events yet";

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const triggerPulse = async () => {
    setPulseLoading(true);
    try {
      const res = await fetch(apiUrl("/pulse"), { method: "POST", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.recovered_usd) {
        throw new Error(data?.error ?? "pulse_failed");
      }
      showToast(`Live Recovery Signal — $${Number(data.recovered_usd).toFixed(2)} recovered`);
      await fetchSummary();
    } catch (err) {
      console.error(err);
      showToast("Live Recovery Signal — Pulse failed");
    } finally {
      setPulseLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Revcover Dashboard</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <StatusRibbon />
        <button
          type="button"
          onClick={triggerPulse}
          disabled={pulseLoading}
          style={{
            background: pulseLoading ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 999,
            padding: "10px 20px",
            fontSize: 16,
            cursor: pulseLoading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
          }}
        >
          {pulseLoading ? "Pulsing…" : "Pulse"}
        </button>
      </div>
      {loading ? (
        <p>Loading summary…</p>
      ) : error ? (
        <p style={{ color: "#b91c1c" }}>{error}</p>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minWidth: 160 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Runs</h2>
            <p style={{ fontSize: 28, margin: 0 }}>{runs}</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minWidth: 160 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Receipts</h2>
            <p style={{ fontSize: 28, margin: 0 }}>{receipts}</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minWidth: 160 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Recovery Rate</h2>
            <p style={{ fontSize: 28, margin: 0 }}>{recoveryRate}%</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minWidth: 200 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Recovered (7d)</h2>
            <p style={{ fontSize: 28, margin: 0 }}>${recovered7d.toFixed(2)}</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minWidth: 220 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Last event</h2>
            <p style={{ fontSize: 18, margin: 0 }}>{lastEventDisplay}</p>
          </div>
        </div>
      )}
      {toast ? (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#f8fafc",
            padding: "12px 24px",
            borderRadius: 999,
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.4)",
            fontSize: 16,
          }}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
