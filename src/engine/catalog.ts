import type { GameId, GeneratedContent, LessonAnalysis, LessonStructure } from './types'

export type GameCategory = 'quiz' | 'logic' | 'interactive' | 'adventure'

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  quiz: 'ألعاب المعرفة والمسابقات',
  logic: 'ألعاب التفكير والمنطق',
  interactive: 'ألعاب تفاعلية',
  adventure: 'مغامرات تعليمية',
}

export interface GameDef {
  id: GameId
  name: string
  icon: string
  category: GameCategory
  tagline: string
  /** Visual step-by-step rules shown before the game starts. */
  howTo: string[]
  /** How students take part without devices. */
  participation: string[]
  fits: LessonStructure[]
  available: (c: GeneratedContent) => { ok: boolean; count: number; reason?: string }
  /** Minimum amount of material for a sensible round. */
  color: string
}

const need = (count: number, min: number, what: string) =>
  count >= min
    ? { ok: true, count }
    : { ok: false, count, reason: `يحتاج إلى ${min} ${what} على الأقل، والدرس يوفّر ${count}.` }

export const GAMES: GameDef[] = [
  {
    id: 'knowledge-battle',
    name: 'معركة المعرفة',
    icon: '⚔️',
    category: 'quiz',
    color: '#6d5efc',
    tagline: 'الفرق تتنافس على أسئلة الدرس، والفريق صاحب الدور يجيب.',
    howTo: ['يظهر سؤال وأربعة اختيارات.', 'يتشاور الفريق صاحب الدور ثم يختار إجابة.', 'يضغط المعلم على اختيار الفريق.', 'نشرح سبب الإجابة الصحيحة، ثم ينتقل الدور.'],
    participation: ['بطاقات أ/ب/ج/د', 'ممثل الفريق', 'الإجابة الشفهية'],
    fits: ['definitions', 'facts', 'process', 'classification', 'math'],
    available: (c) => need(c.mcq.length, 3, 'أسئلة اختيار من متعدد'),
  },
  {
    id: 'millionaire',
    name: 'تحدي القمة',
    icon: '🏔️',
    category: 'quiz',
    color: '#f59e0b',
    tagline: 'سلّم أسئلة يبدأ سهلًا ويصعد تدريجيًا، مع وسائل مساعدة.',
    howTo: ['الأسئلة مرتبة من السهل إلى الصعب.', 'كل إجابة صحيحة ترفعكم درجة في السلّم.', 'لديكم ثلاث وسائل مساعدة: حذف إجابتين، تلميح، استشارة الفصل.', 'المحطات الآمنة تحفظ تقدمكم.'],
    participation: ['الفصل كله أو فريق واحد', 'التصويت برفع اليد'],
    fits: ['definitions', 'facts', 'math'],
    available: (c) => need(c.mcq.length, 5, 'أسئلة'),
  },
  {
    id: 'true-false',
    name: 'صح أم خطأ؟',
    icon: '✅',
    category: 'quiz',
    color: '#10b981',
    tagline: 'عبارات من الدرس، بعضها صحيح وبعضها فيه خطأ مقصود.',
    howTo: ['تظهر عبارة على الشاشة.', 'يرفع الطلاب إبهامًا للأعلى (صح) أو للأسفل (خطأ).', 'يختار المعلم إجابة الفصل أو الفريق.', 'إذا كانت خاطئة نعرض التصحيح.'],
    participation: ['الإبهام للأعلى/للأسفل', 'بطاقة خضراء/حمراء', 'الإشارة'],
    fits: ['definitions', 'facts', 'process'],
    available: (c) => need(c.trueFalse.length, 4, 'عبارات'),
  },
  {
    id: 'matching',
    name: 'طابِق المعنى',
    icon: '🔗',
    category: 'interactive',
    color: '#0ea5e9',
    tagline: 'صِل كل مصطلح بمعناه الصحيح.',
    howTo: ['اختر مصطلحًا من العمود الأول.', 'ثم اختر معناه من العمود الثاني.', 'الزوج الصحيح يُثبَّت ويظهر شرحه.', 'كل فريق يحاول مطابقة زوج في دوره.'],
    participation: ['ممثل الفريق يشير', 'المعلم ينفذ الاختيار'],
    fits: ['definitions'],
    available: (c) => need(c.pairs.length, 3, 'مصطلحات معرّفة'),
  },
  {
    id: 'memory',
    name: 'ذاكرة المصطلحات',
    icon: '🧠',
    category: 'logic',
    color: '#ec4899',
    tagline: 'بطاقات مقلوبة: اكشف المصطلح ومعناه وتذكّر مكانهما.',
    howTo: ['كل فريق يقلب بطاقتين في دوره.', 'إذا كانت البطاقتان مصطلحًا ومعناه فهما زوج، ويلعب الفريق مرة أخرى.', 'إذا لم تتطابقا تُقلبان من جديد وينتقل الدور.', 'تذكّروا أماكن البطاقات!'],
    participation: ['الفريق يختار رقم البطاقة', 'المعلم يقلبها'],
    fits: ['definitions'],
    available: (c) => need(c.pairs.length, 3, 'مصطلحات معرّفة'),
  },
  {
    id: 'sequence',
    name: 'تحدي الترتيب',
    icon: '🔢',
    category: 'logic',
    color: '#8b5cf6',
    tagline: 'رتّب المراحل أو الخطوات بالتسلسل الصحيح.',
    howTo: ['تظهر الخطوات بترتيب عشوائي.', 'حرّك كل خطوة للأعلى أو للأسفل (أو اسحبها).', 'اضغط «تحقّق» لمعرفة الخطوات الصحيحة.', 'الخطوات الصحيحة تُثبَّت وتحاولون في الباقي.'],
    participation: ['الفريق يملي الترتيب', 'طالب عند السبورة'],
    fits: ['process'],
    available: (c) => need(c.sequences.length, 1, 'تسلسل (مراحل أو خطوات)'),
  },
  {
    id: 'scramble',
    name: 'الحروف المبعثرة',
    icon: '🔤',
    category: 'interactive',
    color: '#14b8a6',
    tagline: 'رتّب الحروف لتكتشف مصطلحًا من الدرس.',
    howTo: ['يظهر معنى الكلمة وحروفها مبعثرة.', 'اضغط الحروف بالترتيب الصحيح.', 'يمكنكم طلب تلميح أو كشف حرف.', 'الفريق الذي يكتشف الكلمة يحصل على النقاط.'],
    participation: ['الفرق تملي الحروف', 'الإجابة الشفهية'],
    fits: ['definitions'],
    available: (c) => need(c.scramble.length, 3, 'مصطلحات من كلمة واحدة'),
  },
  {
    id: 'spot-mistake',
    name: 'اكتشف الخطأ',
    icon: '🔎',
    category: 'logic',
    color: '#ef4444',
    tagline: 'في كل جملة كلمة واحدة خاطئة. اعثروا عليها وصحّحوها.',
    howTo: ['تظهر جملة من الدرس فيها خطأ واحد.', 'يحدد الفريق الكلمة الخاطئة.', 'يضغط المعلم على الكلمة.', 'نكشف التصحيح والجملة الأصلية.'],
    participation: ['الإشارة إلى الكلمة', 'ممثل الفريق'],
    fits: ['definitions', 'facts'],
    available: (c) => need(c.mistakes.length, 3, 'جمل قابلة للتعديل'),
  },
  {
    id: 'escape-room',
    name: 'غرفة الهروب',
    icon: '🗝️',
    category: 'adventure',
    color: '#f97316',
    tagline: 'مغامرة بمراحل: كل تحدٍّ محلول يمنحكم رقمًا من رمز القفل.',
    howTo: ['تبدؤون داخل غرفة مغلقة ضمن قصة تناسب الدرس.', 'كل مرحلة تحدٍّ مختلف من الدرس.', 'حل التحدي يكشف رقمًا من رمز القفل.', 'أدخلوا الرمز كاملًا في النهاية لفتح الباب!'],
    participation: ['تعاون الفصل كله', 'أو تناوب الفرق على المراحل'],
    fits: ['definitions', 'process', 'facts', 'classification', 'math'],
    available: (c) => {
      const types = [c.mcq.length >= 1, c.trueFalse.length >= 1, c.sequences.length >= 1, c.pairs.length >= 3, c.scramble.length >= 1, c.mistakes.length >= 1].filter(Boolean).length
      return types >= 3 ? { ok: true, count: types } : { ok: false, count: types, reason: 'تحتاج المغامرة إلى ثلاثة أنواع مختلفة من التحديات على الأقل.' }
    },
  },
]

export const gameById = (id: GameId) => GAMES.find((g) => g.id === id)!

export interface Suggestion {
  game: GameDef
  ok: boolean
  reason?: string
  score: number
  why: string
}

const STRUCTURE_LABEL: Record<LessonStructure, string> = {
  definitions: 'تعريفات ومصطلحات',
  process: 'مراحل وتسلسل',
  classification: 'تصنيفات ومجموعات',
  facts: 'حقائق ومعلومات',
  math: 'عمليات حسابية',
}

export function structureLabel(s: LessonStructure) {
  return STRUCTURE_LABEL[s]
}

/** Ranks games by how well they suit the structure of this particular lesson. */
export function suggestGames(a: LessonAnalysis, c: GeneratedContent): Suggestion[] {
  return GAMES.map((game) => {
    const av = game.available(c)
    const matches = game.fits.filter((f) => a.structure.includes(f))
    let score = matches.length * 2 + Math.min(av.count, 10) / 5
    if (game.fits.length <= 2 && matches.length) score += 2 // specialised game that fits exactly
    if (game.category === 'adventure' && av.ok) score += 1.5
    const why = matches.length
      ? `يناسب الدرس لأنه يحتوي على ${matches.map((m) => STRUCTURE_LABEL[m]).join(' و')}.`
      : 'يمكن تشغيلها بمحتوى الدرس.'
    return { game, ok: av.ok, reason: av.reason, score: av.ok ? score : -1, why }
  }).sort((x, y) => y.score - x.score)
}

/** Games planned for later phases — shown in the library as "in development", never as playable buttons. */
export const ROADMAP: { name: string; icon: string; category: GameCategory; phase: 2 | 3; desc: string }[] = [
  { name: 'تحدي السرعة', icon: '⏱️', category: 'quiz', phase: 2, desc: 'أسئلة بوقت محدد مع إمكانية إيقاف المؤقت.' },
  { name: 'السؤال الغامض', icon: '❓', category: 'quiz', phase: 2, desc: 'تظهر المعلومة تدريجيًا حتى يكتشفها الطلاب.' },
  { name: 'من يعرف أكثر؟', icon: '🏆', category: 'quiz', phase: 2, desc: 'مسابقة استنتاج بين الفرق.' },
  { name: 'خمّن الإجابة', icon: '🕵️', category: 'quiz', phase: 2, desc: 'تلميحات متتالية للوصول للإجابة.' },
  { name: 'اكتشاف الأنماط', icon: '🧩', category: 'logic', phase: 2, desc: 'اكتشاف العلاقات بين العناصر.' },
  { name: 'العنصر المختلف', icon: '🎯', category: 'logic', phase: 2, desc: 'حدد العنصر الذي لا ينتمي للمجموعة وفسّر السبب.' },
  { name: 'ألغاز منطقية', icon: '🧮', category: 'logic', phase: 2, desc: 'ألغاز استنتاج مبنية على الدرس.' },
  { name: 'القطعة المفقودة', icon: '🧷', category: 'logic', phase: 2, desc: 'اكتشف المعلومة الناقصة.' },
  { name: 'تحدي التفكير الناقد', icon: '💭', category: 'logic', phase: 3, desc: 'مواقف تحتاج إلى تحليل قبل الإجابة.' },
  { name: 'التصنيف', icon: '🗂️', category: 'interactive', phase: 2, desc: 'وزّع العناصر على مجموعاتها.' },
  { name: 'الكلمات المتقاطعة', icon: '✏️', category: 'interactive', phase: 2, desc: 'شبكة كلمات من مصطلحات الدرس.' },
  { name: 'البحث عن الكلمات', icon: '🔍', category: 'interactive', phase: 2, desc: 'ابحث عن مصطلحات الدرس في شبكة الحروف.' },
  { name: 'ابنِ الإجابة', icon: '🧱', category: 'interactive', phase: 2, desc: 'ركّب الإجابة من أجزاء.' },
  { name: 'عجلة التحديات', icon: '🎡', category: 'interactive', phase: 2, desc: 'عجلة عشوائية للأسئلة والمهام.' },
  { name: 'البحث عن الكنز', icon: '🗺️', category: 'adventure', phase: 2, desc: 'خريطة وألغاز تقود إلى الكنز.' },
  { name: 'المحقق الغامض', icon: '🕵️‍♀️', category: 'adventure', phase: 2, desc: 'استخدم معلومات الدرس لكشف الحقيقة.' },
  { name: 'مهمة فضائية', icon: '🚀', category: 'adventure', phase: 2, desc: 'رحلة فضائية بمراحل وتحديات.' },
  { name: 'العالم المفقود', icon: '🌋', category: 'adventure', phase: 3, desc: 'عالم بمراحل ومهمات تعليمية.' },
  { name: 'اختر طريقك', icon: '🔀', category: 'adventure', phase: 3, desc: 'كل إجابة تقود إلى مسار مختلف.' },
  { name: 'ابنِ عالمك', icon: '🏙️', category: 'adventure', phase: 3, desc: 'المعلومات الصحيحة تبني مدينة متكاملة.' },
]
