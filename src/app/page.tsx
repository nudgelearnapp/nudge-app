'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Language = 'as' | 'hi' | 'en'
type Message = { role: 'user' | 'ai'; text: string; imageUrl?: string }

const LANG_LABELS: Record<Language, string> = {
  as: 'অসমীয়া',
  hi: 'हिन्दी',
  en: 'English',
}

const PLACEHOLDERS: Record<Language, string> = {
  as: 'আপোনাৰ প্ৰশ্ন লিখক...',
  hi: 'अपना सवाल लिखें...',
  en: 'Type your question...',
}

const GREETINGS: Record<Language, string> = {
  as: 'নমস্কাৰ! মই Nudge, আপোনাৰ AI টিউটৰ। আজি কি পঢ়িব বিচাৰে?',
  hi: 'नमस्ते! मैं Nudge हूँ, आपका AI ट्यूटर। आज क्या पढ़ना है?',
  en: 'Hello! I\'m Nudge, your AI tutor. What would you like to study today?',
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMessages([{ role: 'ai', text: GREETINGS[language] }])
  }, [language])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string, imageFile?: File) => {
    if (!text.trim() && !imageFile) return
    setLoading(true)
    const userMsg: Message = { role: 'user', text: text || '📷 Photo question' }
    if (imageFile) userMsg.imageUrl = URL.createObjectURL(imageFile)
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setImage(null)
    setImagePreview(null)
    try {
      const formData = new FormData()
      formData.append('question', text)
      formData.append('language', language)
      formData.append('history', JSON.stringify(newMessages.slice(-6).map(m => ({ role: m.role, text: m.text }))))
      if (imageFile) formData.append('image', imageFile)
      const res = await fetch('/api/ask', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.answer) {
        const aiMsg: Message = { role: 'ai', text: data.answer }
        setMessages(prev => [...prev, aiMsg])
        await speakText(data.answer)
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const speakText = async (text: string) => {
    setSpeaking(true)
    try {
      if (language === 'en') {
        const utterance = new SpeechSynthesisUtterance(text.substring(0, 300))
        utterance.lang = 'en-IN'
        utterance.rate = 0.9
        utterance.onend = () => setSpeaking(false)
        window.speechSynthesis.speak(utterance)
        return
      }
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 300), language }),
      })
      const data = await res.json()
      if (data.useBrowser) {
        const utterance = new SpeechSynthesisUtterance(text.substring(0, 300))
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
        utterance.onend = () => setSpeaking(false)
        window.speechSynthesis.speak(utterance)
        return
      }
      if (data.audio) {
        const audioBlob = base64ToBlob(data.audio, 'audio/wav')
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        audio.onended = () => setSpeaking(false)
        await audio.play()
      }
    } catch (err) {
      console.error('Speak error:', err)
      setSpeaking(false)
    }
  }

  const base64ToBlob = (base64: string, mimeType: string) => {
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mimeType })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }
      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      alert('Microphone access needed. Please allow microphone permission.')
    }
  }

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false) }

  const transcribeAudio = async (audioBlob: Blob) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', language)
      const res = await fetch('/api/listen', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.transcript) {
        await sendMessage(data.transcript)
      } else if (data.useBrowser) {
        setMessages(prev => [...prev, { role: 'ai', text: language === 'as' ? 'অনুগ্ৰহ কৰি টাইপ কৰক অথবা পুনৰ চেষ্টা কৰক।' : language === 'hi' ? 'कृपया टाइप करें या फिर से कोशिश करें।' : 'Please type your question or try again.' }])
      }
    } catch (err) { console.error('Transcribe error:', err) }
    setLoading(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)) }
  }

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setSpeaking(false) }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      <div className="bg-green-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nudge 📚</h1>
            <p className="text-green-200 text-xs">Class 10 SEBA AI Tutor</p>
          </div>
          <div className="flex gap-1">
            {(['as', 'hi', 'en'] as Language[]).map(lang => (
              <button key={lang} onClick={() => setLanguage(lang)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${language === lang ? 'bg-white text-green-700' : 'bg-green-600 text-white hover:bg-green-500'}`}>
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-2 text-xs overflow-x-auto whitespace-nowrap">
          <span className="px-3 py-1 rounded-full bg-white text-green-700 font-medium">
            {language === 'as' ? '💬 Nudge ক সোধা' : language === 'hi' ? '💬 Nudge से पूछें' : '💬 Ask Nudge'}
          </span>
          <Link href="/book" className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500">
            {language === 'as' ? '📘 কিতাপৰ প্ৰশ্ন' : language === 'hi' ? '📘 किताब के प्रश्न' : '📘 Book Questions'}
          </Link>
          <Link href="/practice" className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500">
            {language === 'as' ? '📝 পুৰণি প্ৰশ্নকাকত' : language === 'hi' ? '📝 पुराने प्रश्नपत्र' : '📝 Past Papers'}
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'}`}>
              {msg.imageUrl && <img src={msg.imageUrl} alt="Question" className="rounded-lg mb-2 max-w-full" />}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.role === 'ai' && (
                <button onClick={() => speakText(msg.text)} className="mt-1 text-xs text-green-600 hover:text-green-800">
                  🔊 {language === 'as' ? 'শুনক' : language === 'hi' ? 'सुनें' : 'Listen'}
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
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay:'0.1s'}} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay:'0.2s'}} />
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
            <button onClick={() => { setImage(null); setImagePreview(null) }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
          </div>
        </div>
      )}
      {speaking && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <div className="flex gap-1">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-1 bg-green-500 rounded-full animate-pulse" style={{height: `${8+i*4}px`, animationDelay: `${i*0.1}s`}} />
            ))}
          </div>
          <span className="text-xs text-green-600">{language === 'as' ? 'কথা কৈ আছে...' : language === 'hi' ? 'बोल रहा है...' : 'Speaking...'}</span>
          <button onClick={stopSpeaking} className="text-xs text-red-500 ml-auto">Stop</button>
        </div>
      )}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex gap-2 items-end">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">📷</button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input, image || undefined) } }}
            placeholder={PLACEHOLDERS[language]} rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-400 max-h-24" />
          <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} disabled={loading}
            className={`p-2 rounded-full transition-all ${recording ? 'bg-red-500 text-white animate-pulse scale-110' : 'text-green-600 hover:bg-green-50'}`}>🎤</button>
          <button onClick={() => sendMessage(input, image || undefined)} disabled={loading || (!input.trim() && !image)}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-40 transition-colors">➤</button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-1">
          {language === 'as' ? '🎤 ধৰি ৰাখক · 📷 ফটো · ⌨️ টাইপ কৰক' : language === 'hi' ? '🎤 दबाएं · 📷 फोटो · ⌨️ टाइप करें' : '🎤 Hold mic · 📷 Photo · ⌨️ Type'}
        </p>
      </div>
    </div>
  )
}
