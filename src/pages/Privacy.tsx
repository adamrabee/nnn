import { useEffect, useState } from 'react'
import { fetchAiStatus, type AiStatus } from '../ai/client'

export function Privacy() {
  const [ai, setAi] = useState<AiStatus | null>(null)
  const [cleared, setCleared] = useState(false)
  useEffect(() => {
    void fetchAiStatus().then(setAi)
  }, [])
  return (
    <div className="page privacy-page">
      <h1>الخصوصية وأين تُحفظ البيانات</h1>
      <div className="analysis-grid">
        <section className="card">
          <h2>الدروس</h2>
          <ul>
            <li>الدروس التي يحفظها المعلم (النص والأسئلة والألعاب) تُخزَّن في مكتبة الدروس على Supabase حتى تفتح من أي جهاز في المدرسة.</li>
            <li>يمكن لأي شخص لديه رابط الموقع عرض المكتبة، لكن لا يستطيع إضافة الدروس أو تعديلها أو حذفها إلا المعلم صاحبها بعد تسجيل الدخول.</li>
            <li>لا تكتب في نص الدرس أسماء طلاب أو أي بيانات شخصية.</li>
          </ul>
        </section>
        <section className="card">
          <h2>الطلاب</h2>
          <ul>
            <li>لا حسابات ولا تسجيل دخول للطلاب.</li>
            <li>أسماء الطلاب في «عجلة الطلاب» تُحفظ على هذا الجهاز فقط ولا تُرفع إلى أي خادم.</li>
            <li>نقاط العجلة ونقاط الفرق مؤقتة: تبقى أثناء الحصة فقط وتُمحى عند إغلاق الصفحة.</li>
            <li>لا قاعدة بيانات للدرجات ولا تحليلات ولا تصدير لبيانات الطلاب.</li>
          </ul>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              try {
                localStorage.removeItem('droos:roster')
                sessionStorage.removeItem('droos:wheel-scores')
              } catch {
                /* ignore */
              }
              setCleared(true)
            }}
          >
            🗑 حذف أسماء الطلاب ونقاطهم من هذا الجهاز
          </button>
          {cleared && <p role="status">تم الحذف.</p>}
        </section>
        <section className="card">
          <h2>توليد الألعاب</h2>
          <ul>
            <li>
              <strong>الوضع المحلي:</strong> يحلّل الدرس داخل المتصفح بقواعد محددة، دون إرسال النص إلى أي خدمة ذكاء اصطناعي.
            </li>
            <li>
              <strong>وضع الذكاء الاصطناعي:</strong> {ai === null ? 'جارٍ التحقق…' : ai.ai ? 'مُفعّل على هذا الخادم.' : 'غير مُفعّل على هذا الخادم حاليًا.'} عند
              استخدامه يُرسل نص الدرس فقط إلى خدمة Claude من Anthropic عبر خادم المنصة، والمفتاح محفوظ على الخادم وليس في المتصفح.
            </li>
            <li>كل عنصر يُبنى من جمل الدرس نفسه، وإذا لم يكفِ الدرس للعبة ما نخبرك بذلك بدل اختلاق محتوى.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
