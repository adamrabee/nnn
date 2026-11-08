import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cachedLessons, deleteLesson, fetchLessons, toBundle, type SavedLesson } from '../lib/lessons'
import { supabase, useSession } from '../lib/supabase'
import { useStore } from '../state/store'
import { playableCount } from './LessonsLibrary'

function AuthForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const res = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (res.error) {
      const t = res.error.message
      setMsg({ ok: false, text: /invalid login/i.test(t) ? 'البريد أو كلمة المرور غير صحيحة.' : /already registered/i.test(t) ? 'هذا البريد مسجّل بالفعل، سجّل الدخول.' : /at least 6/i.test(t) ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' : t })
    } else if (mode === 'up' && !res.data.session) {
      setMsg({ ok: true, text: 'تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.' })
      setMode('in')
    }
  }

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>{mode === 'in' ? 'تسجيل دخول المعلم' : 'إنشاء حساب معلم'}</h2>
      <p className="muted">الدخول مطلوب فقط لحفظ الدروس وتعديلها. عرض المكتبة في الفصل لا يحتاج إلى تسجيل دخول.</p>
      <div className="field">
        <label htmlFor="email">البريد الإلكتروني</label>
        <input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">كلمة المرور</label>
        <input id="password" type="password" dir="ltr" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
      </div>
      {msg && (
        <p className={msg.ok ? 'note ok' : 'error'} role="alert">
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? '…' : mode === 'in' ? 'دخول' : 'إنشاء الحساب'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'لديك حساب؟ سجّل الدخول'}
      </button>
    </form>
  )
}

export function Teacher() {
  const session = useSession()
  const nav = useNavigate()
  const { setBundle } = useStore()
  const [lessons, setLessons] = useState<SavedLesson[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    setLessons(cachedLessons().filter((l) => l.owner_id === session.user.id))
    fetchLessons()
      .then((all) => setLessons(all.filter((l) => l.owner_id === session.user.id)))
      .catch((e) => setError(e.message))
  }, [session])

  if (session === undefined) return <div className="page">…</div>

  return (
    <div className="page teacher-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">لوحة المعلم</p>
          <h1>تحضير الدروس</h1>
          <p className="lead">حضّر الدرس في البيت واحفظه في المكتبة، ثم افتحه في الفصل بضغطة واحدة.</p>
        </div>
        {session && (
          <div className="row">
            <span className="muted small" dir="ltr">
              {session.user.email}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void supabase.auth.signOut()}>
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>

      {!session ? (
        <AuthForm />
      ) : (
        <>
          <ol className="prep-steps">
            <li>
              <span>1</span>أدخل نص الدرس
            </li>
            <li>
              <span>2</span>راجع الألعاب المولّدة
            </li>
            <li>
              <span>3</span>احفظ في المكتبة
            </li>
            <li>
              <span>4</span>افتحه في الفصل
            </li>
          </ol>
          <div className="center-row">
            <button
              type="button"
              className="btn btn-primary btn-xl"
              onClick={() => {
                setBundle(null)
                nav('/lesson')
              }}
            >
              ＋ تحضير درس جديد
            </button>
          </div>

          <section className="section">
            <h2>دروسي في المكتبة ({lessons.length})</h2>
            {error && <p className="error">{error}</p>}
            {lessons.length === 0 ? (
              <p className="muted">لم تحفظ أي درس بعد.</p>
            ) : (
              <div className="my-lessons">
                {lessons.map((l) => {
                  const b = toBundle(l)
                  return (
                    <article key={l.id} className="my-lesson">
                      <div>
                        <strong>{l.title}</strong>
                        <span className="muted small">
                          {l.subject} · {l.grade} · 🎮 {playableCount(b)} لعبة · آخر تعديل {new Date(l.updated_at).toLocaleDateString('ar')}
                        </span>
                      </div>
                      <div className="row">
                        <button type="button" className="btn btn-soft btn-sm" onClick={() => (setBundle(b), nav('/games'))}>
                          ▶ فتح
                        </button>
                        <button type="button" className="btn btn-soft btn-sm" onClick={() => (setBundle(b), nav('/review'))}>
                          ✏️ تعديل الأسئلة
                        </button>
                        <button type="button" className="btn btn-soft btn-sm" onClick={() => (setBundle(b), nav('/lesson'))}>
                          📝 تعديل النص
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm danger"
                          onClick={async () => {
                            if (!window.confirm(`حذف درس «${l.title}» من المكتبة نهائيًا؟`)) return
                            try {
                              await deleteLesson(l.id)
                              setLessons((ls) => ls.filter((x) => x.id !== l.id))
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          🗑 حذف
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
      <p className="center">
        <Link to="/">← العودة إلى مكتبة الدروس</Link>
      </p>
    </div>
  )
}
