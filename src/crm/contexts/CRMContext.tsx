// CRM Context for state management
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CRMLead, CRMDashboardMetrics, CRMSettings, CRMFilters } from '../types';
import { getDashboardMetrics, getCRMSettings, getLeads } from '../services/crmService';

// CRM State
interface CRMState {
  leads: CRMLead[];
  dashboardMetrics: CRMDashboardMetrics | null;
  settings: CRMSettings | null;
  filters: CRMFilters;
  loading: {
    leads: boolean;
    dashboard: boolean;
    settings: boolean;
  };
  error: string | null;
}

// CRM Actions
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
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: CRMState = {
  leads: [],
  dashboardMetrics: null,
  settings: null,
  filters: {},
  loading: {
    leads: false,
    dashboard: false,
    settings: false
  },
  error: null
};

// CRM Reducer
const crmReducer = (state: CRMState, action: CRMActions): CRMState => {
  switch (action.type) {
    case 'SET_LEADS':
      return { ...state, leads: action.payload };

    case 'ADD_LEAD':
      return { ...state, leads: [action.payload, ...state.leads] };

    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(lead =>
          lead.id === action.payload.id ? action.payload : lead
        )
      };

    case 'DELETE_LEAD':
      return {
        ...state,
        leads: state.leads.filter(lead => lead.id !== action.payload)
      };

    case 'SET_DASHBOARD_METRICS':
      return { ...state, dashboardMetrics: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: action.payload };

    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
};

// CRM Context
interface CRMContextType extends CRMState {
  // Actions
  setLeads: (leads: CRMLead[]) => void;
  addLead: (lead: CRMLead) => void;
  updateLead: (lead: CRMLead) => void;
  deleteLead: (leadId: string) => void;
  setFilters: (filters: CRMFilters) => void;
  refreshDashboard: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  clearError: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// CRM Provider
interface CRMProviderProps {
  children: ReactNode;
}

export const CRMProvider: React.FC<CRMProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(crmReducer, initialState);

  // Load dashboard metrics and settings on mount (leads will be loaded as needed)
  useEffect(() => {
    const initializeCRM = async () => {
      try {
        await Promise.allSettled([
          refreshDashboard(),
          refreshSettings()
        ]);

        // Load leads separately to avoid timing issues
        setTimeout(() => refreshLeads(), 100);
      } catch (error) {
        console.error('Failed to initialize CRM:', error);
        // Don't crash the app, just log the error
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to load CRM data. Please refresh the page.'
        });
      }
    };

    initializeCRM();
  }, []);

  const setLeads = (leads: CRMLead[]) => {
    dispatch({ type: 'SET_LEADS', payload: leads });
  };

  const addLead = (lead: CRMLead) => {
    dispatch({ type: 'ADD_LEAD', payload: lead });
  };

  const updateLead = (lead: CRMLead) => {
    dispatch({ type: 'UPDATE_LEAD', payload: lead });
  };

  const deleteLead = (leadId: string) => {
    dispatch({ type: 'DELETE_LEAD', payload: leadId });
  };

  const setFilters = (filters: CRMFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const refreshDashboard = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: true } });
      dispatch({ type: 'SET_ERROR', payload: null });

      const metrics = await getDashboardMetrics();
      dispatch({ type: 'SET_DASHBOARD_METRICS', payload: metrics });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load dashboard'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: false } });
    }
  };

  const refreshSettings = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });

      const settings = await getCRMSettings();
      if (settings) {
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      }
    } catch (error) {
      console.warn('Failed to load CRM settings:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
    }
  };

  const refreshLeads = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'leads', value: true } });
      dispatch({ type: 'SET_ERROR', payload: null });

      let result;
      try {
        result = await getLeads({}, 1, 1000); // Load up to 1000 leads
      } catch (leadsError: any) {
        // Primary leads query failed, trying fallback
        const { getLeadsWithoutOrdering } = await import('../services/crmService');
        result = await getLeadsWithoutOrdering();
      }
      dispatch({ type: 'SET_LEADS', payload: result.data });
    } catch (error: any) {
      // If it's a Firebase index error, try to create the index or use fallback
      if (error.message && error.message.includes('requires an index')) {
        // Try a simple query without ordering as fallback
        try {
          const { getLeadsWithoutOrdering } = await import('../services/crmService');
          const fallbackResult = await getLeadsWithoutOrdering();
          dispatch({ type: 'SET_LEADS', payload: fallbackResult.data });
          dispatch({
            type: 'SET_ERROR',
            payload: 'Using fallback data. Please create Firebase index for full functionality.'
          });
        } catch (fallbackError) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to load leads. Check Firebase index configuration.'
          });
        }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to load leads'
        });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'leads', value: false } });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: CRMContextType = {
    ...state,
    setLeads,
    addLead,
    updateLead,
    deleteLead,
    setFilters,
    refreshDashboard,
    refreshSettings,
    refreshLeads,
    clearError
  };

  return (
    <CRMContext.Provider value={contextValue}>
      {children}
    </CRMContext.Provider>
  );
};

// CRM Hook
export const useCRM = (): CRMContextType => {
  const context = useContext(CRMContext);
  if (context === undefined) {
    console.error('❌ useCRM called outside of CRMProvider! This might be a hot reload issue.');
    // Return a dummy context to prevent crashes during hot reload
    // This should never happen in production with proper component structure
    return {
      leads: [],
      dashboardMetrics: null,
      settings: null,
      filters: {},
      loading: { leads: false, dashboard: false, settings: false },
      error: 'CRM Context not available - please refresh the page',
      setLeads: () => {},
      addLead: () => {},
      updateLead: () => {},
      deleteLead: () => {},
      setFilters: () => {},
      refreshDashboard: async () => {},
      refreshSettings: async () => {},
      refreshLeads: async () => {},
      clearError: () => {}
    };
  }
  return context;
};

export default CRMContext;
