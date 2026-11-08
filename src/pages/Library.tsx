import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, GAMES, ROADMAP, type GameCategory } from '../engine/catalog'
import { useStore } from '../state/store'

export function Library() {
  const { bundle } = useStore()
  const cats = Object.keys(CATEGORY_LABEL) as GameCategory[]
  return (
    <div className="page library-page">
      <h1>🎮 مكتبة الألعاب التعليمية</h1>
      <p className="lead">
        كل لعبة تُولَّد من محتوى درسك ولها آلية لعب حقيقية مختلفة. الألعاب المتاحة الآن جاهزة للعب، والباقي قيد التطوير ضمن المراحل القادمة.
      </p>
      {!bundle && (
        <p className="note">
          لتشغيل أي لعبة، <Link to="/lesson">أدخل درسًا</Link> أولًا أو جرّب درسًا نموذجيًا من الصفحة الرئيسية.
        </p>
      )}
      {cats.map((cat) => (
        <section key={cat} className="section">
          <h2>{CATEGORY_LABEL[cat]}</h2>
          <div className="lib-grid">
            {GAMES.filter((g) => g.category === cat).map((g) => {
              const av = bundle ? g.available(bundle.content) : null
              return (
                <article key={g.id} className="lib-card ready" style={{ ['--g' as string]: g.color }}>
                  <span className="lib-icon" aria-hidden>
                    {g.icon}
                  </span>
                  <h3>{g.name}</h3>
                  <span className="badge badge-ok">متاحة الآن</span>
                  <p>{g.tagline}</p>
                  <details>
                    <summary>طريقة اللعب</summary>
                    <ol>
                      {g.howTo.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </details>
                  {bundle &&
                    (av?.ok ? (
                      <Link className="btn btn-primary btn-sm" to={`/setup/${g.id}`}>
                        العبها بدرس «{bundle.lesson.title}»
                      </Link>
                    ) : (
                      <p className="muted small">غير متاحة لدرسك الحالي: {av?.reason}</p>
                    ))}
                </article>
              )
            })}
            {ROADMAP.filter((r) => r.category === cat).map((r) => (
              <article key={r.name} className="lib-card soon" aria-disabled="true">
                <span className="lib-icon" aria-hidden>
                  {r.icon}
                </span>
                <h3>{r.name}</h3>
                <span className="badge badge-soon">قيد التطوير · المرحلة {r.phase}</span>
                <p>{r.desc}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
