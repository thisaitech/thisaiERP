// AI Assistant Context - For communicating AI actions across the app
import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ActionResult } from '../services/aiActionHandler'

interface AIAssistantContextValue {
  lastAction: ActionResult | null
  triggerAction: (action: ActionResult) => void
  clearAction: () => void
}

const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined)

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [lastAction, setLastAction] = useState<ActionResult | null>(null)

  const triggerAction = useCallback((action: ActionResult) => {
    console.log('🎯 AI Action triggered:', action)
    setLastAction(action)
  }, [])

  const clearAction = useCallback(() => {
    setLastAction(null)
  }, [])

  return (
    <AIAssistantContext.Provider value={{ lastAction, triggerAction, clearAction }}>
      {children}
    </AIAssistantContext.Provider>
  )
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext)
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider')
  }
  return context
}
