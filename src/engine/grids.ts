import { seededRandom, shuffle } from './arabic'
import type { WordItem } from './types'

// Coordinates: x = 0 is the RIGHTMOST column (grids are rendered right-to-left),
// so an "across" word reads in the natural Arabic direction with x increasing.

export interface CrossEntry {
  number: number
  dir: 'across' | 'down'
  x: number
  y: number
  word: string
  clue: string
  term: string
}

export interface Crossword {
  width: number
  height: number
  letters: Record<string, string>
  numbers: Record<string, number>
  entries: CrossEntry[]
}

const key = (x: number, y: number) => `${x},${y}`

interface Placed {
  item: WordItem
  x: number
  y: number
  dir: 'across' | 'down'
}

function canPlace(grid: Map<string, string>, word: string, x: number, y: number, dir: 'across' | 'down') {
  const dx = dir === 'across' ? 1 : 0
  const dy = dir === 'down' ? 1 : 0
  if (grid.has(key(x - dx, y - dy)) || grid.has(key(x + dx * word.length, y + dy * word.length))) return -1
  let crossings = 0
  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i
    const cy = y + dy * i
    const cur = grid.get(key(cx, cy))
    if (cur) {
      if (cur !== word[i]) return -1
      crossings++
    } else if (grid.has(key(cx + dy, cy + dx)) || grid.has(key(cx - dy, cy - dx))) {
      // a new letter may not touch another word side by side
      return -1
    }
  }
  return crossings
}

export function buildCrossword(items: WordItem[], seed = 'x', maxWords = 8): Crossword | null {
  const words = [...items].sort((a, b) => b.word.length - a.word.length).slice(0, 12)
  if (words.length < 2) return null
  const grid = new Map<string, string>()
  const placed: Placed[] = []
  const put = (p: Placed) => {
    for (let i = 0; i < p.item.word.length; i++) grid.set(key(p.x + (p.dir === 'across' ? i : 0), p.y + (p.dir === 'down' ? i : 0)), p.item.word[i])
    placed.push(p)
  }
  put({ item: words[0], x: 0, y: 0, dir: 'across' })
  const rand = seededRandom(seed)
  let pending = words.slice(1)
  for (let pass = 0; pass < 2 && placed.length < maxWords; pass++) {
    const skipped: WordItem[] = []
    for (const w of pending) {
      if (placed.length >= maxWords) break
      let best: { p: Placed; score: number } | null = null
      for (const p of shuffle(placed, rand)) {
        const dir = p.dir === 'across' ? 'down' : 'across'
        for (let i = 0; i < p.item.word.length; i++) {
          const px = p.x + (p.dir === 'across' ? i : 0)
          const py = p.y + (p.dir === 'down' ? i : 0)
          for (let j = 0; j < w.word.length; j++) {
            if (w.word[j] !== p.item.word[i]) continue
            const x = dir === 'across' ? px - j : px
            const y = dir === 'down' ? py - j : py
            const score = canPlace(grid, w.word, x, y, dir)
            if (score > 0 && (!best || score > best.score)) best = { p: { item: w, x, y, dir }, score }
          }
        }
      }
      if (best) put(best.p)
      else skipped.push(w)
    }
    pending = skipped
  }
  if (placed.length < 2) return null
  const xs = [...grid.keys()].map((k) => Number(k.split(',')[0]))
  const ys = [...grid.keys()].map((k) => Number(k.split(',')[1]))
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const letters: Record<string, string> = {}
  for (const [k, v] of grid) {
    const [x, y] = k.split(',').map(Number)
    letters[key(x - minX, y - minY)] = v
  }
  const starts = placed
    .map((p) => ({ ...p, x: p.x - minX, y: p.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const numbers: Record<string, number> = {}
  let num = 0
  const entries: CrossEntry[] = starts.map((p) => {
    const k = key(p.x, p.y)
    if (!numbers[k]) numbers[k] = ++num
    return { number: numbers[k], dir: p.dir, x: p.x, y: p.y, word: p.item.word, clue: p.item.clue, term: p.item.term }
  })
  return { width: Math.max(...xs) - minX + 1, height: Math.max(...ys) - minY + 1, letters, numbers, entries }
}

export interface WordSearch {
  size: number
  grid: string[][]
  placements: { word: string; clue: string; term: string; cells: [number, number][] }[]
}

const FILL = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'
const DIRS: [number, number][] = [
  [1, 0], // across (reads right → left on screen)
  [0, 1], // down
  [1, 1], // diagonal
]

export function buildWordSearch(items: WordItem[], seed = 'x', maxWords = 8): WordSearch | null {
  const list = items.slice(0, maxWords)
  if (list.length < 3) return null
  const longest = Math.max(...list.map((w) => w.word.length))
  const size = Math.min(12, Math.max(8, longest + 2))
  const rand = seededRandom(seed)
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const placements: WordSearch['placements'] = []
  for (const w of [...list].sort((a, b) => b.word.length - a.word.length)) {
    let done = false
    for (let attempt = 0; attempt < 200 && !done; attempt++) {
      const [dx, dy] = DIRS[Math.floor(rand() * DIRS.length)]
      const x0 = Math.floor(rand() * (size - (dx ? w.word.length : 0) + (dx ? 1 : 0)))
      const y0 = Math.floor(rand() * (size - (dy ? w.word.length : 0) + (dy ? 1 : 0)))
      const cells: [number, number][] = []
      let ok = true
      for (let i = 0; i < w.word.length; i++) {
        const x = x0 + dx * i
        const y = y0 + dy * i
        if (x >= size || y >= size || (grid[y][x] && grid[y][x] !== w.word[i])) {
          ok = false
          break
        }
        cells.push([x, y])
      }
      if (!ok) continue
      cells.forEach(([x, y], i) => (grid[y][x] = w.word[i]))
      placements.push({ word: w.word, clue: w.clue, term: w.term, cells })
      done = true
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!grid[y][x]) grid[y][x] = FILL[Math.floor(rand() * FILL.length)]
  return placements.length >= 3 ? { size, grid, placements } : null
}
