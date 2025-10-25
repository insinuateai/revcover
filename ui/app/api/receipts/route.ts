import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { run_id, amount_cents = 0, currency = "USD" } = body || {};
    if (!run_id) return NextResponse.json({ error: "run_id is required" }, { status: 400 });

    const { data: run, error: runErr } = await supabaseAdmin
      .from("agent_runs")
      .select("id, org_id, customer_id, invoice_id, output_json")
      .eq("id", run_id)
      .single();
    if (runErr || !run) throw runErr || new Error("Run not found");

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("receipts")
      .insert({
        run_id: run.id,
        org_id: run.org_id,
        customer_id: run.customer_id,
        invoice_id: run.invoice_id,
        amount_cents,
        currency,
        recovered: amount_cents > 0,
        payload_json: run.output_json
      })
      .select()
      .single();
    if (recErr) throw recErr;

    return NextResponse.json({ receipt_id: rec.id, recovered: rec.recovered }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create receipt" }, { status: 500 });
  }
}

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
  const target = new URL("/receipts", base);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  try {
    const res = await fetch(target, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "receipts_unreachable" }, { status: 502 });
  }
}
