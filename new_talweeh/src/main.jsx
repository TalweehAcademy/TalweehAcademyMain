import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* v7_startTransition: in-app navigation keeps the current page on screen until the next
        page's code has loaded, instead of flashing the Suspense fallback in between. */}
    <BrowserRouter future={{ v7_startTransition: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
