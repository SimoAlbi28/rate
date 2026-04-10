import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply persisted theme before first paint
// Modes: 'light' | 'dark' | 'auto' (default: auto -> dark from 18:47 to 06:00 [test])
function applyTheme() {
  const mode = localStorage.getItem('settings-theme') || 'auto';
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isDarkHour = minutes >= 20 * 60 || minutes < 6 * 60;
  const dark = mode === 'dark' || (mode === 'auto' && isDarkHour);
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme();

// Reset session sort modes to the user's defaults from Settings (if any)
// This way: changes in Home/Cronologia stay live for the session, but on every
// reopen the app starts from the defaults configured in Settings.
const sortDefault = localStorage.getItem('sortMode-default');
if (sortDefault) localStorage.setItem('sortMode', sortDefault);
const cronoSortDefault = localStorage.getItem('cronologia-sort-default');
if (cronoSortDefault) localStorage.setItem('cronologia-sort', cronoSortDefault);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
