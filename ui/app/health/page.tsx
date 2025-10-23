export default async function Health() {
  const res = await fetch('/api/summary', { cache: 'no-store' })
    .then((r) => r.json())
    .catch(() => ({ runs: 0, receipts: 0 }));
  return (
    <main style={{ padding: 24 }}>
      <h1>Health</h1>
      <pre>{JSON.stringify(res, null, 2)}</pre>
    </main>
  );
}
