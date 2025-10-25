const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Returns a fully-qualified API URL pointing at Fastify.
 */
export function apiUrl(path: string) {
  return new URL(path, API_BASE).toString();
}
