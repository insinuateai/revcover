import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { embedText } from '@/lib/embeddings'
import { fetchRecentContext } from '@/lib/context'

const MODEL = 'gpt-4o-mini'

function scoreImportance(text: string): number {
  const high = /(revenue|blocked|deadline|contract|customer|launch|outage|critical)/i.test(text)
  const med  = /(plan|roadmap|todo|next step|improve|optimize|experiment)/i.test(text)
  return high ? 3 : med ? 2 : 1
}

export async function POST(req: Request) {
  try {
    const { message, userId, orgId } = await req.json()
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })
    }
    if (!message || !userId || !orgId) {
      return NextResponse.json({ error: 'message, userId, orgId required' }, { status: 400 })
    }

    // 1) Retrieve recent context + memory
    const { recentMessages, memoryBullets } = await fetchRecentContext(orgId, userId)

    const system = [
      'You are Synex, an evolving company brain.',
      'Use recent conversation and memory bullets to answer with specific, actionable guidance.',
      'Bias toward revenue, speed, and clarity.'
    ].join(' ')

    const userPrompt =
`User message: ${message}

Recent conversation:
${recentMessages || '(none yet)'}

Known memory bullets:
${memoryBullets || '(none yet)'}`

    // 2) Generate assistant reply
    const ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    if (!ai.ok) return NextResponse.json({ error: `OpenAI error: ${await ai.text()}` }, { status: 500 })
    const aiJson = await ai.json()
    const reply: string = aiJson.choices?.[0]?.message?.content ?? 'No reply generated.'

    // 3) Embed BOTH messages
    const userEmbedding = await embedText(message)
    const asstEmbedding = await embedText(reply)

    // 4) Insert both convo rows with embeddings
    const { error: cmErr } = await supabaseAdmin.from('conversation_messages').insert([
      { org_id: orgId, user_id: userId, role: 'user',      message, embedding: userEmbedding },
      { org_id: orgId, user_id: userId, role: 'assistant', message: reply,  embedding: asstEmbedding },
    ])
    if (cmErr) throw cmErr

    // 5) Create a condensed memory bullet + importance + embedding
    const memRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Compress the following exchange into ONE actionable bullet for future retrieval.' },
          { role: 'user', content: `Message:\n${message}\n\nAssistant reply:\n${reply}` }
        ],
      }),
    })
    const memJson = await memRes.json()
    const summary: string = memJson.choices?.[0]?.message?.content?.trim() || message
    const importance = scoreImportance(message + ' ' + reply)
    const summaryEmbedding = await embedText(summary)

    const { error: miErr } = await supabaseAdmin.from('memory_insights').insert({
      org_id: orgId,
      user_id: userId,
      summary,
      importance,
      embedding: summaryEmbedding,
    })
    if (miErr) throw miErr

    return NextResponse.json({ ok: true, reply })
  } catch (e: any) {
    console.error('chat route error', e)
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
