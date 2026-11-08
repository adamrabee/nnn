import { normalize, seededRandom, shuffle } from './arabic'
import type { ChoiceQuestion, GeneratedContent, Lesson, MistakeItem, PairItem, ScrambleItem, SequenceItem, TrueFalseItem } from './types'

export interface AdventureTheme {
  key: string
  title: string
  icon: string
  intro: string
  stageNames: string[]
  stageIcons: string[]
  lockLabel: string
  finale: string
  gradient: string
}

const THEMES: (AdventureTheme & { match: RegExp })[] = [
  {
    key: 'body', match: /هضم|هضمي|معده|قلب|جسم|دم|تنفس|رئه|عظم|عضلات|اعضاء/,
    title: 'مهمة داخل جسم الإنسان', icon: '🧬',
    intro: 'تقلّصت سفينتكم الطبية ودخلت جسم الإنسان! لكل بوابة رمز سري، ولن تُفتح إلا بمعلومات الدرس.',
    stageNames: ['بوابة الدخول', 'النفق الأول', 'غرفة التحكم', 'الممر السري', 'بوابة الخروج', 'المحطة الأخيرة'],
    stageIcons: ['🚪', '🌀', '🎛️', '🔦', '🚀', '🏁'],
    lockLabel: 'رمز بوابة الخروج', finale: 'نجحتم! خرجت السفينة الطبية بسلام بعد رحلة مليئة بالاكتشافات.',
    gradient: 'linear-gradient(135deg,#7c3aed,#db2777)',
  },
  {
    key: 'space', match: /كوكب|كواكب|شمس|فضاء|قمر|مجره|نجوم|مدار/,
    title: 'مستكشفو الفضاء', icon: '🚀',
    intro: 'مركبتكم عالقة في مدار بعيد! حلّوا تحديات كل محطة لتجمعوا رمز تشغيل محرك العودة.',
    stageNames: ['منصة الإطلاق', 'محطة المدار', 'حزام الكويكبات', 'الكوكب الغامض', 'بوابة العودة', 'مركز القيادة'],
    stageIcons: ['🛰️', '🌑', '☄️', '🪐', '🌌', '🌍'],
    lockLabel: 'رمز محرك العودة', finale: 'انطلق المحرك! عادت المركبة إلى الأرض بفضل معرفتكم.',
    gradient: 'linear-gradient(135deg,#1e3a8a,#7c3aed)',
  },
  {
    key: 'nature', match: /ماء|مطر|نبات|تربه|طبيعه|بيئه|حيوان|سحب|تبخر/,
    title: 'بعثة الطبيعة', icon: '🌿',
    intro: 'ضاعت خريطة المحمية الطبيعية! كل محطة تخفي رقمًا من رمز صندوق الخريطة.',
    stageNames: ['مدخل المحمية', 'الوادي الأخضر', 'الشلال', 'كهف الصخور', 'قمة الجبل', 'مخيم البعثة'],
    stageIcons: ['🌳', '🍃', '💧', '🪨', '⛰️', '⛺'],
    lockLabel: 'رمز صندوق الخريطة', finale: 'فُتح الصندوق ووجدتم الخريطة! المحمية في أمان.',
    gradient: 'linear-gradient(135deg,#047857,#0ea5e9)',
  },
  {
    key: 'math', match: /عدد|اعداد|ضرب|جمع|طرح|قسمه|كسر|كسور|هندسه|مساحه/,
    title: 'خزنة الأرقام', icon: '🔐',
    intro: 'أنتم داخل قبو بنك الأرقام، والخزنة الكبرى مغلقة برمز. كل لغز محلول يكشف رقمًا منه.',
    stageNames: ['الباب الحديدي', 'غرفة الحسابات', 'ممر الليزر', 'غرفة المفاتيح', 'الخزنة الكبرى', 'المخرج'],
    stageIcons: ['🚪', '🧮', '🔴', '🗝️', '💰', '🏁'],
    lockLabel: 'رمز الخزنة الكبرى', finale: 'انفتحت الخزنة! عقولكم الرياضية هي الكنز الحقيقي.',
    gradient: 'linear-gradient(135deg,#0f766e,#4338ca)',
  },
  {
    key: 'language', match: /كلمه|فعل|اسم|حرف|جمله|اعراب|نحو|قصيده|اللغه/,
    title: 'مكتبة الكلمات المفقودة', icon: '📚',
    intro: 'أُغلقت المكتبة العتيقة وتبعثرت كلماتها! حلّوا تحديات كل رف لتجمعوا رمز الباب الكبير.',
    stageNames: ['الرف الأول', 'قاعة المخطوطات', 'السلم اللولبي', 'غرفة القواميس', 'الباب الكبير', 'قاعة القراءة'],
    stageIcons: ['📕', '📜', '🪜', '📖', '🚪', '🕯️'],
    lockLabel: 'رمز الباب الكبير', finale: 'عادت الكلمات إلى رفوفها، وفُتحت المكتبة للجميع!',
    gradient: 'linear-gradient(135deg,#92400e,#be185d)',
  },
  {
    key: 'history', match: /تاريخ|حضاره|دوله|ملك|معركه|عصر|قديم|خريطه|قاره/,
    title: 'آلة الزمن', icon: '⏳',
    intro: 'تعطلت آلة الزمن! كل محطة زمنية تخفي رقمًا من رمز إعادة التشغيل.',
    stageNames: ['غرفة الآلة', 'المحطة الأولى', 'المحطة الثانية', 'المحطة الثالثة', 'لوحة التحكم', 'العودة للحاضر'],
    stageIcons: ['⚙️', '🏺', '🏛️', '📜', '🎚️', '🕰️'],
    lockLabel: 'رمز آلة الزمن', finale: 'عادت آلة الزمن للعمل، ورجعتم إلى الحاضر بمعرفة جديدة!',
    gradient: 'linear-gradient(135deg,#78350f,#6d28d9)',
  },
]

const DEFAULT_THEME: AdventureTheme = {
  key: 'lab', title: 'مختبر الأسرار', icon: '🧪',
  intro: 'أُغلق باب المختبر خلفكم! كل تجربة ناجحة تكشف رقمًا من رمز الباب.',
  stageNames: ['طاولة التجارب', 'الخزانة الزجاجية', 'المجهر', 'لوحة المعادلات', 'باب المختبر', 'غرفة الاكتشاف'],
  stageIcons: ['⚗️', '🧫', '🔬', '📋', '🚪', '✨'],
  lockLabel: 'رمز باب المختبر', finale: 'فُتح الباب! أنتم الآن علماء المختبر.',
  gradient: 'linear-gradient(135deg,#4338ca,#0891b2)',
}

/** The adventure story is chosen to fit the lesson — not one story for every subject. */
export function pickTheme(lesson: Lesson): AdventureTheme {
  const text = normalize(`${lesson.subject} ${lesson.title} ${lesson.content.slice(0, 600)}`)
  let best: AdventureTheme = DEFAULT_THEME
  let bestHits = 0
  for (const t of THEMES) {
    const hits = (text.match(new RegExp(t.match.source, 'g')) ?? []).length
    if (hits > bestHits) {
      bestHits = hits
      best = t
    }
  }
  return best
}

export type Stage =
  | { type: 'mcq'; item: ChoiceQuestion; backup?: ChoiceQuestion }
  | { type: 'tf'; item: TrueFalseItem; backup?: TrueFalseItem }
  | { type: 'sequence'; item: SequenceItem }
  | { type: 'matching'; pairs: PairItem[] }
  | { type: 'scramble'; item: ScrambleItem; backup?: ScrambleItem }
  | { type: 'mistake'; item: MistakeItem; backup?: MistakeItem }

/** Builds 4–6 varied stages from the lesson content. */
export function buildStages(lesson: Lesson, c: GeneratedContent, maxStages = 5): Stage[] {
  const rand = seededRandom(lesson.id + lesson.title)
  const mcq = shuffle(c.mcq, rand)
  const tf = shuffle(c.trueFalse, rand)
  const sc = shuffle(c.scramble, rand)
  const mi = shuffle(c.mistakes, rand)
  const candidates: Stage[] = []
  if (tf.length) candidates.push({ type: 'tf', item: tf[0], backup: tf[1] })
  if (mcq.length) candidates.push({ type: 'mcq', item: mcq[0], backup: mcq[2] })
  if (c.pairs.length >= 3) candidates.push({ type: 'matching', pairs: shuffle(c.pairs, rand).slice(0, 4) })
  if (sc.length) candidates.push({ type: 'scramble', item: sc[0], backup: sc[1] })
  if (c.sequences.length) candidates.push({ type: 'sequence', item: c.sequences[0] })
  if (mi.length) candidates.push({ type: 'mistake', item: mi[0], backup: mi[1] })
  if (mcq.length > 1) candidates.push({ type: 'mcq', item: mcq[1], backup: mcq[3] })
  return candidates.slice(0, maxStages)
}

export const STAGE_LABEL: Record<Stage['type'], string> = {
  mcq: 'سؤال المفتاح',
  tf: 'صح أم خطأ',
  sequence: 'لغز الترتيب',
  matching: 'لوحة التوصيل',
  scramble: 'الكلمة المشفّرة',
  mistake: 'اكتشف الخلل',
}
