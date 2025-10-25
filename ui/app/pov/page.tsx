"use client";

import { useCallback, useEffect, useState } from "react";

const steps = ["Stripe Connect", "Playbooks", "Start"] as const;

type Step = (typeof steps)[number];

const PLAYBOOKS = [
  { id: "email", label: "Email Recovery" },
  { id: "sms", label: "SMS Nudges" },
  { id: "agent", label: "Agent Escalation" },
];

export default function ProofOfValueWizard() {
  const [current, setCurrent] = useState(0);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<Record<string, boolean>>({ email: true, sms: false, agent: false });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const stepName: Step = steps[current];

  const connectStripe = async () => {
    setStatus("loading");
    setMessage(null);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStripeConnected(true);
    setStatus("success");
    setMessage("Stripe account linked");
  };

  const togglePlaybook = (id: string) => {
    setSelectedPlaybooks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadAssurancePack = useCallback(async () => {
    try {
      setStatus("loading");
      setMessage(null);
      const res = await fetch("/api/assurance-pack");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assurance-pack.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("success");
      setMessage("Assurance pack ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Unable to build assurance pack");
    }
  }, []);

  useEffect(() => {
    if (stepName === "Start" && stripeConnected) {
      void downloadAssurancePack();
    }
  }, [downloadAssurancePack, stepName, stripeConnected]);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Proof-of-Value Wizard</h1>
      <ol style={{ display: "flex", gap: 16, listStyle: "none", padding: 0, marginTop: 12 }}>
        {steps.map((name, idx) => (
          <li key={name} style={{
            flex: 1,
            padding: 12,
            borderRadius: 9999,
            background: idx === current ? "#2563eb" : "#e2e8f0",
            color: idx === current ? "white" : "#0f172a",
            textAlign: "center",
            fontWeight: 600,
          }}>
            {idx + 1}. {name}
          </li>
        ))}
      </ol>

      <section style={{ marginTop: 32, border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
        {stepName === "Stripe Connect" && (
          <div>
            <p>Connect your Stripe account to capture failed invoices.</p>
            <button
              type="button"
              onClick={connectStripe}
              disabled={status === "loading" || stripeConnected}
              style={{
                marginTop: 12,
                background: stripeConnected ? "#10b981" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 999,
                padding: "10px 20px",
                cursor: stripeConnected ? "not-allowed" : "pointer",
              }}
            >
              {stripeConnected ? "Connected" : "Connect Stripe"}
            </button>
          </div>
        )}

        {stepName === "Playbooks" && (
          <div>
            <p>Select playbooks to activate on day one.</p>
            <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
              {PLAYBOOKS.map((playbook) => (
                <li key={playbook.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input
                    id={`playbook-${playbook.id}`}
                    type="checkbox"
                    checked={!!selectedPlaybooks[playbook.id]}
                    onChange={() => togglePlaybook(playbook.id)}
                  />
                  <label htmlFor={`playbook-${playbook.id}`}>{playbook.label}</label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stepName === "Start" && (
          <div>
            <p>Download the assurance pack and kick off the recovery program.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={downloadAssurancePack} style={{ background: "#0f172a", color: "white", border: "none", borderRadius: 999, padding: "10px 20px" }}>
                Download Assurance Pack
              </button>
              <button type="button" onClick={() => alert("Program started!")} style={{ border: "1px solid #0f172a", borderRadius: 999, padding: "10px 20px" }}>
                Start Recovery Program
              </button>
            </div>
          </div>
        )}
      </section>

      <footer style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button type="button" onClick={() => setCurrent((idx) => Math.max(0, idx - 1))} disabled={current === 0}>
          Back
        </button>
        <button type="button" onClick={() => setCurrent((idx) => Math.min(steps.length - 1, idx + 1))} disabled={current === steps.length - 1}>
          Next
        </button>
      </footer>

      {message && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: status === "error" ? "#fee2e2" : "#dcfce7", color: status === "error" ? "#991b1b" : "#166534" }}>
          {message}
        </div>
      )}
    </main>
  );
}
