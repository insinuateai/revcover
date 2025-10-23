"use client";
import { useEffect, useState } from "react";

type Summary = { runs: number; receipts: number };

export default function Dashboard() {
  const [stats, setStats] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <main className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1><p>Error: {error}</p></main>;
  }
  if (!stats) {
    return <main className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1><p>Loading...</p></main>;
  }

  const recoveryRate = stats.runs ? ((stats.receipts / stats.runs) * 100).toFixed(2) : "0.00";
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">📈 Revcover Dashboard</h1>
      <div className="mb-2">Runs: {stats.runs}</div>
      <div className="mb-2">Receipts: {stats.receipts}</div>
      <div className="mb-2">Recovery Rate: {recoveryRate}%</div>
    </main>
  );
}
