import { useEffect, useRef } from 'react'
import { sound } from '../audio/sound'
import { PRESETS, useA11y, type A11yFlags } from '../state/a11y'

const TOGGLES: { key: keyof A11yFlags; label: string }[] = [
  { key: 'effects', label: '🔔 المؤثرات الصوتية' },
  { key: 'music', label: '🎵 موسيقى خلفية هادئة' },
  { key: 'gentleSound', label: '🔉 أصوات هادئة ومنخفضة' },
  { key: 'captions', label: '💬 عرض الأصوات كنصوص (للإعاقة السمعية)' },
  { key: 'autoRead', label: '🗣️ قراءة الأسئلة تلقائيًا' },
  { key: 'reduceMotion', label: '🧘 تقليل الحركة والرسوم المتحركة' },
  { key: 'highContrast', label: '🌓 تباين عالٍ' },
  { key: 'spacing', label: '↔️ مسافات أوسع بين الحروف والكلمات' },
  { key: 'highlight', label: '🖍️ تمييز الكلمات المهمة' },
  { key: 'icons', label: '🖼️ رموز بصرية بجانب النصوص' },
  { key: 'simplified', label: '🧩 تعليمات مبسطة واختيارات أقل' },
  { key: 'focus', label: '🎯 وضع التركيز (عناصر أقل)' },
  { key: 'noTimer', label: '🐢 إيقاف المؤقت تمامًا' },
  { key: 'extraTime', label: '⏳ ضعف الوقت' },
]

export function A11ySettings() {
  const { flags, presets, togglePreset, setFlag, reset } = useA11y()
  return (
    <div className="a11y-settings">
      <p className="note">
        هذه أدوات دعم للنشاط الجماعي كله، وليست وسيلة لتصنيف الطلاب أو تشخيصهم. يمكن الجمع بين أكثر من إعداد.
      </p>
      <h3>إعدادات جاهزة</h3>
      <div className="preset-grid">
        {PRESETS.map((p) => {
          const on = presets.includes(p.id)
          return (
            <button key={p.id} type="button" className={`preset ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => (togglePreset(p.id), sound.play('select'))}>
              <span className="preset-icon" aria-hidden>
                {p.icon}
              </span>
              <span className="preset-name">{p.name}</span>
              <span className="preset-desc">{p.desc}</span>
              <span className="preset-state">{on ? '✔ مفعّل' : 'غير مفعّل'}</span>
            </button>
          )
        })}
      </div>
      <h3>حجم النص</h3>
      <div className="seg" role="group" aria-label="حجم النص">
        {[1, 1.15, 1.35, 1.6].map((s) => (
          <button key={s} type="button" className={flags.textScale === s ? 'on' : ''} aria-pressed={flags.textScale === s} onClick={() => setFlag('textScale', s)}>
            {s === 1 ? 'عادي' : s === 1.15 ? 'كبير' : s === 1.35 ? 'أكبر' : 'كبير جدًا'}
          </button>
        ))}
      </div>
      <h3>تحكم دقيق</h3>
      <div className="toggle-list">
        {TOGGLES.map((t) => (
          <label key={t.key} className="toggle">
            <input type="checkbox" checked={Boolean(flags[t.key])} onChange={(e) => setFlag(t.key, e.target.checked as never)} />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn-soft" onClick={() => sound.play('correct')}>
          ▶ جرّب صوت الإجابة الصحيحة
        </button>
        <button type="button" className="btn btn-ghost" onClick={reset}>
          إعادة الضبط الافتراضي
        </button>
      </div>
    </div>
  )
}

export function A11yPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div ref={ref} id="a11y-panel" className="drawer" role="dialog" aria-modal="true" aria-label="إعدادات إمكانية الوصول" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>♿ إمكانية الوصول والراحة</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <A11ySettings />
      </div>
    </div>
  )
}
