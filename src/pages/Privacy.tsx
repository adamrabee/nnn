import { useEffect, useState } from 'react'
import { fetchAiStatus, type AiStatus } from '../ai/client'
import { useStore } from '../state/store'

export function Privacy() {
  const [ai, setAi] = useState<AiStatus | null>(null)
  const { bundle, setBundle } = useStore()
  const [cleared, setCleared] = useState(false)
  useEffect(() => {
    void fetchAiStatus().then(setAi)
  }, [])
  return (
    <div className="page privacy-page">
      <h1>🔒 الخصوصية وطريقة معالجة الدروس</h1>
      <div className="analysis-grid">
        <section className="card">
          <h2>بيانات الطلاب: لا شيء</h2>
          <ul>
            <li>لا حسابات ولا تسجيل دخول ولا ملفات شخصية للطلاب.</li>
            <li>لا نجمع أسماء أو بريدًا إلكترونيًا أو صورًا أو أي بيانات شخصية.</li>
            <li>النقاط والنتائج تعيش في ذاكرة الصفحة فقط أثناء النشاط، وتختفي عند إعادة التحميل أو المغادرة.</li>
            <li>لا قاعدة بيانات للدرجات، ولا لوحة تحليلات، ولا تصدير لبيانات الطلاب.</li>
            <li>أسماء الفرق مؤقتة؛ ننصح باستخدام أسماء فرق لا أسماء طلاب.</li>
          </ul>
        </section>
        <section className="card">
          <h2>محتوى الدرس</h2>
          <ul>
            <li>
              <strong>الوضع المحلي (الافتراضي):</strong> التحليل وتوليد الألعاب يتمّان داخل متصفحك بقواعد وقوالب محددة. لا يُرسل أي نص إلى أي خادم.
            </li>
            <li>
              <strong>وضع الذكاء الاصطناعي:</strong> {ai === null ? 'جارٍ التحقق…' : ai.ai ? 'مُعدّ على هذا الخادم.' : 'غير مُعدّ على هذا الخادم حاليًا.'} عند
              استخدامه يُرسل العنوان والمادة والصف ونص الدرس فقط إلى خادم المنصة، الذي يرسلها إلى خدمة Claude من Anthropic. مفتاح الخدمة محفوظ على الخادم وليس في
              المتصفح.
            </li>
            <li>يُحفظ آخر درس كتبته على هذا الجهاز فقط (في المتصفح) حتى لا يضيع عند تحديث الصفحة.</li>
          </ul>
          {bundle && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                setBundle(null)
                setCleared(true)
              }}
            >
              🗑 حذف الدرس المحفوظ من هذا الجهاز
            </button>
          )}
          {cleared && <p role="status">تم حذف الدرس من هذا الجهاز.</p>}
        </section>
        <section className="card">
          <h2>دقة المحتوى</h2>
          <ul>
            <li>نبني الأسئلة من جمل الدرس نفسه، والإجابات الخاطئة هي عناصر أخرى من الدرس — لا نخترع معلومات.</li>
            <li>إذا لم يكفِ الدرس للعبة معينة نخبرك بذلك بدل اختلاق محتوى.</li>
            <li>في وضع الذكاء الاصطناعي نقارن كل عنصر بنص الدرس ونعلّم ما لا يطابقه بعلامة «راجِع».</li>
            <li>يمكنك مراجعة كل سؤال وتعديله قبل اللعب.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
