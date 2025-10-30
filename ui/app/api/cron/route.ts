// ui/app/api/cron/route.ts
import { NextResponse } from 'next/server'

/**
 * This endpoint is ONLY for Vercel Cron.
 * Vercel will call it on the schedule defined in vercel.json.
 * We keep /api/reflect public for the UI button, and protect THIS route.
 */

const CRON_SECRET = process.env.CRON_SECRET

// set these in Vercel → Project → Settings → Environment Variables
const ORG_ID = process.env.CRON_ORG_ID || '00000000-0000-0000-0000-000000000000'
const USER_ID = process.env.CRON_USER_ID || '11111111-1111-1111-1111-111111111111'
const HORIZON_DAYS = Number(process.env.CRON_HORIZON_DAYS || 7)

export async function GET(req: Request) {
  // ✅ Verify the request came from your Vercel Cron (Authorization header)
  const auth = req.headers.get('authorization') || ''
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // POST to your internal /api/reflect route on the same deployment
  try {
    const url = new URL('/api/reflect', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').toString()

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // use your real org/user IDs and horizon
      body: JSON.stringify({
        orgId: ORG_ID,
        userId: USER_ID,
        horizonDays: HORIZON_DAYS
      })
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.ok) {
      return NextResponse.json({ ok: false, status: res.status, json }, { status: 502 })
    }

    return NextResponse.json({ ok: true, savedId: json.savedId, at: Date.now() })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Cron failed' }, { status: 500 })
  }
}
