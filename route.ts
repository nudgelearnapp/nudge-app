import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json()

    // Sarvam TTS for Assamese and Hindi
    // For English we use browser Web Speech API (handled on frontend)
    const langMap: Record<string, string> = {
      as: 'as-IN',
      hi: 'hi-IN',
    }

    const targetLang = langMap[language]
    if (!targetLang) {
      return NextResponse.json({ useBrowser: true })
    }

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        inputs: [text.substring(0, 500)], // Sarvam limit
        target_language_code: targetLang,
        speaker: language === 'as' ? 'anushka' : 'meera',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v1',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Sarvam TTS error:', err)
      return NextResponse.json({ useBrowser: true })
    }

    const data = await response.json()
    const audioBase64 = data.audios?.[0]

    if (!audioBase64) {
      return NextResponse.json({ useBrowser: true })
    }

    return NextResponse.json({ audio: audioBase64 })

  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json({ useBrowser: true })
  }
}
