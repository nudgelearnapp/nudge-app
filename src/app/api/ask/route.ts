import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const question = formData.get('question') as string
    const language = formData.get('language') as string || 'en'
    const imageFile = formData.get('image') as File | null
    const history = JSON.parse(formData.get('history') as string || '[]')

    const langInstructions: Record<string, string> = {
      as: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in Assamese (অসমীয়া). Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
      hi: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in Hindi. Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
      en: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in English. Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
    }

    const systemPrompt = langInstructions[language] || langInstructions['en']
    const historyText = history.map((h: {role: string, text: string}) =>
      `${h.role === 'user' ? 'Student' : 'Nudge'}: ${h.text}`
    ).join('\n')

    let userMessage = question || 'Please explain what you see in this image'
    if (historyText) userMessage = `Previous conversation:\n${historyText}\n\nStudent: ${userMessage}`

    const messages: object[] = [{ role: 'user', content: userMessage }]

    if (imageFile) {
      const imageBytes = await imageFile.arrayBuffer()
      const base64 = Buffer.from(imageBytes).toString('base64')
      messages[0] = {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64}` } }
        ]
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nudge-app-mu.vercel.app',
        'X-Title': 'Nudge AI Tutor',
      },
      body: JSON.stringify({
        model: 'google/gemma-4-31b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
    return NextResponse.json({ answer: text })

  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
