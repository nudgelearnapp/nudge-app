'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { canAsk, recordAsk, remaining, voiceAllowed, checkTesterLink, LIMIT_MSG, FREE_DAILY_LIMIT } from '@/lib/usage'

type Language = 'as' | 'hi' | 'en'
type Message = { role: 'user' | 'ai'; text: string; imageUrl?: string }

const LANG_LABELS: Record<Language, string> = { as: 'অসমীয়া', hi: 'हिन्दी', en: 'English' }

const PLACEHOLDERS: Record<Language, string> = {
  as: 'তোমাৰ প্ৰশ্ন লিখা...',
  hi: 'अपना सवाल लिखो...',
  en: 'Type your question...',
}

const GREETINGS: Record<Language, string> = {
  as: 'নমস্কাৰ! মই Nudge, তোমাৰ পঢ়া-শুনাৰ সংগী। বিজ্ঞানৰ যিকোনো প্ৰশ্ন সোধা — অসমীয়াত বা English আখৰত লিখিব পাৰা।',
  hi: 'नमस्ते! मैं Nudge हूँ, तुम्हारा पढ़ाई का साथी। कक्षा 10 की किताबों से कोई भी सवाल पूछो।',
  en: "Hello! I'm Nudge, your study buddy. Ask me any question from your Class 10 books.",
}

const T = {
  ask: { as: '💬 Nudge ক সোধা', hi: '💬 Nudge से पूछो', en: '💬 Ask Nudge' },
  book: { as: '📘 কিতাপৰ প্ৰশ্ন', hi: '📘 Book Questions', en: '📘 Book Questions' },
  papers: { as: '📝 পুৰণি প্ৰশ্নকাকত', hi: '📝 Past Papers', en: '📝 Past Papers' },
  left: { as: 'আজি বাকী থকা প্ৰশ্ন', hi: 'आज बचे सवाल', en: 'Questions left today' },
  listen: { as: 'শুনক', hi: 'सुनो', en: 'Listen' },
  speaking: { as: 'কথা কৈ আছে...', hi: 'बोल रहा है...', en: 'Speaking...' },
  recording: { as: 'ক’ব পাৰা... শেষ হ’লে ⏹ টিপা', hi: 'अब बोलो... खत्म होने पर ⏹ दबाओ', en: 'Speak now... tap ⏹ when done' },
  micError: { as: 'মাত বুজিব পৰা নগ’ল। অনুগ্ৰহ কৰি টাইপ কৰা অথবা আকৌ চেষ্টা কৰা।', hi: 'आवाज़ समझ नहीं आई। कृपया टाइप करो या फिर से कोशिश करो।', en: "Sorry, I couldn't catch that. Please type your question or try again." },
  error: { as: 'কিবা ভুল হ’ল। আকৌ চেষ্টা কৰা।', hi: 'कुछ गड़बड़ हो गई। फिर से कोशिश करो।', en: 'Something went wrong. Please try again.' },
  hint: { as: '📷 ফটো · ⌨️ টাইপ', hi: '📷 फोटो · ⌨️ टाइप', en: '📷 Photo · ⌨️ Type' },
  hintMic: { as: '🎤 কোৱা · 📷 ফটো · ⌨️ টাইপ', hi: '🎤 बोलो · 📷 फोटो · ⌨️ टाइप', en: '🎤 Speak · 📷 Photo · ⌨️ Type' },
}

const MAX_RECORD_MS = 28000 // Sarvam accepts up to 30 seconds per request

// Shrinks phone photos (often 3–5 MB) to ~200 KB so they upload fast on mobile data
async function shrinkImage(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8))
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('as')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [left, setLeft] = useState<number>(FREE_DAILY_LIMIT)
  const [micOn, setMicOn] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkTesterLink()
    setLeft(remaining())
    setMicOn(voiceAllowed())
    try {
      const saved = localStorage.getItem('nudge_lang')
      if (saved === 'as' || saved === 'hi' || saved === 'en') setLanguage(saved)
    } catch {}
  }, [])

  useEffect(() => {
    setMessages([{ role: 'ai', text: GREETINGS[language] }])
    try {
      localStorage.setItem('nudge_lang', language)
    } catch {}
  }, [language])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string, imageFile?: File) => {
    if (!text.trim() && !imageFile) return
    const userMsg: Message = { role: 'user', text: text || '📷' }
    if (imageFile) userMsg.imageUrl = URL.createObjectURL(imageFile)
    const newMessages = [...messages, userMsg]
    setInput('')
    setImage(null)
    setImagePreview(null)

    if (!canAsk()) {
      setMessages([...newMessages, { role: 'ai', text: LIMIT_MSG[language] }])
      return
    }

    setMessages(newMessages)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('question', text)
      formData.append('language', language)
      formData.append('history', JSON.stringify(newMessages.slice(-6).map((m) => ({ role: m.role, text: m.text }))))
      if (imageFile) formData.append('image', await shrinkImage(imageFile))
      const res = await fetch('/api/ask', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.answer) {
        recordAsk()
        setLeft(remaining())
        setMessages((prev) => [...prev, { role: 'ai', text: data.answer }])
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: T.error[language] }])
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: 'ai', text: T.error[language] }])
    }
    setLoading(false)
  }

  // English and Hindi answers are read aloud by the phone's own voice (free). Assamese is not read aloud.
  const speakText = (text: string) => {
    if (language === 'as' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 600))
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.9
    utterance.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const startRecording = async () => {
    if (!canAsk()) {
      setMessages((prev) => [...prev, { role: 'ai', text: LIMIT_MSG[language] }])
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = mediaRecorder.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
        await transcribeAudio(new Blob(audioChunksRef.current, { type }), ext)
      }
      mediaRecorder.start()
      setRecording(true)
      stopTimerRef.current = setTimeout(stopRecording, MAX_RECORD_MS)
    } catch {
      alert(language === 'as' ? 'মাইক্ৰ’ফ’নৰ অনুমতি দিয়া।' : language === 'hi' ? 'माइक्रोफ़ोन की अनुमति दो।' : 'Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setRecording(false)
  }

  const transcribeAudio = async (audioBlob: Blob, ext: string) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${ext}`)
      formData.append('language', language)
      const res = await fetch('/api/listen', { method: 'POST', body: formData })
      const data = await res.json()
      setLoading(false)
      if (data.transcript) {
        await sendMessage(data.transcript)
        return
      }
      setMessages((prev) => [...prev, { role: 'ai', text: T.micError[language] }])
    } catch (err) {
      console.error('Transcribe error:', err)
      setMessages((prev) => [...prev, { role: 'ai', text: T.micError[language] }])
    }
    setLoading(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      <div className="bg-green-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nudge 📚</h1>
            <p className="text-green-200 text-xs">Class 10 · ASSEB (SEBA)</p>
          </div>
          <div className="flex gap-1">
            {(['as', 'hi', 'en'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  language === lang ? 'bg-white text-green-700' : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-2 text-xs overflow-x-auto whitespace-nowrap">
          <span className="px-3 py-1 rounded-full bg-white text-green-700 font-medium">{T.ask[language]}</span>
          <Link href="/book" className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500">
            {T.book[language]}
          </Link>
          <Link href="/practice" className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500">
            {T.papers[language]}
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
              }`}
            >
              {msg.imageUrl && <img src={msg.imageUrl} alt="Question" className="rounded-lg mb-2 max-w-full" />}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.role === 'ai' && language !== 'as' && i > 0 && (
                <button onClick={() => speakText(msg.text)} className="mt-1 text-xs text-green-600 hover:text-green-800">
                  🔊 {T.listen[language]}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {imagePreview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Selected" className="h-20 rounded-lg border border-gray-200" />
            <button
              onClick={() => {
                setImage(null)
                setImagePreview(null)
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {speaking && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <span className="text-xs text-green-600">{T.speaking[language]}</span>
          <button onClick={stopSpeaking} className="text-xs text-red-500 ml-auto">
            Stop
          </button>
        </div>
      )}
      {recording && <p className="px-4 pb-1 text-xs text-red-600">{T.recording[language]}</p>}

      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
          >
            📷
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input, image || undefined)
              }
            }}
            placeholder={PLACEHOLDERS[language]}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-400 max-h-24"
          />
          {micOn && (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={`p-2 rounded-full transition-all ${
                recording ? 'bg-red-500 text-white animate-pulse' : 'text-green-600 hover:bg-green-50'
              }`}
            >
              {recording ? '⏹' : '🎤'}
            </button>
          )}
          <button
            onClick={() => sendMessage(input, image || undefined)}
            disabled={loading || (!input.trim() && !image)}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            ➤
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-1">
          {micOn ? T.hintMic[language] : T.hint[language]}
          {Number.isFinite(left) && (
            <span className="ml-2 text-green-700">
              · {T.left[language]}: {left}/{FREE_DAILY_LIMIT}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
