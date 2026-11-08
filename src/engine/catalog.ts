import { buildCrossword, buildWordSearch } from './grids'
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
    color: '#1e3a8a',
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
    color: '#a16207',
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
    color: '#047857',
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
    color: '#0e7490',
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
    color: '#6d28d9',
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
    color: '#4f46e5',
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
    color: '#0f766e',
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
    color: '#b91c1c',
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
    color: '#c2410c',
    tagline: 'مغامرة بمراحل: كل تحدٍّ محلول يمنحكم رقمًا من رمز القفل.',
    howTo: ['تبدؤون داخل غرفة مغلقة ضمن قصة تناسب الدرس.', 'كل مرحلة تحدٍّ مختلف من الدرس.', 'حل التحدي يكشف رقمًا من رمز القفل.', 'أدخلوا الرمز كاملًا في النهاية لفتح الباب!'],
    participation: ['تعاون الفصل كله', 'أو تناوب الفرق على المراحل'],
    fits: ['definitions', 'process', 'facts', 'classification', 'math'],
    available: (c) => {
      const types = [c.mcq.length >= 1, c.trueFalse.length >= 1, c.sequences.length >= 1, c.pairs.length >= 3, c.scramble.length >= 1, c.mistakes.length >= 1].filter(Boolean).length
      return types >= 3 ? { ok: true, count: types } : { ok: false, count: types, reason: 'تحتاج المغامرة إلى ثلاثة أنواع مختلفة من التحديات على الأقل.' }
    },
  },
  {
    id: 'wheel',
    name: 'عجلة التحديات',
    icon: '🎡',
    category: 'interactive',
    color: '#1d4ed8',
    tagline: 'عجلة بأسماء طلابك: من يقع عليه الدور يجيب عن سؤال ويجمع النقاط.',
    howTo: ['أضيفوا أسماء الطلاب مرة واحدة (لصق أو ملف).', 'اضغطوا «أدر العجلة».', 'يظهر اسم الطالب ثم سؤاله.', 'الإجابة الصحيحة تضيف نقاطًا بجانب اسمه.'],
    participation: ['طالب واحد في كل دور', 'مساعدة صديق عند الحاجة'],
    fits: ['definitions', 'facts', 'process', 'classification', 'math'],
    available: (c) => need(c.mcq.length + c.trueFalse.length, 3, 'أسئلة'),
  },
  {
    id: 'patterns',
    name: 'اكتشاف الأنماط',
    icon: '🧩',
    category: 'logic',
    color: '#0f766e',
    tagline: 'سلسلة عناصر تتبع قاعدة واحدة: اكتشفوا القاعدة وأكملوا الخانة الناقصة.',
    howTo: ['تظهر سلسلة من البطاقات وخانة «؟».', 'ناقشوا: ما القاعدة التي تربطها؟', 'اختاروا البطاقة التي تكمل النمط.', 'نكشف القاعدة ونشرحها.'],
    participation: ['نقاش الفريق', 'ممثل الفريق يختار'],
    fits: ['process', 'classification', 'math'],
    available: (c) => need(c.patterns.length, 2, 'أنماط (تسلسلات أو تصنيفات أو أعداد)'),
  },
  {
    id: 'odd-one-out',
    name: 'العنصر المختلف',
    icon: '🎯',
    category: 'logic',
    color: '#b45309',
    tagline: 'أربعة عناصر، ثلاثة منها من مجموعة واحدة. أيها المختلف؟ ولماذا؟',
    howTo: ['تظهر أربع بطاقات.', 'ابحثوا عن البطاقة التي لا تنتمي للمجموعة.', 'اختاروها ثم فسّروا السبب.', 'التفسير الصحيح يمنح نقاطًا إضافية.'],
    participation: ['الإشارة إلى البطاقة', 'التفسير الشفهي'],
    fits: ['classification', 'process'],
    available: (c) => need(c.oddOne.length, 2, 'مجموعات (تصنيفات أو مراحل)'),
  },
  {
    id: 'logic',
    name: 'الألغاز المنطقية',
    icon: '🧠',
    category: 'logic',
    color: '#4338ca',
    tagline: 'لغز «من أنا؟»: تظهر الأدلة واحدًا تلو الآخر، فاستبعدوا الاحتمالات حتى يبقى جواب واحد.',
    howTo: ['تظهر قائمة المرشحين.', 'اكشفوا دليلًا واحدًا في كل مرة.', 'اشطبوا كل مرشح يتعارض مع الدليل.', 'كلما احتجتم أدلة أقل، زادت النقاط.'],
    participation: ['الفريق يقترح من يُشطب', 'المعلم يشطب'],
    fits: ['process', 'classification'],
    available: (c) => need(c.logic.length, 2, 'ألغاز (تسلسلات أو تصنيفات)'),
  },
  {
    id: 'missing-piece',
    name: 'القطعة المفقودة',
    icon: '🧷',
    category: 'logic',
    color: '#0369a1',
    tagline: 'جملة من الدرس مقسّمة إلى قطع، وقطعة واحدة مفقودة. أيّ قطعة تكملها؟',
    howTo: ['تظهر الجملة كقطع أحجية.', 'قطعة واحدة مفقودة.', 'اختاروا القطعة الصحيحة من بين ثلاث.', 'تكتمل الجملة ونقرؤها معًا.'],
    participation: ['قراءة جماعية', 'ممثل الفريق يختار'],
    fits: ['facts', 'definitions', 'process'],
    available: (c) => need(c.missing.length, 3, 'جمل أو تسلسلات'),
  },
  {
    id: 'critical',
    name: 'تحدي التفكير الناقد',
    icon: '💭',
    category: 'logic',
    color: '#7c2d12',
    tagline: 'موقف «ماذا لو؟» يحتاج إلى تحليل: اختاروا الإجابة ثم دافعوا عنها.',
    howTo: ['اقرؤوا الموقف بتمعّن.', 'فكّروا فرديًا ثم ناقشوا في الفريق.', 'اختاروا الإجابة.', 'دافعوا عن إجابتكم: يمنح المعلم نقاطًا لكل فكرة صحيحة.'],
    participation: ['فكّر — ناقش — شارك', 'متحدث باسم الفريق'],
    fits: ['process', 'definitions'],
    available: (c) => need(c.critical.length, 2, 'مواقف'),
  },
  {
    id: 'crossword',
    name: 'الكلمات المتقاطعة',
    icon: '✏️',
    category: 'interactive',
    color: '#334155',
    tagline: 'شبكة كلمات من مصطلحات الدرس: حلّوا كل تعريف لتملؤوا الشبكة.',
    howTo: ['اختاروا تعريفًا من القائمة.', 'اكتبوا الكلمة بلوحة الحروف (بدون «ال»).', 'الكلمة الصحيحة تُكتب في الشبكة.', 'أكملوا الشبكة كلها!'],
    participation: ['الفرق تتناوب على التعريفات', 'الإجابة الشفهية'],
    fits: ['definitions'],
    available: (c) => {
      const cw = buildCrossword(c.words, 'check')
      return need(cw ? cw.entries.length : 0, 3, 'كلمات متقاطعة (مصطلحات من كلمة واحدة)')
    },
  },
  {
    id: 'build-answer',
    name: 'ابنِ الإجابة',
    icon: '🧱',
    category: 'interactive',
    color: '#15803d',
    tagline: 'ركّبوا التعريف الصحيح من قطع كلمات مبعثرة، واحذروا القطع الدخيلة!',
    howTo: ['يظهر سؤال وقطع كلمات.', 'اضغطوا القطع بالترتيب لبناء الإجابة.', 'بعض القطع دخيلة ولا تنتمي للإجابة.', 'تحققوا من الإجابة.'],
    participation: ['الفريق يملي الترتيب', 'طالب عند السبورة'],
    fits: ['definitions'],
    available: (c) => need(c.build.length, 3, 'تعريفات'),
  },
  {
    id: 'detective',
    name: 'المحقق الغامض',
    icon: '🕵️',
    category: 'adventure',
    color: '#1e293b',
    tagline: 'قضية غامضة: أجيبوا عن أسئلة التحقيق لكشف الأدلة، ثم اتهموا الفاعل.',
    howTo: ['اقرؤوا القضية وتعرفوا على المشتبه بهم.', 'كل سؤال تحقيق صحيح يكشف دليلًا.', 'يمكنكم الاتهام في أي وقت.', 'الاتهام الصحيح بأدلة أقل = نقاط أكثر.'],
    participation: ['الفصل كله فريق تحقيق', 'أو تتنافس الفرق على القضايا'],
    fits: ['definitions'],
    available: (c) => need(c.detective.length, 1, 'قضية (4 مصطلحات معرّفة على الأقل)'),
  },
  {
    id: 'word-search',
    name: 'البحث عن الكلمات',
    icon: '🔍',
    category: 'interactive',
    color: '#9a3412',
    tagline: 'ابحثوا عن مصطلحات الدرس المخفية في شبكة الحروف.',
    howTo: ['الكلمات مكتوبة بدون «ال».', 'قد تكون أفقية أو عمودية أو مائلة.', 'اضغطوا أول حرف ثم آخر حرف في الكلمة.', 'كل كلمة تجدونها تكشف معناها.'],
    participation: ['ممثل الفريق عند الشاشة', 'الفرق تتناوب'],
    fits: ['definitions'],
    available: (c) => {
      const ws = buildWordSearch(c.words, 'check')
      return need(ws ? ws.placements.length : 0, 4, 'مصطلحات من كلمة واحدة')
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
