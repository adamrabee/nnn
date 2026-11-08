import { Link, Navigate } from 'react-router-dom'
import { structureLabel, suggestGames } from '../engine/catalog'
import { pickTheme } from '../engine/adventure'
import { useStore } from '../state/store'

export function GamesPage() {
  const { bundle } = useStore()
  if (!bundle) return <Navigate to="/lesson" replace />
  const { lesson, analysis: a, content: c, aiNotes } = bundle
  const suggestions = suggestGames(a, c)
  const okCount = suggestions.filter((s) => s.ok).length
  const theme = pickTheme(lesson)

  return (
    <div className="page games-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {lesson.subject} · {lesson.grade}
          </p>
          <h1>🎮 ألعاب درس «{lesson.title}»</h1>
          <p className="lead">
            وجدنا {okCount} ألعاب مناسبة لهذا الدرس. اختر لعبة لإعدادها، أو راجع الأسئلة وعدّلها أولًا.
          </p>
        </div>
        <div className="row">
          <Link to="/review" className="btn btn-soft">
            ✏️ مراجعة وتعديل المحتوى
          </Link>
          <Link to="/lesson" className="btn btn-ghost">
            تعديل الدرس
          </Link>
        </div>
      </div>

      <div className={`badge-line ${c.generatedBy === 'ai' ? 'ai' : 'local'}`}>
        {c.generatedBy === 'ai' ? '✨ أُنشئ بالذكاء الاصطناعي ثم تم التحقق منه مقابل نص الدرس' : '🔒 أُنشئ محليًا داخل المتصفح بقواعد محددة — لم يُرسل أي نص خارج جهازك'}
      </div>
      {aiNotes.length > 0 && (
        <ul className="notes">
          {aiNotes.map((n, i) => (
            <li key={i}>⚠️ {n}</li>
          ))}
        </ul>
      )}

      <section className="section">
        <h2>الألعاب المقترحة</h2>
        <div className="suggest-grid">
          {suggestions.map((s, i) => (
            <article key={s.game.id} className={`suggest-card ${s.ok ? '' : 'unavailable'}`} style={{ ['--g' as string]: s.game.color }}>
              <div className="suggest-top">
                <span className="suggest-icon" aria-hidden>
                  {s.game.icon}
                </span>
                {s.ok && i < 3 && <span className="badge badge-best">⭐ مناسبة جدًا</span>}
              </div>
              <h3>{s.game.name}</h3>
              <p>{s.game.id === 'escape-room' && s.ok ? `«${theme.title}» — ${s.game.tagline}` : s.game.tagline}</p>
              {s.ok ? (
                <>
                  <p className="muted small">{s.why}</p>
                  <Link to={`/setup/${s.game.id}`} className="btn btn-primary">
                    إعداد اللعبة ←
                  </Link>
                </>
              ) : (
                <p className="unavail-reason">
                  <strong>غير متاحة لهذا الدرس:</strong> {s.reason} أضف إلى الدرس محتوى من هذا النوع لتفعيلها.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>🔍 تحليل الدرس</h2>
        <div className="chip-list">
          {a.structure.map((s) => (
            <span key={s} className="chip">
              {structureLabel(s)}
            </span>
          ))}
          <span className="chip chip-muted">
            {a.stats.words} كلمة · {a.stats.sentences} جملة
          </span>
        </div>
        <div className="analysis-grid">
          <div className="card">
            <h3>🎯 الأهداف التعليمية</h3>
            <ul>{a.objectives.length ? a.objectives.map((o, i) => <li key={i}>{o}</li>) : <li className="muted">لم نتمكن من تحديد أهداف واضحة.</li>}</ul>
          </div>
          <div className="card">
            <h3>📖 المفاهيم والتعريفات ({a.concepts.length})</h3>
            {a.concepts.length ? (
              <dl className="defs">
                {a.concepts.map((cpt) => (
                  <div key={cpt.id}>
                    <dt>{cpt.term}</dt>
                    <dd>{cpt.definition}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">لا توجد تعريفات واضحة. اكتب التعريفات بصيغة «المصطلح هو …».</p>
            )}
          </div>
          <div className="card">
            <h3>🏷️ المصطلحات</h3>
            <div className="chip-list">
              {a.terms.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>🔢 التسلسلات والمراحل</h3>
            {a.sequences.length ? (
              a.sequences.map((s) => (
                <div key={s.id}>
                  <strong>{s.title}</strong>
                  <p>{s.steps.join(' ← ')}</p>
                </div>
              ))
            ) : (
              <p className="muted">لا توجد مراحل مرتبة في الدرس.</p>
            )}
            {a.classifications.length > 0 && (
              <>
                <h3>🗂️ التصنيفات</h3>
                {a.classifications.map((g) => (
                  <p key={g.id}>
                    <strong>{g.group}:</strong> {g.items.join('، ')}
                  </p>
                ))}
              </>
            )}
          </div>
          <div className="card">
            <h3>⭐ أهم المعلومات</h3>
            <ul>
              {a.keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>🔗 العلاقات بين المعلومات</h3>
            {a.relations.length ? (
              <ul>
                {a.relations.slice(0, 10).map((r, i) => (
                  <li key={i}>
                    {r.from} <span className="muted">{r.label}</span> {r.to}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">لم نجد علاقات واضحة.</p>
            )}
            {a.needsExplanation.length > 0 && (
              <>
                <h3>💡 تحتاج إلى شرح إضافي</h3>
                <ul>
                  {a.needsExplanation.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="card">
            <h3>📊 المحتوى المولّد</h3>
            <ul className="counts">
              <li>أسئلة اختيار من متعدد: {c.mcq.length}</li>
              <li>عبارات صح أم خطأ: {c.trueFalse.length}</li>
              <li>جمل «اكتشف الخطأ»: {c.mistakes.length}</li>
              <li>كلمات مبعثرة: {c.scramble.length}</li>
              <li>أزواج مطابقة: {c.pairs.length}</li>
              <li>تسلسلات: {c.sequences.length}</li>
            </ul>
            <p className="muted small">الأسئلة موزعة على ثلاثة مستويات: سهل، متوسط، صعب.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
