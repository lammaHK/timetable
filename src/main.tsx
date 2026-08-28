import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { PreferencesProvider, usePrefs } from './context/PreferencesContext'
import { I18nProvider } from './lib/i18n'

function Root() {
  const { lang, setLang } = usePrefs()
  return (
    <I18nProvider lang={lang} onLang={setLang}>
      <App />
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PreferencesProvider>
        <MotionConfig reducedMotion="never">
          <Root />
        </MotionConfig>
      </PreferencesProvider>
    </AuthProvider>
  </StrictMode>,
)

// Register the service worker for offline / home-screen installability (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
