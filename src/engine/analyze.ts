import {
  cleanLine,
  contentWords,
  includesNormalized,
  normalize,
  splitList,
  splitSentences,
  stripDiacritics,
  words,
} from './arabic'
import type { Classification, Concept, Lesson, LessonAnalysis, LessonStructure, Relation, Sequence } from './types'

const PROCESS_RE = /مراحل|المراحل|خطوات|الخطوات|بالترتيب|ترتيب|تسلسل|يمر|تمر|يبدأ|تبدأ|دورة|دوره|عملية|عمليه|مسار|ينتقل|تنتقل|كالتالي|كالآتي/
const CLASS_RE = /أنواع|انواع|تنقسم|ينقسم|تشمل|يشمل|تتكون|يتكون|تتألف|يتألف|أقسام|اقسام|أمثلة|امثله|أمثله|مكونات|أجزاء|اجزاء|تضم|يضم|منها/
const ORDINAL_RE = /^(?:أولا|أولاً|اولا|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً|خامسا|خامساً|سادسا|سادساً|في البداية|بعد ذلك|بعدها|ثم|أخيرا|أخيراً|اخيرا|وأخيرا|وأخيراً|في النهاية)[،,:\s]+/u
const LEADING_FILLER = /^(?:و|ف)?(?:إن|ان|يعد|تعد|يعتبر|تعتبر|يُعد|تُعد)\s+/u

let counter = 0
const nextId = (p: string) => `${p}${++counter}`

function cleanTerm(t: string): string {
  return cleanLine(t).replace(LEADING_FILLER, '').replace(/^و(?=ال)/u, '').replace(/[«»"']/g, '').trim()
}

function isValidTerm(t: string): boolean {
  const w = words(t)
  if (w.length === 0 || w.length > 5) return false
  if (contentWords(t).length === 0) return false
  if (/^\d/.test(t)) return false
  if (/^(?:مثال|مثل|أمثلة|امثلة|ملاحظة|ملاحظه|تذكر|تذكير|لاحظ|نشاط|سؤال)/u.test(t)) return false
  return t.length >= 2 && t.length <= 45
}

function isShortList(items: string[]): boolean {
  return items.length >= 3 && items.every((i) => words(i).length <= 5)
}

/** Tries to read a definition out of one sentence. */
export const ORDINAL_PREFIX = ORDINAL_RE

export function matchDefinition(sentence: string): { term: string; definition: string } | null {
  const s = stripDiacritics(sentence)
  const patterns: { re: RegExp; reverse?: boolean }[] = [
    { re: /^(?:يعرف|تعرف)\s+(.{2,45}?)\s+(?:بأنه|بانه|بأنها|بانها|على أنه|على انه|على أنها|على انها)\s+(.{6,})$/u },
    { re: /^(?:يطلق على|يُطلق على)\s+(.{6,}?)\s+(?:اسم|مصطلح)\s+(.{2,45})$/u, reverse: true },
    { re: /^(?:تسمى|يسمى|تُسمى|يُسمى)\s+(.{6,}?)\s+(?:باسم|بـ|ب)\s*(.{2,45})$/u, reverse: true },
    { re: /^(.{2,45}?)\s+(?:عبارة عن|عباره عن|يقصد به|يقصد بها|يعني|تعني|هو|هي|هما)\s+(.{6,})$/u },
    { re: /^(.{2,45}?)\s*[:：]\s*(.{6,})$/u },
  ]
  for (const { re, reverse } of patterns) {
    const m = s.match(re)
    if (!m) continue
    let term = cleanTerm(reverse ? m[2] : m[1])
    let definition = cleanLine(reverse ? m[1] : m[2])
    if (!isValidTerm(term)) continue
    // "X: a، b، c" is a list, not a definition.
    if (isShortList(splitList(definition))) continue
    if (words(definition).length < 2) continue
    // Mostly numbers ("3 × 4 = 12") is an example, not a definition.
    if ((definition.match(/[0-9٠-٩]/g) ?? []).length > (definition.match(/[\u0621-\u064A]/g) ?? []).length) continue
    term = term.replace(/^(?:مصطلح|مفهوم)\s+/u, '')
    definition = definition.replace(/^(?:أن|ان)\s+/u, '')
    return { term, definition }
  }
  return null
}

function headingKind(heading: string): 'process' | 'class' | null {
  if (PROCESS_RE.test(heading)) return 'process'
  if (CLASS_RE.test(heading)) return 'class'
  return null
}

function titleFrom(heading: string, fallback: string): string {
  const t = cleanLine(heading.replace(/[:：]\s*$/, ''))
    .replace(/\s*(?:بالمراحل|بالخطوات|المراحل|الخطوات)?\s*(?:التالية|الآتية|كالتالي|كالآتي)$/u, '')
    .trim()
  return t.length > 0 ? t : fallback
}

export function analyzeLesson(lesson: Lesson): LessonAnalysis {
  counter = 0
  const raw = lesson.content.replace(/\r/g, '')
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const sentences = splitSentences(raw)

  const concepts: Concept[] = []
  const sequences: Sequence[] = []
  const classifications: Classification[] = []
  const usedInLists = new Set<string>()

  const addConcept = (term: string, definition: string, source: string) => {
    if (concepts.some((c) => normalize(c.term) === normalize(term))) return
    concepts.push({ id: nextId('c'), term, definition, source })
  }

  // 1) Block lists: a heading line ending with ":" followed by list lines.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/[:：]\s*$/.test(line)) continue
    const items: string[] = []
    let numbered = false
    let j = i + 1
    while (j < lines.length && /^\s*(?:[-•*–]|\d+[.)\-]|[٠-٩]+[.)\-])\s*/u.test(lines[j])) {
      if (/^\s*(?:\d+|[٠-٩]+)[.)\-]/u.test(lines[j])) numbered = true
      items.push(cleanLine(lines[j]))
      j++
    }
    if (items.length < 2) continue
    const heading = titleFrom(line, lesson.title)
    const kind = headingKind(heading) ?? (numbered ? 'process' : 'class')
    // Items written as "term: definition" also become concepts.
    const shortItems = items.map((it) => {
      const d = matchDefinition(it)
      if (d) {
        addConcept(d.term, d.definition, it)
        return d.term
      }
      return it
    })
    items.forEach((it) => usedInLists.add(normalize(it)))
    usedInLists.add(normalize(line))
    if (kind === 'process' && shortItems.length >= 3) {
      sequences.push({ id: nextId('s'), title: heading, steps: shortItems, source: `${heading}: ${shortItems.join('، ')}` })
    } else if (shortItems.length >= 2) {
      classifications.push({ id: nextId('g'), group: heading, items: shortItems, source: `${heading}: ${shortItems.join('، ')}` })
    }
    i = j - 1
  }

  // 2) Sentence level patterns.
  let ordinalRun: { title: string; steps: string[]; sources: string[] } | null = null
  const flushOrdinal = () => {
    if (ordinalRun && ordinalRun.steps.length >= 3) {
      sequences.push({ id: nextId('s'), title: ordinalRun.title, steps: ordinalRun.steps, source: ordinalRun.sources.join(' ') })
    }
    ordinalRun = null
  }

  sentences.forEach((sentence, idx) => {
    if (usedInLists.has(normalize(sentence))) return
    const plain = stripDiacritics(sentence)

    // Ordinal step sentences: "أولاً، ..." "ثم ..." "أخيراً ..."
    if (ORDINAL_RE.test(plain)) {
      const step = cleanLine(plain.replace(ORDINAL_RE, ''))
      if (!ordinalRun) {
        const prev = idx > 0 ? sentences[idx - 1] : ''
        const prevDef = prev ? matchDefinition(prev) : null
        const title = prevDef ? prevDef.term : prev && words(prev).length <= 8 ? titleFrom(prev, lesson.title) : lesson.title
        ordinalRun = { title, steps: [], sources: [] }
      }
      ordinalRun.steps.push(step)
      ordinalRun.sources.push(sentence)
      return
    }
    flushOrdinal()

    // Inline list after a colon: "يمر الطعام بالمراحل التالية: الفم، المريء، المعدة"
    const colon = plain.match(/^(.{4,}?)[:：]\s*(.+)$/u)
    if (colon) {
      const items = splitList(colon[2])
      const kind = headingKind(colon[1])
      if (items.length >= 3 && items.every((i) => words(i).length <= 6)) {
        if (kind === 'process') {
          sequences.push({ id: nextId('s'), title: titleFrom(colon[1], lesson.title), steps: items, source: sentence })
          return
        }
        classifications.push({ id: nextId('g'), group: titleFrom(colon[1], lesson.title), items, source: sentence })
        return
      }
    }

    // Classification without colon: "تنقسم الصخور إلى نارية ورسوبية ومتحولة"
    const split = plain.match(/^(?:و)?(تنقسم|ينقسم|تتكون|يتكون|تتألف|يتألف|تشمل|يشمل|تضم|يضم)\s+(.{2,40}?)\s+(?:إلى|الى|من)\s+(.+)$/u)
    if (split) {
      const items = splitList(split[3])
      if (items.length >= 2 && items.every((i) => words(i).length <= 5)) {
        classifications.push({ id: nextId('g'), group: `${split[1]} ${split[2]}`, items, source: sentence })
      }
    }

    // Chains: "يدخل الطعام الفم ثم المريء ثم المعدة"
    const chain = plain.split(/\s+ثم\s+|،\s*ثم\s+/u)
    if (chain.length >= 3) {
      const steps = chain.map(cleanLine).filter((s) => s.length > 1)
      if (steps.length >= 3 && steps.every((s) => words(s).length <= 12)) {
        sequences.push({ id: nextId('s'), title: lesson.title, steps, source: sentence })
      }
    }

    const def = matchDefinition(sentence)
    if (def) addConcept(def.term, def.definition, sentence)
  })
  flushOrdinal()

  // 3) Terms: defined terms, list items, and frequently repeated content words.
  const termSet = new Map<string, string>()
  const addTerm = (t: string) => {
    const n = normalize(t)
    if (n.length < 2 || termSet.has(n)) return
    termSet.set(n, t)
  }
  concepts.forEach((c) => addTerm(c.term))
  classifications.forEach((g) => g.items.forEach((i) => words(i).length <= 3 && i.length >= 2 && addTerm(i)))
  sequences.forEach((s) => s.steps.forEach((st) => words(st).length <= 3 && addTerm(st)))
  const freq = new Map<string, { w: string; n: number }>()
  for (const w of contentWords(raw)) {
    const n = normalize(w)
    if (n.length < 4) continue
    const cur = freq.get(n)
    if (cur) cur.n++
    else freq.set(n, { w, n: 1 })
  }
  ;[...freq.values()]
    .filter((f) => f.n >= 3 && /^(?:و)?ال/.test(f.w))
    // skip fragments of multi-word terms ("الجهاز" from "الجهاز الهضمي")
    .filter((f) => ![...termSet.keys()].some((t) => t.includes(' ') && t.split(' ').includes(normalize(f.w.replace(/^و(?=ال)/u, '')))))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)
    .forEach((f) => addTerm(f.w.replace(/^و(?=ال)/u, '')))
  const terms = [...termSet.values()]

  // 4) Key points: score sentences.
  const termNorms = terms.map(normalize)
  const scored = sentences
    .filter((s) => words(s).length >= 4 && !/[:：]\s*$/.test(s))
    .map((s, i) => {
      const n = normalize(s)
      let score = 0
      termNorms.forEach((t) => n.includes(t) && (score += 2))
      if (matchDefinition(s)) score += 3
      if (/\d|[٠-٩]/.test(s)) score += 1
      if (i < 2) score += 1
      if (words(s).length > 35) score -= 2
      return { s, i, score }
    })
  const keyPoints = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)

  const facts = sentences.filter((s) => {
    const wc = words(s).length
    return wc >= 4 && wc <= 30 && !/[:：]\s*$/.test(s) && termNorms.some((t) => normalize(s).includes(t))
  })

  // 5) Relations.
  const relations: Relation[] = []
  for (const c of concepts) {
    for (const other of concepts) {
      if (other.id !== c.id && includesNormalized(c.definition, other.term)) {
        relations.push({ from: c.term, to: other.term, label: 'يرتبط بـ' })
      }
    }
  }
  for (const s of sequences) {
    for (let i = 0; i < s.steps.length - 1; i++) relations.push({ from: s.steps[i], to: s.steps[i + 1], label: 'يليه' })
  }
  for (const g of classifications) for (const it of g.items) relations.push({ from: g.group, to: it, label: 'يشمل' })

  // 6) Objectives are templates filled ONLY with lesson items.
  const objectives: string[] = []
  if (concepts.length) objectives.push(`أن يعرّف الطالب: ${concepts.slice(0, 4).map((c) => c.term).join('، ')}.`)
  sequences.forEach((s) => objectives.push(`أن يرتب الطالب ${s.title} بالتسلسل الصحيح.`))
  classifications.forEach((g) => objectives.push(`أن يميز الطالب عناصر: ${g.group}.`))
  if (relations.some((r) => r.label === 'يرتبط بـ')) objectives.push('أن يربط الطالب بين المفاهيم المترابطة في الدرس.')
  if (facts.length) objectives.push(`أن يتذكر الطالب أهم الحقائق في درس «${lesson.title}».`)

  // 7) Concepts that may need extra explanation.
  const needsExplanation: string[] = []
  concepts.forEach((c) => {
    if (words(c.definition).length > 18) needsExplanation.push(`«${c.term}»: تعريفه طويل، يُفضّل تبسيطه بمثال.`)
  })
  ;[...freq.values()]
    .filter((f) => f.n >= 3 && !concepts.some((c) => includesNormalized(c.term, f.w)))
    .slice(0, 3)
    .forEach((f) => needsExplanation.push(`«${f.w}» يتكرر في الدرس دون تعريف واضح.`))

  const structure: LessonStructure[] = []
  if (concepts.length >= 2) structure.push('definitions')
  if (sequences.length) structure.push('process')
  if (classifications.length) structure.push('classification')
  if (facts.length >= 3) structure.push('facts')
  if (/[0-9٠-٩]\s*[+\-×x*÷/]\s*[0-9٠-٩]/.test(raw)) structure.push('math')

  return {
    sentences,
    keyPoints,
    concepts,
    terms,
    sequences,
    classifications,
    relations,
    objectives,
    needsExplanation,
    facts,
    structure,
    stats: { words: words(raw).length, sentences: sentences.length },
  }
}
