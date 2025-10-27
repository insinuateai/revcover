import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: {
    export: (args: {
      status?: string;
      search?: string;
      from?: string;
      to?: string;
      sort?: string;
      direction?: "asc" | "desc";
      page?: number;
    }) => Promise<string | Buffer>;
  };
};

export const buildReceiptsRoute =
  ({ repo }: Deps): FastifyPluginAsync =>
  async (app) => {
    app.get<{
      Querystring: {
        status?: string;
        search?: string;
        from?: string;
        to?: string;
        sort?: string;
        direction?: "asc" | "desc";
        page?: string | number;
      };
    }>("/receipts.csv", async (req, reply) => {
      const { status, search, from, to, sort, direction, page } = req.query ?? {};

      const args = {
        status,
        search,
        from,
        to,
        sort,
        direction,
        page: page != null ? Number(page) : undefined,
      };

      const csv = await repo.export(args);

      reply
        .type("text/csv")
        .header("content-disposition", 'attachment; filename="receipts.csv"')
        .send(csv);
    });
  };

export default buildReceiptsRoute;
