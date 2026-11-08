import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { End } from './pages/End'
import { GamesPage } from './pages/GamesPage'
import { Home } from './pages/Home'
import { LessonInput } from './pages/LessonInput'
import { Library } from './pages/Library'
import { Play } from './pages/Play'
import { Privacy } from './pages/Privacy'
import { Review } from './pages/Review'
import { Setup } from './pages/Setup'
import { A11yProvider } from './state/a11y'
import { StoreProvider } from './state/store'

export default function App() {
  return (
    <A11yProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="lesson" element={<LessonInput />} />
              <Route path="games" element={<GamesPage />} />
              <Route path="review" element={<Review />} />
              <Route path="setup/:gameId" element={<Setup />} />
              <Route path="play" element={<Play />} />
              <Route path="end" element={<End />} />
              <Route path="library" element={<Library />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </A11yProvider>
  )
}
