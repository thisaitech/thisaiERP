/**
 * CRM Standalone Module
 *
 * A complete, embeddable CRM system for construction lead management.
 * This file can be copied to any React project for integration.
 *
 * Dependencies required in your project:
 * - react, react-dom
 * - react-router-dom
 * - framer-motion
 * - @phosphor-icons/react
 * - date-fns
 * - Firebase (for data storage) OR implement your own data adapter
 *
 * Usage:
 * ```tsx
 * import { CRMModule } from './CRMStandalone';
 *
 * function App() {
 *   return <CRMModule />;
 * }
 * ```
 *
 * For integration with existing routing:
 * ```tsx
 * import { CRMRoutes } from './CRMStandalone';
 *
 * // In your router
 * <Route path="/crm/*" element={<CRMRoutes />} />
 * ```
 */

import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ChartLine,
  Users,
  Kanban,
  Gear,
  Plus,
  MagnifyingGlass,
  Funnel,
  ArrowsDownUp,
  Phone,
  Chat,
  Calendar,
  MapPin,
  CurrencyDollar,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Pencil,
  FloppyDisk,
  X,
  Eye,
  FileText,
  Camera,
  Upload,
  List,
  Envelope,
  ArrowLeft,
  ArrowsClockwise,
  User,
  Tag,
  Warning,
  Info,
  CaretRight,
  CaretDown,
  DotsThree
} from '@phosphor-icons/react';

// ============================================================================
// TYPES
// ============================================================================

export interface CRMLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  projectName: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  source: string;
  stage: CRMStageKey;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedValue?: number;
  budgetMin?: number;
  budgetMax?: number;
  sqft?: number;
  projectType?: string;
  timeline?: string;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  lastActivityAt?: Date;
  nextFollowUpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CRMActivity {
  id: string;
  leadId: string;
  type: 'call' | 'meeting' | 'email' | 'site_visit' | 'whatsapp' | 'note' | 'stage_change';
  title: string;
  description?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  outcome?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CRMSiteVisit {
  id: string;
  leadId: string;
  engineerId: string;
  engineerName: string;
  visitAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  photos?: string[];
  checklist: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CRMAttachment {
  id: string;
  leadId: string;
  entityType: 'lead' | 'site_visit' | 'quotation' | 'drawing';
  entityId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CRMSettings {
  id: string;
  companyId: string;
  leadSources: string[];
  projectTypes: string[];
  engineers: { id: string; name: string; phone: string }[];
  siteVisitChecklist: string[];
  notifications: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    reminderHours: number;
  };
  updatedAt: Date;
  updatedBy: string;
}

type CRMStageKey = 'lead_created' | 'qualified' | 'site_visit_scheduled' | 'requirements_collected' |
  'drawing_prepared' | 'quotation_sent' | 'negotiation' | 'confirmed' | 'waiting' | 'lost';

// ============================================================================
// CONSTANTS
// ============================================================================

const CRM_STAGES: Record<CRMStageKey, { label: string; color: string; order: number }> = {
  lead_created: { label: 'Lead Created', color: 'bg-slate-100 text-slate-800', order: 1 },
  qualified: { label: 'Qualified', color: 'bg-blue-100 text-blue-800', order: 2 },
  site_visit_scheduled: { label: 'Site Visit Scheduled', color: 'bg-purple-100 text-purple-800', order: 3 },
  requirements_collected: { label: 'Requirements Collected', color: 'bg-indigo-100 text-indigo-800', order: 4 },
  drawing_prepared: { label: 'Drawing Prepared', color: 'bg-cyan-100 text-cyan-800', order: 5 },
  quotation_sent: { label: 'Quotation Sent', color: 'bg-amber-100 text-amber-800', order: 6 },
  negotiation: { label: 'Negotiation', color: 'bg-orange-100 text-orange-800', order: 7 },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', order: 8 },
  waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800', order: 9 },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-800', order: 10 }
};

const CRM_PRIORITIES = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' }
};

const CRM_DEFAULTS = {
  LEAD_SOURCES: ['Website', 'Facebook', 'Google Ads', 'Instagram', 'Referral', 'Cold Call', 'Walk-in', 'JustDial', 'IndiaMART'],
  PROJECT_TYPES: ['Residential House', 'Commercial Building', 'Villa', 'Apartment Complex', 'Office Building', 'Warehouse', 'Factory', 'Renovation']
};

// ============================================================================
// DATA ADAPTER INTERFACE (Implement this for your backend)
// ============================================================================

export interface CRMDataAdapter {
  // Leads
  getLeads(): Promise<CRMLead[]>;
  getLead(id: string): Promise<CRMLead | null>;
  createLead(data: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead>;
  updateLead(id: string, data: Partial<CRMLead>): Promise<void>;
  deleteLead(id: string): Promise<void>;

  // Activities
  getLeadActivities(leadId: string): Promise<CRMActivity[]>;
  createActivity(data: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity>;

  // Site Visits
  getLeadSiteVisits(leadId: string): Promise<CRMSiteVisit[]>;
  createSiteVisit(data: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSiteVisit>;

  // Attachments
  getLeadAttachments(leadId: string): Promise<CRMAttachment[]>;
  uploadAttachment(file: File, leadId: string, category?: string): Promise<CRMAttachment>;

  // Settings
  getSettings(): Promise<CRMSettings | null>;
  updateSettings(data: Partial<CRMSettings>): Promise<void>;
}

// ============================================================================
// LOCAL STORAGE ADAPTER (Default implementation - stores in IndexedDB)
// ============================================================================

class LocalStorageAdapter implements CRMDataAdapter {
  private dbName = 'crm_standalone';
  private version = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('leads')) {
          db.createObjectStore('leads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activities')) {
          const store = db.createObjectStore('activities', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
        }
        if (!db.objectStoreNames.contains('siteVisits')) {
          const store = db.createObjectStore('siteVisits', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
        }
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }

  private generateId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getLeads(): Promise<CRMLead[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['leads'], 'readonly');
      const store = transaction.objectStore('leads');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getLead(id: string): Promise<CRMLead | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['leads'], 'readonly');
      const store = transaction.objectStore('leads');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async createLead(data: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead> {
    const db = await this.openDB();
    const lead: CRMLead = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['leads'], 'readwrite');
      const store = transaction.objectStore('leads');
      const request = store.add(lead);
      request.onsuccess = () => resolve(lead);
      request.onerror = () => reject(request.error);
    });
  }

  async updateLead(id: string, data: Partial<CRMLead>): Promise<void> {
    const db = await this.openDB();
    const existing = await this.getLead(id);
    if (!existing) throw new Error('Lead not found');

    const updated = { ...existing, ...data, updatedAt: new Date() };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['leads'], 'readwrite');
      const store = transaction.objectStore('leads');
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLead(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['leads'], 'readwrite');
      const store = transaction.objectStore('leads');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLeadActivities(leadId: string): Promise<CRMActivity[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['activities'], 'readonly');
      const store = transaction.objectStore('activities');
      const index = store.index('leadId');
      const request = index.getAll(leadId);
      request.onsuccess = () => {
        const activities = request.result || [];
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(activities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createActivity(data: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity> {
    const db = await this.openDB();
    const activity: CRMActivity = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['activities'], 'readwrite');
      const store = transaction.objectStore('activities');
      const request = store.add(activity);
      request.onsuccess = () => resolve(activity);
      request.onerror = () => reject(request.error);
    });
  }

  async getLeadSiteVisits(leadId: string): Promise<CRMSiteVisit[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readonly');
      const store = transaction.objectStore('siteVisits');
      const index = store.index('leadId');
      const request = index.getAll(leadId);
      request.onsuccess = () => {
        const visits = request.result || [];
        visits.sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime());
        resolve(visits);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createSiteVisit(data: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSiteVisit> {
    const db = await this.openDB();
    const visit: CRMSiteVisit = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readwrite');
      const store = transaction.objectStore('siteVisits');
      const request = store.add(visit);
      request.onsuccess = () => resolve(visit);
      request.onerror = () => reject(request.error);
    });
  }

  async getLeadAttachments(leadId: string): Promise<CRMAttachment[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readonly');
      const store = transaction.objectStore('attachments');
      const index = store.index('leadId');
      const request = index.getAll(leadId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async uploadAttachment(file: File, leadId: string, category?: string): Promise<CRMAttachment> {
    const db = await this.openDB();

    // Convert file to base64
    const fileUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

    const attachment: CRMAttachment = {
      id: this.generateId(),
      leadId,
      entityType: 'lead',
      entityId: leadId,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user',
      updatedBy: 'user'
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      const request = store.add(attachment);
      request.onsuccess = () => resolve(attachment);
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings(): Promise<CRMSettings | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('default');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSettings(data: Partial<CRMSettings>): Promise<void> {
    const db = await this.openDB();
    const existing = await this.getSettings();
    const settings: CRMSettings = {
      id: 'default',
      companyId: 'default',
      leadSources: CRM_DEFAULTS.LEAD_SOURCES,
      projectTypes: CRM_DEFAULTS.PROJECT_TYPES,
      engineers: [],
      siteVisitChecklist: ['Plot boundaries verified', 'Soil condition checked', 'Access roads available', 'Water source available', 'Electricity connection nearby'],
      notifications: { emailEnabled: false, whatsappEnabled: false, reminderHours: 24 },
      updatedAt: new Date(),
      updatedBy: 'user',
      ...existing,
      ...data
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(settings);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface CRMContextType {
  leads: CRMLead[];
  settings: CRMSettings | null;
  loading: boolean;
  error: string | null;
  refreshLeads: () => Promise<void>;
  addLead: (lead: CRMLead) => void;
  updateLead: (lead: CRMLead) => void;
  deleteLead: (id: string) => void;
  refreshSettings: () => Promise<void>;
  adapter: CRMDataAdapter;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {} }; // Fallback if used outside provider
  }
  return context;
};

const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const icons = {
    success: <CheckCircle size={20} weight="fill" className="text-green-500" />,
    error: <XCircle size={20} weight="fill" className="text-red-500" />,
    warning: <Warning size={20} weight="fill" className="text-yellow-500" />,
    info: <Info size={20} weight="fill" className="text-blue-500" />
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-white dark:bg-slate-800 border`}
            >
              {icons[toast.type]}
              <span className="text-sm text-slate-800 dark:text-slate-200">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ============================================================================
// CRM PROVIDER
// ============================================================================

interface CRMProviderProps {
  children: ReactNode;
  adapter?: CRMDataAdapter;
}

const CRMProvider: React.FC<CRMProviderProps> = ({ children, adapter }) => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [settings, setSettings] = useState<CRMSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataAdapter = adapter || new LocalStorageAdapter();

  const refreshLeads = async () => {
    try {
      const data = await dataAdapter.getLeads();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    }
  };

  const refreshSettings = async () => {
    try {
      const data = await dataAdapter.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshLeads(), refreshSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  const addLead = (lead: CRMLead) => {
    setLeads(prev => [lead, ...prev]);
  };

  const updateLead = (lead: CRMLead) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  return (
    <CRMContext.Provider value={{
      leads,
      settings,
      loading,
      error,
      refreshLeads,
      addLead,
      updateLead,
      deleteLead,
      refreshSettings,
      adapter: dataAdapter
    }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </CRMContext.Provider>
  );
};

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

const CRMDashboard: React.FC = () => {
  const { leads, loading } = useCRM();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !['confirmed', 'lost'].includes(l.stage)).length;
  const wonDeals = leads.filter(l => l.stage === 'confirmed').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  const stageStats = Object.entries(CRM_STAGES).map(([key, stage]) => ({
    key,
    ...stage,
    count: leads.filter(l => l.stage === key).length
  }));

  const recentActivities = leads
    .filter(l => l.lastActivityAt)
    .sort((a, b) => new Date(b.lastActivityAt!).getTime() - new Date(a.lastActivityAt!).getTime())
    .slice(0, 5);

  const upcomingFollowUps = leads
    .filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) > new Date())
    .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Leads</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalLeads}</p>
          <Users size={24} className="text-blue-500 mt-2" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Active Leads</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{activeLeads}</p>
          <CheckCircle size={24} className="text-emerald-500 mt-2" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Won Deals</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{wonDeals}</p>
          <CheckCircle size={24} className="text-purple-500 mt-2" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{conversionRate}%</p>
          <ChartLine size={24} className="text-orange-500 mt-2" />
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stageStats.slice(0, 10).map(stage => (
            <div key={stage.key} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{stage.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stage.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0}% of total
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Activities</h2>
          {recentActivities.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No recent activities</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map(lead => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <MapPin size={16} className="text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(lead.lastActivityAt!), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Upcoming Follow-ups</h2>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No upcoming follow-ups</p>
          ) : (
            <div className="space-y-3">
              {upcomingFollowUps.map(lead => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <Clock size={16} className="text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(lead.nextFollowUpAt!), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LEADS LIST COMPONENT
// ============================================================================

const CRMLeadsList: React.FC = () => {
  const navigate = useNavigate();
  const { leads, loading, adapter, addLead } = useCRM();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
        >
          <option value="all">All Stages</option>
          {Object.entries(CRM_STAGES).map(([key, stage]) => (
            <option key={key} value={key}>{stage.label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Lead
        </button>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>No leads found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const stageInfo = CRM_STAGES[lead.stage] || { label: lead.stage || 'Unknown', color: 'bg-gray-100 text-gray-800' };
            const priorityInfo = CRM_PRIORITIES[lead.priority] || { label: lead.priority || 'medium', color: 'bg-gray-100 text-gray-800' };

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`lead/${lead.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{lead.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
                        {stageInfo.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{lead.projectName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {lead.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {lead.city}
                      </span>
                      {lead.expectedValue && (
                        <span className="flex items-center gap-1">
                          <CurrencyDollar size={14} /> ₹{lead.expectedValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${lead.phone}`, '_self');
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Phone size={20} className="text-green-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const message = encodeURIComponent(`Hi ${lead.name}`);
                        window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Chat size={20} className="text-emerald-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(lead) => {
          addLead(lead);
          showToast('success', 'Lead created successfully');
        }}
      />
    </div>
  );
};

// ============================================================================
// CREATE LEAD MODAL
// ============================================================================

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (lead: CRMLead) => void;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { adapter, settings } = useCRM();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    projectName: '',
    address: '',
    city: '',
    source: 'website',
    priority: 'medium' as const
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const lead = await adapter.createLead({
        ...formData,
        stage: 'lead_created',
        createdBy: 'user',
        updatedBy: 'user'
      });
      onSuccess?.(lead);
      onClose();
      setFormData({ name: '', phone: '', email: '', projectName: '', address: '', city: '', source: 'website', priority: 'medium' });
    } catch (error) {
      setErrors({ submit: 'Failed to create lead' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create New Lead</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
              {errors.projectName && <p className="text-sm text-red-600 mt-1">{errors.projectName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                >
                  {(settings?.leadSources || CRM_DEFAULTS.LEAD_SOURCES).map(source => (
                    <option key={source} value={source.toLowerCase().replace(/\s+/g, '_')}>{source}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              >
                {Object.entries(CRM_PRIORITIES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// PIPELINE BOARD COMPONENT
// ============================================================================

const CRMPipelineBoard: React.FC = () => {
  const navigate = useNavigate();
  const { leads, loading, adapter, updateLead: updateLeadContext } = useCRM();
  const { showToast } = useToast();

  const handleDragEnd = async (leadId: string, newStage: CRMStageKey) => {
    try {
      await adapter.updateLead(leadId, { stage: newStage, updatedBy: 'user' });
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        updateLeadContext({ ...lead, stage: newStage });
      }
      showToast('success', 'Lead moved successfully');
    } catch (error) {
      showToast('error', 'Failed to move lead');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {Object.entries(CRM_STAGES).map(([stageKey, stage]) => {
          const stageLeads = leads.filter(l => l.stage === stageKey);

          return (
            <div
              key={stageKey}
              className="w-72 flex-shrink-0 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{stage.label}</h3>
                <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded-full text-sm">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-3">
                {stageLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    draggable
                    onDragEnd={() => {}}
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`lead/${lead.id}`)}
                  >
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{lead.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{lead.projectName}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Phone size={12} /> {lead.phone}
                    </div>
                    {lead.expectedValue && (
                      <p className="text-sm font-medium text-green-600 mt-2">
                        ₹{lead.expectedValue.toLocaleString()}
                      </p>
                    )}
                  </motion.div>
                ))}

                {stageLeads.length === 0 && (
                  <p className="text-center py-4 text-sm text-slate-400">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// LEAD DETAIL COMPONENT
// ============================================================================

const CRMLeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adapter, updateLead: updateLeadContext } = useCRM();
  const { showToast } = useToast();

  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [siteVisits, setSiteVisits] = useState<CRMSiteVisit[]>([]);
  const [attachments, setAttachments] = useState<CRMAttachment[]>([]);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const leadData = await adapter.getLead(id);
      setLead(leadData);

      // Load related data
      const [acts, visits, files] = await Promise.all([
        adapter.getLeadActivities(id),
        adapter.getLeadSiteVisits(id),
        adapter.getLeadAttachments(id)
      ]);
      setActivities(acts);
      setSiteVisits(visits);
      setAttachments(files);
    } catch (error) {
      showToast('error', 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async (updates: Partial<CRMLead>) => {
    if (!lead) return;
    try {
      await adapter.updateLead(lead.id, updates);
      const updated = { ...lead, ...updates };
      setLead(updated);
      updateLeadContext(updated);
      showToast('success', 'Lead updated');
    } catch (error) {
      showToast('error', 'Failed to update lead');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Lead not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  const stageInfo = CRM_STAGES[lead.stage] || { label: lead.stage || 'Unknown', color: 'bg-gray-100 text-gray-800' };
  const priorityInfo = CRM_PRIORITIES[lead.priority] || { label: lead.priority || 'medium', color: 'bg-gray-100 text-gray-800' };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'activities', label: 'Activities', icon: List },
    { id: 'site-visits', label: 'Site Visits', icon: MapPin },
    { id: 'attachments', label: 'Attachments', icon: Upload }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{lead.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageInfo.color}`}>{stageInfo.label}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.color}`}>{priorityInfo.label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><Phone size={16} /> {lead.phone}</span>
            {lead.email && <span className="flex items-center gap-1"><Envelope size={16} /> {lead.email}</span>}
            <span className="flex items-center gap-1"><MapPin size={16} /> {lead.city}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`tel:${lead.phone}`, '_self')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Phone size={16} /> Call
          </button>
          <button
            onClick={() => {
              const message = encodeURIComponent(`Hi ${lead.name}`);
              window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Chat size={16} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Basic Information</h3>
                <div className="space-y-3">
                  <div><span className="text-sm text-slate-500">Name:</span> <span className="ml-2">{lead.name}</span></div>
                  <div><span className="text-sm text-slate-500">Phone:</span> <span className="ml-2">{lead.phone}</span></div>
                  <div><span className="text-sm text-slate-500">Email:</span> <span className="ml-2">{lead.email || 'N/A'}</span></div>
                  <div><span className="text-sm text-slate-500">Source:</span> <span className="ml-2">{lead.source}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Project Details</h3>
                <div className="space-y-3">
                  <div><span className="text-sm text-slate-500">Project:</span> <span className="ml-2">{lead.projectName}</span></div>
                  <div><span className="text-sm text-slate-500">Type:</span> <span className="ml-2">{lead.projectType || 'N/A'}</span></div>
                  <div><span className="text-sm text-slate-500">Area:</span> <span className="ml-2">{lead.sqft ? `${lead.sqft} sqft` : 'N/A'}</span></div>
                  <div><span className="text-sm text-slate-500">Expected Value:</span> <span className="ml-2">{lead.expectedValue ? `₹${lead.expectedValue.toLocaleString()}` : 'N/A'}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No activities yet</p>
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      {activity.type === 'call' && <Phone size={20} className="text-blue-600" />}
                      {activity.type === 'site_visit' && <MapPin size={20} className="text-orange-600" />}
                      {activity.type === 'whatsapp' && <Chat size={20} className="text-emerald-600" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(activity.createdAt), 'MMM dd, yyyy hh:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'site-visits' && (
            <div className="space-y-4">
              {siteVisits.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No site visits scheduled</p>
              ) : (
                siteVisits.map(visit => (
                  <div key={visit.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Visit with {visit.engineerName}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {format(new Date(visit.visitAt), 'EEEE, MMM dd, yyyy • hh:mm a')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        visit.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {visit.status}
                      </span>
                    </div>
                    {visit.notes && <p className="mt-2 text-sm text-slate-600">{visit.notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {attachments.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No attachments</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map(att => (
                    <div key={att.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FileText size={24} className="text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{att.fileName}</h4>
                          <p className="text-xs text-slate-500">{(att.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                         className="mt-2 block text-sm text-blue-600 hover:text-blue-700">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

const CRMSettings: React.FC = () => {
  const { settings, adapter, refreshSettings } = useCRM();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leadSources: settings?.leadSources || CRM_DEFAULTS.LEAD_SOURCES,
    projectTypes: settings?.projectTypes || CRM_DEFAULTS.PROJECT_TYPES,
    engineers: settings?.engineers || []
  });

  const [newSource, setNewSource] = useState('');
  const [newProjectType, setNewProjectType] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      await adapter.updateSettings(formData);
      await refreshSettings();
      showToast('success', 'Settings saved');
    } catch (error) {
      showToast('error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lead Sources */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Lead Sources</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.leadSources.map((source, index) => (
            <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-2">
              {source}
              <button
                onClick={() => setFormData({
                  ...formData,
                  leadSources: formData.leadSources.filter((_, i) => i !== index)
                })}
                className="hover:text-red-600"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Add new source"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          />
          <button
            onClick={() => {
              if (newSource.trim()) {
                setFormData({ ...formData, leadSources: [...formData.leadSources, newSource.trim()] });
                setNewSource('');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Project Types */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Project Types</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.projectTypes.map((type, index) => (
            <span key={index} className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm flex items-center gap-2">
              {type}
              <button
                onClick={() => setFormData({
                  ...formData,
                  projectTypes: formData.projectTypes.filter((_, i) => i !== index)
                })}
                className="hover:text-red-600"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newProjectType}
            onChange={(e) => setNewProjectType(e.target.value)}
            placeholder="Add new project type"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          />
          <button
            onClick={() => {
              if (newProjectType.trim()) {
                setFormData({ ...formData, projectTypes: [...formData.projectTypes, newProjectType.trim()] });
                setNewProjectType('');
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CRM MODULE COMPONENT
// ============================================================================

interface CRMModuleProps {
  adapter?: CRMDataAdapter;
  basePath?: string;
}

export const CRMModule: React.FC<CRMModuleProps> = ({ adapter, basePath = '' }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  // Detect if we're on a lead detail page
  const isLeadDetail = location.pathname.includes('/lead/');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartLine },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'settings', label: 'Settings', icon: Gear }
  ];

  if (isLeadDetail) {
    return (
      <CRMProvider adapter={adapter}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
          <CRMLeadDetail />
        </div>
      </CRMProvider>
    );
  }

  return (
    <CRMProvider adapter={adapter}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <CRMDashboard />}
              {activeTab === 'leads' && <CRMLeadsList />}
              {activeTab === 'pipeline' && <CRMPipelineBoard />}
              {activeTab === 'settings' && <CRMSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </CRMProvider>
  );
};

// ============================================================================
// ROUTES COMPONENT (For use with React Router)
// ============================================================================

export const CRMRoutes: React.FC<{ adapter?: CRMDataAdapter }> = ({ adapter }) => {
  return (
    <CRMProvider adapter={adapter}>
      <Routes>
        <Route path="/" element={<CRMModuleContent />} />
        <Route path="/lead/:id" element={<CRMLeadDetail />} />
      </Routes>
    </CRMProvider>
  );
};

const CRMModuleContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartLine },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'settings', label: 'Settings', icon: Gear }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && <CRMDashboard />}
        {activeTab === 'leads' && <CRMLeadsList />}
        {activeTab === 'pipeline' && <CRMPipelineBoard />}
        {activeTab === 'settings' && <CRMSettings />}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CRM_STAGES,
  CRM_PRIORITIES,
  CRM_DEFAULTS,
  CRMProvider,
  CRMDashboard,
  CRMLeadsList,
  CRMPipelineBoard,
  CRMLeadDetail,
  CRMSettings,
  CreateLeadModal,
  LocalStorageAdapter,
  ToastProvider,
  useToast
};

export default CRMModule;
