// ui/lib/env.ts
export const REVCOVER_API_URL =
  process.env.NEXT_PUBLIC_HELIX_API_URL ||
  process.env.HELIx_API_URL ||
  "https://api.revcover.ai";

export const ORG_TOKEN =
  process.env.NEXT_PUBLIC_HELIX_ORG_TOKEN ||
  process.env.ORG_TOKEN ||
  "demo-org-token";

if (!REVCOVER_API_URL || !ORG_TOKEN) {
  console.warn(
    "[env] Missing required environment variables: REVCOVER_API_URL or ORG_TOKEN"
  );
}
