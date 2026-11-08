import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { sound } from '../audio/sound'
import { useStore } from '../state/store'
import { A11yPanel } from './A11yPanel'
import { SoundCaptions } from './common'

export function Layout() {
  const [panel, setPanel] = useState(false)
  const { bundle } = useStore()
  const loc = useLocation()
  const playing = loc.pathname.startsWith('/play')

  useEffect(() => {
    // Audio may only start after the first interaction.
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    setPanel(false)
  }, [loc.pathname])

  return (
    <div className={`app ${playing ? 'app-playing' : ''}`}>
      <a href="#main" className="skip-link">
        انتقل إلى المحتوى
      </a>
      {!playing && (
        <header className="topbar">
          <NavLink to="/" className="brand" aria-label="الصفحة الرئيسية — ملعب الدروس">
            <span className="brand-mark" aria-hidden>
              🎲
            </span>
            <span>
              ملعب الدروس <small>تعلّم باللعب</small>
            </span>
          </NavLink>
          <nav aria-label="التنقل الرئيسي" className="nav">
            <NavLink to="/lesson">ابدأ درسًا</NavLink>
            {bundle && <NavLink to="/games">ألعاب الدرس</NavLink>}
            <NavLink to="/library">مكتبة الألعاب</NavLink>
            <NavLink to="/privacy">الخصوصية</NavLink>
          </nav>
          <button type="button" className="btn btn-soft a11y-toggle" onClick={() => setPanel(true)} aria-expanded={panel} aria-controls="a11y-panel">
            ♿ إمكانية الوصول
          </button>
        </header>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet context={{ openA11y: () => setPanel(true) }} />
      </main>
      {panel && <A11yPanel onClose={() => setPanel(false)} />}
      <SoundCaptions />
    </div>
  )
}
