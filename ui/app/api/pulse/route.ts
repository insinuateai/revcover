export const dynamic = "force-dynamic";

export async function POST() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
  try {
    const res = await fetch(`${base}/pulse`, { method: "POST", cache: "no-store" });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "pulse_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
