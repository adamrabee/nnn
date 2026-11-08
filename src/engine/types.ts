// Structured data model shared by the analyzer, the generators and the games.
// Lesson content is kept separate from the game engine: games only ever read
// a `GeneratedContent` object, never the raw lesson text.

export interface Lesson {
  id: string
  title: string
  subject: string
  grade: string
  content: string
}

export type Difficulty = 1 | 2 | 3

export interface Concept {
  id: string
  term: string
  definition: string
  /** The lesson sentence this concept was taken from. */
  source: string
}

export interface Sequence {
  id: string
  title: string
  steps: string[]
  source: string
}

export interface Classification {
  id: string
  group: string
  items: string[]
  source: string
}

export interface Relation {
  from: string
  to: string
  label: string
}

export interface LessonAnalysis {
  sentences: string[]
  keyPoints: string[]
  concepts: Concept[]
  terms: string[]
  sequences: Sequence[]
  classifications: Classification[]
  relations: Relation[]
  objectives: string[]
  needsExplanation: string[]
  facts: string[]
  /** e.g. "definitions", "process", "science", "math" */
  structure: LessonStructure[]
  stats: { words: number; sentences: number }
}

export type LessonStructure = 'definitions' | 'process' | 'classification' | 'facts' | 'math'

export interface AccessibleView {
  /** Short, simplified version of the prompt. */
  simple: string
  /** Emoji used as a visual cue next to the text. */
  icon: string
  /** Text that will be read aloud by text-to-speech. */
  speak: string
}

interface BaseItem {
  id: string
  difficulty: Difficulty
  conceptId?: string
  concept: string
  explanation: string
  hint: string
  source: string
  accessible: AccessibleView
  /** True when an AI-generated item could not be matched to lesson text. */
  needsReview?: boolean
}

export interface ChoiceQuestion extends BaseItem {
  kind: 'mcq'
  prompt: string
  options: string[]
  correctIndex: number
  /** For arithmetic items: drives the number-line / dots visual support. */
  math?: { a: number; b: number; op: string; result: number }
}

export interface TrueFalseItem extends BaseItem {
  kind: 'tf'
  statement: string
  isTrue: boolean
  /** The correct statement shown in feedback when the item is false. */
  correction: string
}

export interface MistakeItem extends BaseItem {
  kind: 'mistake'
  /** Sentence containing one wrong word/phrase. */
  sentence: string
  wrong: string
  correct: string
}

export interface ScrambleItem extends BaseItem {
  kind: 'scramble'
  word: string
}

export interface PairItem {
  id: string
  term: string
  match: string
  source: string
  icon: string
}

export interface SequenceItem extends BaseItem {
  kind: 'sequence'
  title: string
  steps: string[]
}

export interface GeneratedContent {
  generatedBy: 'local' | 'ai'
  mcq: ChoiceQuestion[]
  trueFalse: TrueFalseItem[]
  mistakes: MistakeItem[]
  scramble: ScrambleItem[]
  pairs: PairItem[]
  sequences: SequenceItem[]
  closing: ChoiceQuestion | null
  keyLearnings: string[]
  // Thinking & word games (added in v2; older saved lessons are filled in on load)
  patterns: PatternItem[]
  oddOne: OddOneItem[]
  logic: LogicItem[]
  missing: MissingItem[]
  critical: CriticalItem[]
  build: BuildItem[]
  detective: DetectiveCase[]
  words: WordItem[]
}

/** "What comes next?" — tiles with a rule; the answer fills the "?" slot. */
export interface PatternItem {
  id: string
  kind: 'numeric' | 'sequence' | 'analogy'
  title: string
  shown: string[]
  answer: string
  options: string[]
  rule: string
  source: string
}

export interface OddOneItem {
  id: string
  items: string[]
  oddIndex: number
  group: string
  oddGroup: string
  explanation: string
  source: string
}

/** Deduction: candidates are crossed out as clues are revealed. */
export interface LogicItem {
  id: string
  candidates: string[]
  clues: string[]
  answer: string
  explanation: string
  source: string
}

/** A sentence split into puzzle pieces with one piece missing. */
export interface MissingItem {
  id: string
  pieces: string[]
  missingIndex: number
  options: string[]
  explanation: string
  source: string
}

export interface CriticalItem {
  id: string
  scenario: string
  question: string
  options: string[]
  correctIndex: number
  /** Ideas the teacher listens for when students justify their answer. */
  rubric: string[]
  explanation: string
  source: string
}

export interface BuildItem {
  id: string
  prompt: string
  chunks: string[]
  distractors: string[]
  explanation: string
  source: string
}

export interface DetectiveCase {
  id: string
  story: string
  suspects: string[]
  culprit: string
  evidence: { clue: string; question: TrueFalseItem }[]
  explanation: string
  source: string
}

/** Single words for the crossword and word search (written without «ال»). */
export interface WordItem {
  id: string
  word: string
  term: string
  clue: string
}

export type GameId =
  | 'knowledge-battle'
  | 'millionaire'
  | 'true-false'
  | 'matching'
  | 'memory'
  | 'sequence'
  | 'scramble'
  | 'spot-mistake'
  | 'escape-room'
  | 'patterns'
  | 'odd-one-out'
  | 'logic'
  | 'missing-piece'
  | 'critical'
  | 'crossword'
  | 'wheel'
  | 'build-answer'
  | 'detective'
  | 'word-search'

export type CompetitionMode =
  | 'pvp'
  | 'teams'
  | 'whole-class'
  | 'cooperative'
  | 'teacher-vs-students'
  | 'random-team'

export interface Team {
  id: string
  name: string
  color: string
  /** Shape is used together with colour so teams are never told apart by colour alone. */
  shape: string
  icon: string
  score: number
  stars: number
  streak: number
  bestStreak: number
  badges: string[]
}

export interface SessionConfig {
  gameId: GameId
  mode: CompetitionMode
  teams: Team[]
  difficulty: 'all' | Difficulty
  rounds: number
  timerSeconds: number | null
}
