import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sound } from '../audio/sound'
import { saveLesson } from '../lib/lessons'
import { useSession } from '../lib/supabase'
import { useStore } from '../state/store'

/** "Save to Library": stores the lesson, its analysis and all generated games in Supabase. */
export function SaveToLibrary() {
  const session = useSession()
  const { bundle, setBundle } = useStore()
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  if (!bundle || bundle.lesson.id.startsWith('sample-')) return null
  if (session === null && bundle.remoteId) return null
  if (session === null)
    return (
      <Link to="/teacher" className="btn btn-soft">
        🔑 سجّل الدخول لحفظ الدرس في المكتبة
      </Link>
    )
  const save = async () => {
    setState('saving')
    try {
      const id = await saveLesson(bundle)
      setBundle({ ...bundle, remoteId: id })
      setState('saved')
      sound.play('stage')
    } catch (e) {
      setError((e as Error).message)
      setState('error')
    }
  }
  return (
    <span className="save-wrap">
      <button type="button" className="btn btn-primary" onClick={save} disabled={state === 'saving' || !session}>
        {state === 'saving' ? '… جارٍ الحفظ' : bundle.remoteId ? '💾 حفظ التعديلات في المكتبة' : '💾 حفظ الدرس في المكتبة'}
      </button>
      {state === 'saved' && (
        <span className="save-ok" role="status">
          ✔ تم الحفظ — سيظهر في مكتبة الدروس على أي جهاز
        </span>
      )}
      {state === 'error' && (
        <span className="error small" role="alert">
          تعذّر الحفظ: {error}
        </span>
      )}
    </span>
  )
}
