import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { sound } from '../audio/sound'
import type { CompetitionMode, Team } from '../engine/types'
import { BADGES, SCORING } from './teams'

export interface ResultEntry {
  label: string
  correct: boolean
  concept: string
  teamId?: string
}

export interface Toast {
  id: number
  text: string
  icon: string
}

export interface GameApi {
  teams: Team[]
  mode: CompetitionMode
  activeTeam: Team
  /** Marks a correct answer for a team (default: the active team): points + star + streak. */
  correct: (teamId?: string, points?: number) => void
  /** Marks a wrong attempt: resets the streak only — never removes points. */
  wrong: (teamId?: string) => void
  bonus: (kind: 'explain' | 'teamwork' | 'complete', teamId?: string) => void
  record: (r: ResultEntry) => void
  nextTurn: () => void
  pickRandomTeam: () => void
  results: ResultEntry[]
  toasts: Toast[]
  pushToast: (text: string, icon?: string) => void
  resetScores: () => void
  rolling: boolean
}

const SessionContext = createContext<GameApi | null>(null)

export function GameSessionProvider({ initialTeams, mode, children }: { initialTeams: Team[]; mode: CompetitionMode; children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [activeIdx, setActiveIdx] = useState(0)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [rolling, setRolling] = useState(false)
  const failedOnce = useRef(new Set<string>())
  const toastId = useRef(0)

  const pushToast = useCallback((text: string, icon = '✨') => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-3), { id, text, icon }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const activeTeam = teams[Math.min(activeIdx, teams.length - 1)]

  const giveBadge = useCallback(
    (team: Team, key: keyof typeof BADGES): Team => {
      if (team.badges.includes(key)) return team
      pushToast(`${team.name}: ${BADGES[key].name}`, BADGES[key].icon)
      return { ...team, badges: [...team.badges, key] }
    },
    [pushToast],
  )

  const correct = useCallback(
    (teamId?: string, points = SCORING.correct) => {
      const id = teamId ?? activeTeam.id
      sound.play('star')
      setTeams((ts) =>
        ts.map((t) => {
          if (t.id !== id) return t
          let next: Team = { ...t, score: t.score + points, stars: t.stars + 1, streak: t.streak + 1, bestStreak: Math.max(t.bestStreak, t.streak + 1) }
          if (t.stars === 0) next = giveBadge(next, 'first')
          if (next.streak >= 3) next = giveBadge(next, 'streak3')
          if (failedOnce.current.has(id)) {
            next = giveBadge(next, 'persist')
            failedOnce.current.delete(id)
          }
          return next
        }),
      )
    },
    [activeTeam, giveBadge],
  )

  const wrong = useCallback(
    (teamId?: string) => {
      const id = teamId ?? activeTeam.id
      failedOnce.current.add(id)
      setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, streak: 0 } : t)))
    },
    [activeTeam],
  )

  const bonus = useCallback(
    (kind: 'explain' | 'teamwork' | 'complete', teamId?: string) => {
      const id = teamId ?? activeTeam.id
      sound.play('star')
      setTeams((ts) => ts.map((t) => (t.id === id ? giveBadge({ ...t, score: t.score + SCORING[kind] }, kind) : t)))
    },
    [activeTeam, giveBadge],
  )

  const pickRandomTeam = useCallback(() => {
    if (teams.length <= 1) return
    setRolling(true)
    sound.play('drumroll')
    let n = 0
    const spins = 10 + Math.floor(Math.random() * teams.length)
    const iv = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % teams.length)
      n++
      if (n >= spins) {
        window.clearInterval(iv)
        setRolling(false)
        sound.play('turn')
      }
    }, 90)
  }, [teams.length])

  /** Passes the turn: next team in order, or a random team in random-team mode. */
  const nextTurn = useCallback(() => {
    if (teams.length <= 1) return
    if (mode === 'random-team') return pickRandomTeam()
    setActiveIdx((i) => (i + 1) % teams.length)
    sound.play('turn')
  }, [teams.length, mode, pickRandomTeam])

  const api = useMemo<GameApi>(
    () => ({
      teams,
      mode,
      activeTeam,
      correct,
      wrong,
      bonus,
      record: (r) => setResults((rs) => [...rs, r]),
      nextTurn,
      pickRandomTeam,
      results,
      toasts,
      pushToast,
      resetScores: () => {
        setTeams((ts) => ts.map((t) => ({ ...t, score: 0, stars: 0, streak: 0, bestStreak: 0, badges: [] })))
        setResults([])
        setActiveIdx(0)
      },
      rolling,
    }),
    [teams, mode, activeTeam, correct, wrong, bonus, nextTurn, pickRandomTeam, results, toasts, pushToast, rolling],
  )
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useGame() {
  const c = useContext(SessionContext)
  if (!c) throw new Error('GameSessionProvider missing')
  return c
}
