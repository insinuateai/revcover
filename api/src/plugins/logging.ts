import fp from "fastify-plugin";
import { randomUUID } from "crypto";

export default fp(async (app) => {
  app.addHook("onRequest", async (req, _reply) => {
    (req as any).request_id = req.headers["x-request-id"] || randomUUID();
    req.log = req.log.child({ request_id: (req as any).request_id });
  });

  app.decorateReply("ok", function ok(payload: any) {
    const request = this.request as any;
    request.log.info({ path: request.url, status: 200 }, "request_ok");
    return this.send(payload);
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, "request_error");
    reply.status(err.statusCode || 500).send({
      error: "INTERNAL",
      code: "RVC-500-UNEXPECTED",
      request_id: (req as any).request_id,
    });
  });
});
