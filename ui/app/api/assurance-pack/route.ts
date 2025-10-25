export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
  try {
    const res = await fetch(`${base}/assurance-pack.zip`, { cache: "no-store" });
    const arrayBuffer = await res.arrayBuffer();
    return new Response(Buffer.from(arrayBuffer), {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/zip",
        "content-disposition": res.headers.get("content-disposition") ?? 'attachment; filename="assurance-pack.zip"',
      },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "assurance_pack_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
