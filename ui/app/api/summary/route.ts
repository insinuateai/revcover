// ui/app/api/summary/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const api = process.env.NEXT_PUBLIC_HELIX_API_URL;
  if (!api) return NextResponse.json({ runs: 0, receipts: 0 });

  try {
    const r = await fetch(`${api}/api/summary`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ runs: 0, receipts: 0 });
    const json = await r.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ runs: 0, receipts: 0 });
  }
}
