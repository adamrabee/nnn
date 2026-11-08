// Sound effects synthesised with the Web Audio API: no audio files, works offline.
// Every sound has a text caption, so it can also be shown visually (hearing support).

export type SoundName =
  | 'click'
  | 'select'
  | 'correct'
  | 'wrong'
  | 'flip'
  | 'match'
  | 'reveal'
  | 'stage'
  | 'unlock'
  | 'win'
  | 'tick'
  | 'star'
  | 'whoosh'
  | 'drumroll'
  | 'applause'
  | 'hint'
  | 'turn'

export const SOUND_CAPTION: Record<SoundName, string> = {
  click: 'نقرة',
  select: 'تم الاختيار',
  correct: 'إجابة صحيحة!',
  wrong: 'ليست الإجابة الصحيحة',
  flip: 'قلب بطاقة',
  match: 'تطابق!',
  reveal: 'كشف الإجابة',
  stage: 'اكتملت المرحلة',
  unlock: 'فُتح القفل!',
  win: 'نهاية اللعبة — مبروك!',
  tick: 'الوقت يقترب من النهاية',
  star: 'نجمة جديدة',
  whoosh: 'انتقال',
  drumroll: 'لحظة الاختيار…',
  applause: 'تصفيق',
  hint: 'تلميح',
  turn: 'دور فريق جديد',
}

interface Settings {
  effects: boolean
  music: boolean
  volume: number // 0..1
  gentle: boolean
}

type CueListener = (name: SoundName) => void

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private settings: Settings = { effects: true, music: false, volume: 0.7, gentle: false }
  private listeners = new Set<CueListener>()

  configure(s: Partial<Settings>) {
    const wasMusic = this.settings.music
    this.settings = { ...this.settings, ...s }
    if (this.master) this.master.gain.value = this.settings.volume
    if (this.musicGain) this.musicGain.gain.value = this.settings.gentle ? 0.05 : 0.09
    if (this.settings.music && !wasMusic) this.startMusic()
    if (!this.settings.music && wasMusic) this.stopMusic()
  }

  onCue(fn: CueListener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** Browsers only allow audio after a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.settings.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (this.settings.music && this.musicTimer === null) this.startMusic()
  }

  play(name: SoundName) {
    this.listeners.forEach((l) => l(name))
    if (!this.settings.effects) return
    this.unlock()
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const g = this.settings.gentle
    // Loud / sudden sounds are skipped entirely in gentle (low stimulation) mode.
    if (g && (name === 'applause' || name === 'drumroll' || name === 'tick')) return
    const t = ctx.currentTime + 0.01
    const v = g ? 0.5 : 1
    switch (name) {
      case 'click':
        this.tone(660, t, 0.05, 'triangle', 0.18 * v)
        break
      case 'select':
        this.tone(520, t, 0.07, 'triangle', 0.22 * v)
        this.tone(780, t + 0.05, 0.08, 'triangle', 0.18 * v)
        break
      case 'turn':
        this.tone(440, t, 0.1, 'sine', 0.2 * v)
        this.tone(660, t + 0.1, 0.14, 'sine', 0.2 * v)
        break
      case 'correct':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.08, g ? 0.25 : 0.32, 'triangle', 0.24 * v))
        if (!g) this.tone(1567.98, t + 0.34, 0.4, 'sine', 0.08)
        break
      case 'wrong':
        // Soft, low and short — informative, not punishing.
        this.tone(330, t, 0.16, 'sine', 0.2 * v)
        this.tone(262, t + 0.15, 0.26, 'sine', 0.18 * v)
        break
      case 'flip':
        this.sweep(300, 900, t, 0.09, 'triangle', 0.16 * v)
        break
      case 'match':
        this.tone(784, t, 0.12, 'triangle', 0.22 * v)
        this.tone(1175, t + 0.09, 0.22, 'triangle', 0.2 * v)
        break
      case 'reveal':
        this.sweep(400, 1200, t, 0.25, 'sine', 0.16 * v)
        break
      case 'hint':
        ;[880, 1108, 1318].forEach((f, i) => this.tone(f, t + i * 0.06, 0.18, 'sine', 0.1 * v))
        break
      case 'star':
        ;[1318.5, 1760, 2093].forEach((f, i) => this.tone(f, t + i * 0.07, 0.3, 'sine', 0.13 * v))
        break
      case 'whoosh':
        this.noise(t, 0.35, 0.12 * v, 600, 3000)
        break
      case 'stage':
        ;[392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, t + i * 0.11, 0.35, 'triangle', 0.22 * v))
        break
      case 'unlock':
        this.tone(220, t, 0.06, 'square', 0.12 * v)
        this.tone(330, t + 0.08, 0.06, 'square', 0.12 * v)
        ;[523.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + 0.2 + i * 0.09, 0.45, 'triangle', 0.22 * v))
        break
      case 'tick':
        this.tone(1000, t, 0.03, 'square', 0.08)
        break
      case 'drumroll':
        for (let i = 0; i < 16; i++) this.noise(t + i * 0.05, 0.05, 0.08 + i * 0.006, 150, 900)
        this.noise(t + 0.85, 0.25, 0.25, 80, 600)
        break
      case 'applause':
        for (let i = 0; i < 40; i++) this.noise(t + Math.random() * 1.6, 0.04, 0.05 + Math.random() * 0.06, 1000, 5000)
        break
      case 'win': {
        const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]
        const durs = [0.15, 0.15, 0.15, 0.3, 0.15, 0.6]
        let acc = 0
        melody.forEach((f, i) => {
          this.tone(f, t + acc, durs[i] + 0.1, 'triangle', 0.24 * v)
          this.tone(f / 2, t + acc, durs[i] + 0.1, 'sine', 0.12 * v)
          acc += durs[i]
        })
        break
      }
    }
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const gn = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, start)
    gn.gain.setValueAtTime(0.0001, start)
    gn.gain.exponentialRampToValueAtTime(vol, start + 0.015)
    gn.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    o.connect(gn).connect(this.master!)
    o.start(start)
    o.stop(start + dur + 0.05)
  }

  private sweep(from: number, to: number, start: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const gn = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(from, start)
    o.frequency.exponentialRampToValueAtTime(to, start + dur)
    gn.gain.setValueAtTime(0.0001, start)
    gn.gain.exponentialRampToValueAtTime(vol, start + 0.02)
    gn.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    o.connect(gn).connect(this.master!)
    o.start(start)
    o.stop(start + dur + 0.05)
  }

  private noise(start: number, dur: number, vol: number, low: number, high: number) {
    const ctx = this.ctx!
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = (low + high) / 2
    bp.Q.value = (low + high) / 2 / (high - low)
    const gn = ctx.createGain()
    gn.gain.value = vol
    src.connect(bp).connect(gn).connect(this.master!)
    src.start(start)
  }

  // Calm generative background music: slow pentatonic arpeggio over soft pads.
  private startMusic() {
    if (!this.ctx || !this.master || this.musicTimer !== null) return
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = this.settings.gentle ? 0.05 : 0.09
    this.musicGain.connect(this.master)
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]
    const chords = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]]
    let step = 0
    const tick = () => {
      const ctx = this.ctx!
      const t = ctx.currentTime + 0.05
      if (step % 8 === 0) {
        const chord = chords[(step / 8) % chords.length]
        chord.forEach((f) => this.musicNote(f / 2, t, 3.6, 'sine', 0.35))
      }
      if (Math.random() > 0.35) this.musicNote(scale[Math.floor(Math.random() * scale.length)], t, 0.9, 'triangle', 0.28)
      step++
    }
    tick()
    this.musicTimer = window.setInterval(tick, 450)
  }

  private musicNote(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const gn = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    gn.gain.setValueAtTime(0.0001, start)
    gn.gain.linearRampToValueAtTime(vol, start + Math.min(0.4, dur / 3))
    gn.gain.linearRampToValueAtTime(0.0001, start + dur)
    o.connect(gn).connect(this.musicGain!)
    o.start(start)
    o.stop(start + dur + 0.05)
  }

  private stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
    if (this.musicGain && this.ctx) {
      const g = this.musicGain
      g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5)
      window.setTimeout(() => g.disconnect(), 700)
    }
    this.musicGain = null
  }
}

export const sound = new SoundEngine()
