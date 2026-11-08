// Small Arabic text utilities used by the local (rule-based) analyzer.

const DIACRITICS = /[ً-ْٰـ]/g

/** Removes tashkeel and tatweel and unifies letter variants for comparison only. */
export function normalize(text: string): string {
  return text
    .replace(DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, '')
}

export const STOPWORDS = new Set(
  [
    'في', 'من', 'على', 'الى', 'إلى', 'عن', 'مع', 'هو', 'هي', 'هم', 'هن', 'ان', 'أن', 'إن', 'كان', 'كانت',
    'التي', 'الذي', 'الذين', 'اللذان', 'اللتان', 'هذا', 'هذه', 'ذلك', 'تلك', 'هناك', 'هنا', 'ثم', 'او', 'أو',
    'و', 'ف', 'ب', 'ل', 'ك', 'لا', 'ما', 'لم', 'لن', 'قد', 'كل', 'بعض', 'عند', 'عندما', 'حيث', 'بين', 'حتى',
    'ايضا', 'أيضا', 'أيضاً', 'كما', 'لكن', 'بل', 'اذا', 'إذا', 'وهو', 'وهي', 'فهو', 'فهي', 'يتم', 'تتم', 'به',
    'بها', 'له', 'لها', 'منه', 'منها', 'فيه', 'فيها', 'عليه', 'عليها', 'اي', 'أي', 'التى', 'الى', 'بعد', 'قبل',
    'خلال', 'داخل', 'خارج', 'نحو', 'جدا', 'جداً', 'يكون', 'تكون', 'يعد', 'تعد', 'يعتبر', 'تعتبر', 'عبارة',
    'يسمى', 'تسمى', 'يطلق', 'اسم', 'ذات', 'ذو', 'غير', 'أكثر', 'اكثر', 'أقل', 'اقل', 'مثل', 'منذ', 'لدى',
    'وذلك', 'وفي', 'ومن', 'وعلى', 'كذلك', 'هما', 'نحن', 'انت', 'أنت', 'يمكن', 'تستطيع', 'يستطيع', 'تقوم', 'يقوم',
    'the', 'a', 'an', 'of', 'and', 'is', 'are', 'to', 'in',
  ].map(normalize),
)

/** Splits text into trimmed sentences, removing list markers. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!؟?])\s+|\n+/)
    .map(cleanLine)
    .filter((s) => s.length > 0)
}

export function cleanLine(line: string): string {
  return line
    .replace(/^\s*(?:[-•*–]|\d+[.)\-]|[٠-٩]+[.)\-]|[أ-ي][.)\-](?=\s))\s*/u, '')
    .replace(/\*\*/g, '')
    .replace(/[.!؟?]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function words(text: string): string[] {
  return text
    .replace(/[.,،؛;:!؟?()«»"'\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function contentWords(text: string): string[] {
  return words(text).filter((w) => {
    const n = normalize(w)
    return n.length >= 3 && !STOPWORDS.has(n) && !/^\d+$/.test(n)
  })
}

/** Jaccard-like overlap between two texts, on normalised content words. */
export function overlap(a: string, b: string): number {
  const A = new Set(contentWords(a).map(normalize))
  const B = new Set(contentWords(b).map(normalize))
  if (A.size === 0 || B.size === 0) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / Math.min(A.size, B.size)
}

export function includesNormalized(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle))
}

/** Splits a comma/«و» separated list: "الفم، المريء، والمعدة" → [الفم, المريء, المعدة] */
export function splitList(text: string): string[] {
  return text
    .split(/[،,؛;]|\s+ثم\s+|\s+و(?=ال)/)
    .map((s) => cleanLine(s).replace(/^(?:و|ثم)\s*/u, '').replace(/^و(?=ال)/u, ''))
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

export function truncateWords(text: string, max: number): string {
  const w = text.split(/\s+/)
  return w.length <= max ? text : w.slice(0, max).join(' ') + '…'
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Deterministic PRNG so the same lesson always produces the same game set. */
export function seededRandom(seedText: string): () => number {
  let h = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

const ICONS: [RegExp, string][] = [
  [/شمس|نجم/, '☀️'], [/قمر/, '🌙'], [/كوكب|كواكب|المريخ|المشتري|زحل|عطارد|الزهره|اورانوس|نبتون/, '🪐'],
  [/الارض|ارض/, '🌍'], [/فضاء|مجره|صاروخ/, '🚀'], [/ماء|مياه|بحر|محيط|نهر/, '💧'], [/مطر|امطار|هطول/, '🌧️'],
  [/سحاب|سحب|غيوم|تكاثف/, '☁️'], [/تبخر|بخار|حراره|حرار/, '♨️'], [/نبات|نباتات|ورقه|اوراق|جذر|جذور|ساق|زهره|بذور|بذره/, '🌱'],
  [/شجر/, '🌳'], [/فم|اسنان|سن/, '🦷'], [/لعاب|غدد/, '💦'], [/معده/, '🫃'], [/امعاء|الامعاء/, '🌀'], [/مريء/, '⬇️'],
  [/قلب|دم|شريان|وريد/, '❤️'], [/رئه|رئتين|تنفس|اكسجين/, '🫁'], [/دماغ|مخ|عصب/, '🧠'], [/عظم|هيكل/, '🦴'],
  [/حيوان|حيوانات|ثدي|طيور|طائر/, '🐾'], [/خليه|خلايا/, '🔬'], [/طاقه|كهرباء/, '⚡'], [/ضوء|ضوئي|بناء ضوئي/, '💡'],
  [/غذاء|طعام|هضم|هضمي/, '🍎'], [/صخر|صخور|معادن|تربه/, '🪨'], [/جبل|جبال/, '⛰️'], [/هواء|رياح|غلاف/, '🌬️'],
  [/عدد|اعداد|رقم|جمع|طرح|ضرب|قسمه|كسر|كسور/, '🔢'], [/مثلث|مربع|دائره|شكل|زاويه/, '📐'], [/تاريخ|عام|حضاره|دوله/, '🏛️'],
  [/خريطه|قاره|مدينه/, '🗺️'], [/كلمه|حرف|جمله|فعل|اسم|فاعل|مفعول/, '🔤'], [/كتاب|قراءه/, '📖'], [/وقت|ساعه|زمن/, '⏰'],
  [/مغناطيس/, '🧲'], [/صوت/, '🔊'], [/ثلج|جليد|تجمد/, '🧊'], [/نار|احتراق/, '🔥'], [/فيروس|بكتيريا|مرض/, '🦠'],
]

/** Picks an emoji for a piece of text (visual support next to words). */
export function iconFor(text: string, fallback = '💡'): string {
  const n = normalize(text)
  for (const [re, icon] of ICONS) if (re.test(n)) return icon
  return fallback
}
