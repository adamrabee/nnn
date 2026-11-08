import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildLocal, buildWithAi, fetchAiStatus, type AiStatus } from '../ai/client'
import { sound } from '../audio/sound'
import { uid } from '../engine/arabic'
import { SAMPLE_LESSONS } from '../engine/samples'
import type { Lesson } from '../engine/types'
import { useStore } from '../state/store'

const SUBJECTS = ['العلوم', 'الرياضيات', 'اللغة العربية', 'الدراسات الاجتماعية', 'اللغة الإنجليزية', 'التربية الإسلامية', 'الحاسب والتقنية', 'أخرى']
const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'المرحلة المتوسطة', 'المرحلة الثانوية']

export const PIPELINE = [
  'قراءة الدرس',
  'استخراج المفاهيم',
  'تحديد الأهداف التعليمية',
  'فهم بنية الدرس',
  'توليد الأسئلة',
  'إنشاء مستويات الصعوبة',
  'اختيار أنواع الألعاب المناسبة',
  'توليد محتوى الألعاب',
  'المعاينة والتعديل',
  'بدء اللعب في الفصل',
]

export function LessonInput() {
  const nav = useNavigate()
  const { bundle, setBundle } = useStore()
  const [lesson, setLesson] = useState<Lesson>(() => bundle?.lesson ?? { id: uid('lesson'), title: '', subject: SUBJECTS[0], grade: GRADES[3], content: '' })
  const [mode, setMode] = useState<'local' | 'ai'>('local')
  const [ai, setAi] = useState<AiStatus>({ ai: false, model: null })
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchAiStatus().then(setAi)
  }, [])

  const set = (k: keyof Lesson, v: string) => setLesson((l) => ({ ...l, [k]: v }))
  const words = lesson.content.trim() ? lesson.content.trim().split(/\s+/).length : 0
  const valid = lesson.title.trim().length > 1 && words >= 15

  const analyze = async () => {
    setError('')
    if (!valid) {
      setError('اكتب عنوان الدرس ونصًا لا يقل عن 15 كلمة.')
      return
    }
    setBusy(true)
    sound.play('reveal')
    const animate = async (upto: number) => {
      for (let i = 0; i <= upto; i++) {
        setStep(i)
        await new Promise((r) => setTimeout(r, 110))
      }
    }
    try {
      const fresh = { ...lesson, id: lesson.id || uid('lesson') }
      let result
      if (mode === 'ai') {
        const anim = animate(3)
        result = await buildWithAi(fresh)
        await anim
      } else {
        result = buildLocal(fresh)
      }
      await animate(PIPELINE.length - 3)
      setBundle({ lesson: fresh, ...result })
      sound.play('stage')
      nav('/games')
    } catch (e) {
      setError(`${(e as Error).message} يمكنك استخدام الوضع المحلي بدلًا من ذلك.`)
      sound.play('wrong')
    } finally {
      setBusy(false)
      setStep(-1)
    }
  }

  return (
    <div className="page lesson-page">
      <h1>✍️ إدخال الدرس</h1>
      <p className="lead">اكتب محتوى الدرس أو الصقه. سنبني الألعاب من هذا النص فقط — لن نضيف معلومات غير موجودة فيه.</p>

      <div className="lesson-layout">
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault()
            void analyze()
          }}
        >
          <div className="field">
            <label htmlFor="title">عنوان الدرس</label>
            <input id="title" value={lesson.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: الجهاز الهضمي" required />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="subject">المادة</label>
              <select id="subject" value={SUBJECTS.includes(lesson.subject) ? lesson.subject : 'أخرى'} onChange={(e) => set('subject', e.target.value)}>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="grade">الصف</label>
              <select id="grade" value={lesson.grade} onChange={(e) => set('grade', e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="content">محتوى الدرس</label>
            <textarea
              id="content"
              value={lesson.content}
              onChange={(e) => set('content', e.target.value)}
              rows={14}
              placeholder={'اكتب الدرس هنا…\nمثال:\nالتبخر هو تحول الماء من الحالة السائلة إلى الحالة الغازية.\nمراحل دورة الماء:\n1. التبخر\n2. التكاثف\n3. الهطول'}
            />
            <span className="muted">{words} كلمة</span>
          </div>

          <fieldset className="field mode-field">
            <legend>طريقة معالجة الدرس</legend>
            <label className={`mode-opt ${mode === 'local' ? 'on' : ''}`}>
              <input type="radio" name="mode" checked={mode === 'local'} onChange={() => setMode('local')} />
              <span>
                <strong>🔒 الوضع المحلي (افتراضي)</strong>
                <span>التحليل يتم داخل متصفحك بالكامل بقواعد وقوالب محددة. لا يُرسل أي نص إلى أي خدمة خارجية.</span>
              </span>
            </label>
            <label className={`mode-opt ${mode === 'ai' ? 'on' : ''} ${ai.ai ? '' : 'disabled'}`}>
              <input type="radio" name="mode" checked={mode === 'ai'} disabled={!ai.ai} onChange={() => setMode('ai')} />
              <span>
                <strong>✨ وضع الذكاء الاصطناعي {ai.ai ? '' : '— غير مُعدّ'}</strong>
                {ai.ai ? (
                  <span>
                    يُرسَل نص الدرس فقط (العنوان والمادة والصف والمحتوى) إلى خادم المنصة، ثم إلى خدمة Claude لتوليد أسئلة أكثر تنوعًا.
                    نتحقق من كل عنصر مقابل نص الدرس ونعلّم ما يحتاج مراجعة. لا تكتب أسماء طلاب أو بيانات شخصية.
                  </span>
                ) : (
                  <span>لم يُضبط مفتاح خدمة الذكاء الاصطناعي على الخادم بعد، لذلك هذا الوضع غير متاح. الوضع المحلي يعمل بالكامل.</span>
                )}
              </span>
            </label>
          </fieldset>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-xl" disabled={busy}>
            {busy ? '⏳ جارٍ التحليل…' : '🔍 حلّل الدرس وأنشئ الألعاب'}
          </button>
        </form>

        <aside className="side">
          {busy ? (
            <div className="card pipeline" aria-live="polite">
              <h3>محرك تحويل الدرس إلى ألعاب</h3>
              <ol>
                {PIPELINE.map((p, i) => (
                  <li key={p} className={i < step ? 'done' : i === step ? 'now' : ''}>
                    <span aria-hidden>{i < step ? '✔' : i === step ? '⏳' : '○'}</span> {p}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              <div className="card">
                <h3>📌 نصائح لنتائج أفضل</h3>
                <ul className="tips">
                  <li>
                    اكتب التعريفات بصيغة: <code>المصطلح هو …</code>
                  </li>
                  <li>
                    اكتب المراحل كقائمة مرقمة بعد سطر مثل: <code>مراحل …:</code>
                  </li>
                  <li>
                    اكتب التصنيفات هكذا: <code>أنواع الصخور: نارية، رسوبية، متحولة</code>
                  </li>
                  <li>جملة واحدة لكل معلومة تساعد على توليد أسئلة أدق.</li>
                  <li>لا تكتب أسماء طلاب أو أي بيانات شخصية.</li>
                </ul>
              </div>
              <div className="card">
                <h3>📚 أو ابدأ بدرس نموذجي</h3>
                <div className="chip-list">
                  {SAMPLE_LESSONS.map((s) => (
                    <button key={s.id} type="button" className="btn btn-chip" onClick={() => setLesson({ ...s, id: uid('lesson') })}>
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
