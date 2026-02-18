import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import type { DesignMode } from '../types'

export interface UrlState {
  mode: DesignMode
  nodeId: string | null
  simId: string | null
  panel: 'palette' | 'metrics' | 'config' | null
  debug: boolean
}

function parseMode(raw: string | null): DesignMode {
  if (raw === 'ui' || raw === 'service') return raw
  return 'system'
}

function parsePanel(raw: string | null): UrlState['panel'] {
  if (raw === 'metrics' || raw === 'config' || raw === 'palette') return raw
  return null
}

export function useUrlState() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const state: UrlState = {
    mode: parseMode(params.get('mode')),
    nodeId: params.get('nodeId'),
    simId: params.get('simId'),
    panel: parsePanel(params.get('panel')),
    debug: params.get('debug') === 'true',
  }

  const setUrlState = useCallback(
    (updates: Partial<UrlState>) => {
      const current = new URLSearchParams(params)

      if (updates.mode !== undefined) {
        current.set('mode', updates.mode)
      }
      if ('nodeId' in updates) {
        if (updates.nodeId) {
          current.set('nodeId', updates.nodeId)
          if (!current.has('panel')) current.set('panel', 'config')
        } else {
          current.delete('nodeId')
          if (current.get('panel') === 'config') current.delete('panel')
        }
      }
      if ('simId' in updates) {
        if (updates.simId) current.set('simId', updates.simId)
        else current.delete('simId')
      }
      if ('panel' in updates) {
        if (updates.panel) current.set('panel', updates.panel)
        else current.delete('panel')
      }
      if ('debug' in updates) {
        if (updates.debug) current.set('debug', 'true')
        else current.delete('debug')
      }

      navigate({ search: current.toString() }, { replace: true })
    },
    [params, navigate]
  )

  return { state, setUrlState }
}
