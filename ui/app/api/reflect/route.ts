// /ui/app/api/reflect/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embedText } from '@/lib/embeddings'
import { fetchRecentContext } from '@/lib/context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

export async function POST(req: Request) {
  try {
    const { orgId, userId, horizonDays = 7 } = await req.json()
    if (!orgId || !userId) {
      return NextResponse.json({ ok: false, error: 'orgId and userId required' }, { status: 400 })
    }

    // 1) Load recent context + memory bullets (Phase 1 exports)
    const { recentMessages, memoryBullets } = await fetchRecentContext(orgId, userId, 50)

    // 2) Build prompt for Brain Report
    const sys = `You are Synex, Revcover's reflection analyst.
Synthesize a concise Brain Report for the last ${horizonDays} days.
Return JSON with: highlights[], challenges[], decisions[], risks[], next_actions[]. Keep each bullet <= 18 words.`
    const user = `Recent Messages:
${recentMessages}

Existing Memory Bullets:
${memoryBullets}
`

    // 3) Generate report
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ],
        temperature: 0.2
      })
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `OpenAI error: ${await res.text()}` }, { status: 502 })
    }
    const json = await res.json()
    const report = JSON.parse(json.choices[0].message.content || '{}')

    // 4) Persist summarized insight + embedding
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

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, report, savedId: data.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
