import { useEffect, useRef, useState } from 'react'

type SessionJson = any
type SessionResp = SessionJson | null

type Options = {
  intervalMs?: number            // default 30000
  failThreshold?: number         // default 2
  pauseWhenHidden?: boolean      // default true
  /** How long (ms) to keep considering the session “healthy” after a success to avoid flicker; default 5000 */
  successGraceMs?: number
  /** Determine whether a JSON payload indicates an authenticated session */
  successPredicate?: (json: SessionJson) => boolean
}

export function useAuthHeartbeat(opts: Options = {}) {
  const {
    intervalMs = 30000,
    failThreshold = 2,
    pauseWhenHidden = true,
    successGraceMs = 5000,
    successPredicate = (j: SessionJson) => {
      // Default behavior: prefer explicit flag, otherwise accept common shapes
      if (j && typeof j === 'object') {
        if ('authenticated' in j) return !!j.authenticated
        if (j.user || j.email || j.profile) return true
      }
      return false
    },
  } = opts

  const [authDown, setAuthDown] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [lastOkAt, setLastOkAt] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)

  async function check() {
    try {
      const res = await fetch('/api/session', { credentials: 'include' })
      // If it’s not 2xx, treat as a failure
      if (!res.ok) throw new Error(`session ${res.status}`)
      const json = (await res.json()) as SessionResp
      const ok = successPredicate(json)

      if (ok) {
        setLastOkAt(Date.now())
        setErrorCount(0)
        // clear the modal immediately on success
        setAuthDown(false)
      } else {
        // 2xx but unauthenticated
        setErrorCount(0)
        setAuthDown(true)
      }
    } catch {
      // Network or 5xx error
      setErrorCount((n) => {
        const next = n + 1
        // if we had a recent success within grace, don’t drop auth immediately
        if (lastOkAt && Date.now() - lastOkAt < successGraceMs) {
          return 0
        }
        if (next >= failThreshold) setAuthDown(true)
        return next
      })
    }
  }

  useEffect(() => {
    // initial check
    check()

    function tick() {
      if (pauseWhenHidden && document.visibilityState === 'hidden') return
      check()
    }

    timerRef.current = window.setInterval(tick, intervalMs)

    const onVis = () => {
      if (!pauseWhenHidden) return
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, failThreshold, pauseWhenHidden, successGraceMs])

  return {
    authDown,
    errorCount,
    lastOkAt,
    recheck: check,
  }
}