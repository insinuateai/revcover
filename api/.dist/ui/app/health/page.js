// ui/app/health/page.tsx
export default async function Health() {
    const [summary, apiHealth] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ runs: 0, receipts: 0 })),
        fetch("/api/health", { cache: "no-store" }).then((r) => r.text()).catch(() => "down"),
    ]);
    return (<main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Health</h1>
      <h2>Summary</h2>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
      <h2>API</h2>
      <pre>{String(apiHealth)}</pre>
    </main>);
}
