'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import papersData from '@/data/papers.json'
import bookData from '@/data/book-questions.json'

type Lang = 'as' | 'en'
type Option = { label: string; en?: string; as: string }
type Question = {
  id: string
  source: string
  year?: number
  no: number
  section?: string
  marks?: number
  chapter?: number
  page?: number
  answer?: string
  en?: string
  as: string
  options?: Option[]
  keyAnswer?: string
}

const PAPER_QS = (papersData as { questions: Question[] }).questions
const BOOK_QS = (bookData as { questions: Question[] }).questions

const CHAPTERS: Record<number, { as: string; en: string }> = {
  1: { as: 'ৰাসায়নিক বিক্ৰিয়া আৰু সমীকৰণ', en: 'Chemical Reactions and Equations' },
  2: { as: 'এছিড, ক্ষাৰক আৰু লৱণ', en: 'Acids, Bases and Salts' },
  3: { as: 'ধাতু আৰু অধাতু', en: 'Metals and Non-metals' },
  4: { as: 'কাৰ্বন আৰু তাৰ যৌগ', en: 'Carbon and its Compounds' },
  5: { as: 'মৌলৰ পৰ্যাবৃত্ত শ্ৰেণীবিভাজন', en: 'Periodic Classification of Elements' },
  6: { as: 'জীৱন প্ৰক্ৰিয়া', en: 'Life Processes' },
  7: { as: 'নিয়ন্ত্ৰণ আৰু সমন্বয়', en: 'Control and Coordination' },
  8: { as: 'জীৱই কেনেকৈ বংশবিস্তাৰ কৰে?', en: 'How do Organisms Reproduce?' },
  9: { as: 'বংশগতি আৰু ক্ৰমবিকাশ', en: 'Heredity and Evolution' },
  10: { as: 'পোহৰ: প্ৰতিফলন আৰু প্ৰতিসৰণ', en: 'Light: Reflection and Refraction' },
  11: { as: 'মানুহৰ চকু আৰু বাৰেবৰণীয়া পৃথিৱী', en: 'The Human Eye and the Colourful World' },
  12: { as: 'বিদ্যুত', en: 'Electricity' },
  13: { as: 'বিদ্যুত-প্ৰবাহৰ চুম্বকীয় ক্ৰিয়া', en: 'Magnetic Effects of Electric Current' },
  14: { as: 'শক্তিৰ উৎসসমূহ', en: 'Sources of Energy' },
  15: { as: 'আমাৰ পৰিবেশ', en: 'Our Environment' },
  16: { as: 'প্ৰাকৃতিক সম্পদৰ ব্যৱস্থাপনা', en: 'Management of Natural Resources' },
}

const T = {
  title: { as: 'অনুশীলন', en: 'Practice' },
  ask: { as: '💬 Nudge ক সোধা', en: '💬 Ask Nudge' },
  pastPapers: { as: '📝 পুৰণি প্ৰশ্নকাকত', en: '📝 Past Papers' },
  bookQs: { as: '📘 কিতাপৰ প্ৰশ্ন', en: '📘 Book Questions' },
  correct: { as: '✅ শুদ্ধ!', en: '✅ Correct!' },
  wrong: { as: '❌ শুদ্ধ নহয়। শুদ্ধ উত্তৰ', en: '❌ Not quite. The correct answer is' },
  fromBook: { as: '(কিতাপৰ উত্তৰমালা অনুসৰি)', en: '(from the textbook answer key)' },
  question: { as: 'প্ৰশ্ন', en: 'Q' },
  page: { as: 'পৃষ্ঠা', en: 'p.' },
  sampleBook: { as: 'নতুন অধ্যায়ৰ প্ৰশ্ন ক্ৰমে যোগ কৰা হৈছে', en: 'Questions for more chapters are being added' },
  allYears: { as: 'সকলো বছৰ', en: 'All years' },
  allChapters: { as: 'সকলো অধ্যায়', en: 'All chapters' },
  mcq: { as: 'ক-শাখা (MCQ)', en: 'Section A (MCQ)' },
  written: { as: 'খ-শাখা (লিখিত)', en: 'Section B (written)' },
  marks: { as: 'নম্বৰ', en: 'marks' },
  check: { as: 'উত্তৰ পৰীক্ষা কৰা', en: 'Check my answer' },
  explain: { as: 'বুজাই দিয়া', en: 'Explain' },
  writeHere: { as: 'তোমাৰ উত্তৰ ইয়াত লিখা...', en: 'Write your answer here...' },
  pickFirst: { as: 'প্ৰথমে এটা বিকল্প বাছি লোৱা', en: 'Pick an option first' },
  thinking: { as: 'Nudge এ ভাবি আছে...', en: 'Nudge is thinking...' },
  none: { as: 'এই বাছনিত কোনো প্ৰশ্ন নাই', en: 'No questions for this selection' },
  comingSoon: { as: 'এই অধ্যায়ৰ প্ৰশ্নবোৰ সোনকালে যোগ কৰা হ’ব। তেতিয়ালৈকে “Nudge ক সোধা” ত এই অধ্যায়ৰ যিকোনো প্ৰশ্ন সুধিব পাৰা।', en: 'Questions for this chapter are coming soon. Meanwhile, you can ask Nudge anything about this chapter in “Ask Nudge”.' },
  sample: { as: 'নমুনা: এতিয়ালৈ কেইটামান প্ৰশ্নহে যোগ কৰা হৈছে', en: 'Sample: only a few questions added so far' },
  error: { as: 'কিবা ভুল হ’ল। আকৌ চেষ্টা কৰা।', en: 'Something went wrong. Please try again.' },
}

function chapterName(n: number | undefined, lang: Lang) {
  if (!n || !CHAPTERS[n]) return ''
  return `${lang === 'as' ? 'অধ্যায়' : 'Ch'} ${n}: ${CHAPTERS[n][lang]}`
}

async function askNudge(prompt: string, lang: Lang): Promise<string> {
  const formData = new FormData()
  formData.append('question', prompt)
  formData.append('language', lang)
  formData.append('history', '[]')
  const res = await fetch('/api/ask', { method: 'POST', body: formData })
  const json = await res.json()
  if (!json.answer) throw new Error(json.error || 'No answer')
  return json.answer as string
}

function QuestionCard({ q, lang }: { q: Question; lang: Lang }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [written, setWritten] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const isMcq = !!q.options?.length
  const isBook = q.source === 'book'
  const header = isBook
    ? `Class 10 Science textbook, Chapter ${q.chapter}, exercise question ${q.no}`
    : `HSLC ${q.year}, Question ${q.no} (${q.marks} ${q.marks === 1 ? 'mark' : 'marks'})`
  const marksText = q.marks ? ` ${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}` : ' marks'
  const fullQuestion =
    (q.en || q.as) +
    (isMcq ? '\n' + q.options!.map((o) => `(${o.label}) ${o.en || o.as}`).join('\n') : '') +
    (q.keyAnswer ? `\n\n[Textbook answer key: ${q.keyAnswer}]` : '')

  const run = async (prompt: string) => {
    setBusy(true)
    setReply('')
    try {
      setReply(await askNudge(prompt, lang))
    } catch {
      setReply(T.error[lang])
    }
    setBusy(false)
  }

  const check = () => {
    if (isMcq) {
      if (!picked) return setReply(T.pickFirst[lang])
      const o = q.options!.find((x) => x.label === picked)!
      if (q.answer) {
        const right = q.options!.find((x) => x.label === q.answer)
        return setReply(
          picked === q.answer
            ? `${T.correct[lang]} ${T.fromBook[lang]}`
            : `${T.wrong[lang]} (${q.answer}) ${right ? right[lang] || right.as : ''} ${T.fromBook[lang]}`
        )
      }
      run(
        `${header}\n${fullQuestion}\n\nThe student chose option (${picked}) ${o.en || o.as}. ` +
          `Say clearly whether this is correct. If it is wrong, give the correct option. ` +
          `Then explain why in 2 to 4 short sentences, based on the textbook.`
      )
    } else {
      if (!written.trim()) return
      run(
        `${header}\n${fullQuestion}\n\nThe student's answer:\n"""${written.trim()}"""\n\n` +
          `Check this answer like a fair HSLC examiner. If a textbook answer key is given above, treat it as correct unless it is clearly a misprint.${q.marks ? ` Give a score out of ${q.marks}.` : ''} ` +
          `Say what is correct, what is missing or wrong, and what to add to get full marks. Be encouraging. ` +
          `Do not just give the whole model answer unless the student's answer is mostly wrong.`
      )
    }
  }

  const explain = () =>
    run(
      `${header}\n${fullQuestion}\n\nExplain how to answer this question to score full${marksText}. ` +
        `Give the correct answer${isMcq ? ' option' : ''}${q.answer ? ` (the textbook answer key says (${q.answer}))` : ''} and a short explanation based on the textbook.`
    )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="font-semibold text-green-700">
          {isBook ? `${T.question[lang]} ${q.no}` : `${q.year} · Q${q.no}`}
        </span>
        {isBook ? (
          q.page && <span>{T.page[lang]} {q.page}</span>
        ) : (
          <span>
            {q.marks} {T.marks[lang]}
          </span>
        )}
      </div>
      {q.chapter && !isBook && <p className="text-[11px] text-gray-400 mb-1">{chapterName(q.chapter, lang)}</p>}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{q[lang] || q.as}</p>

      {isMcq ? (
        <div className="mt-3 space-y-2">
          {q.options!.map((o) => (
            <button
              key={o.label}
              onClick={() => setPicked(o.label)}
              className={`w-full text-left text-sm rounded-xl border px-3 py-2 transition-colors ${
                picked === o.label ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="font-semibold mr-2">({o.label})</span>
              {o[lang] || o.as}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={written}
          onChange={(e) => setWritten(e.target.value)}
          placeholder={T.writeHere[lang]}
          rows={4}
          className="mt-3 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-400"
        />
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={check}
          disabled={busy}
          className="flex-1 bg-green-600 text-white text-sm rounded-xl py-2 hover:bg-green-700 disabled:opacity-40"
        >
          {T.check[lang]}
        </button>
        <button
          onClick={explain}
          disabled={busy}
          className="flex-1 border border-green-600 text-green-700 text-sm rounded-xl py-2 hover:bg-green-50 disabled:opacity-40"
        >
          {T.explain[lang]}
        </button>
      </div>

      {(busy || reply) && (
        <div className="mt-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {busy ? T.thinking[lang] : reply}
        </div>
      )}
    </div>
  )
}

export default function PracticeView({ mode }: { mode: 'book' | 'papers' }) {
  const isBook = mode === 'book'
  const ALL = isBook ? BOOK_QS : PAPER_QS
  const [lang, setLang] = useState<Lang>('as')
  const [year, setYear] = useState<number | 'all'>('all')
  const [section, setSection] = useState<'A' | 'B'>('A')
  const years = useMemo(() => [...new Set(ALL.map((q) => q.year).filter((y): y is number => !!y))].sort((a, b) => b - a), [ALL])
  const loaded = useMemo(() => new Set(ALL.map((q) => q.chapter).filter((c): c is number => !!c)), [ALL])
  // Book mode lists all 16 chapters (students can jump to any); papers list only chapters that have questions
  const chapters = useMemo(
    () => (isBook ? Object.keys(CHAPTERS).map(Number) : [...loaded]).sort((a, b) => a - b),
    [isBook, loaded]
  )
  const [chapter, setChapter] = useState<number | 'all'>(isBook ? chapters[0] ?? 'all' : 'all')

  const list = ALL.filter(
    (q) =>
      (isBook || q.section === section) &&
      (isBook || year === 'all' || q.year === year) &&
      (chapter === 'all' || q.chapter === chapter)
  ).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (isBook ? (a.chapter ?? 0) - (b.chapter ?? 0) : 0) || a.no - b.no)

  const tab = (href: string, label: string, active: boolean) =>
    active ? (
      <span className="px-3 py-1 rounded-full bg-white text-green-700 font-medium">{label}</span>
    ) : (
      <Link href={href} className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500">
        {label}
      </Link>
    )

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      <div className="bg-green-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nudge 📚</h1>
            <p className="text-green-200 text-xs">{T.title[lang]} · {isBook ? 'বিজ্ঞান (Science)' : 'HSLC General Science'}</p>
          </div>
          <div className="flex gap-1">
            {(['as', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  lang === l ? 'bg-white text-green-700' : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {l === 'as' ? 'অসমীয়া' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-2 text-xs overflow-x-auto whitespace-nowrap">
          {tab('/', T.ask[lang], false)}
          {tab('/book', T.bookQs[lang], isBook)}
          {tab('/practice', T.pastPapers[lang], !isBook)}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
        {!isBook && (
          <div className="flex gap-2">
            {(['A', 'B'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex-1 text-xs rounded-lg py-2 border ${
                  section === s ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600'
                }`}
              >
                {s === 'A' ? T.mcq[lang] : T.written[lang]}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {!isBook && (
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="flex-1 text-xs rounded-lg border border-gray-200 px-2 py-2 bg-white"
            >
              <option value="all">{T.allYears[lang]}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  HSLC {y}
                </option>
              ))}
            </select>
          )}
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="flex-1 text-xs rounded-lg border border-gray-200 px-2 py-2 bg-white"
          >
            {!isBook && <option value="all">{T.allChapters[lang]}</option>}
            {chapters.map((c) => (
              <option key={c} value={c}>
                {chapterName(c, lang)}
                {isBook && !loaded.has(c) ? (lang === 'as' ? ' (সোনকালে)' : ' (coming soon)') : ''}
              </option>
            ))}
          </select>
        </div>
        {(!isBook || loaded.size < Object.keys(CHAPTERS).length) && (
          <p className="text-[11px] text-amber-600">{isBook ? T.sampleBook[lang] : T.sample[lang]}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {list.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-8 px-6">
            {isBook && chapter !== 'all' && !loaded.has(chapter) ? T.comingSoon[lang] : T.none[lang]}
          </p>
        ) : (
          list.map((q) => <QuestionCard key={q.id} q={q} lang={lang} />)
        )}
      </div>
    </div>
  )
}
