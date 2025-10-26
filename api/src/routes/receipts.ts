import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

type AnyBuilder = any;

const PAGE_SIZE = 50;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["date", "recovered_usd"]).default("date"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["all", "recovered", "pending"]).default("all"),
  from: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizeDate(value)),
  to: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizeDate(value)),
  search: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .optional(),
});

type QueryParams = z.infer<typeof querySchema>;

type ReceiptRow = {
  id: string;
  org_id: string;
  run_id: string;
  customer_id: string | null;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  recovered: boolean;
  reason_code: string | null;
  action_source: string | null;
  attribution_hash: string | null;
  created_at: string;
};

type ReceiptDTO = {
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

type ReceiptsFilters = QueryParams & { orgId: string };

type ReceiptsRepo = {
  list(filters: ReceiptsFilters): Promise<{ rows: ReceiptRow[]; count: number }>;
  export(filters: ReceiptsFilters): Promise<ReceiptRow[]>;
};

type ReceiptsDeps = {
  repo: ReceiptsRepo;
};

const defaultDeps: ReceiptsDeps = {
  repo: createReceiptsRepo(supabaseAdmin),
};

function normalizeDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function centsToDollars(value?: number | null) {
  return Number(((value ?? 0) / 100).toFixed(2));
}

function applyFilters(query: AnyBuilder, filters: ReceiptsFilters) {
  let next: AnyBuilder = (query as AnyBuilder).eq("org_id", filters.orgId);

  if (filters.status === "recovered") next = (next as AnyBuilder).eq("recovered", true);
  if (filters.status === "pending") next = (next as AnyBuilder).eq("recovered", false);
  if (filters.from) next = (next as AnyBuilder).gte("created_at", filters.from);
  if (filters.to) next = (next as AnyBuilder).lte("created_at", filters.to);
  if (filters.search) next = (next as AnyBuilder).ilike("invoice_id", `%${filters.search}%`);

  return next;
}

function orderColumn(sort: QueryParams["sort"]) {
  return sort === "recovered_usd" ? "amount_cents" : "created_at";
}

function createReceiptsRepo(client: SupabaseClient): ReceiptsRepo {
  return {
    async list(filters) {
      const start = (filters.page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;
      let query: AnyBuilder = client.from("receipts").select("*", { count: "exact" });
      query = applyFilters(query, filters);
      query = (query as AnyBuilder).order(orderColumn(filters.sort), { ascending: filters.direction === "asc" });
      const { data, error, count } = await query.range(start, end);
      if (error || !Array.isArray(data)) throw error ?? new Error("receipts_query_failed");
      return { rows: data as ReceiptRow[], count: count ?? 0 };
    },

    async export(filters) {
      let query: AnyBuilder = client.from("receipts").select("*");
      query = applyFilters(query, filters);
      query = (query as AnyBuilder).order(orderColumn(filters.sort), { ascending: filters.direction === "asc" });
      const { data, error } = await query;
      if (error || !Array.isArray(data)) throw error ?? new Error("receipts_export_failed");
      return data as ReceiptRow[];
    },
  };
}

function toDTO(row: ReceiptRow): ReceiptDTO {
  return {
    id: row.id,
    run_id: row.run_id,
    invoice_id: row.invoice_id,
    recovered_usd: centsToDollars(row.amount_cents),
    currency: row.currency,
    status: row.recovered ? "recovered" : "pending",
    reason_code: row.reason_code,
    action_source: row.action_source,
    attribution_hash: row.attribution_hash,
    created_at: row.created_at,
  };
}

function toCsv(rows: ReceiptRow[]) {
  const header = [
    "id",
    "invoice_id",
    "run_id",
    "recovered_usd",
    "currency",
    "status",
    "reason_code",
    "action_source",
    "attribution_hash",
    "created_at",
  ];
  const lines = rows.map((row) => {
    const dto = toDTO(row);
    return [
      dto.id,
      dto.invoice_id,
      dto.run_id,
      dto.recovered_usd.toFixed(2),
      dto.currency,
      dto.status,
      dto.reason_code ?? "",
      dto.action_source ?? "",
      dto.attribution_hash ?? "",
      dto.created_at,
    ]
      .map((value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

function parseQuery(raw: Record<string, unknown>) {
  const result = querySchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first?.message ?? "invalid_query";
    const path = first?.path?.join(".") ?? "";
    const error = new Error(`${path ? `${path}: ` : ""}${message}`);
    (error as any).statusCode = 400;
    throw error;
  }

  return result.data;
}

export function buildReceiptsRoute(deps: ReceiptsDeps = defaultDeps) {
  const { repo } = deps;

  return async function receiptsRoute(app: FastifyInstance) {
    app.get("/receipts", async (req, reply) => {
      const orgId = (req.query as Record<string, string | undefined>)?.org_id ?? process.env.ORG_TOKEN ?? "demo-org";
      const requestId = (req as { id?: string }).id ?? "unknown_request";

      try {
        const parsed = parseQuery(req.query as Record<string, unknown>);
        const filters: ReceiptsFilters = { ...parsed, orgId };
        const { rows, count } = await repo.list(filters);

        return reply.send({
          ok: true,
          page: filters.page,
          page_size: PAGE_SIZE,
          total: count,
          receipts: rows.map(toDTO),
        });
      } catch (err: any) {
        const status = Number(err?.statusCode) || 500;
        app.log.error({ err, request_id: requestId, route: "receipts_list" }, "receipts list failed");
        return reply.code(status).send({ ok: false, error: "receipts_list_failed", message: err?.message ?? "unknown" });
      }
    });

    app.get("/receipts/export.csv", async (req, reply) => {
      const orgId = (req.query as Record<string, string | undefined>)?.org_id ?? process.env.ORG_TOKEN ?? "demo-org";
      const requestId = (req as { id?: string }).id ?? "unknown_request";

      try {
        const parsed = parseQuery(req.query as Record<string, unknown>);
        const filters: ReceiptsFilters = { ...parsed, orgId };
        const rows = await repo.export(filters);
        const csv = toCsv(rows);

        return reply
          .header("content-type", "text/csv")
          .header("content-disposition", `attachment; filename="receipts-export.csv"`)
          .send(csv);
      } catch (err: any) {
        const status = Number(err?.statusCode) || 500;
        app.log.error({ err, request_id: requestId, route: "receipts_export" }, "receipts export failed");
        return reply.code(status).send({ ok: false, error: "receipts_export_failed", message: err?.message ?? "unknown" });
      }
    });
  };
}

export default buildReceiptsRoute();
