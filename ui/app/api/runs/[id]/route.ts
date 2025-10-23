import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Next 15 signature: (request: NextRequest, context: { params: { id: string } })
export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  // TODO: replace with real lookup logic if needed
  return Response.json({ ok: true, id })
}

// Keep module alive as ESM module even if tree-shaken
export {}
