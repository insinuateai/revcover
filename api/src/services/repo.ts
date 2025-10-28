// api/src/services/repo.ts

export type Receipt = {
  id: string;
  created_at: string;
  invoice_id: string | null;
  status: "pending" | "recovered" | "failed" | string;
  recovered_usd: number | null;
  attribution_hash: string | null;
  reason_code: string | null;
  action_source: string | null;
};

export type ReceiptsFilter = {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
};

export interface Repo {
  listReceipts(filters: ReceiptsFilter): Promise<{ rows: Receipt[]; total: number }>;
  listReceiptsForExport(filters: ReceiptsFilter): Promise<Receipt[]>;
  getRecoveryReportHtml(orgIdOrSlug: string): Promise<{ filename: string; html: string }>;
}
