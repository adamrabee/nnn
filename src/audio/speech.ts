// Text-to-speech using the browser's built-in voices (no data leaves the device).

let cachedVoice: SpeechSynthesisVoice | null | undefined

function arabicVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ar')) ?? null
  return cachedVoice
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined
    arabicVoice()
  }
}

export function speechAvailable(): boolean {
  return arabicVoice() !== null
}

export function speak(text: string, rate = 0.9): boolean {
  if (!('speechSynthesis' in window)) return false
  const voice = arabicVoice()
  if (!voice) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''))
  u.voice = voice
  u.lang = voice.lang
  u.rate = rate
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
