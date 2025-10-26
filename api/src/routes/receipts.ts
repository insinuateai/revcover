import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const listQuery = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export default async function receipts(app: FastifyInstance) {
  app.get("/receipts", async (req, reply) => {
    const parsed = listQuery.safeParse((req as any).query);
    if (!parsed.success) {
      reply.code(400).send({ error: "Invalid query", issues: parsed.error.issues });
      return;
    }
    const { status, q, from, to, limit, offset } = parsed.data;

    let qb: any = supabaseAdmin
      .from("receipts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) qb = (qb as any).eq("status", status);
    if (from)   qb = (qb as any).gte("created_at", from);
    if (to)     qb = (qb as any).lte("created_at", to);
    if (q)      qb = (qb as any).or(`invoice_id.ilike.%${q}%,customer_id.ilike.%${q}%`);

    qb = (qb as any).range(offset, offset + limit - 1);

    const { data, error, count } = await qb;
    if (error) return reply.code(500).send({ error: error.message });
    reply.send({ items: data ?? [], total: count ?? 0, limit, offset });
  });
}
