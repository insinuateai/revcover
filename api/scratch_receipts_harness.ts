import Fastify from "fastify";
import * as receipts from "./src/routes/receipts";

(async () => {
  const app = Fastify();

  const repo = {
    export: (filters: any) => {
      console.log("HARNESS repo.export called with:", filters);
      return [{ id: "1", created_at: "2025-01-01", invoice_id: null, status: "recovered", recovered_usd: 10, attribution_hash: null, reason_code: null, action_source: null }];
    }
  };

  // Try both registration styles one by one:
  // 1) plugin form:
  await app.register((receipts as any).buildReceiptsRoute, { repo });
  // 2) factory form:
  // await app.register((receipts as any).buildReceiptsRoute({ repo }));

  await app.ready();
  const res = await app.inject({ method: "GET", url: "/receipts/export.csv?status=recovered" });
  console.log("STATUS:", res.statusCode);
  console.log("BODY(1st 100):", res.payload.slice(0, 100));
})();
