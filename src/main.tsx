import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'
import { log } from '@shared/utils'
import { isDebugMode } from '@shared/utils'

log.app.info('Systyfield starting', {
  mode: import.meta.env.MODE,
  debug: isDebugMode(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
