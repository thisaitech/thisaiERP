import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './main.css'
import { initializeTheme } from './services/themeService'

// Initialize festival theme on app start
initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
