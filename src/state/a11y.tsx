import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sound } from '../audio/sound'

export interface A11yFlags {
  textScale: number
  spacing: boolean
  highlight: boolean
  highContrast: boolean
  reduceMotion: boolean
  effects: boolean
  music: boolean
  gentleSound: boolean
  captions: boolean
  autoRead: boolean
  icons: boolean
  numberVisuals: boolean
  simplified: boolean
  focus: boolean
  noTimer: boolean
  extraTime: boolean
  calm: boolean
}

export const DEFAULT_FLAGS: A11yFlags = {
  textScale: 1,
  spacing: false,
  highlight: false,
  highContrast: false,
  reduceMotion: false,
  effects: true,
  music: false,
  gentleSound: false,
  captions: false,
  autoRead: false,
  icons: true,
  numberVisuals: false,
  simplified: false,
  focus: false,
  noTimer: false,
  extraTime: false,
  calm: false,
}

export type PresetId =
  | 'reading'
  | 'visual'
  | 'audio'
  | 'focus'
  | 'low-stim'
  | 'extra-time'
  | 'simplified'
  | 'high-contrast'
  | 'large-text'
  | 'no-speed'

export interface Preset {
  id: PresetId
  name: string
  icon: string
  desc: string
  flags: Partial<A11yFlags>
}

/** Support tools for the whole activity — not diagnostic labels for students. */
export const PRESETS: Preset[] = [
  { id: 'reading', name: 'وضع القراءة الميسّرة', icon: '📖', desc: 'نص أكبر، مسافات أوسع بين الحروف والكلمات، وتمييز الكلمات المهمة.', flags: { textScale: 1.15, spacing: true, highlight: true } },
  { id: 'visual', name: 'وضع الدعم البصري', icon: '🖼️', desc: 'رموز بجانب النصوص، تمثيل الأعداد بصريًا، وعرض الأصوات كنصوص على الشاشة.', flags: { icons: true, numberVisuals: true, captions: true } },
  { id: 'audio', name: 'وضع الدعم الصوتي', icon: '🔊', desc: 'قراءة الأسئلة والتعليمات صوتيًا تلقائيًا (عند توفر صوت عربي في المتصفح).', flags: { autoRead: true } },
  { id: 'focus', name: 'وضع التركيز', icon: '🎯', desc: 'عناصر أقل على الشاشة، وخلفيات بسيطة، ومهمة واحدة في كل مرة.', flags: { focus: true, reduceMotion: true } },
  { id: 'low-stim', name: 'وضع التحفيز المنخفض', icon: '🌙', desc: 'بدون موسيقى، أصوات هادئة، ألوان هادئة، وبدون حركة أو وميض.', flags: { calm: true, reduceMotion: true, music: false, gentleSound: true } },
  { id: 'extra-time', name: 'وضع الوقت الإضافي', icon: '⏳', desc: 'ضعف الوقت عند استخدام المؤقت.', flags: { extraTime: true } },
  { id: 'simplified', name: 'وضع التعليمات المبسطة', icon: '🧩', desc: 'جمل أقصر، اختيارات أقل (3 بدل 4)، ومثال قبل بدء اللعب.', flags: { simplified: true } },
  { id: 'high-contrast', name: 'وضع التباين العالي', icon: '🌓', desc: 'تباين قوي بين النص والخلفية وحدود واضحة.', flags: { highContrast: true } },
  { id: 'large-text', name: 'وضع النص الكبير', icon: '🔠', desc: 'تكبير كل النصوص لتُقرأ من آخر الفصل.', flags: { textScale: 1.35 } },
  { id: 'no-speed', name: 'وضع بلا ضغط وقت', icon: '🐢', desc: 'إيقاف المؤقت تمامًا؛ لا نقاط على السرعة.', flags: { noTimer: true } },
]

interface Stored {
  presets: PresetId[]
  manual: Partial<A11yFlags>
}

const KEY = 'malaab:a11y'

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* storage unavailable */
  }
  return { presets: [], manual: {} }
}

export function combine(presets: PresetId[], manual: Partial<A11yFlags>): A11yFlags {
  const f: A11yFlags = { ...DEFAULT_FLAGS }
  for (const id of presets) {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) continue
    for (const [k, v] of Object.entries(p.flags) as [keyof A11yFlags, never][]) {
      if (k === 'textScale') f.textScale = Math.max(f.textScale, v as number)
      else if (k === 'music' || k === 'effects') (f[k] as boolean) = (f[k] as boolean) && (v as boolean)
      else (f[k] as boolean) = (f[k] as boolean) || (v as boolean)
    }
  }
  return { ...f, ...manual }
}

interface Ctx {
  flags: A11yFlags
  presets: PresetId[]
  manual: Partial<A11yFlags>
  togglePreset: (id: PresetId) => void
  setFlag: <K extends keyof A11yFlags>(k: K, v: A11yFlags[K]) => void
  reset: () => void
}

const A11yContext = createContext<Ctx | null>(null)

export function A11yProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(load)
  const flags = useMemo(() => combine(state.presets, state.manual), [state])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--text-scale', String(flags.textScale))
    const classes: [string, boolean][] = [
      ['a-spacing', flags.spacing],
      ['a-highlight', flags.highlight],
      ['a-contrast', flags.highContrast],
      ['a-reduce-motion', flags.reduceMotion],
      ['a-focus', flags.focus],
      ['a-calm', flags.calm],
      ['a-no-icons', !flags.icons],
    ]
    classes.forEach(([c, on]) => root.classList.toggle(c, on))
    sound.configure({ effects: flags.effects, music: flags.music, gentle: flags.gentleSound || flags.calm })
  }, [flags])

  const value: Ctx = {
    flags,
    presets: state.presets,
    manual: state.manual,
    togglePreset: (id) =>
      setState((s) => {
        const on = s.presets.includes(id)
        const preset = PRESETS.find((p) => p.id === id)!
        // Turning a preset on/off clears manual overrides for the flags it controls.
        const manual = { ...s.manual }
        for (const k of Object.keys(preset.flags)) delete manual[k as keyof A11yFlags]
        return { presets: on ? s.presets.filter((p) => p !== id) : [...s.presets, id], manual }
      }),
    setFlag: (k, v) => setState((s) => ({ ...s, manual: { ...s.manual, [k]: v } })),
    reset: () => setState({ presets: [], manual: {} }),
  }
  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
}

export function useA11y() {
  const c = useContext(A11yContext)
  if (!c) throw new Error('A11yProvider missing')
  return c
}
