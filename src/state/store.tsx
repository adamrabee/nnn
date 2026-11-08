import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { GeneratedContent, Lesson, LessonAnalysis, SessionConfig, Team } from '../engine/types'
import { ensureContent } from '../engine/generate'
import type { ResultEntry } from '../games/session'

export interface RunResult {
  teams: Team[]
  results: ResultEntry[]
}

export interface LessonBundle {
  lesson: Lesson
  analysis: LessonAnalysis
  content: GeneratedContent
  aiNotes: string[]
  /** Set when the lesson is saved in the Supabase library. */
  remoteId?: string
}

interface Ctx {
  bundle: LessonBundle | null
  setBundle: (b: LessonBundle | null) => void
  updateContent: (fn: (c: GeneratedContent) => GeneratedContent) => void
  /** Session = teams + scores. Lives in memory only and disappears on refresh. */
  session: SessionConfig | null
  setSession: (s: SessionConfig | null) => void
  /** Results of the game that just ended — memory only, gone on refresh. */
  lastRun: RunResult | null
  setLastRun: (r: RunResult | null) => void
}

// Only the TEACHER's lesson content is kept on this device so a refresh does not lose it.
// No student data, scores or names are ever stored.
const KEY = 'droos:lesson'

function load(): LessonBundle | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const b = JSON.parse(raw) as LessonBundle
    return { ...b, content: ensureContent(b.lesson, b.analysis, b.content) }
  } catch {
    return null
  }
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<LessonBundle | null>(load)
  const [session, setSession] = useState<SessionConfig | null>(null)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  useEffect(() => {
    try {
      if (bundle) localStorage.setItem(KEY, JSON.stringify(bundle))
      else localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }, [bundle])

  return (
    <StoreContext.Provider
      value={{
        bundle,
        setBundle,
        updateContent: (fn) => setBundle((b) => (b ? { ...b, content: fn(b.content) } : b)),
        session,
        setSession,
        lastRun,
        setLastRun,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const c = useContext(StoreContext)
  if (!c) throw new Error('StoreProvider missing')
  return c
}
