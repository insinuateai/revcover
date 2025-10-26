# API recipe (route + Zod + test)
- Define `querySchema`, `respSchema` (Zod).
- Handler: validate -> do work -> `{ok:true,data}` or `{ok:false,error}`.
- Vitest: 1 happy, 1 invalid query, 1 internal error.
File layout:
- api/src/routes/<feature>.ts
- api/src/routes/<feature>.test.ts
