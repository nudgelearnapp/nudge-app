import { NextRequest, NextResponse } from 'next/server'

// Gemini via the native REST endpoint (works with the new AQ. keys).
// Tries a few models in order, in case one is retired or rate-limited.
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']

const BASE =
  'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Be friendly, patient, and encouraging. Explain step by step, using simple words and examples from everyday life in Assam where helpful. End by asking if they understood.'

const LANG: Record<string, string> = {
  as: `${BASE} Always respond in Assamese (অসমীয়া), written in Assamese script.`,
  hi: `${BASE} Always respond in Hindi, written in Devanagari script.`,
  en: `${BASE} Always respond in English.`,
}

type Turn = { role: string; text: string }
type Content = { role: 'user' | 'model'; parts: { text: string }[] }

// Gemini needs turns that start with the user and alternate user/model.
function buildContents(history: Turn[], question: string): Content[] {
  const out: Content[] = []
  const all = [...history, { role: 'user', text: question }]
  for (const h of all) {
    if (!h?.text) continue
    const role: 'user' | 'model' = h.role === 'user' ? 'user' : 'model'
    if (out.length === 0 && role === 'model') continue // drop leading greeting
    const last = out[out.length - 1]
    if (last && last.role === role) last.parts[0].text += `\n\n${h.text}`
    else out.push({ role, parts: [{ text: h.text }] })
  }
  return out
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const question = ((formData.get('question') as string) || '').trim() || 'Please help me understand.'
    const language = (formData.get('language') as string) || 'en'
    let history: Turn[] = []
    try {
      history = JSON.parse((formData.get('history') as string) || '[]')
    } catch {}

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY' }, { status: 500 })
    }

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: LANG[language] || LANG.en }] },
      contents: buildContents(history.slice(-10), question),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    })

    let lastError = ''
    for (const model of MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
        }
      )

      if (res.ok) {
        const data = await res.json()
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map((p: { text?: string }) => p.text || '')
          .join('')
          .trim()
        if (text) return NextResponse.json({ answer: text, model })
        lastError = `${model}: empty response ${JSON.stringify(data).slice(0, 300)}`
      } else {
        lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 300)}`
      }
      console.error('Gemini error ->', lastError)
      // 401/403 = key problem; trying other models won't help
      if (res.status === 401 || res.status === 403) break
    }

    // `detail` helps debugging during beta — remove before launch
    return NextResponse.json({ error: 'Failed to get answer', detail: lastError }, { status: 500 })
  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
