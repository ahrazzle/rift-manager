import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/primitives.css'
import './styles.css'
import './management.css'
import './match.css'

createRoot(document.getElementById('root')).render(<App />)
