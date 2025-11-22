'use client'

import { useState, useEffect, useCallback } from 'react'

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineAt: Date | null
}

/**
 * Hook to track browser online/offline status
 * Returns current status plus whether user was recently offline
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setLastOnlineAt(new Date())
    // Keep wasOffline true for a few seconds to show "reconnected" message
    setTimeout(() => setWasOffline(false), 5000)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
  }, [])

  useEffect(() => {
    // Set initial state based on navigator
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { isOnline, wasOffline, lastOnlineAt }
}
