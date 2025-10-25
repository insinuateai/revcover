"use client";

import { useMemo } from "react";

type ChecklistItem = {
  label: string;
  description: string;
  status: "pass" | "warn" | "todo";
};

const checklist: ChecklistItem[] = [
  { label: "SPF record", description: "v=spf1 include:revcover.io ~all", status: "pass" },
  { label: "DKIM selector", description: "revcover._domainkey", status: "warn" },
  { label: "DMARC policy", description: "p=quarantine pct=100", status: "todo" },
];

export default function SettingsPage() {
  const bounceRate = useMemo(() => 4.2, []); // mock
  const banner = bounceRate > 3 ? `Heads up: bounce rate is ${bounceRate.toFixed(1)}% in the last 24h` : null;

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Deliverability Settings</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>Keep your SPF/DKIM/DMARC aligned for the Vault playbooks.</p>

      {banner && (
        <div style={{
          background: "#fef3c7",
          color: "#92400e",
          padding: "12px 16px",
          borderRadius: 12,
          marginBottom: 24,
          border: "1px solid #fcd34d",
        }}>
          {banner}
        </div>
      )}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>SPF / DKIM / DMARC Checklist</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {checklist.map((item) => (
            <li key={item.label} style={{
              border: "1px solid #f1f5f9",
              borderRadius: 12,
              padding: 16,
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>{item.description}</p>
              </div>
              <span style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: item.status === "pass" ? "#dcfce7" : item.status === "warn" ? "#fef9c3" : "#e2e8f0",
                color: item.status === "pass" ? "#15803d" : item.status === "warn" ? "#92400e" : "#475569",
              }}>
                {item.status === "pass" ? "Ready" : item.status === "warn" ? "Review" : "Todo"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
