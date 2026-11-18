import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'as'

    const langMap: Record<string, string> = {
      as: 'as-IN',
      hi: 'hi-IN',
      en: 'en-IN',
    }

    const targetLang = langMap[language] || 'as-IN'
    const audioBytes = await audioFile.arrayBuffer()
    const audioBase64 = Buffer.from(audioBytes).toString('base64')

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        model: 'saarika:v2',
        language_code: targetLang,
        audio: audioBase64,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Sarvam STT error:', err)
      return NextResponse.json({ error: 'Speech recognition failed', useBrowser: true }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ transcript: data.transcript || '' })

  } catch (error) {
    console.error('STT error:', error)
    return NextResponse.json({ error: 'Failed to transcribe', useBrowser: true }, { status: 500 })
  }
}
