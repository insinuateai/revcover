/* eslint-disable no-console */
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn("⚠️  NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001");
}
console.log("✅ Preflight minimal check passed.");
process.exit(0);
