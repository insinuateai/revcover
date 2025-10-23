import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { REVCOVER_API_URL, ORG_TOKEN } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { org_id = "demo-org", customer_id = "demo-customer", invoice_id = null, input = {} } = body || {};

    // 1) Create a pending run
    const { data: created, error: createErr } = await supabaseAdmin
      .from("agent_runs")
      .insert({
        org_id,
        customer_id,
        invoice_id,
        status: "running",
        input_json: input,
        attempt_count: 1
      })
      .select()
      .single();
    if (createErr) throw createErr;

    // 2) Call upstream agent via server-side proxy (Revcover API)
    const upstream = await fetch(`${REVCOVER_API_URL}/agents/think`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ORG_TOKEN}`,
      },
      body: JSON.stringify({ org_id, input }),
    });

    const result = await upstream.json();

    // 3) Update run with result
    const status = upstream.ok ? "completed" : "failed";
    const { error: updateErr } = await supabaseAdmin
      .from("agent_runs")
      .update({ status, output_json: result })
      .eq("id", created.id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ run_id: created.id, status, result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create run" }, { status: 500 });
  }
}

export const runtime = "nodejs";
