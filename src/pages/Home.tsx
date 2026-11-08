import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { buildLocal } from '../ai/client'
import { sound } from '../audio/sound'
import { CATEGORY_LABEL, GAMES, ROADMAP } from '../engine/catalog'
import { SAMPLE_LESSONS } from '../engine/samples'
import { MODE_INFO } from '../games/teams'
import { useStore } from '../state/store'

const STEPS = [
  { icon: '✍️', title: 'اكتب الدرس', text: 'العنوان والمادة والصف ونص الدرس.' },
  { icon: '🔍', title: 'نحلّل المحتوى', text: 'المفاهيم والتعريفات والمراحل والأهداف.' },
  { icon: '🎮', title: 'نقترح الألعاب', text: 'ألعاب تناسب طبيعة درسك بالذات.' },
  { icon: '✏️', title: 'راجع وعدّل', text: 'كل سؤال قابل للتعديل قبل اللعب.' },
  { icon: '🏆', title: 'العب مع الفصل', text: 'على الشاشة الكبيرة، بلا أجهزة للطلاب.' },
]

export function Home() {
  const nav = useNavigate()
  const { setBundle } = useStore()
  const { openA11y } = useOutletContext<{ openA11y: () => void }>()

  const trySample = (id: string) => {
    const lesson = SAMPLE_LESSONS.find((l) => l.id === id)!
    setBundle({ lesson, ...buildLocal(lesson) })
    sound.play('whoosh')
    nav('/games')
  }

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">منصة تعلّم باللعب داخل الفصل</p>
          <h1>
            حوّل أي درس إلى <span className="grad">تحدٍّ ومغامرة</span> يريد الطلاب إكمالها
          </h1>
          <p className="lead">
            اكتب درسك، وسنحوّله إلى ألعاب ومنافسات ومغامرات تعليمية تعرضها على شاشة الفصل. كل لعبة تشرح سبب الإجابة —
            فالهدف أن يتعلم الطالب، لا أن يُختبر فقط.
          </p>
          <div className="hero-cta">
            <Link to="/lesson" className="btn btn-primary btn-xl">
              ✍️ ابدأ درسًا جديدًا
            </Link>
            <Link to="/library" className="btn btn-soft btn-xl">
              🎮 استكشف الألعاب
            </Link>
          </div>
          <ul className="hero-points">
            <li>✔ بلا حسابات للطلاب</li>
            <li>✔ بلا أجهزة للطلاب</li>
            <li>✔ لا نحفظ أي نتائج</li>
            <li>✔ لا يحتاج الإنترنت أثناء اللعب</li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="float-card c1">⚔️ معركة المعرفة</div>
          <div className="float-card c2">🗝️ غرفة الهروب</div>
          <div className="float-card c3">🧠 ذاكرة المصطلحات</div>
          <div className="float-card c4">🔢 تحدي الترتيب</div>
          <div className="hero-orb">🎲</div>
        </div>
      </section>

      <section className="section">
        <h2>جرّب فورًا بدرس جاهز</h2>
        <div className="sample-grid">
          {SAMPLE_LESSONS.map((l) => (
            <button key={l.id} type="button" className="sample-card" onClick={() => trySample(l.id)}>
              <span className="sample-subject">{l.subject}</span>
              <strong>{l.title}</strong>
              <span className="muted">{l.grade}</span>
              <span className="sample-go">حوّله إلى ألعاب ←</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>كيف تعمل المنصة؟</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={i} className="step">
              <span className="step-icon" aria-hidden>
                {s.icon}
              </span>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2>الألعاب التعليمية</h2>
        <p className="muted">كل لعبة بآلية لعب مختلفة — لا قالب أسئلة واحد مكرر.</p>
        <div className="game-mini-grid">
          {GAMES.map((g) => (
            <div key={g.id} className="game-mini" style={{ ['--g' as string]: g.color }}>
              <span className="game-mini-icon" aria-hidden>
                {g.icon}
              </span>
              <strong>{g.name}</strong>
              <span className="muted">{CATEGORY_LABEL[g.category]}</span>
            </div>
          ))}
        </div>
        <p>
          <Link to="/library">عرض المكتبة كاملة ({GAMES.length + ROADMAP.length} لعبة ومغامرة، منها {ROADMAP.length} قيد التطوير) ←</Link>
        </p>
      </section>

      <section className="section two-col">
        <div className="feature-card adventure">
          <h2>🗝️ مغامرات تعليمية</h2>
          <p>
            يتحول الدرس إلى قصة: مهمة داخل جسم الإنسان، رحلة فضائية، خزنة أرقام، أو مكتبة كلمات مفقودة — بحسب طبيعة الدرس.
            كل مرحلة تحدٍّ مختلف يكشف رقمًا من رمز القفل.
          </p>
        </div>
        <div className="feature-card">
          <h2>🏆 منافسات الفصل</h2>
          <ul className="mode-list">
            {Object.values(MODE_INFO).map((m) => (
              <li key={m.name}>
                <span aria-hidden>{m.icon}</span> {m.name}
              </li>
            ))}
          </ul>
          <p className="muted">النقاط على الفهم والتفسير والتعاون — وليس على السرعة.</p>
        </div>
      </section>

      <section className="section feature-card a11y-feature">
        <h2>♿ تعليم شامل للجميع</h2>
        <p>
          عشرة إعدادات جاهزة يمكن الجمع بينها: القراءة الميسّرة، الدعم البصري والصوتي، التركيز، التحفيز المنخفض، الوقت الإضافي،
          التعليمات المبسطة، التباين العالي، النص الكبير، وبلا ضغط وقت. كل الألعاب تعمل بلوحة المفاتيح، ولا تشترط السحب والإفلات.
        </p>
        <button type="button" className="btn btn-primary" onClick={openA11y}>
          افتح إعدادات إمكانية الوصول
        </button>
      </section>
    </div>
  )
}
