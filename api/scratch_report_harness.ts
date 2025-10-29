import Fastify from "fastify";
import * as report from "./src/routes/recoveryReport";

(async () => {
  const app = Fastify();

  const repo = {
    getRecoveryReportHtml: async (id: string) => ({ filename: `${id}.pdf`, html: `<h1>${id}</h1>` })
  };

  // Try either style:
  await app.register((report as any).buildRecoveryReportRoute, { repo });
  // await app.register((report as any).buildRecoveryReportRoute({ repo }));

  await app.ready();
  const res = await app.inject({ method: "GET", url: "/recovery-report/demo-org.pdf" });
  console.log("STATUS:", res.statusCode);
  console.log("CT:", res.headers["content-type"]);
  console.log("LEN:", res.rawPayload.length);
})();
