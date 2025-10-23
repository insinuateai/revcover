import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  // For stability, fetch from Fastify rather than using service role in UI.
  const api = process.env.NEXT_PUBLIC_HELIX_API_URL
  if (!api) return NextResponse.json({ ok: false, error: 'API unavailable' }, { status: 500 })
  const r = await fetch(`${api}/api/runs/${ctx.params.id}`, { cache: 'no-store' })
  if (!r.ok) return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 })
  return NextResponse.json(await r.json())
}
