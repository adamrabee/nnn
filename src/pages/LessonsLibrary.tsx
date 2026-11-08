import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildLocal } from '../ai/client'
import { sound } from '../audio/sound'
import { normalize } from '../engine/arabic'
import { GAMES } from '../engine/catalog'
import { SAMPLE_LESSONS } from '../engine/samples'
import { cachedLessons, fetchLessons, toBundle, type SavedLesson } from '../lib/lessons'
import { useStore, type LessonBundle } from '../state/store'

const SUBJECT_ICON: Record<string, string> = {
  العلوم: '🔬',
  الرياضيات: '➗',
  'اللغة العربية': '📖',
  'الدراسات الاجتماعية': '🌍',
  'اللغة الإنجليزية': '🔤',
  'التربية الإسلامية': '🕌',
  'الحاسب والتقنية': '💻',
}

export function playableCount(b: LessonBundle) {
  return GAMES.filter((g) => g.available(b.content).ok).length
}

export function LessonsLibrary() {
  const nav = useNavigate()
  const { setBundle } = useStore()
  const [lessons, setLessons] = useState<SavedLesson[]>(cachedLessons)
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')
  const [q, setQ] = useState('')

  useEffect(() => {
    fetchLessons()
      .then((l) => {
        setLessons(l)
        setStatus('online')
      })
      .catch(() => setStatus('offline'))
  }, [])

  const open = (b: LessonBundle) => {
    sound.play('whoosh')
    setBundle(b)
    nav('/games')
  }

  const filtered = useMemo(() => {
    const n = normalize(q)
    return n ? lessons.filter((l) => normalize(`${l.title} ${l.subject} ${l.grade}`).includes(n)) : lessons
  }, [lessons, q])

  return (
    <div className="page library-home">
      <section className="lib-hero">
        <div>
          <img src="/droos-logo.png" alt="Droos" className="lib-hero-logo" />
          <h1>مكتبة الدروس</h1>
          <p className="lead">اختر درسًا لتبدأ ألعابه مع الفصل فورًا.</p>
        </div>
        <div className="lib-hero-actions">
          <input className="search" type="search" placeholder="🔎 ابحث عن درس أو مادة…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="البحث في الدروس" />
          <Link to="/teacher" className="btn btn-soft">
            ✍️ تحضير درس جديد
          </Link>
        </div>
      </section>

      <div className={`sync-line ${status}`} role="status">
        {status === 'loading' && (lessons.length ? '↻ جارٍ تحديث المكتبة… (المعروض الآن هو آخر نسخة محفوظة)' : '↻ جارٍ تحميل المكتبة…')}
        {status === 'online' && `● المكتبة محدّثة — ${lessons.length} درس`}
        {status === 'offline' && `● لا يوجد اتصال الآن — نعرض آخر نسخة محفوظة على هذا الجهاز (${lessons.length} درس)`}
      </div>

      <section className="section">
        <h2>الدروس المحفوظة</h2>
        {filtered.length === 0 ? (
          <div className="empty">
            {status === 'loading' ? (
              <p>جارٍ التحميل…</p>
            ) : q ? (
              <p>لا توجد نتائج لـ «{q}».</p>
            ) : (
              <>
                <p>لا توجد دروس محفوظة بعد.</p>
                <Link to="/teacher" className="btn btn-primary">
                  حضّر أول درس واحفظه في المكتبة
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="lesson-grid">
            {filtered.map((l) => {
              const b = toBundle(l)
              return (
                <button key={l.id} type="button" className="lesson-card" onClick={() => open(b)}>
                  <span className="lesson-icon" aria-hidden>
                    {SUBJECT_ICON[l.subject] ?? '📘'}
                  </span>
                  <span className="lesson-subject">
                    {l.subject} · {l.grade}
                  </span>
                  <strong className="lesson-title">{l.title}</strong>
                  <span className="lesson-meta">
                    🎮 {playableCount(b)} لعبة جاهزة · {new Date(l.updated_at).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="lesson-go">ابدأ ←</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="section">
        <h2>دروس نموذجية</h2>
        <div className="lesson-grid">
          {SAMPLE_LESSONS.map((l) => (
            <button key={l.id} type="button" className="lesson-card sample" onClick={() => open({ lesson: l, ...buildLocal(l) })}>
              <span className="lesson-icon" aria-hidden>
                {SUBJECT_ICON[l.subject] ?? '📘'}
              </span>
              <span className="lesson-subject">
                {l.subject} · {l.grade}
              </span>
              <strong className="lesson-title">{l.title}</strong>
              <span className="lesson-go">جرّب ←</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
