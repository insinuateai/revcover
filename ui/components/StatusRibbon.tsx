"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

type SummaryResponse = {
  runs: number;
  receipts: number;
  recovered_7d: number;
  last_event_at: string | null;
};

type HealthResponse = {
  ok: boolean;
  error?: string;
};

type RibbonState = {
  summary: SummaryResponse | null;
  health: HealthResponse | null;
  error: string | null;
  loading: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function StatusRibbon() {
  const [{ summary, health, error, loading }, setState] = useState<RibbonState>({
    summary: null,
    health: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, healthRes] = await Promise.all([
          fetch(apiUrl("/summary"), { cache: "no-store" }),
          fetch(apiUrl("/health"), { cache: "no-store" }),
        ]);

        if (!summaryRes.ok) throw new Error(`summary_failed_${summaryRes.status}`);
        if (!healthRes.ok) throw new Error(`health_failed_${healthRes.status}`);

        const [summaryJson, healthJson] = await Promise.all([summaryRes.json(), healthRes.json()]);
        if (!cancelled) {
          setState({
            summary: summaryJson as SummaryResponse,
            health: healthJson as HealthResponse,
            error: null,
            loading: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Unable to load status",
          }));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const webhookStatus = useMemo(() => {
    if (health?.ok) return "Webhook healthy";
    if (health && health.ok === false) return health.error ? `Webhook issue: ${health.error}` : "Webhook unreachable";
    return loading ? "Checking webhook…" : "Webhook status unknown";
  }, [health, loading]);

  const lastEventLabel = useMemo(() => {
    if (summary?.last_event_at) return dateFormatter.format(new Date(summary.last_event_at));
    return loading ? "Loading…" : "No events yet";
  }, [summary, loading]);

  const recoveredLabel = useMemo(() => {
    if (typeof summary?.recovered_7d === "number") return currencyFormatter.format(summary.recovered_7d);
    return loading ? "Loading…" : currencyFormatter.format(0);
  }, [summary, loading]);

  if (error) {
    return (
      <div
        role="status"
        style={{
          background: "#fef2f2",
          color: "#991b1b",
          padding: "8px 16px",
          borderRadius: 12,
          fontSize: 14,
        }}
      >
        Failed to load status: {error}
      </div>
    );
  }

  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        background: "#0f172a",
        color: "#f8fafc",
        padding: "8px 16px",
        borderRadius: 9999,
        fontSize: 14,
      }}
    >
      <span>
        <strong>Webhook:</strong> {webhookStatus}
      </span>
      <span>
        <strong>Last event:</strong> {lastEventLabel}
      </span>
      <span>
        <strong>7d recovered:</strong> {recoveredLabel}
      </span>
    </div>
  );
}
