# Guardrailed Codex Pipeline (5)
1) Guardrail cmd must be green before PR: `pnpm guardrail` (typecheck → lint → test → preflight).
2) Atomic PRs (≤300 LOC) with acceptance checks in the description.
3) Define TS/Zod contracts first; UI never fetches “any”.
4) All routes return `{ok:boolean, data?, error?}`; no silent failures.
5) Sentry on every 5xx; audit all privileged mutations.
