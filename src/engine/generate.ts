import { ORDINAL_PREFIX } from './analyze'
import { STOPWORDS, iconFor, normalize, seededRandom, shuffle, stripDiacritics, truncateWords, words } from './arabic'
import type {
  ChoiceQuestion,
  Concept,
  Difficulty,
  GeneratedContent,
  Lesson,
  LessonAnalysis,
  MistakeItem,
  PairItem,
  ScrambleItem,
  SequenceItem,
  TrueFalseItem,
} from './types'

/**
 * Local (rule-based) Lesson → Game content generator.
 * Every item is built only from sentences, terms, lists and definitions that
 * exist in the lesson text. Wrong answers are other items from the same
 * lesson, so no new "facts" are invented.
 */
export function generateContent(lesson: Lesson, a: LessonAnalysis): GeneratedContent {
  const rand = seededRandom(lesson.title + lesson.content.length)
  let n = 0
  const id = (p: string) => `${p}-${++n}`

  const conceptTerms = a.concepts.map((c) => c.term)
  const allTerms = dedupe([...conceptTerms, ...a.terms])
  const families: string[][] = [
    conceptTerms,
    a.classifications.flatMap((g) => g.items),
    ...a.sequences.map((sq) => sq.steps),
  ]

  // ---------- Multiple choice ----------
  const mcq: ChoiceQuestion[] = []
  const makeChoice = (
    prompt: string,
    correct: string,
    distractors: string[],
    extra: Partial<ChoiceQuestion> & { explanation: string; source: string; concept: string; difficulty: Difficulty; hint: string },
  ) => {
    const pool = shuffle(dedupe(distractors.filter((d) => normalize(d) !== normalize(correct))), rand).slice(0, 3)
    if (pool.length < 2) return
    const options = shuffle([correct, ...pool], rand)
    mcq.push({
      kind: 'mcq',
      id: id('q'),
      prompt,
      options,
      correctIndex: options.indexOf(correct),
      accessible: { simple: prompt, icon: iconFor(extra.concept + ' ' + correct), speak: `${prompt}. ${options.map((o, i) => `${LETTERS[i]}: ${o}`).join('. ')}` },
      ...extra,
    })
  }

  a.concepts.forEach((c, i) => {
    const others = a.concepts.filter((o) => o.id !== c.id)
    if (others.length < 2) return
    const shortDef = truncateWords(c.definition, 16)
    if (i % 2 === 0) {
      makeChoice(`أي مصطلح يدل على: «${shortDef}»؟`, c.term, others.map((o) => o.term), {
        conceptId: c.id,
        concept: c.term,
        difficulty: 1,
        hint: letterHint(c.term),
        explanation: `«${c.term}» هو ${c.definition}.`,
        source: c.source,
      })
    } else {
      makeChoice(`ما المقصود بـ «${c.term}»؟`, shortDef, others.map((o) => truncateWords(o.definition, 16)), {
        conceptId: c.id,
        concept: c.term,
        difficulty: words(c.definition).length > 12 ? 3 : 2,
        hint: `ابحث في الدرس عن الجملة التي تذكر «${c.term}».`,
        explanation: `«${c.term}»: ${c.definition}.`,
        source: c.source,
      })
    }
  })

  // Fill in the blank from key sentences.
  const blankSources = dedupe([...a.keyPoints, ...a.facts]).filter((s) => !a.concepts.some((c) => c.source === s))
  for (const sentence of blankSources) {
    if (mcq.length >= 16) break
    const plain = tidy(sentence)
    const term = allTerms.find((t) => findTerm(plain, t) && words(t).length <= 3 && words(plain).length - words(t).length >= 3)
    if (!term) continue
    const [bs, be] = findTerm(plain, term)!
    const distractors = allTerms.filter((t) => !normalize(plain).includes(normalize(t)) && words(t).length <= 4)
    if (distractors.length < 2) continue
    const blanked = plain.slice(0, bs) + '______' + plain.slice(be)
    makeChoice(`أكمل: ${blanked}`, term, distractors, {
      concept: term,
      difficulty: words(plain).length > 16 ? 3 : 2,
      hint: letterHint(term),
      explanation: `الجملة الصحيحة: ${sentence}.`,
      source: sentence,
    })
  }

  // Sequence-based choice.
  for (const s of a.sequences) {
    for (let i = 0; i < s.steps.length - 1 && i < 3; i++) {
      makeChoice(`في «${s.title}»: ما الذي يأتي مباشرة بعد «${s.steps[i]}»؟`, s.steps[i + 1], s.steps.filter((_, k) => k !== i + 1 && k !== i), {
        concept: s.title,
        difficulty: i === 0 ? 2 : 3,
        hint: `الترتيب يبدأ بـ «${s.steps[0]}».`,
        explanation: `الترتيب الصحيح: ${s.steps.join(' ← ')}.`,
        source: s.source,
      })
    }
  }

  // Classification-based choice (only when another group supplies wrong answers).
  for (const g of a.classifications) {
    const outside = a.classifications.filter((o) => o.id !== g.id).flatMap((o) => o.items)
    const filtered = outside.filter((o) => !g.items.some((it) => normalize(it) === normalize(o)))
    if (filtered.length < 2) continue
    const correct = g.items[Math.floor(rand() * g.items.length)]
    makeChoice(`أي مما يلي من: ${g.group}؟`, correct, filtered, {
      concept: g.group,
      difficulty: 2,
      hint: `تذكّر قائمة «${g.group}».`,
      explanation: `${g.group}: ${g.items.join('، ')}.`,
      source: g.source,
    })
  }

  // Arithmetic found in the lesson (results are computed, not trusted).
  for (const m of findMath(lesson.content).slice(0, 8)) {
    const near = dedupe([m.result + 1, m.result - 1, m.result + 2, m.result + 10, m.result - 2].filter((x) => x >= 0 && x !== m.result).map(String))
    makeChoice(`كم يساوي ${m.a} ${m.op} ${m.b}؟`, String(m.result), near, {
      concept: 'العمليات الحسابية',
      difficulty: m.result > 50 ? 3 : m.result > 10 ? 2 : 1,
      hint: m.op === '+' ? `ابدأ من ${m.a} وعُدّ ${m.b} خطوات إلى الأمام.` : m.op === '-' ? `ابدأ من ${m.a} وعُدّ ${m.b} خطوات إلى الخلف.` : m.op === '×' ? `${m.a} × ${m.b} يعني جمع ${m.a} عدد ${m.b} مرات.` : `كم مرة يدخل ${m.b} في ${m.a}؟`,
      explanation: `${m.a} ${m.op} ${m.b} = ${m.result}.`,
      source: m.source,
      math: { a: m.a, b: m.b, op: m.op, result: m.result },
    })
  }

  // ---------- True / False ----------
  const trueFalse: TrueFalseItem[] = []
  const swapTargets = a.concepts.length >= 2 ? conceptTerms : allTerms
  const tfSources = dedupe([...a.concepts.map((c) => c.source), ...a.keyPoints, ...a.facts]).filter((s) => words(s).length <= 28)
  // Definitions: a neutral "«term»: definition" form, so pronoun agreement never gives the answer away.
  a.concepts.forEach((c, i) => {
    if (words(c.definition).length > 24) return
    const others = conceptTerms.filter((t) => normalize(t) !== normalize(c.term) && !includesNorm(c.definition, t))
    const makeFalse = i % 2 === 0 && others.length > 0
    const shown = makeFalse ? stripDiacritics(others[Math.floor(rand() * others.length)]) : c.term
    const statement = `«${shown}»: ${c.definition}`
    trueFalse.push({
      kind: 'tf',
      id: id('tf'),
      statement,
      isTrue: !makeFalse,
      correction: `«${c.term}»: ${c.definition}`,
      concept: c.term,
      conceptId: c.id,
      difficulty: makeFalse ? 2 : 1,
      hint: makeFalse ? `هل هذا الوصف يخص «${shown}» فعلًا؟` : 'هل تتذكر هذا التعريف من الدرس؟',
      explanation: makeFalse ? `خطأ: هذا تعريف «${c.term}» وليس «${shown}».` : `صحيح: هذا هو تعريف «${c.term}» كما ورد في الدرس.`,
      source: c.source,
      accessible: { simple: statement, icon: iconFor(c.term + ' ' + c.definition), speak: `صح أم خطأ؟ ${shown}: ${c.definition}` },
    })
  })
  const conceptSources = new Set(a.concepts.map((c) => c.source))
  tfSources.filter((s) => !conceptSources.has(s)).forEach((sentence, i) => {
    const plain = tidy(sentence)
    const makeFalse = i % 2 === 0
    if (makeFalse) {
      const swap = swapTerm(plain, swapTargets, rand, families)
      if (swap) {
        trueFalse.push({
          kind: 'tf',
          id: id('tf'),
          statement: swap.sentence,
          isTrue: false,
          correction: sentence,
          concept: swap.original,
          difficulty: 2,
          hint: `ركّز على كلمة «${swap.replacement}».`,
          explanation: `العبارة خاطئة لأن الصحيح هو «${swap.original}» وليس «${swap.replacement}».`,
          source: sentence,
          accessible: { simple: swap.sentence, icon: iconFor(sentence), speak: `صح أم خطأ؟ ${swap.sentence}` },
        })
        return
      }
    }
    trueFalse.push({
      kind: 'tf',
      id: id('tf'),
      statement: plain,
      isTrue: true,
      correction: sentence,
      concept: allTerms.find((t) => plain.includes(stripDiacritics(t))) ?? lesson.title,
      difficulty: 1,
      hint: 'هل تتذكر هذه الجملة من الدرس كما هي؟',
      explanation: 'العبارة صحيحة كما وردت في الدرس.',
      source: sentence,
      accessible: { simple: plain, icon: iconFor(sentence), speak: `صح أم خطأ؟ ${plain}` },
    })
  })
  // Order statements from sequences.
  for (const s of a.sequences) {
    if (s.steps.length < 3) continue
    const [x, y] = [s.steps[0], s.steps[1]]
    const trueSt = `في «${s.title}» تأتي «${x}» قبل «${y}»`
    const falseSt = `في «${s.title}» تأتي «${s.steps[s.steps.length - 1]}» قبل «${s.steps[0]}»`
    const base = { concept: s.title, difficulty: 2 as Difficulty, hint: 'تخيّل المراحل بالترتيب من البداية.', source: s.source, correction: `الترتيب الصحيح: ${s.steps.join(' ← ')}` }
    trueFalse.push({ kind: 'tf', id: id('tf'), statement: trueSt, isTrue: true, explanation: `صحيح. ${base.correction}.`, accessible: { simple: trueSt, icon: '🔢', speak: trueSt }, ...base })
    trueFalse.push({ kind: 'tf', id: id('tf'), statement: falseSt, isTrue: false, explanation: `خطأ. ${base.correction}.`, accessible: { simple: falseSt, icon: '🔢', speak: falseSt }, ...base })
  }

  // ---------- Spot the mistake ----------
  // Prefer swapping a term INSIDE the sentence body (not the subject), so the mistake is not always the first word.
  const mistakes: MistakeItem[] = []
  for (const sentence of tfSources) {
    if (mistakes.length >= 10) break
    const plain = tidy(sentence)
    const concept = a.concepts.find((c) => c.source === sentence)
    let swap: ReturnType<typeof swapTerm> = null
    if (concept) {
      const head = plain.slice(0, plain.indexOf(stripDiacritics(concept.term)) + stripDiacritics(concept.term).length)
      const body = plain.slice(head.length)
      const inner = swapTerm(body, allTerms.filter((t) => normalize(t) !== normalize(concept.term)), rand, families, plain)
      if (inner && head) swap = { ...inner, sentence: head + inner.sentence }
    } else {
      swap = swapTerm(plain, swapTargets, rand, families)
    }
    if (!swap) continue
    mistakes.push({
      kind: 'mistake',
      id: id('m'),
      sentence: swap.sentence,
      wrong: swap.replacement,
      correct: swap.original,
      concept: swap.original,
      difficulty: 2,
      hint: 'الخطأ في مصطلح واحد من مصطلحات الدرس.',
      explanation: `الكلمة الخاطئة هي «${swap.replacement}»، والصحيح «${swap.original}».`,
      source: sentence,
      accessible: { simple: swap.sentence, icon: '🔎', speak: `ابحث عن الخطأ: ${swap.sentence}` },
    })
  }

  // ---------- Word scramble ----------
  const scramble: ScrambleItem[] = []
  for (const t of allTerms) {
    if (scramble.length >= 10) break
    if (words(t).length !== 1) continue
    const letters = [...stripDiacritics(t)]
    if (letters.length < 3 || letters.length > 10) continue
    const concept = a.concepts.find((c) => normalize(c.term) === normalize(t))
    const sourceSentence = concept?.source ?? a.sentences.find((s) => stripDiacritics(s).includes(stripDiacritics(t))) ?? ''
    const clue = concept ? truncateWords(concept.definition, 14) : truncateWords(stripDiacritics(sourceSentence).replace(stripDiacritics(t), '____'), 16)
    if (!clue) continue
    scramble.push({
      kind: 'scramble',
      id: id('w'),
      word: stripDiacritics(t),
      concept: t,
      difficulty: letters.length > 6 ? 3 : letters.length > 4 ? 2 : 1,
      hint: `الكلمة تبدأ بحرف «${letters[0]}».`,
      explanation: concept ? `«${t}»: ${concept.definition}.` : `وردت الكلمة في الدرس: ${sourceSentence}.`,
      source: sourceSentence,
      accessible: { simple: clue, icon: iconFor(t), speak: `رتّب الحروف لتكوين كلمة معناها: ${clue}` },
    })
  }

  // ---------- Pairs (matching / memory) ----------
  const pairs: PairItem[] = a.concepts.map((c) => ({
    id: id('p'),
    term: c.term,
    match: truncateWords(c.definition, 12),
    source: c.source,
    icon: iconFor(c.term + ' ' + c.definition),
  }))

  // ---------- Sequences ----------
  const sequences: SequenceItem[] = a.sequences
    .filter((s) => s.steps.length >= 3 && s.steps.length <= 10)
    .map((s) => ({
      kind: 'sequence',
      id: id('seq'),
      title: s.title,
      steps: s.steps,
      concept: s.title,
      difficulty: s.steps.length > 5 ? 3 : 2,
      hint: `أول خطوة: «${s.steps[0]}».`,
      explanation: `الترتيب الصحيح: ${s.steps.join(' ← ')}.`,
      source: s.source,
      accessible: { simple: `رتّب: ${s.title}`, icon: '🔢', speak: `رتّب ${s.title}` },
    }))

  const closing = mcq.find((q) => q.difficulty === 2) ?? mcq[0] ?? null

  return {
    generatedBy: 'local',
    mcq,
    trueFalse: interleave(trueFalse),
    mistakes,
    scramble,
    pairs,
    sequences,
    closing: closing ? { ...closing, id: id('closing') } : null,
    keyLearnings: a.keyPoints.slice(0, 5).map((k) => truncateWords(k, 24)),
  }
}

export const LETTERS = ['أ', 'ب', 'ج', 'د']

function tidy(s: string): string {
  return stripDiacritics(s).replace(ORDINAL_PREFIX, '').trim()
}

function includesNorm(h: string, n: string) {
  return normalize(h).includes(normalize(n))
}

function letterHint(term: string): string {
  const clean = stripDiacritics(term).replace(/^ال/, '')
  return `يبدأ ${words(term).length > 1 ? 'المصطلح' : 'بعد «ال»'} بحرف «${clean[0]}» ويتكون من ${words(term).length > 1 ? words(term).length + ' كلمات' : clean.length + ' أحرف'}.`
}

function dedupe<T extends string>(arr: T[]): T[] {
  const seen = new Set<string>()
  return arr.filter((x) => {
    const k = normalize(x)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Finds a term as a whole word (allowing و/ف/ب/ك/ل prefixes). Returns [start, end] of the term itself. */
export function findTerm(sentence: string, term: string): [number, number] | null {
  const t = stripDiacritics(term)
  const re = new RegExp(`(^|[\\s«(،"'])((?:[وفبكل]){0,2})(${escapeRe(t)})(?=$|[\\s».،؛:)!؟?"'])`, 'u')
  const m = re.exec(sentence)
  if (!m) return null
  const startIdx = m.index + m[1].length + m[2].length
  return [startIdx, startIdx + t.length]
}

const swappable = (t: string) => words(t).length <= 4 && normalize(t).length >= 3 && !STOPWORDS.has(normalize(t))

/**
 * Replaces one lesson term in a sentence with another lesson term from the
 * same family (concepts with concepts, list items with list items).
 */
export function swapTerm(sentence: string, terms: string[], rand: () => number, families: string[][] = [], context = sentence) {
  const present = terms
    .filter(swappable)
    .map((t) => ({ t: stripDiacritics(t), pos: findTerm(sentence, t) }))
    .filter((x) => x.pos)
    .sort((x, y) => y.t.length - x.t.length)
  if (present.length === 0) return null
  const { t: original, pos } = present[0]
  const family = families.find((f) => f.some((x) => normalize(x) === normalize(original)))
  const ok = (c: string) => swappable(c) && !findTerm(sentence, c) && !findTerm(context, c) && !normalize(c).includes(normalize(original)) && !normalize(original).includes(normalize(c))
  let candidates = (family ?? []).filter(ok)
  if (candidates.length === 0) candidates = terms.filter(ok)
  if (candidates.length === 0) return null
  const replacement = stripDiacritics(candidates[Math.floor(rand() * candidates.length)])
  const [a, b] = pos!
  return { sentence: sentence.slice(0, a) + replacement + sentence.slice(b), original, replacement }
}

function interleave(items: TrueFalseItem[]): TrueFalseItem[] {
  const t = items.filter((i) => i.isTrue)
  const f = items.filter((i) => !i.isTrue)
  const out: TrueFalseItem[] = []
  while (t.length || f.length) {
    if (f.length) out.push(f.shift()!)
    if (t.length) out.push(t.shift()!)
  }
  return out
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
function toLatin(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
}

export function findMath(text: string) {
  const out: { a: number; b: number; op: string; result: number; source: string }[] = []
  const re = /([0-9٠-٩]{1,4})\s*([+\-−×x*÷/])\s*([0-9٠-٩]{1,4})/g
  const seen = new Set<string>()
  for (const m of toLatin(text).matchAll(re)) {
    const a = Number(m[1])
    const b = Number(m[3])
    const raw = m[2]
    const op = raw === '+' ? '+' : raw === '-' || raw === '−' ? '-' : raw === '÷' || raw === '/' ? '÷' : '×'
    let result: number
    if (op === '+') result = a + b
    else if (op === '-') result = a - b
    else if (op === '×') result = a * b
    else {
      if (b === 0 || a % b !== 0) continue
      result = a / b
    }
    if (result < 0) continue
    const key = `${a}${op}${b}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ a, b, op, result, source: `${a} ${op} ${b} = ${result}` })
  }
  return out
}

export function conceptById(a: LessonAnalysis, cid?: string): Concept | undefined {
  return a.concepts.find((c) => c.id === cid)
}
