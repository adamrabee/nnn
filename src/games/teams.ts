import type { CompetitionMode, Team } from '../engine/types'

/** Team look: colour + shape + icon, so teams are never distinguished by colour alone. */
export const TEAM_STYLES = [
  { name: 'فريق الصقور', color: '#1d4ed8', shape: '●', icon: '🦅' },
  { name: 'فريق النجوم', color: '#b45309', shape: '★', icon: '⭐' },
  { name: 'فريق الموج', color: '#0f766e', shape: '▲', icon: '🌊' },
  { name: 'فريق الأرز', color: '#15803d', shape: '■', icon: '🌲' },
  { name: 'فريق البرق', color: '#b91c1c', shape: '◆', icon: '⚡' },
  { name: 'فريق القمر', color: '#6d28d9', shape: '⬟', icon: '🌙' },
]

export const MODE_INFO: Record<CompetitionMode, { name: string; icon: string; desc: string }> = {
  teams: { name: 'فريق ضد فريق', icon: '🆚', desc: 'من 2 إلى 6 فرق تتناوب على الأدوار.' },
  pvp: { name: 'لاعب ضد لاعب', icon: '🤺', desc: 'طالبان أو ممثلان يتنافسان.' },
  'whole-class': { name: 'تحدي الفصل كله', icon: '🏫', desc: 'الفصل كله فريق واحد يجمع النجوم.' },
  cooperative: { name: 'الوضع التعاوني', icon: '🤝', desc: 'الجميع يعمل معًا للوصول إلى هدف مشترك.' },
  'teacher-vs-students': { name: 'المعلم ضد الطلاب', icon: '🎓', desc: 'الطلاب يتحدّون المعلم!' },
  'random-team': { name: 'الفريق العشوائي', icon: '🎲', desc: 'يُختار الفريق صاحب الدور عشوائيًا في كل جولة.' },
}

function mk(i: number, name?: string): Team {
  const s = TEAM_STYLES[i % TEAM_STYLES.length]
  return { id: `t${i + 1}`, name: name ?? s.name, color: s.color, shape: s.shape, icon: s.icon, score: 0, stars: 0, streak: 0, bestStreak: 0, badges: [] }
}

export function makeTeams(mode: CompetitionMode, count: number): Team[] {
  switch (mode) {
    case 'pvp':
      return [mk(0, 'اللاعب الأول'), mk(1, 'اللاعب الثاني')]
    case 'whole-class':
      return [{ ...mk(3, 'الفصل كله'), icon: '🏫' }]
    case 'cooperative':
      return [{ ...mk(2, 'فريقنا المشترك'), icon: '🤝' }]
    case 'teacher-vs-students':
      return [{ ...mk(4, 'المعلم'), icon: '🎓' }, { ...mk(0, 'الطلاب'), icon: '🧑‍🤝‍🧑' }]
    default:
      return Array.from({ length: Math.min(6, Math.max(2, count)) }, (_, i) => mk(i))
  }
}

export const SCORING = {
  correct: 10,
  explain: 5,
  teamwork: 5,
  complete: 5,
}

export const BADGES: Record<string, { icon: string; name: string }> = {
  first: { icon: '🌟', name: 'أول إجابة صحيحة' },
  streak3: { icon: '🔥', name: 'ثلاث إجابات متتالية' },
  explain: { icon: '💬', name: 'فسّر الإجابة' },
  teamwork: { icon: '🤝', name: 'روح الفريق' },
  persist: { icon: '💪', name: 'المثابرة: نجاح بعد محاولة' },
  complete: { icon: '🏁', name: 'أكمل التحدي' },
}
