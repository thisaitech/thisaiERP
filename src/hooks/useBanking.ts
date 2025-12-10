import { useEffect, useState, useCallback } from 'react'
import { appEventTarget } from '../services/syncService'

export const useBanking = () => {
  const read = () => {
    try {
      const raw = localStorage.getItem('bankingAccounts')
      return raw ? JSON.parse(raw) : { cashInHand: { balance: 0 }, accounts: [] }
    } catch (e) {
      console.warn('useBanking: failed to parse bankingAccounts', e)
      return { cashInHand: { balance: 0 }, accounts: [] }
    }
  }

  const [accounts, setAccounts] = useState<any>(() => read())

  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail
        setAccounts(detail)
      } catch (e) {
        // ignore
      }
    }

    appEventTarget.addEventListener('bankingUpdated', handler as EventListener)

    // Also respond to storage events for cross-tab updates
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bankingAccounts') {
        setAccounts(read())
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      appEventTarget.removeEventListener('bankingUpdated', handler as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const refresh = useCallback(() => {
    setAccounts(read())
  }, [])

  return { accounts, refresh }
}
