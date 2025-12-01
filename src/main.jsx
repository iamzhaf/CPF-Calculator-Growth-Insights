import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CPFcalculator from './CPFcalculator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CPFcalculator />
  </StrictMode>,
)
