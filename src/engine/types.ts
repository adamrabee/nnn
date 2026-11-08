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
