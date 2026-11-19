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

    let promptText = `${systemPrompt}\n\n`
    if (historyText) promptText += `Previous conversation:\n${historyText}\n\n`
    promptText += `Student's question: ${question || 'Please explain what you see in this image'}`

    const parts: object[] = [{ text: promptText }]

    if (imageFile) {
      const imageBytes = await imageFile.arrayBuffer()
      parts.push({
        inlineData: {
          data: Buffer.from(imageBytes).toString('base64'),
          mimeType: imageFile.type,
        },
      })
    }

    const apiKey = process.env.GEMINI_API_KEY!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
    return NextResponse.json({ answer: text })

  } catch (error) {
    console.error('Gemini error:', error)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
