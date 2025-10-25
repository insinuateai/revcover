import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
  const target = new URL("/receipts/export.csv", base);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  try {
    const res = await fetch(target, { cache: "no-store" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "text/csv",
        "content-disposition": res.headers.get("content-disposition") ?? "attachment; filename=receipts-export.csv",
      },
    });
  } catch {
    return new Response("ok,false", {
      status: 502,
      headers: { "content-type": "text/csv" },
    });
  }
}
