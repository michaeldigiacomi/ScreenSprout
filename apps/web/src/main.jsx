import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { csrfManager } from './lib/csrf.js'
import { ThemeProvider } from './context/ThemeContext.jsx'

// Initialize CSRF token before rendering the app
// This ensures we have a token ready for any API calls
csrfManager.init().then(() => {
    console.log('[CSRF] Token initialized');
}).catch((err) => {
    console.error('[CSRF] Failed to initialize token:', err);
    // Continue anyway - the interceptor will fetch on first mutating request
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
