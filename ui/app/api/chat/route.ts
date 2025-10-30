export const runtime = 'nodejs' // avoid Edge runtime issues with process.env/fetch
export const dynamic = 'force-dynamic' // avoid caching in dev

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { embedText } from '@/lib/embeddings'
import { fetchRecentContext } from '@/lib/context'

const OPENAI_MODEL = 'gpt-4o-mini'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, userId, orgId } = body as { message?: string; userId?: string; orgId?: string }
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const resolvedOrgId = orgId || process.env.APP_DEFAULT_ORG_ID!
    const resolvedUserId = userId || 'anonymous-user'

    // 1) store user message + embedding
    const userEmbedding = await embedText(message)
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('conversation_messages')
      .insert({ org_id: resolvedOrgId, user_id: resolvedUserId, role: 'user', message, embedding: userEmbedding })
      .select().single()
    if (insertErr) throw insertErr
    const sourceMessageId = inserted?.id

    // 2) build lightweight context
    const ctx = await fetchRecentContext(resolvedOrgId, resolvedUserId)
    const system = 'You are Helix, a crisp, helpful AI that tracks context and suggests actionable next steps.'
    const prompt = [
      system,
      ctx.memoryBullets ? `Recent memory:\n${ctx.memoryBullets}\n` : '',
      ctx.recentMessages ? `Conversation:\n${ctx.recentMessages}\n` : '',
      `USER: ${message}`,
      'ASSISTANT:'
    ].join('\n')

    // 3) LLM reply
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) throw new Error('OPENAI_API_KEY missing')
    const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 250 })
    })
    if (!llmRes.ok) throw new Error(`OpenAI chat error: ${await llmRes.text()}`)
    const llm = await llmRes.json()
    const reply = llm.choices?.[0]?.message?.content?.trim() || 'OK.'
    const asstEmbedding = await embedText(reply)

    // 4) store assistant reply
    const { error: insertAssistantErr } = await supabaseAdmin
      .from('conversation_messages')
      .insert({ org_id: resolvedOrgId, user_id: resolvedUserId, role: 'assistant', message: reply, embedding: asstEmbedding })
    if (insertAssistantErr) throw insertAssistantErr

    // 5) Create a condensed memory bullet + importance + embedding (never null)
    let summary = message
    try {
      const memRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'Summarize the following exchange into ONE actionable business insight bullet.' },
            { role: 'user', content: `User: ${message}\nAssistant: ${reply}` }
          ]
        })
      })
      if (memRes.ok) {
        const memJson = await memRes.json()
        summary = memJson.choices?.[0]?.message?.content?.trim() || summary
      } else {
        console.warn('[memory] summary OpenAI call failed:', await memRes.text())
      }
    } catch (e) {
      console.warn('[memory] summary generation error:', e)
    }

    const importance = scoreImportance(`${message} ${reply}`)

    // Try to embed the summary; if it fails, reuse assistant embedding
    let summaryEmbedding = asstEmbedding
    try {
      summaryEmbedding = await embedText(summary)
    } catch (e) {
      console.error('[memory] embed summary failed, falling back to assistant embedding:', e)
      summaryEmbedding = asstEmbedding
    }

    const { error: miErr } = await supabaseAdmin.from('memory_insights').insert({
      org_id: resolvedOrgId,
      user_id: resolvedUserId,
      source_message_id: sourceMessageId,
      summary,
      importance,
      embedding: summaryEmbedding
    })
    if (miErr) throw miErr

    return NextResponse.json({
      ok: true,
      reply,
      diag: {
        // these three must appear in the response
        userDim: userEmbedding.length,
        asstDim: asstEmbedding.length,
        memDim:  summaryEmbedding.length,
      }
    })
  } catch (e: any) {
    console.error('chat route error', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

function scoreImportance(text: string) {
  const normalized = text.trim()
  if (!normalized) return 0
  const wordCount = normalized.split(/\s+/).length
  if (wordCount > 120) return 3
  if (wordCount > 40) return 2
  return 1
}
