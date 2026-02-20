import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

const useIsMobileViewport = () => {
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobileViewport
}

export default useIsMobileViewport
