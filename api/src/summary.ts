import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export default async function summaryRoute(app: FastifyInstance) {
  app.get('/api/summary', async (_req, reply) => {
    // Query Supabase to count runs and receipts; fall back to zeros on error
    try {
      const { data: runsData, error: runsErr } = await supabaseAdmin
        .from('runs')
        .select('id', { count: 'exact' });
      const { data: receiptsData, error: receiptsErr } = await supabaseAdmin
        .from('receipts')
        .select('id', { count: 'exact' });
      if (runsErr || receiptsErr) {
        app.log.error({ runsErr, receiptsErr }, 'Summary query failed');
      }
      const runs = runsData?.length ?? 0;
      const receipts = receiptsData?.length ?? 0;
      return reply.send({ runs, receipts });
    } catch (err) {
      app.log.error(err, 'Summary query exception');
      return reply.send({ runs: 0, receipts: 0 });
    }
  });
}
