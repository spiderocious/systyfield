import { createContext, useContext } from 'react'

export interface CinematicContextValue {
  cinematicMode: boolean
  focusNodeId: string | null
}

export const CinematicContext = createContext<CinematicContextValue>({
  cinematicMode: false,
  focusNodeId: null,
})

export function useCinematic(): CinematicContextValue {
  return useContext(CinematicContext)
}
