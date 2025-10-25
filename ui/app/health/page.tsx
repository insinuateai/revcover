// ui/app/health/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export default async function HealthPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "127.0.0.1:3000";
  const base = `${proto}://${host}`;

  let summary = { runs: 0, receipts: 0 };
  let api = { ok: false, error: "unreachable" };

  try {
    const [summaryRes, apiRes] = await Promise.all([
      fetch(new URL("/api/summary", base), { cache: "no-store" }),
      fetch(new URL("/api/health", base), { cache: "no-store" }),
    ]);

    if (summaryRes.ok) summary = await summaryRes.json();
    if (apiRes.ok) api = await apiRes.json();   // <-- parse JSON, not .text()
  } catch (err) {
    api = { ok: false, error: String(err) };
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Health</h1>
      <h2>Summary</h2>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
      <h2>API</h2>
      <pre>{JSON.stringify(api, null, 2)}</pre>
    </main>
  );
}
