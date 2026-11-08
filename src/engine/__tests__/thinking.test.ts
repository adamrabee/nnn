import { describe, expect, it } from 'vitest'
import { parseNames } from '../../lib/roster'
import { analyzeLesson } from '../analyze'
import { normalize } from '../arabic'
import { GAMES } from '../catalog'
import { ensureContent, generateContent } from '../generate'
import { buildCrossword, buildWordSearch } from '../grids'
import { SAMPLE_LESSONS } from '../samples'

const build = (id: string) => {
  const l = SAMPLE_LESSONS.find((x) => x.id === id)!
  return { l, c: generateContent(l, analyzeLesson(l)) }
}

describe('thinking games content', () => {
  it('logic puzzles have exactly one candidate consistent with the clues (sequence)', () => {
    const { c } = build('sample-solar')
    for (const p of c.logic) expect(p.candidates).toContain(p.answer)
    expect(c.logic.length).toBeGreaterThanOrEqual(2)
  })
  it('odd-one-out item really is outside the group', () => {
    const { c } = build('sample-grammar')
    for (const o of c.oddOne) {
      expect(o.oddIndex).toBeGreaterThanOrEqual(0)
      expect(o.items).toHaveLength(4)
    }
  })
  it('numeric patterns are computed from lesson numbers', () => {
    const { c } = build('sample-math')
    const p = c.patterns.find((x) => x.kind === 'numeric')!
    const nums = p.shown.map(Number)
    const step = nums[1] - nums[0]
    expect(Number(p.answer)).toBe(nums[3] + step)
    expect(p.options).toContain(p.answer)
  })
  it('critical items and missing pieces point at a valid option', () => {
    for (const l of SAMPLE_LESSONS) {
      const c = generateContent(l, analyzeLesson(l))
      for (const q of c.critical) expect(q.options[q.correctIndex]).toBeDefined()
      for (const m of c.missing) expect(m.options).toContain(m.pieces[m.missingIndex])
      for (const b of c.build) for (const d of b.distractors) expect(b.chunks.map(normalize)).not.toContain(normalize(d))
    }
  })
  it('detective culprit is one of the suspects', () => {
    const { c } = build('sample-digestive')
    expect(c.detective.length).toBeGreaterThan(0)
    for (const d of c.detective) expect(d.suspects).toContain(d.culprit)
  })
})

describe('grids', () => {
  it('crossword words read back from the grid and cross each other', () => {
    const { c } = build('sample-solar')
    const cw = buildCrossword(c.words, 'seed')!
    expect(cw.entries.length).toBeGreaterThanOrEqual(3)
    for (const e of cw.entries) {
      const read = [...e.word].map((_, i) => cw.letters[`${e.x + (e.dir === 'across' ? i : 0)},${e.y + (e.dir === 'down' ? i : 0)}`]).join('')
      expect(read).toBe(e.word)
    }
  })
  it('word search contains every placed word', () => {
    const { c } = build('sample-grammar')
    const ws = buildWordSearch(c.words, 'seed')!
    for (const p of ws.placements) expect(p.cells.map(([x, y]) => ws.grid[y][x]).join('')).toBe(p.word)
  })
})

describe('library compatibility', () => {
  it('fills in new game content for lessons saved before v2', () => {
    const { l, c } = build('sample-solar')
    const a = analyzeLesson(l)
    const old = { ...c } as Record<string, unknown>
    for (const k of ['patterns', 'oddOne', 'logic', 'missing', 'critical', 'build', 'detective', 'words']) delete old[k]
    const filled = ensureContent(l, a, old as unknown as typeof c)
    expect(filled.words.length).toBeGreaterThan(0)
    expect(GAMES.filter((g) => g.available(filled).ok).length).toBeGreaterThanOrEqual(15)
  })
})

describe('student roster import', () => {
  it('reads one name per line, CSV first column, skips headers and duplicates', () => {
    expect(parseNames('الاسم,الصف\nأحمد,5\nسارة,5\n\nأحمد,5\n1. يوسف')).toEqual(['أحمد', 'سارة', 'يوسف'])
  })
})
