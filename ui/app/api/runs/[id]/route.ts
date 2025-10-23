export const runtime = 'nodejs'

// Keep types minimal to avoid Next 15 signature complaints on Vercel.
// Next will provide { params } at runtime; we avoid compile-time coupling here.
export async function GET(_req: Request, ctx: any) {
  const id = ctx?.params?.id ?? ''
  return Response.json({ ok: true, id })
}
export {}
