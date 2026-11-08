import { describe, expect, it } from 'vitest'
import { convertAi } from '../../ai/client'
import { analyzeLesson, matchDefinition } from '../analyze'
import { normalize, stripDiacritics } from '../arabic'
import { buildStages, pickTheme } from '../adventure'
import { suggestGames } from '../catalog'
import { findMath, generateContent, swapTerm } from '../generate'
import { SAMPLE_LESSONS } from '../samples'
import type { Lesson } from '../types'

const lesson = (id: string) => SAMPLE_LESSONS.find((l) => l.id === id)!

describe('definition detection', () => {
  it('reads "X هو Y" definitions', () => {
    expect(matchDefinition('التبخر هو تحول الماء من الحالة السائلة إلى الحالة الغازية')).toEqual({
      term: 'التبخر',
      definition: 'تحول الماء من الحالة السائلة إلى الحالة الغازية',
    })
  })
  it('does not treat an inline list as a definition', () => {
    expect(matchDefinition('الكواكب الصخرية: عطارد، الزهرة، الأرض، المريخ')).toBeNull()
  })
  it('does not treat a numeric example as a definition', () => {
    expect(matchDefinition('مثال: 3 × 4 = 12')).toBeNull()
  })
})

describe('lesson analysis', () => {
  it('extracts concepts and the ordered list of the digestive lesson', () => {
    const a = analyzeLesson(lesson('sample-digestive'))
    expect(a.concepts.map((c) => c.term)).toContain('المريء')
    expect(a.sequences[0].steps).toEqual(['الفم', 'المريء', 'المعدة', 'الأمعاء الدقيقة', 'الأمعاء الغليظة'])
    expect(a.structure).toContain('process')
  })
  it('extracts ordinal steps (أولاً / ثم / أخيراً) as a sequence', () => {
    const a = analyzeLesson(lesson('sample-water'))
    expect(a.sequences.length).toBeGreaterThan(0)
    expect(a.sequences[0].steps).toHaveLength(4)
  })
  it('extracts classifications', () => {
    const a = analyzeLesson(lesson('sample-solar'))
    expect(a.classifications.map((g) => g.group)).toContain('الكواكب الصخرية')
  })
})

describe('content generation is grounded in the lesson', () => {
  for (const l of SAMPLE_LESSONS) {
    it(`${l.title}: every MCQ has a valid correct index and grounded answer`, () => {
      const a = analyzeLesson(l)
      const c = generateContent(l, a)
      expect(c.mcq.length).toBeGreaterThanOrEqual(3)
      const text = normalize(l.content)
      for (const q of c.mcq) {
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.options.length)
        expect(new Set(q.options.map(normalize)).size).toBe(q.options.length)
        // the correct option comes from the lesson (or is a computed arithmetic result)
        if (!q.math) expect(text).toContain(normalize(q.options[q.correctIndex].replace(/…$/, '')))
      }
    })
    it(`${l.title}: false statements are corrected with a lesson sentence`, () => {
      const a = analyzeLesson(l)
      const c = generateContent(l, a)
      for (const t of c.trueFalse.filter((x) => !x.isTrue)) expect(t.correction.length).toBeGreaterThan(0)
      for (const m of c.mistakes) {
        expect(m.sentence).toContain(m.wrong)
        expect(normalize(m.wrong)).not.toBe(normalize(m.correct))
      }
    })
  }
})

describe('swapTerm respects word boundaries', () => {
  it('does not replace inside another word', () => {
    const r = swapTerm('خاصية الإبدال تعني أن تغيير ترتيب العاملين لا يغير الناتج', ['العامل', 'الناتج', 'القسمة'], () => 0)
    expect(r?.original).toBe('الناتج')
    expect(r?.sentence).not.toContain('القسمةين')
  })
})

describe('math', () => {
  it('computes results itself and skips non-integer division', () => {
    const m = findMath('3 × 4 = 12 و ١٢ ÷ ٣ و 7 ÷ 2')
    expect(m.map((x) => x.result)).toEqual([12, 4])
  })
})

describe('game availability and adventures', () => {
  it('reports why a game is unavailable instead of inventing content', () => {
    const l: Lesson = { id: 'x', title: 'قصير', subject: 'العلوم', grade: '', content: 'الشمس نجم كبير. القمر يدور حول الأرض كل شهر تقريبًا في السماء.' }
    const a = analyzeLesson(l)
    const s = suggestGames(a, generateContent(l, a))
    const seq = s.find((x) => x.game.id === 'sequence')!
    expect(seq.ok).toBe(false)
    expect(seq.reason).toMatch(/يحتاج/)
  })
  it('chooses an adventure theme that fits the lesson', () => {
    expect(pickTheme(lesson('sample-solar')).key).toBe('space')
    expect(pickTheme(lesson('sample-digestive')).key).toBe('body')
    expect(pickTheme(lesson('sample-math')).key).toBe('math')
    expect(pickTheme(lesson('sample-grammar')).key).toBe('language')
  })
  it('builds varied stages', () => {
    const l = lesson('sample-digestive')
    const stages = buildStages(l, generateContent(l, analyzeLesson(l)))
    expect(new Set(stages.map((s) => s.type)).size).toBeGreaterThanOrEqual(4)
  })
})

describe('AI output conversion', () => {
  it('drops invented concepts and flags ungrounded questions', () => {
    const l = lesson('sample-water')
    const r = convertAi(l, {
      concepts: [
        { term: 'التبخر', definition: 'تحول الماء إلى بخار', source: 'التبخر هو تحول الماء من الحالة السائلة إلى الحالة الغازية بسبب الحرارة' },
        { term: 'التسامي', definition: 'تحول الجليد مباشرة إلى بخار', source: 'غير موجود' },
      ],
      sequences: [], classifications: [], keyPoints: [], objectives: [], needsExplanation: [], mistakes: [], insufficient: [],
      mcq: [1, 2, 3].map((i) => ({
        prompt: `سؤال ${i}`, options: ['أ', 'ب', 'ج'], correctIndex: 0, explanation: '', hint: '', difficulty: 1, concept: 'التبخر', simplePrompt: '',
        source: i === 1 ? 'التبخر هو تحول الماء من الحالة السائلة إلى الحالة الغازية بسبب الحرارة' : 'الجليد يذوب في الصيف بسرعة كبيرة جدا',
      })),
      trueFalse: [],
    })
    expect(r.analysis.concepts.map((c) => c.term)).toEqual(['التبخر'])
    expect(r.content.mcq.filter((q) => q.needsReview)).toHaveLength(2)
    expect(r.content.generatedBy).toBe('ai')
    expect(stripDiacritics(r.aiNotes.join(' '))).toMatch(/استبعاد/)
  })
})
