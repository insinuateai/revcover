// ui/app/api/runs/[id]/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(_req, ctx) {
    const api = process.env.NEXT_PUBLIC_HELIX_API_URL;
    if (!api)
        return NextResponse.json({ ok: false, error: "API unavailable" }, { status: 500 });
    const res = await fetch(`${api}/api/runs/${ctx.params.id}`, { cache: "no-store" });
    if (!res.ok) {
        return NextResponse.json({ ok: false, error: "run_not_found" }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json);
}
