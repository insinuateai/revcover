// ui/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { embedText } from '@/lib/embeddings'
import { fetchRecentContext } from '@/lib/context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const { recentMessages, memoryBullets } = await fetchRecentContext(orgId, userId)

    const system = [
      'You are Synex, an evolving company brain.',
      'Use recent conversation and memory bullets to answer with specific, actionable guidance.',
      'Bias toward revenue, speed, and clarity.',
    ].join(' ')

    const userPrompt =
`User message: ${message}

Recent conversation:
${recentMessages || '(none yet)'}

Known memory bullets:
${memoryBullets || '(none yet)'}`

    // ---- LLM reply
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

    // ---- Embeddings (both sides)
    const userEmbedding = await embedText(message)         // 1536
    const asstEmbedding = await embedText(reply)           // 1536

    // Store both convo rows
    {
      const { error } = await supabaseAdmin.from('conversation_messages').insert([
        { org_id: orgId, user_id: userId, role: 'user',      message, embedding: userEmbedding },
        { org_id: orgId, user_id: userId, role: 'assistant', message: reply,  embedding: asstEmbedding },
      ])
      if (error) throw error
    }

    // ---- Condensed memory bullet (never-null embedding)
    let summary = message
    try {
      const memRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'Summarize the following exchange into ONE actionable business insight bullet.' },
            { role: 'user', content: `User: ${message}\nAssistant: ${reply}` },
          ],
        }),
      })
      if (memRes.ok) {
        const j = await memRes.json()
        summary = j.choices?.[0]?.message?.content?.trim() || summary
      } else {
        console.warn('[memory] summary OpenAI call failed:', await memRes.text())
      }
    } catch (e) {
      console.warn('[memory] summary generation error:', e)
    }

    const importance = scoreImportance(message + ' ' + reply)

    // Try summary embedding; if anything fails, fall back to assistant embedding (so it's never NULL)
    let summaryEmbedding: number[] = asstEmbedding
    try {
      const vec = await embedText(summary || reply || message)
      if (Array.isArray(vec) && vec.length === asstEmbedding.length) summaryEmbedding = vec
      else console.warn('[memory] summary embed dimension mismatch; using assistant embedding fallback')
    } catch (e) {
      console.error('[memory] embed summary failed; using assistant embedding fallback:', e)
    }

    {
      const { error } = await supabaseAdmin.from('memory_insights').insert({
        org_id: orgId,
        user_id: userId,
        summary,
        importance,
        embedding: summaryEmbedding,
      })
      if (error) throw error
    }

    // Diagnostics (vector lengths) in response for quick confirmation
    return NextResponse.json({
      ok: true,
      reply,
      diag: {
        userDim: userEmbedding.length,
        asstDim: asstEmbedding.length,
        memDim:  summaryEmbedding.length,
      }
    })
  } catch (e: any) {
    console.error('chat route error', e)
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
