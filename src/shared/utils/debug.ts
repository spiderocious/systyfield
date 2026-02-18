const DEBUG_KEY = 'systyfield_debug'

export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('debug') === 'true') {
    localStorage.setItem(DEBUG_KEY, 'true')
    return true
  }
  if (urlParams.get('debug') === 'false') {
    localStorage.removeItem(DEBUG_KEY)
    return false
  }
  return localStorage.getItem(DEBUG_KEY) === 'true'
}

export function enableDebug(): void {
  localStorage.setItem(DEBUG_KEY, 'true')
}

export function disableDebug(): void {
  localStorage.removeItem(DEBUG_KEY)
}
