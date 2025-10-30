export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// --- envs (server-only) ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// --- clients/helpers ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function embedText(text: string) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  })
  if (!r.ok) throw new Error(`OpenAI embeddings: ${await r.text()}`)
  const j = await r.json()
  return j.data?.[0]?.embedding
}

async function fetchRecentContext(orgId: string, userId: string, limit = 50) {
  // Pull recent conversation messages and memory bullets (adjust table/column names if needed)
  const { data: msgs, error: mErr } = await supabase
    .from('conversation_messages')
    .select('role,content,created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (mErr) throw mErr

  const { data: bullets, error: bErr } = await supabase
    .from('memory_insights')
    .select('summary,importance,created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (bErr) throw bErr

  const recentMessages = (msgs ?? [])
    .reverse()
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n')
  const memoryBullets = (bullets ?? [])
    .map((b) => `• (${b.importance}) ${b.summary}`)
    .join('\n')

  return { recentMessages, memoryBullets }
}

export async function POST(req: Request) {
  try {
    const { orgId, userId, horizonDays = 7, diagnose = false } = await req.json()

    // fast param + env checks
    const missing = [
      !orgId && 'orgId',
      !userId && 'userId',
      !SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
      !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
      !OPENAI_API_KEY && 'OPENAI_API_KEY'
    ].filter(Boolean)
    if (missing.length) {
      return NextResponse.json({ ok: false, error: `Missing: ${missing.join(', ')}` }, { status: 400 })
    }
    if (diagnose) {
      return NextResponse.json({
        ok: true,
        diag: {
          hasSupabaseUrl: !!SUPABASE_URL,
          hasSrKey: !!SUPABASE_SERVICE_ROLE_KEY,
          hasOpenAI: !!OPENAI_API_KEY,
          model: OPENAI_MODEL
        }
      })
    }

    // 1) Load recent context
    const { recentMessages, memoryBullets } = await fetchRecentContext(orgId, userId, 50)

    // 2) Ask OpenAI to produce a JSON Brain Report
    const sys = `You are Synex, Revcover's reflection analyst.
Synthesize a concise Brain Report for the last ${horizonDays} days.
Return JSON with: highlights[], challenges[], decisions[], risks[], next_actions[]. Keep each bullet <= 18 words.`

    const user = `Recent Messages:
${recentMessages}

Existing Memory Bullets:
${memoryBullets}
`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
      })
    })
    if (!r.ok) return NextResponse.json({ ok: false, error: await r.text() }, { status: 502 })
    const j = await r.json()
    const report = JSON.parse(j.choices?.[0]?.message?.content || '{}')

    // 3) Persist summary + embedding
    const summaryText = [
      'Brain Report — Weekly Reflection',
      '',
      'Highlights:',
      ...(report.highlights || []).map((x: string) => `• ${x}`),
      '',
      'Challenges:',
      ...(report.challenges || []).map((x: string) => `• ${x}`),
      '',
      'Decisions:',
      ...(report.decisions || []).map((x: string) => `• ${x}`),
      '',
      'Risks:',
      ...(report.risks || []).map((x: string) => `• ${x}`),
      '',
      'Next Actions:',
      ...(report.next_actions || []).map((x: string) => `• ${x}`)
    ].join('\n')

    const embedding = await embedText(summaryText)

    const { data, error } = await supabase
      .from('memory_insights')
      .insert({
        org_id: orgId,
        user_id: userId,
        summary: summaryText,
        importance: 9,
        embedding
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, report, savedId: data.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
