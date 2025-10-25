import crypto from "node:crypto";

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

export type LedgerTokenPayload = {
  org_id: string;
  exp: number; // epoch ms
};

function getSecret() {
  const secret = process.env.LEDGER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("LEDGER_TOKEN_SECRET is not configured");
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const pad = 4 - (input.length % 4 || 4);
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad === 4 ? 0 : pad);
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function signLedgerToken(payload: LedgerTokenPayload) {
  const secret = getSecret();
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "RLE" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyLedgerToken(token: string | undefined | null): LedgerTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const secret = process.env.LEDGER_TOKEN_SECRET;
  if (!secret) return null;

  const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (expectedSig.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as LedgerTokenPayload;
    if (!payload?.org_id || typeof payload.exp !== "number") return null;
    const now = Date.now();
    const timeToExpiry = payload.exp - now;
    if (timeToExpiry <= 0) return null;
    if (timeToExpiry > HOURS_72) return null;
    return payload;
  } catch {
    return null;
  }
}
