import { contentWords, normalize, seededRandom, shuffle, stripDiacritics, truncateWords, words } from './arabic'
import { findMath } from './generate'
import type {
  BuildItem,
  CriticalItem,
  DetectiveCase,
  Lesson,
  LessonAnalysis,
  LogicItem,
  MissingItem,
  OddOneItem,
  PatternItem,
  TrueFalseItem,
  WordItem,
} from './types'

/**
 * Content for the thinking & word games. Like the rest of the engine, it only
 * rearranges what the lesson already says (terms, steps, groups, sentences)
 * or computes arithmetic from numbers found in the lesson.
 */
export interface ThinkingContent {
  patterns: PatternItem[]
  oddOne: OddOneItem[]
  logic: LogicItem[]
  missing: MissingItem[]
  critical: CriticalItem[]
  build: BuildItem[]
  detective: DetectiveCase[]
  words: WordItem[]
}

const same = (a: string, b: string) => normalize(a) === normalize(b)
const uniq = (arr: string[]) => arr.filter((x, i) => arr.findIndex((y) => same(x, y)) === i)
const short = (s: string, n = 4) => words(s).length <= n

export function generateThinking(lesson: Lesson, a: LessonAnalysis, trueFalse: TrueFalseItem[]): ThinkingContent {
  const rand = seededRandom('think' + lesson.title + lesson.content.length)
  let n = 0
  const id = (p: string) => `${p}-${++n}`
  const seqs = a.sequences.filter((s) => s.steps.length >= 3)
  const shortSeqs = seqs.filter((s) => s.steps.every((st) => short(st)))
  const groups = [
    ...a.classifications.filter((g) => g.items.length >= 3).map((g) => ({ name: g.group, items: g.items, source: g.source })),
    ...shortSeqs.map((s) => ({ name: s.title, items: s.steps, source: s.source })),
  ]
  const conceptTerms = a.concepts.map((c) => c.term)

  // ---------------- Patterns ----------------
  const patterns: PatternItem[] = []
  for (const s of seqs) {
    for (let i = 0; i + 3 < s.steps.length && i < 4; i += 2) {
      const shown = s.steps.slice(i, i + 3)
      const answer = s.steps[i + 3]
      const others = s.steps.filter((x) => !shown.includes(x) && x !== answer)
      const options = shuffle(uniq([answer, ...shuffle(others, rand).slice(0, 2)]), rand)
      if (options.length < 2) continue
      patterns.push({
        id: id('pat'), kind: 'sequence', title: `ما الذي يأتي بعد ذلك في «${s.title}»؟`, shown, answer, options,
        rule: `هذه خطوات «${s.title}» بالترتيب: ${s.steps.join(' ← ')}.`, source: s.source,
      })
    }
  }
  const seenNum = new Set<string>()
  for (const m of findMath(lesson.content)) {
    let step: number
    let start: number
    let rule: string
    if (m.op === '×' && m.a >= 2 && m.a <= 12) {
      step = m.a
      start = m.a
      rule = `نضيف ${step} في كل مرة — إنها مضاعفات العدد ${step} (جدول ضرب ${step}).`
    } else if (m.op === '+' && m.b >= 1 && m.b <= 20) {
      step = m.b
      start = m.a
      rule = `نضيف ${step} في كل مرة.`
    } else continue
    const key = `${start}:${step}`
    if (seenNum.has(key)) continue
    seenNum.add(key)
    const seq = [0, 1, 2, 3].map((k) => start + k * step)
    const answer = String(start + 4 * step)
    const options = shuffle(uniq([answer, String(start + 4 * step + 1), String(start + 3 * step + 1), String(start + 5 * step)]), rand).slice(0, 4)
    if (!options.includes(answer)) options[0] = answer
    patterns.push({ id: id('pat'), kind: 'numeric', title: 'اكتشفوا القاعدة: ما العدد التالي؟', shown: seq.map(String), answer, options: shuffle(options, rand), rule, source: m.source })
    if (patterns.filter((p) => p.kind === 'numeric').length >= 4) break
  }
  if (a.classifications.length >= 2) {
    const gs = a.classifications.filter((g) => g.items.length >= 2)
    for (let i = 0; i < gs.length && i < 3; i++) {
      const g1 = gs[i]
      const g2 = gs[(i + 1) % gs.length]
      if (g1.id === g2.id) continue
      const x = g1.items[0]
      const y = g2.items[Math.min(1, g2.items.length - 1)]
      const options = shuffle(uniq(gs.map((g) => g.group)).slice(0, 4), rand)
      patterns.push({
        id: id('pat'), kind: 'analogy', title: 'أكملوا العلاقة بنفس النمط', shown: [x, g1.group, y], answer: g2.group, options,
        rule: `«${x}» من «${g1.group}»، وبالنمط نفسه «${y}» من «${g2.group}».`, source: `${g1.source} ${g2.source}`,
      })
    }
  }
  for (const s of seqs) {
    if (s.steps.length < 4) continue
    const [x1, x2, y1, y2] = [s.steps[0], s.steps[1], s.steps[2], s.steps[3]]
    const options = shuffle(uniq([y2, ...s.steps.filter((st) => ![x1, x2, y1, y2].includes(st)).slice(0, 2), x1]), rand)
    patterns.push({
      id: id('pat'), kind: 'analogy', title: 'أكملوا العلاقة بنفس النمط', shown: [x1, x2, y1], answer: y2, options,
      rule: `في «${s.title}» تأتي «${x2}» مباشرة بعد «${x1}»، وبالنمط نفسه تأتي «${y2}» بعد «${y1}».`, source: s.source,
    })
  }

  // ---------------- Odd one out ----------------
  const oddOne: OddOneItem[] = []
  for (const g of groups) {
    const outsiders = uniq([
      ...groups.filter((o) => o !== g).flatMap((o) => o.items.map((it) => ({ it, from: o.name }))).map((x) => x.it),
      ...conceptTerms,
    ]).filter((t) => short(t) && !g.items.some((it) => same(it, t) || normalize(it).includes(normalize(t)) || normalize(t).includes(normalize(it))))
    if (outsiders.length === 0) continue
    for (let r = 0; r < 2 && r * 3 < g.items.length; r++) {
      const three = shuffle(g.items, rand).slice(0, 3)
      const odd = outsiders[(r * 3 + Math.floor(rand() * outsiders.length)) % outsiders.length]
      const oddGroup = groups.find((o) => o !== g && o.items.some((it) => same(it, odd)))?.name ?? 'مصطلحات أخرى في الدرس'
      const items = shuffle([...three, odd], rand)
      oddOne.push({
        id: id('odd'), items, oddIndex: items.indexOf(odd), group: g.name, oddGroup,
        explanation: `«${three.join('»، «')}» كلها من «${g.name}»، أما «${odd}» فليس منها${oddGroup !== 'مصطلحات أخرى في الدرس' ? ` بل من «${oddGroup}»` : ''}.`,
        source: g.source,
      })
    }
  }

  // ---------------- Logic (deduction) ----------------
  const logic: LogicItem[] = []
  for (const s of shortSeqs) {
    if (s.steps.length < 4) continue
    for (let i = 1; i < s.steps.length - 1 && i <= 3; i++) {
      const answer = s.steps[i]
      const candidates = shuffle(s.steps.slice(0, 6).concat(s.steps.length > 6 && i >= 6 ? [answer] : []), rand)
      logic.push({
        id: id('log'), candidates: uniq(candidates), answer,
        clues: [`أنا خطوة من «${s.title}».`, `آتي بعد «${s.steps[i - 1]}».`, `وآتي قبل «${s.steps[i + 1]}».`],
        explanation: `الترتيب: ${s.steps.join(' ← ')}. الخطوة الوحيدة بين «${s.steps[i - 1]}» و«${s.steps[i + 1]}» هي «${answer}».`,
        source: s.source,
      })
    }
  }
  for (const g of a.classifications.filter((c) => c.items.length >= 3)) {
    const others = a.classifications.filter((o) => o.id !== g.id).flatMap((o) => o.items).filter((t) => !g.items.some((it) => same(it, t)))
    if (others.length < 1) continue
    const answer = g.items[Math.floor(rand() * g.items.length)]
    const rest = g.items.filter((x) => x !== answer).slice(0, 4)
    const candidates = shuffle(uniq([answer, ...rest, ...shuffle(others, rand).slice(0, 2)]), rand)
    const clues = [`أنتمي إلى «${g.group}».`]
    for (let k = 0; k < rest.length; k += 2) clues.push(`لست «${rest.slice(k, k + 2).join('» ولا «')}».`)
    logic.push({ id: id('log'), candidates, answer, clues, explanation: `من «${g.group}» (${g.items.join('، ')}) يبقى «${answer}» بعد استبعاد الباقي.`, source: g.source })
  }

  // ---------------- Missing piece ----------------
  const missing: MissingItem[] = []
  const sentencePool = uniq([...a.keyPoints, ...a.facts]).map((s) => stripDiacritics(s)).filter((s) => {
    const w = words(s).length
    return w >= 7 && w <= 24 && !/[:：]\s*$/.test(s) && !/[0-9٠-٩×÷=+]/.test(s)
  })
  const chunk = (s: string) => {
    const w = s.split(/\s+/)
    const pieces: string[] = []
    for (let i = 0; i < w.length; i += 3) pieces.push(w.slice(i, i + 3).join(' '))
    if (pieces.length > 1 && pieces[pieces.length - 1].split(' ').length === 1) pieces[pieces.length - 2] += ' ' + pieces.pop()
    return pieces
  }
  const allPieces = sentencePool.flatMap((s) => chunk(s).map((p) => ({ p, s })))
  for (const s of sentencePool) {
    if (missing.length >= 10) break
    const pieces = chunk(s)
    if (pieces.length < 3) continue
    const scored = pieces.map((p, i) => ({ i, score: (i === 0 ? -2 : 0) + (a.terms.some((t) => p.includes(stripDiacritics(t))) ? 2 : 0) }))
    const top = scored.sort((x, y) => y.score - x.score)[0]
    const missingIndex = top.score > 0 ? top.i : Math.floor(pieces.length / 2)
    const decoys = shuffle(allPieces.filter((x) => x.s !== s && !same(x.p, pieces[missingIndex])), rand).map((x) => x.p)
    const options = shuffle(uniq([pieces[missingIndex], ...decoys]).slice(0, 3), rand)
    if (options.length < 3) continue
    missing.push({ id: id('mis'), pieces, missingIndex, options, explanation: `الجملة كاملة من الدرس: ${s}.`, source: s })
  }
  for (const sq of shortSeqs) {
    if (sq.steps.length < 4) continue
    const missingIndex = 1 + Math.floor(rand() * (sq.steps.length - 2))
    const decoys = uniq([...conceptTerms, ...a.classifications.flatMap((g) => g.items)]).filter((t) => short(t) && !sq.steps.some((st) => same(st, t)))
    const options = shuffle(uniq([sq.steps[missingIndex], ...shuffle(decoys, rand).slice(0, 2)]), rand)
    if (options.length < 3) continue
    missing.push({ id: id('mis'), pieces: sq.steps, missingIndex, options, explanation: `خطوات «${sq.title}»: ${sq.steps.join(' ← ')}.`, source: sq.source })
  }

  // ---------------- Critical thinking ----------------
  const critical: CriticalItem[] = []
  for (const s of seqs) {
    for (let i = 0; i < s.steps.length - 1 && i < 2; i++) {
      const next = s.steps[i + 1]
      const options = shuffle(uniq([next, ...shuffle(s.steps.filter((_, k) => k !== i && k !== i + 1), rand).slice(0, 3)]), rand)
      critical.push({
        id: id('crit'),
        scenario: `في «${s.title}»، تخيّلوا أن «${truncateWords(s.steps[i], 10)}» لم تحدث.`,
        question: 'أي خطوة ستتأثر أولًا ومباشرة؟ ولماذا؟',
        options,
        correctIndex: options.indexOf(next),
        rubric: [`تحدّثوا عن الخطوة التالية مباشرة: «${truncateWords(next, 8)}».`, 'شرحوا أن كل خطوة تعتمد على الخطوة التي قبلها.', `ذكروا الترتيب الكامل: ${s.steps.map((x) => truncateWords(x, 4)).join(' ← ')}.`],
        explanation: `الترتيب الصحيح: ${s.steps.join(' ← ')}. لذلك أول ما يتأثر هو «${next}».`,
        source: s.source,
      })
    }
  }
  for (const c of a.concepts) {
    if (critical.length >= 10) break
    if (words(c.definition).length < 4) continue
    const others = a.concepts.filter((o) => o.id !== c.id && words(o.definition).length >= 3)
    if (others.length < 2) continue
    const correct = truncateWords(c.definition, 12)
    const options = shuffle(uniq([correct, ...shuffle(others, rand).slice(0, 3).map((o) => truncateWords(o.definition, 12))]), rand)
    const related = a.relations.filter((r) => same(r.from, c.term) && r.label === 'يرتبط بـ').map((r) => r.to)
    const keyWords = contentWords(c.definition).filter((w) => !same(w, c.term)).slice(0, 3)
    critical.push({
      id: id('crit'),
      scenario: `تخيّلوا أن «${c.term}» اختفى تمامًا ولم يعد موجودًا.`,
      question: 'أي وصف من الدرس سيختفي معه؟ وما أثر ذلك؟',
      options,
      correctIndex: options.indexOf(correct),
      rubric: [
        `ربطوا «${c.term}» بوصفه الصحيح.`,
        ...(keyWords.length ? [`استخدموا كلمات الدرس مثل: ${keyWords.join('، ')}.`] : []),
        ...(related.length ? [`ذكروا ارتباطه بـ «${related.slice(0, 2).join('» و«')}».`] : ['قدّموا مثالًا أو نتيجة منطقية لاختفائه.']),
      ],
      explanation: `«${c.term}»: ${c.definition}.`,
      source: c.source,
    })
  }

  // ---------------- Build the answer ----------------
  const build: BuildItem[] = []
  const pairsOf = (s: string) => {
    const w = stripDiacritics(s).split(/\s+/)
    const out: string[] = []
    for (let i = 0; i < w.length; i += 2) out.push(w.slice(i, i + 2).join(' '))
    return out
  }
  for (const c of a.concepts) {
    const wc = words(c.definition).length
    if (wc < 4 || wc > 16) continue
    const chunks = pairsOf(c.definition)
    const decoys = shuffle(a.concepts.filter((o) => o.id !== c.id).flatMap((o) => pairsOf(o.definition)), rand).filter((d) => !chunks.some((ch) => same(ch, d)))
    build.push({
      id: id('bld'), prompt: `ما المقصود بـ «${c.term}»؟ ابنوا الإجابة بالترتيب الصحيح.`, chunks, distractors: uniq(decoys).slice(0, 2),
      explanation: `«${c.term}»: ${c.definition}.`, source: c.source,
    })
  }

  // ---------------- Mystery detective ----------------
  const detective: DetectiveCase[] = []
  const usable = a.concepts.filter((c) => words(c.definition).length >= 5)
  for (let k = 0; k < usable.length && detective.length < 3; k += 2) {
    const culprit = usable[k]
    const suspects = shuffle([culprit.term, ...shuffle(a.concepts.filter((c) => c.id !== culprit.id).map((c) => c.term), rand).slice(0, 3)], rand)
    if (suspects.length < 3) continue
    const w = stripDiacritics(culprit.definition).split(/\s+/)
    const third = Math.ceil(w.length / 3)
    const clueTexts = [w.slice(0, third), w.slice(0, third * 2), w].map((x) => x.join(' '))
    const questions = shuffle(trueFalse.filter((t) => t.source !== culprit.source && !normalize(t.statement).includes(normalize(culprit.term))), rand)
    if (questions.length < 3) continue
    detective.push({
      id: id('det'),
      story: `قضية غامضة في درس «${lesson.title}»: أحد المشتبه بهم يخفي سرًّا من الدرس. أجيبوا عن أسئلة التحقيق لتكشفوا الأدلة، ثم وجّهوا الاتهام!`,
      suspects,
      culprit: culprit.term,
      evidence: clueTexts.map((clue, i) => ({ clue: `يوصف الفاعل بأنه: «${clue}${i < 2 ? '…' : ''}»`, question: questions[i] })),
      explanation: `الفاعل هو «${culprit.term}» لأن الدرس يقول: ${culprit.definition}.`,
      source: culprit.source,
    })
  }

  // ---------------- Single words (crossword / word search) ----------------
  const wordItems: WordItem[] = []
  const seenW = new Set<string>()
  for (const t of uniq([...conceptTerms, ...a.terms])) {
    if (words(t).length !== 1) continue
    let w = stripDiacritics(t).replace(/ـ/g, '')
    if (/^ال/.test(w) && w.length - 2 >= 3) w = w.slice(2)
    if (w.length < 3 || w.length > 9 || /[^ء-ي]/.test(w) || seenW.has(w)) continue
    const concept = a.concepts.find((c) => same(c.term, t))
    const sentence = a.sentences.find((s) => stripDiacritics(s).includes(stripDiacritics(t)))
    const clue = concept ? truncateWords(concept.definition, 11) : sentence ? truncateWords(stripDiacritics(sentence).replace(stripDiacritics(t), '____'), 12) : ''
    if (!clue) continue
    seenW.add(w)
    wordItems.push({ id: id('w'), word: w, term: t, clue })
    if (wordItems.length >= 10) break
  }

  return { patterns, oddOne, logic, missing, critical: critical.filter((c) => c.correctIndex >= 0), build, detective, words: wordItems }
}
