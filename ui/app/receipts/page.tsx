"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

const PAGE_SIZE = 50;

export type Receipt = {
  id: string;
  run_id: string;
  invoice_id: string;
  recovered_usd: number;
  currency: string;
  status: "recovered" | "pending";
  reason_code: string | null;
  action_source: string | null;
  attribution_hash: string | null;
  created_at: string;
};

export type ReceiptsResponse = {
  ok: boolean;
  page: number;
  page_size: number;
  total: number;
  receipts: Receipt[];
};

type Filters = {
  page: number;
  status: "all" | "recovered" | "pending";
  sort: "date" | "recovered_usd";
  direction: "asc" | "desc";
  from?: string;
  to?: string;
  search?: string;
};

const defaultFilters: Filters = {
  page: 1,
  status: "all",
  sort: "date",
  direction: "desc",
};

export default function ReceiptsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<ReceiptsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Receipt | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === "") return;
      params.set(key, String(value));
    });
    return params.toString();
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/receipts?${query}`), { cache: "no-store" });
      const json = (await res.json()) as ReceiptsResponse;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "load_failed");
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load receipts");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  const updateFilter = (patch: Partial<Filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? (patch.search !== undefined || patch.status || patch.sort || patch.direction || patch.from !== undefined || patch.to !== undefined ? 1 : prev.page),
    }));
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(apiUrl(`/receipts/export?${query}`), { cache: "no-store" });
      if (!res.ok) throw new Error("export_failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "receipts-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Export failed");
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Receipts</h1>
          <p style={{ color: "#64748b", margin: 0 }}>Server pagination with CSV export</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          style={{ background: "#0f172a", color: "white", border: "none", borderRadius: 999, padding: "10px 18px", cursor: "pointer" }}
        >
          Export CSV
        </button>
      </header>

      <section style={{ marginTop: 24, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Status</span>
          <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value as Filters["status"] })}>
            <option value="all">All</option>
            <option value="recovered">Recovered</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Sort</span>
          <select value={filters.sort} onChange={(e) => updateFilter({ sort: e.target.value as Filters["sort"] })}>
            <option value="date">Date</option>
            <option value="recovered_usd">Recovered USD</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Direction</span>
          <select value={filters.direction} onChange={(e) => updateFilter({ direction: e.target.value as Filters["direction"] })}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>From</span>
          <input type="date" value={filters.from ?? ""} onChange={(e) => updateFilter({ from: e.target.value || undefined })} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>To</span>
          <input type="date" value={filters.to ?? ""} onChange={(e) => updateFilter({ to: e.target.value || undefined })} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Invoice</span>
          <input type="text" placeholder="Search invoice" value={filters.search ?? ""} onChange={(e) => updateFilter({ search: e.target.value || undefined })} />
        </label>
      </section>

      {loading ? (
        <p style={{ marginTop: 24 }}>Loading receipts…</p>
      ) : error ? (
        <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p>
      ) : (
        <div style={{ marginTop: 24, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 12 }}>Invoice</th>
                <th style={{ padding: 12 }}>Run</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Recovered</th>
                <th style={{ padding: 12 }}>Created</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {data?.receipts.map((receipt) => (
                <tr key={receipt.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 12 }}>{receipt.invoice_id}</td>
                  <td style={{ padding: 12 }}>{receipt.run_id}</td>
                  <td style={{ padding: 12 }}>{receipt.status}</td>
                  <td style={{ padding: 12 }}>${receipt.recovered_usd.toFixed(2)}</td>
                  <td style={{ padding: 12 }}>{new Date(receipt.created_at).toLocaleString()}</td>
                  <td style={{ padding: 12 }}>
                    <button type="button" onClick={() => setDrawer(receipt)} style={{ border: "none", background: "transparent", color: "#2563eb", cursor: "pointer" }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.receipts.length && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                    No receipts for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" disabled={filters.page <= 1} onClick={() => updateFilter({ page: Math.max(1, filters.page - 1) })}>
          Prev
        </button>
        <span>
          Page {filters.page} / {totalPages}
        </span>
        <button type="button" disabled={filters.page >= totalPages} onClick={() => updateFilter({ page: Math.min(totalPages, filters.page + 1) })}>
          Next
        </button>
        <span style={{ marginLeft: "auto", color: "#94a3b8" }}>{data?.total ?? 0} total</span>
      </footer>

      {drawer ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            padding: 24,
          }}
          onClick={() => setDrawer(null)}
        >
          <div
            style={{
              width: "min(480px, 100%)",
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 12px 32px rgba(15,23,42,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Receipt {drawer.invoice_id}</h2>
              <button type="button" onClick={() => setDrawer(null)} style={{ background: "transparent", border: "none", fontSize: 18 }}>
                ×
              </button>
            </header>
            <dl style={{ marginTop: 16, display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 12 }}>
              <dt>Status</dt>
              <dd>{drawer.status}</dd>
              <dt>Recovered</dt>
              <dd>${drawer.recovered_usd.toFixed(2)}</dd>
              <dt>Reason</dt>
              <dd>{drawer.reason_code ?? "—"}</dd>
              <dt>Source</dt>
              <dd>{drawer.action_source ?? "—"}</dd>
              <dt>Attribution Hash</dt>
              <dd style={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{drawer.attribution_hash ?? "—"}</dd>
              <dt>Created</dt>
              <dd>{new Date(drawer.created_at).toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </main>
  );
}
