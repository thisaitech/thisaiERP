import React, { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { CRM_STAGES } from '../constants'
import type { CRMDashboardMetrics, CRMFilters, CRMLead, CRMSettings, CRMStage, CRMStatus } from '../types'
import { getSettings, listLeads } from '../services/admissionsCrmApi'

interface CRMState {
  leads: CRMLead[]
  dashboardMetrics: CRMDashboardMetrics | null
  settings: CRMSettings | null
  filters: CRMFilters
  loading: {
    leads: boolean
    dashboard: boolean
    settings: boolean
  }
  error: string | null
}

type CRMActions =
  | { type: 'SET_LEADS'; payload: CRMLead[] }
  | { type: 'ADD_LEAD'; payload: CRMLead }
  | { type: 'UPDATE_LEAD'; payload: CRMLead }
  | { type: 'DELETE_LEAD'; payload: string }
  | { type: 'SET_DASHBOARD_METRICS'; payload: CRMDashboardMetrics }
  | { type: 'SET_SETTINGS'; payload: CRMSettings }
  | { type: 'SET_FILTERS'; payload: CRMFilters }
  | { type: 'SET_LOADING'; payload: { key: keyof CRMState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }

const initialState: CRMState = {
  leads: [],
  dashboardMetrics: null,
  settings: null,
  filters: {},
  loading: { leads: false, dashboard: false, settings: false },
  error: null,
}

function computeDashboardMetrics(leads: CRMLead[]): CRMDashboardMetrics {
  const stageCounts = {} as Record<CRMStage, number>
  for (const stage of Object.keys(CRM_STAGES) as CRMStage[]) stageCounts[stage] = 0

  const statusCounts: Record<CRMStatus, number> = { open: 0, admitted: 0, lost: 0, waiting: 0 }

  for (const lead of leads) {
    if (lead.stage in stageCounts) stageCounts[lead.stage] += 1
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
  }

  const totalLeads = leads.length
  const admitted = statusCounts.admitted || 0
  const conversionRate = totalLeads > 0 ? Math.round((admitted / totalLeads) * 100) : 0

  return { totalLeads, stageCounts, statusCounts, conversionRate }
}

function crmReducer(state: CRMState, action: CRMActions): CRMState {
  switch (action.type) {
    case 'SET_LEADS':
      return { ...state, leads: action.payload }
    case 'ADD_LEAD':
      return { ...state, leads: [action.payload, ...state.leads] }
    case 'UPDATE_LEAD':
      return { ...state, leads: state.leads.map((l) => (l.id === action.payload.id ? action.payload : l)) }
    case 'DELETE_LEAD':
      return { ...state, leads: state.leads.filter((l) => l.id !== action.payload) }
    case 'SET_DASHBOARD_METRICS':
      return { ...state, dashboardMetrics: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export interface CRMContextType extends CRMState {
  setLeads: (leads: CRMLead[]) => void
  addLead: (lead: CRMLead) => void
  updateLead: (lead: CRMLead) => void
  deleteLead: (leadId: string) => void
  setFilters: (filters: CRMFilters) => void
  refreshDashboard: () => Promise<void>
  refreshSettings: () => Promise<void>
  refreshLeads: () => Promise<void>
  clearError: () => void
}

const CRMContext = createContext<CRMContextType | undefined>(undefined)

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(crmReducer, initialState)

  const setLeads = (leads: CRMLead[]) => {
    dispatch({ type: 'SET_LEADS', payload: leads })
    dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(leads) })
  }

  const addLead = (lead: CRMLead) => {
    const next = [lead, ...state.leads]
    dispatch({ type: 'ADD_LEAD', payload: lead })
    dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(next) })
  }

  const updateLead = (lead: CRMLead) => {
    const next = state.leads.map((l) => (l.id === lead.id ? lead : l))
    dispatch({ type: 'UPDATE_LEAD', payload: lead })
    dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(next) })
  }

  const deleteLead = (leadId: string) => {
    const next = state.leads.filter((l) => l.id !== leadId)
    dispatch({ type: 'DELETE_LEAD', payload: leadId })
    dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(next) })
  }

  const setFilters = (filters: CRMFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }

  const refreshDashboard = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: true } })
    dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(state.leads) })
    dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: false } })
  }

  const refreshSettings = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } })
    try {
      const settings = await getSettings()
      dispatch({ type: 'SET_SETTINGS', payload: settings })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load CRM settings',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } })
    }
  }

  const refreshLeads = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'leads', value: true } })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const leads = await listLeads()
      dispatch({ type: 'SET_LEADS', payload: leads })
      dispatch({ type: 'SET_DASHBOARD_METRICS', payload: computeDashboardMetrics(leads) })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load leads',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'leads', value: false } })
    }
  }

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  useEffect(() => {
    // Initial load in parallel.
    void Promise.all([refreshSettings(), refreshLeads()])
  }, [])

  const contextValue = useMemo<CRMContextType>(
    () => ({
      ...state,
      setLeads,
      addLead,
      updateLead,
      deleteLead,
      setFilters,
      refreshDashboard,
      refreshSettings,
      refreshLeads,
      clearError,
    }),
    [state]
  )

  return <CRMContext.Provider value={contextValue}>{children}</CRMContext.Provider>
}

export function useCRM(): CRMContextType {
  const ctx = useContext(CRMContext)
  if (!ctx) {
    return {
      ...initialState,
      error: 'CRM Context not available',
      setLeads: () => {},
      addLead: () => {},
      updateLead: () => {},
      deleteLead: () => {},
      setFilters: () => {},
      refreshDashboard: async () => {},
      refreshSettings: async () => {},
      refreshLeads: async () => {},
      clearError: () => {},
    }
  }
  return ctx
}

