import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Design, DesignMode } from '@shared/types'
import { ROUTES } from '@shared/constants'
import { log } from '@shared/utils'
import {
  createNewDesign,
  loadDesign,
  saveDesign,
} from '../services/design-service'

const AUTOSAVE_DELAY_MS = 800

export function useDesignSession(mode: DesignMode) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [design, setDesign] = useState<Design | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load or create design on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      if (!id || id === 'new') {
        log.session.info('Creating new design')
        const fresh = createNewDesign(mode)
        setDesign(fresh)
        // Persist and redirect to the design URL
        await saveDesign(fresh)
        navigate(ROUTES.CANVAS.DESIGN(fresh.id), { replace: true })
      } else {
        log.session.info('Loading existing design', { id })
        const existing = await loadDesign(id)
        if (existing) {
          setDesign(existing)
        } else {
          log.session.warn('Design not found, creating new', { id })
          const fresh = createNewDesign(mode)
          setDesign(fresh)
          await saveDesign(fresh)
          navigate(ROUTES.CANVAS.DESIGN(fresh.id), { replace: true })
        }
      }
      setIsLoading(false)
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleAutosave = useCallback((updated: Design) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      log.session.debug('Autosaving design', { id: updated.id })
      setIsSaving(true)
      try {
        await saveDesign(updated)
      } catch (err) {
        log.session.error('Autosave failed', err)
      } finally {
        setIsSaving(false)
      }
    }, AUTOSAVE_DELAY_MS)
  }, [])

  const updateTitle = useCallback(
    (title: string) => {
      setDesign(prev => {
        if (!prev) return prev
        const updated = { ...prev, meta: { ...prev.meta, title } }
        scheduleAutosave(updated)
        return updated
      })
    },
    [scheduleAutosave]
  )

  const saveNow = useCallback(async () => {
    if (!design) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setIsSaving(true)
    try {
      const saved = await saveDesign(design)
      setDesign(saved)
      log.session.info('Manual save complete', { id: design.id })
    } catch (err) {
      log.session.error('Manual save failed', err)
    } finally {
      setIsSaving(false)
    }
  }, [design])

  return {
    design,
    isSaving,
    isLoading,
    updateTitle,
    saveNow,
    scheduleAutosave,
  }
}
