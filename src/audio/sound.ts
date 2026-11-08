// Calm, clean interface sounds synthesised with the Web Audio API (no files, works offline).
// Design: mellow marimba / bell voices, soft attacks, short decays, a gentle
// room reverb, and a compressor + low-pass on the master so nothing is sharp or loud.

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
  | 'spin'

export const SOUND_CAPTION: Record<SoundName, string> = {
  click: 'نقرة',
  select: 'تم الاختيار',
  correct: 'إجابة صحيحة!',
  wrong: 'ليست الإجابة الصحيحة',
  flip: 'قلب بطاقة',
  match: 'تطابق!',
  reveal: 'كشف',
  stage: 'اكتملت المرحلة',
  unlock: 'فُتح القفل!',
  win: 'نهاية اللعبة — مبروك!',
  tick: 'تكّة',
  star: 'نقاط جديدة',
  whoosh: 'انتقال',
  drumroll: 'لحظة الاختيار…',
  applause: 'أحسنتم!',
  hint: 'تلميح',
  turn: 'دور جديد',
  spin: 'العجلة تدور',
}

interface Settings {
  effects: boolean
  music: boolean
  volume: number
  gentle: boolean
}

type CueListener = (name: SoundName) => void

// Note frequencies (C major / pentatonic — consonant and friendly).
const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 }

class SoundEngine {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private dry: GainNode | null = null
  private wet: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private noiseBuf: AudioBuffer | null = null
  private lastTick = 0
  private settings: Settings = { effects: true, music: false, volume: 0.8, gentle: false }
  private listeners = new Set<CueListener>()

  configure(s: Partial<Settings>) {
    const wasMusic = this.settings.music
    this.settings = { ...this.settings, ...s }
    if (this.out) this.out.gain.value = this.settings.volume
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
      const ctx = new AC()
      this.ctx = ctx
      // master: (dry + reverb) → low-pass → compressor → volume → speakers
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -20
      comp.knee.value = 18
      comp.ratio.value = 3
      comp.attack.value = 0.005
      comp.release.value = 0.2
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 7000
      this.out = ctx.createGain()
      this.out.gain.value = this.settings.volume
      lp.connect(comp).connect(this.out).connect(ctx.destination)
      this.dry = ctx.createGain()
      this.dry.connect(lp)
      const verb = ctx.createConvolver()
      verb.buffer = this.impulse(1.4)
      this.wet = ctx.createGain()
      this.wet.gain.value = 0.18
      this.wet.connect(verb).connect(lp)
      this.noiseBuf = this.makeNoise()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (this.settings.music && this.musicTimer === null) this.startMusic()
  }

  play(name: SoundName) {
    this.listeners.forEach((l) => l(name))
    if (!this.settings.effects) return
    this.unlock()
    if (!this.ctx || !this.dry) return
    const t = this.ctx.currentTime + 0.01
    const v = this.settings.gentle ? 0.6 : 1
    switch (name) {
      case 'click':
        this.marimba(N.A5, t, 0.05 * v, 0.08)
        break
      case 'select':
        this.marimba(N.E5, t, 0.07 * v, 0.14)
        this.marimba(N.A5, t + 0.05, 0.06 * v, 0.16)
        break
      case 'turn':
        this.marimba(N.C5, t, 0.08 * v, 0.25)
        this.marimba(N.G5, t + 0.09, 0.07 * v, 0.3)
        break
      case 'correct':
        ;[N.C5, N.E5, N.G5].forEach((f, i) => this.marimba(f, t + i * 0.075, 0.1 * v, 0.45))
        this.bell(N.C6, t + 0.22, 0.06 * v, 0.9)
        break
      case 'wrong':
        // Soft, low, short: informative — never punishing.
        this.marimba(N.E4, t, 0.09 * v, 0.28, true)
        this.marimba(N.C4, t + 0.13, 0.08 * v, 0.4, true)
        break
      case 'flip':
        this.swish(t, 0.12, 0.03 * v, 1800, 4200)
        this.marimba(N.D5, t + 0.04, 0.03 * v, 0.08)
        break
      case 'match':
        this.marimba(N.G5, t, 0.08 * v, 0.3)
        this.marimba(N.C6, t + 0.08, 0.08 * v, 0.45)
        break
      case 'reveal':
        ;[N.C5, N.D5, N.E5, N.G5].forEach((f, i) => this.marimba(f, t + i * 0.05, 0.05 * v, 0.25))
        break
      case 'hint':
        this.bell(N.E6, t, 0.04 * v, 0.7)
        this.bell(N.G6, t + 0.09, 0.03 * v, 0.7)
        break
      case 'star':
        this.bell(N.G5 * 2, t, 0.045 * v, 0.6)
        break
      case 'whoosh':
        this.swish(t, 0.28, 0.035 * v, 500, 2400)
        break
      case 'spin':
        this.swish(t, 0.7, 0.04 * v, 300, 1600)
        break
      case 'stage':
        ;[N.C5, N.E5, N.G5, N.C6].forEach((f, i) => this.marimba(f, t + i * 0.1, 0.09 * v, 0.6))
        this.bell(N.E6, t + 0.42, 0.04 * v, 1)
        break
      case 'unlock':
        this.wood(t, 0.06 * v)
        this.wood(t + 0.09, 0.06 * v)
        ;[N.C5, N.G5, N.C6, N.E6].forEach((f, i) => this.marimba(f, t + 0.22 + i * 0.08, 0.08 * v, 0.6))
        break
      case 'tick': {
        // Wheel/timer tick: tiny wooden click, rate-limited so fast spins stay soft.
        const now = this.ctx.currentTime
        if (now - this.lastTick < 0.03) return
        this.lastTick = now
        this.wood(t, 0.05 * v)
        break
      }
      case 'drumroll':
        for (let i = 0; i < 10; i++) this.wood(t + i * 0.07 * (1 - i * 0.04), 0.035 * v)
        break
      case 'applause':
        ;[N.G5, N.C6, N.E6, N.G6].forEach((f, i) => this.bell(f, t + i * 0.12, 0.035 * v, 1.1))
        break
      case 'win': {
        const melody = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6]
        const d = [0.14, 0.14, 0.14, 0.32, 0.14, 0.6]
        let acc = 0
        melody.forEach((f, i) => {
          this.marimba(f, t + acc, 0.09 * v, d[i] + 0.35)
          acc += d[i]
        })
        this.bell(N.E6, t + acc - 0.5, 0.04 * v, 1.4)
        break
      }
    }
  }

  /** Marimba-like pluck: sine fundamental + soft 4th partial, quick exponential decay. */
  private marimba(freq: number, start: number, vol: number, decay: number, dark = false) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(vol, start + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, start + decay)
    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = freq
    o1.connect(g)
    if (!dark) {
      const o2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      o2.type = 'sine'
      o2.frequency.value = freq * 4
      g2.gain.value = 0.12
      o2.connect(g2).connect(g)
      o2.start(start)
      o2.stop(start + decay + 0.05)
    }
    this.route(g)
    o1.start(start)
    o1.stop(start + decay + 0.05)
  }

  /** Soft bell: sine + inharmonic partial, long gentle tail. */
  private bell(freq: number, start: number, vol: number, decay: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, start + decay)
    ;[1, 2.76].forEach((m, i) => {
      const o = ctx.createOscillator()
      const pg = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq * m
      pg.gain.value = i === 0 ? 1 : 0.18
      o.connect(pg).connect(g)
      o.start(start)
      o.stop(start + decay + 0.05)
    })
    this.route(g)
  }

  /** Short wooden tick (band-passed noise + tiny sine). */
  private wood(start: number, vol: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2400
    bp.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, start)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.035)
    src.connect(bp).connect(g)
    this.route(g, false)
    src.start(start, Math.random() * 0.5, 0.05)
    this.marimba(1250, start, vol * 0.5, 0.04, true)
  }

  /** Airy swish for transitions and the spinning wheel. */
  private swish(start: number, dur: number, vol: number, from: number, to: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const lp = ctx.createBiquadFilter()
    lp.type = 'bandpass'
    lp.Q.value = 0.8
    lp.frequency.setValueAtTime(from, start)
    lp.frequency.exponentialRampToValueAtTime(to, start + dur * 0.6)
    lp.frequency.exponentialRampToValueAtTime(from, start + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(vol, start + dur * 0.4)
    g.gain.linearRampToValueAtTime(0.0001, start + dur)
    src.connect(lp).connect(g)
    this.route(g)
    src.start(start, 0, dur + 0.05)
  }

  private route(node: AudioNode, reverb = true) {
    node.connect(this.dry!)
    if (reverb) node.connect(this.wet!)
  }

  private makeNoise() {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    return buf
  }

  // Optional calm background: slow, quiet pentatonic notes over soft pads.
  private startMusic() {
    if (!this.ctx || !this.dry || this.musicTimer !== null) return
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = this.settings.gentle ? 0.25 : 0.4
    this.musicGain.connect(this.dry)
    this.musicGain.connect(this.wet!)
    const scale = [N.C5, N.D5, N.E5, N.G5, N.A5]
    const chords = [[N.C4, N.E4, N.G4], [N.A4 / 2, N.C4, N.E4], [174.61, N.A4 / 2, N.C4], [196, 246.94, 293.66]]
    let step = 0
    const tick = () => {
      const ctx = this.ctx!
      const t = ctx.currentTime + 0.05
      if (step % 8 === 0) chords[(step / 8) % chords.length].forEach((f) => this.pad(f, t, 4))
      if (step % 2 === 0 && Math.random() > 0.4) this.padNote(scale[Math.floor(Math.random() * scale.length)], t)
      step++
    }
    tick()
    this.musicTimer = window.setInterval(tick, 500)
  }

  private pad(freq: number, start: number, dur: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(0.05, start + 1.2)
    g.gain.linearRampToValueAtTime(0.0001, start + dur)
    o.connect(g).connect(this.musicGain!)
    o.start(start)
    o.stop(start + dur + 0.05)
  }

  private padNote(freq: number, start: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(0.035, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.4)
    o.connect(g).connect(this.musicGain!)
    o.start(start)
    o.stop(start + 1.5)
  }

  private stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
    if (this.musicGain && this.ctx) {
      const g = this.musicGain
      g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6)
      window.setTimeout(() => g.disconnect(), 800)
    }
    this.musicGain = null
  }
}

export const sound = new SoundEngine()
