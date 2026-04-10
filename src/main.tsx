import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply persisted theme before first paint
// Modes: 'light' | 'dark' | 'auto' (default: auto -> dark from 19:00 to 06:00)
function applyTheme() {
  const mode = localStorage.getItem('settings-theme') || 'auto';
  const h = new Date().getHours();
  const isDarkHour = h >= 19 || h < 6;
  const dark = mode === 'dark' || (mode === 'auto' && isDarkHour);
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
