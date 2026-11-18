import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const question = formData.get('question') as string
    const language = formData.get('language') as string || 'en'
    const imageFile = formData.get('image') as File | null
    const history = JSON.parse(formData.get('history') as string || '[]')

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const langInstructions: Record<string, string> = {
      as: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in Assamese (অসমীয়া). Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
      hi: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in Hindi. Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
      en: 'You are Nudge, an AI tutor for Class 10 SEBA board students in Assam. Always respond in English. Be friendly, patient, and encouraging like a good tutor. Explain step by step. After explaining, ask the student if they understood. Keep responses concise and clear.',
    }

    const systemPrompt = langInstructions[language] || langInstructions['en']
    const historyText = history.map((h: {role: string, text: string}) =>
      `${h.role === 'user' ? 'Student' : 'Nudge'}: ${h.text}`
    ).join('\n')

    let prompt = `${systemPrompt}\n\n`
    if (historyText) prompt += `Previous conversation:\n${historyText}\n\n`
    prompt += `Student's question: ${question || 'Please explain what you see in this image'}`

    let result
    if (imageFile) {
      const imageBytes = await imageFile.arrayBuffer()
      const imageData = {
        inlineData: {
          data: Buffer.from(imageBytes).toString('base64'),
          mimeType: imageFile.type,
        },
      }
      result = await model.generateContent([prompt, imageData])
    } else {
      result = await model.generateContent(prompt)
    }

    const text = result.response.text()
    return NextResponse.json({ answer: text })

  } catch (error) {
    console.error('Gemini error:', error)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
