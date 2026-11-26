// Free-version daily limit, counted per phone/browser (until student login exists).
// A student who clears browser data can reset it; that's acceptable for the beta.

export const FREE_DAILY_LIMIT = 2 // AI questions per day (Ask Nudge, "Check my answer", "Explain")
export const FREE_VOICE = false // free version: no mic. Tester mode always has the mic.

const KEY = 'nudge_usage_v1'
const TESTER_KEY = 'nudge_tester'
// Open the app once with ?tester=nudge-team-2026 to switch on unlimited tester mode on that phone.
const TESTER_CODE = 'nudge-team-2026'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, phone's local date

function read(): { date: string; count: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v.date === today() ? { date: v.date, count: Number(v.count) || 0 } : { date: today(), count: 0 }
  } catch {
    return { date: today(), count: 0 }
  }
}

export function checkTesterLink() {
  try {
    const code = new URLSearchParams(window.location.search).get('tester')
    if (code === TESTER_CODE) localStorage.setItem(TESTER_KEY, '1')
    if (code === 'off') localStorage.removeItem(TESTER_KEY)
  } catch {}
}

export function isTester(): boolean {
  try {
    return localStorage.getItem(TESTER_KEY) === '1'
  } catch {
    return false
  }
}

export function remaining(): number {
  return isTester() ? Infinity : Math.max(0, FREE_DAILY_LIMIT - read().count)
}

export function canAsk(): boolean {
  return remaining() > 0
}

export function recordAsk() {
  if (isTester()) return
  try {
    const u = read()
    localStorage.setItem(KEY, JSON.stringify({ date: u.date, count: u.count + 1 }))
  } catch {}
}

export function voiceAllowed(): boolean {
  return FREE_VOICE || isTester()
}

export const LIMIT_MSG = {
  as: `আজিৰ বিনামূলীয়া প্ৰশ্ন শেষ হ'ল (দিনে ${FREE_DAILY_LIMIT} টা)। কাইলৈ আকৌ সুধিব পাৰিবা। তেতিয়ালৈকে 📘 কিতাপৰ প্ৰশ্ন আৰু 📝 পুৰণি প্ৰশ্নকাকত অনুশীলন কৰা — MCQ পৰীক্ষা সদায় বিনামূলীয়া।`,
  hi: `आज के मुफ़्त सवाल खत्म हो गए (रोज़ ${FREE_DAILY_LIMIT})। कल फिर पूछ सकते हो। तब तक 📘 Book Questions और 📝 Past Papers में अभ्यास करो — MCQ जाँच हमेशा मुफ़्त है।`,
  en: `You've used today's free questions (${FREE_DAILY_LIMIT} per day). You can ask again tomorrow. Meanwhile, practise in 📘 Book Questions and 📝 Past Papers. MCQ checking is always free.`,
}
