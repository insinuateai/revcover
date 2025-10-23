// ui/app/api/runs/[id]/route.ts
import { NextResponse } from "next/server";

// Optional: avoid static optimization surprises
export const dynamic = "force-dynamic";

// Next.js 15 App Router: (req: Request, ctx: { params: {...} })
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Minimal, dependency-free payload to guarantee compile success
  return NextResponse.json({ ok: true, id });
}
