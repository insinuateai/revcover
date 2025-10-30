import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL = 'gpt-4o-mini'
const DAYS = 7

type ReflectRequest = {
  orgId?: string
  userId?: string
}

export async function POST(req: Request) {
  const { orgId, userId } = (await req.json().catch(() => ({}))) as ReflectRequest
  if (!orgId || !userId) {
    return NextResponse.json({ error: 'orgId,userId required' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: msgs, error: msgErr } = await supabaseAdmin
    .from('conversation_messages')
    .select('role,message,created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  const { data: mems, error: memErr } = await supabaseAdmin
    .from('memory_insights')
    .select('summary,importance,created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 })
  }

  const corpus = [
    '--- Conversation (last 7 days) ---',
    ...(msgs || []).map((m) => `[${m.created_at}] ${m.role?.toUpperCase?.() ?? 'UNKNOWN'}: ${m.message ?? ''}`),
    '',
    '--- Memory Bullets (last 7 days) ---',
    ...(mems || []).map((i) => `[${i.created_at}] (${i.importance ?? 'n/a'}) • ${i.summary ?? ''}`),
  ].join('\n')

  const sys = [
    'You are Synex (reflection agent).',
    'Analyze the data and output:',
    '1) Highlights, 2) Risks, 3) Decisions made, 4) Top 3 actions (concise, high-ROI).',
  ].join(' ')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: corpus || '(no recent activity)' },
      ],
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 })
  }

  const j = await res.json()
  const report = j.choices?.[0]?.message?.content ?? '(empty)'

  await supabaseAdmin
    .from('agent_runs')
    .insert({
      org_id: orgId,
      user_id: userId,
      agent: 'synex_reflect',
      payload: { days: DAYS },
      output: report,
    })
    .catch(() => undefined)

  return NextResponse.json({ ok: true, report })
}

