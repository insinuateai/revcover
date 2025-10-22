export const REVCOVER_API_URL =
  process.env.REVCOVER_API_URL ||
  process.env.HELIX_BACKEND_URL ||          // temporary legacy alias
  process.env.NEXT_PUBLIC_HELIX_API_URL ||  // last-resort legacy
  "";

export const ORG_TOKEN =
  process.env.ORG_TOKEN ||
  process.env.NEXT_PUBLIC_HELIX_ORG_TOKEN || // temporary legacy alias
  "";
