import { NextRequest, NextResponse } from 'next/server'

export const preferredRegion = 'bom1'

// Speech to text with Sarvam (saaras:v4). Sarvam needs the recording sent as a file
// (multipart form), max ~30 seconds per request.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio')
    const language = (formData.get('language') as string) || 'as'
    if (!audio || typeof audio === 'string' || audio.size === 0) {
      return NextResponse.json({ error: 'No audio received' }, { status: 400 })
    }
    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      console.error('SARVAM_API_KEY is not set')
      return NextResponse.json({ error: 'Voice is not set up' }, { status: 500 })
    }

    const body = new FormData()
    body.append('file', audio, (audio as File).name || 'recording.webm')
    body.append('model', 'saaras:v4')
    body.append('mode', 'transcribe')
    body.append('language_code', language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'as-IN')

    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.error('Sarvam STT error:', res.status, (await res.text()).slice(0, 300))
      return NextResponse.json({ error: 'Speech recognition failed' }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ transcript: (data.transcript || '').trim() })
  } catch (error) {
    console.error('STT error:', error)
    return NextResponse.json({ error: 'Failed to transcribe' }, { status: 500 })
  }
}
