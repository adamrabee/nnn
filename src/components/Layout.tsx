import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { sound } from '../audio/sound'
import { useStore } from '../state/store'

export function Layout() {
  const { bundle } = useStore()
  const loc = useLocation()
  const immersive = loc.pathname.startsWith('/play')

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
  }, [loc.pathname])

  return (
    <div className={`app ${immersive ? 'app-playing' : ''}`}>
      <a href="#main" className="skip-link">
        انتقل إلى المحتوى
      </a>
      {!immersive && (
        <header className="topbar">
          <NavLink to="/" className="brand" aria-label="Droos — مكتبة الدروس">
            <img src="/droos-logo.png" alt="Droos" className="brand-logo" />
          </NavLink>
          <nav aria-label="التنقل الرئيسي" className="nav">
            <NavLink to="/" end>
              مكتبة الدروس
            </NavLink>
            {bundle && <NavLink to="/games">ألعاب الدرس</NavLink>}
            <NavLink to="/wheel">عجلة الطلاب</NavLink>
            <NavLink to="/teacher">لوحة المعلم</NavLink>
          </nav>
        </header>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      {!immersive && (
        <footer className="footer">
          <img src="/droos-logo.png" alt="" className="footer-logo" />
          <span>تعلّم باللعب داخل الفصل</span>
          <NavLink to="/privacy">الخصوصية</NavLink>
        </footer>
      )}
    </div>
  )
}
