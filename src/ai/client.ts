import { analyzeLesson } from '../engine/analyze'
import { iconFor, includesNormalized, normalize, overlap, splitSentences, uid } from '../engine/arabic'
import { generateContent, LETTERS } from '../engine/generate'
import type { ChoiceQuestion, Difficulty, GeneratedContent, Lesson, LessonAnalysis, LessonStructure, MistakeItem, TrueFalseItem } from '../engine/types'

export interface AiStatus {
  ai: boolean
  model: string | null
}

/** Asks the server whether an AI key is configured. Never assumes it is. */
export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const r = await fetch('/api/status', { headers: { accept: 'application/json' } })
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return { ai: false, model: null }
    const j = await r.json()
    return { ai: Boolean(j.ai), model: j.model ?? null }
  } catch {
    return { ai: false, model: null }
  }
}

export interface BuildResult {
  analysis: LessonAnalysis
  content: GeneratedContent
  aiNotes: string[]
}

/** Local mode: everything happens in the browser, nothing leaves the device. */
export function buildLocal(lesson: Lesson): BuildResult {
  const analysis = analyzeLesson(lesson)
  return { analysis, content: generateContent(lesson, analysis), aiNotes: [] }
}

interface RawAi {
  concepts: { term: string; definition: string; source: string }[]
  sequences: { title: string; steps: string[]; source: string }[]
  classifications: { group: string; items: string[]; source: string }[]
  keyPoints: string[]
  objectives: string[]
  needsExplanation: string[]
  mcq: { prompt: string; options: string[]; correctIndex: number; explanation: string; hint: string; difficulty: number; concept: string; source: string; simplePrompt: string }[]
  trueFalse: { statement: string; isTrue: boolean; correction: string; explanation: string; hint: string; difficulty: number; concept: string; source: string }[]
  mistakes: { sentence: string; wrong: string; correct: string; explanation: string; hint: string; concept: string; source: string }[]
  insufficient: { game: string; reason: string }[]
}

const AI_ERRORS: Record<string, string> = {
  ai_not_configured: 'خدمة الذكاء الاصطناعي غير مُعدّة على الخادم.',
  lesson_too_short: 'نص الدرس قصير جدًا.',
  lesson_too_long: 'نص الدرس طويل جدًا (الحد 20,000 حرف).',
  rate_limited: 'الخدمة مشغولة الآن، حاول بعد قليل.',
  ai_auth_failed: 'مفتاح الخدمة على الخادم غير صالح.',
  refused: 'رفضت الخدمة معالجة هذا النص.',
}

/** AI mode: sends only the lesson text to our server, which calls Claude. */
export async function buildWithAi(lesson: Lesson): Promise<BuildResult> {
  const r = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: lesson.title, subject: lesson.subject, grade: lesson.grade, content: lesson.content }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(AI_ERRORS[j.error] ?? 'تعذر الاتصال بخدمة الذكاء الاصطناعي.')
  return convertAi(lesson, j.result as RawAi)
}

/** A sentence counts as grounded if it overlaps enough with some lesson sentence. */
function grounded(lessonSentences: string[], text: string): boolean {
  if (!text) return false
  return lessonSentences.some((s) => overlap(s, text) >= 0.6)
}

const lvl = (n: number): Difficulty => (n <= 1 ? 1 : n >= 3 ? 3 : 2)

export function convertAi(lesson: Lesson, raw: RawAi): BuildResult {
  const local = analyzeLesson(lesson)
  const sentences = splitSentences(lesson.content)
  const notes: string[] = []

  // Anti-invention: drop concepts whose term is not in the lesson text.
  const concepts = (raw.concepts ?? []).filter((c) => c.term && includesNormalized(lesson.content, c.term))
  const dropped = (raw.concepts ?? []).length - concepts.length
  if (dropped > 0) notes.push(`تم استبعاد ${dropped} مفهوم/مفاهيم لا تظهر في نص الدرس.`)

  const analysis: LessonAnalysis = {
    ...local,
    concepts: concepts.map((c) => ({ id: uid('c'), term: c.term.trim(), definition: c.definition.trim(), source: c.source })),
    sequences: (raw.sequences ?? []).filter((s) => s.steps?.length >= 3).map((s) => ({ id: uid('s'), title: s.title, steps: s.steps, source: s.source })),
    classifications: (raw.classifications ?? []).filter((g) => g.items?.length >= 2).map((g) => ({ id: uid('g'), group: g.group, items: g.items, source: g.source })),
    keyPoints: raw.keyPoints?.length ? raw.keyPoints : local.keyPoints,
    objectives: raw.objectives?.length ? raw.objectives : local.objectives,
    needsExplanation: raw.needsExplanation ?? local.needsExplanation,
  }
  analysis.terms = [...new Set([...analysis.concepts.map((c) => c.term), ...local.terms])]
  const structure = new Set<LessonStructure>(local.structure)
  if (analysis.concepts.length >= 2) structure.add('definitions')
  if (analysis.sequences.length) structure.add('process')
  if (analysis.classifications.length) structure.add('classification')
  analysis.structure = [...structure]

  // Pairs, scramble and sequences come from the (checked) AI analysis.
  const base = generateContent(lesson, analysis)

  const mcq: ChoiceQuestion[] = (raw.mcq ?? [])
    .filter((q) => q.options?.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
    .map((q): ChoiceQuestion => ({
      kind: 'mcq',
      id: uid('q'),
      prompt: q.prompt,
      options: q.options.slice(0, 4),
      correctIndex: Math.min(q.correctIndex, 3),
      explanation: q.explanation,
      hint: q.hint,
      difficulty: lvl(q.difficulty),
      concept: q.concept,
      source: q.source,
      needsReview: !grounded(sentences, q.source),
      accessible: { simple: q.simplePrompt || q.prompt, icon: iconFor(q.concept + ' ' + q.prompt), speak: `${q.prompt}. ${q.options.map((o, i) => `${LETTERS[i]}: ${o}`).join('. ')}` },
    }))
    .filter((q) => q.correctIndex < q.options.length)

  const trueFalse: TrueFalseItem[] = (raw.trueFalse ?? []).map((t): TrueFalseItem => ({
    kind: 'tf',
    id: uid('tf'),
    statement: t.statement,
    isTrue: t.isTrue,
    correction: t.correction,
    explanation: t.explanation,
    hint: t.hint,
    difficulty: lvl(t.difficulty),
    concept: t.concept,
    source: t.source,
    needsReview: !grounded(sentences, t.isTrue ? t.statement : t.correction),
    accessible: { simple: t.statement, icon: iconFor(t.statement), speak: `صح أم خطأ؟ ${t.statement}` },
  }))

  const mistakes: MistakeItem[] = (raw.mistakes ?? [])
    .filter((m) => m.wrong && m.sentence.includes(m.wrong) && normalize(m.wrong) !== normalize(m.correct))
    .map((m): MistakeItem => ({
      kind: 'mistake',
      id: uid('m'),
      sentence: m.sentence,
      wrong: m.wrong,
      correct: m.correct,
      explanation: m.explanation,
      hint: m.hint,
      difficulty: 2,
      concept: m.concept,
      source: m.source,
      needsReview: !grounded(sentences, m.source),
      accessible: { simple: m.sentence, icon: '🔎', speak: `ابحث عن الخطأ: ${m.sentence}` },
    }))

  const flagged = [...mcq, ...trueFalse, ...mistakes].filter((x) => x.needsReview).length
  if (flagged) notes.push(`${flagged} عنصرًا لم نجد له جملة مطابقة في الدرس — مُعلَّم بعلامة «راجِع» في صفحة المراجعة.`)
  for (const i of raw.insufficient ?? []) notes.push(`${i.game}: ${i.reason}`)

  const content: GeneratedContent = {
    ...base,
    generatedBy: 'ai',
    mcq: mcq.length >= 3 ? mcq : base.mcq,
    trueFalse: trueFalse.length >= 4 ? trueFalse : base.trueFalse,
    mistakes: mistakes.length >= 3 ? mistakes : base.mistakes,
  }
  content.closing = content.mcq.find((q) => q.difficulty === 2 && !q.needsReview) ?? content.mcq[0] ?? null
  if (content.closing) content.closing = { ...content.closing, id: uid('closing') }
  return { analysis, content, aiNotes: notes }
}
