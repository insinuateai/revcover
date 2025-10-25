export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
  try {
    const r = await fetch(`${base}/health`, { cache: "no-store" });
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.ok ? 200 : r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "unreachable" }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
