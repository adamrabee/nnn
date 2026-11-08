import { z } from 'zod'

// The structured shape Claude must return. Kept deliberately flat; the
// browser converts it into the app's GeneratedContent model and re-checks
// every item against the lesson text (grounding check).
const level = z.number().int().min(1).max(3)

export const LessonGameSchema = z.object({
  concepts: z.array(z.object({ term: z.string(), definition: z.string(), source: z.string() })),
  sequences: z.array(z.object({ title: z.string(), steps: z.array(z.string()), source: z.string() })),
  classifications: z.array(z.object({ group: z.string(), items: z.array(z.string()), source: z.string() })),
  keyPoints: z.array(z.string()),
  objectives: z.array(z.string()),
  needsExplanation: z.array(z.string()),
  mcq: z.array(
    z.object({
      prompt: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
      hint: z.string(),
      difficulty: level,
      concept: z.string(),
      source: z.string(),
      simplePrompt: z.string(),
    }),
  ),
  trueFalse: z.array(
    z.object({
      statement: z.string(),
      isTrue: z.boolean(),
      correction: z.string(),
      explanation: z.string(),
      hint: z.string(),
      difficulty: level,
      concept: z.string(),
      source: z.string(),
    }),
  ),
  mistakes: z.array(
    z.object({
      sentence: z.string(),
      wrong: z.string(),
      correct: z.string(),
      explanation: z.string(),
      hint: z.string(),
      concept: z.string(),
      source: z.string(),
    }),
  ),
  insufficient: z.array(z.object({ game: z.string(), reason: z.string() })),
})

export type LessonGameOutput = z.infer<typeof LessonGameSchema>
