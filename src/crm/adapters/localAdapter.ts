// Local IndexedDB Adapter for CRM
// This adapter stores all CRM data locally using IndexedDB
// Perfect for standalone/demo mode without Firebase

import {
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMAttachment,
  CRMAuditLog,
  CRMSettings,
  CRMFilters,
  CRMDashboardMetrics,
  CRMEngineer
} from '../types';
import { CRMDatabaseAdapter, PaginatedResult, FileUploadResult, CRMAdapterConfig } from './types';
import { CRM_DEFAULTS, CRM_STAGES } from '../constants';
import { CRMStage } from '../types';

// Re-export CRMEngineer
export type { CRMEngineer };

// IndexedDB Database wrapper
class LocalDatabase {
  private dbName = 'crm_local_db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        const stores = [
          { name: 'leads', keyPath: 'id', indexes: ['stage', 'createdAt'] },
          { name: 'activities', keyPath: 'id', indexes: ['leadId', 'createdAt'] },
          { name: 'siteVisits', keyPath: 'id', indexes: ['leadId', 'visitAt'] },
          { name: 'requirements', keyPath: 'id', indexes: ['leadId'] },
          { name: 'attachments', keyPath: 'id', indexes: ['leadId', 'entityType'] },
          { name: 'auditLogs', keyPath: 'id', indexes: ['leadId', 'createdAt'] },
          { name: 'engineers', keyPath: 'id', indexes: ['status'] },
          { name: 'settings', keyPath: 'id' }
        ];

        stores.forEach(({ name, keyPath, indexes }) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });
            indexes?.forEach(idx => {
              store.createIndex(idx, idx, { unique: false });
            });
          }
        });
      };
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, data: T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Generate unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Local CRM Adapter
export class LocalCRMAdapter implements CRMDatabaseAdapter {
  private db: LocalDatabase;
  private companyId: string = 'local_company';

  constructor() {
    this.db = new LocalDatabase();
  }

  // ============================================
  // LEAD OPERATIONS
  // ============================================

  async createLead(leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead> {
    const lead: CRMLead = {
      ...leadData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('leads', lead);
    return lead;
  }

  async getLead(id: string): Promise<CRMLead | null> {
    return this.db.get<CRMLead>('leads', id);
  }

  async getLeads(filters: CRMFilters, page: number, pageSize: number): Promise<PaginatedResult<CRMLead>> {
    let leads = await this.db.getAll<CRMLead>('leads');

    // Apply filters
    if (filters.stage) {
      leads = leads.filter(l => l.stage === filters.stage);
    }
    if (filters.priority) {
      leads = leads.filter(l => l.priority === filters.priority);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      leads = leads.filter(l =>
        l.name.toLowerCase().includes(search) ||
        l.phone.includes(search) ||
        l.projectName.toLowerCase().includes(search)
      );
    }

    // Sort by createdAt desc
    leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = leads.length;
    const start = (page - 1) * pageSize;
    const data = leads.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      limit: pageSize,
      hasMore: start + pageSize < total
    };
  }

  async updateLead(id: string, updates: Partial<CRMLead>): Promise<CRMLead> {
    const existing = await this.getLead(id);
    if (!existing) throw new Error('Lead not found');

    const updated: CRMLead = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    await this.db.put('leads', updated);
    return updated;
  }

  async deleteLead(id: string): Promise<void> {
    await this.db.delete('leads', id);
    // Also delete related data
    const activities = await this.db.getByIndex<CRMActivity>('activities', 'leadId', id);
    for (const act of activities) {
      await this.db.delete('activities', act.id);
    }
    const visits = await this.db.getByIndex<CRMSiteVisit>('siteVisits', 'leadId', id);
    for (const visit of visits) {
      await this.db.delete('siteVisits', visit.id);
    }
  }

  // ============================================
  // ACTIVITY OPERATIONS
  // ============================================

  async createActivity(activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity> {
    const activity: CRMActivity = {
      ...activityData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('activities', activity);
    return activity;
  }

  async getLeadActivities(leadId: string): Promise<CRMActivity[]> {
    const activities = await this.db.getByIndex<CRMActivity>('activities', 'leadId', leadId);
    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateActivity(id: string, updates: Partial<CRMActivity>): Promise<CRMActivity> {
    const existing = await this.db.get<CRMActivity>('activities', id);
    if (!existing) throw new Error('Activity not found');

    const updated: CRMActivity = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.put('activities', updated);
    return updated;
  }

  async deleteActivity(id: string): Promise<void> {
    await this.db.delete('activities', id);
  }

  // ============================================
  // SITE VISIT OPERATIONS
  // ============================================

  async createSiteVisit(visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSiteVisit> {
    const visit: CRMSiteVisit = {
      ...visitData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('siteVisits', visit);
    return visit;
  }

  async getLeadSiteVisits(leadId: string): Promise<CRMSiteVisit[]> {
    const visits = await this.db.getByIndex<CRMSiteVisit>('siteVisits', 'leadId', leadId);
    return visits.sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime());
  }

  async updateSiteVisit(id: string, updates: Partial<CRMSiteVisit>): Promise<CRMSiteVisit> {
    const existing = await this.db.get<CRMSiteVisit>('siteVisits', id);
    if (!existing) throw new Error('Site visit not found');

    const updated: CRMSiteVisit = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.put('siteVisits', updated);
    return updated;
  }

  async deleteSiteVisit(id: string): Promise<void> {
    await this.db.delete('siteVisits', id);
  }

  // ============================================
  // REQUIREMENTS OPERATIONS
  // ============================================

  async createRequirements(reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMRequirements> {
    const req: CRMRequirements = {
      ...reqData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('requirements', req);
    return req;
  }

  async getLeadRequirements(leadId: string): Promise<CRMRequirements | null> {
    const reqs = await this.db.getByIndex<CRMRequirements>('requirements', 'leadId', leadId);
    return reqs[0] || null;
  }

  async updateRequirements(id: string, updates: Partial<CRMRequirements>): Promise<CRMRequirements> {
    const existing = await this.db.get<CRMRequirements>('requirements', id);
    if (!existing) throw new Error('Requirements not found');

    const updated: CRMRequirements = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.put('requirements', updated);
    return updated;
  }

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================

  async uploadFile(file: File, path: string): Promise<FileUploadResult> {
    // Convert file to base64 for local storage
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

    return {
      url: base64,
      path: path
    };
  }

  async createAttachment(attachmentData: Omit<CRMAttachment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMAttachment> {
    const attachment: CRMAttachment = {
      ...attachmentData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('attachments', attachment);
    return attachment;
  }

  async getLeadAttachments(leadId: string): Promise<CRMAttachment[]> {
    return this.db.getByIndex<CRMAttachment>('attachments', 'leadId', leadId);
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.db.delete('attachments', id);
  }

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================

  async createAuditLog(logData: Omit<CRMAuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const log: CRMAuditLog = {
      ...logData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('auditLogs', log);
  }

  async getLeadAuditLogs(leadId: string): Promise<CRMAuditLog[]> {
    const logs = await this.db.getByIndex<CRMAuditLog>('auditLogs', 'leadId', leadId);
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  async getSettings(): Promise<CRMSettings | null> {
    const settings = await this.db.get<CRMSettings>('settings', 'default');
    if (!settings) {
      // Return default settings
      return {
        id: 'default',
        companyId: this.companyId,
        leadSources: CRM_DEFAULTS.LEAD_SOURCES,
        projectTypes: CRM_DEFAULTS.PROJECT_TYPES,
        siteVisitChecklist: CRM_DEFAULTS.SITE_VISIT_CHECKLIST,
        pipelineStages: Object.keys(CRM_STAGES) as CRMStage[],
        notifications: { email: true, sms: false, push: true },
        currency: CRM_DEFAULTS.CURRENCY,
        areaUnit: 'sqft',
        businessType: 'construction',
        lostReasons: CRM_DEFAULTS.LOST_REASONS,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      };
    }
    return settings;
  }

  async updateSettings(updates: Partial<CRMSettings>): Promise<CRMSettings> {
    const existing = await this.getSettings();
    const updated: CRMSettings = {
      ...existing!,
      ...updates,
      id: 'default',
      updatedAt: new Date()
    };
    await this.db.put('settings', updated);
    return updated;
  }

  // ============================================
  // ENGINEER OPERATIONS
  // ============================================

  async createEngineer(engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMEngineer> {
    const engineer: CRMEngineer = {
      ...engineerData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.db.add('engineers', engineer);
    return engineer;
  }

  async getEngineers(): Promise<CRMEngineer[]> {
    const engineers = await this.db.getAll<CRMEngineer>('engineers');
    return engineers.filter(e => e.status === 'active');
  }

  async updateEngineer(id: string, updates: Partial<CRMEngineer>): Promise<CRMEngineer> {
    const existing = await this.db.get<CRMEngineer>('engineers', id);
    if (!existing) throw new Error('Engineer not found');

    const updated: CRMEngineer = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.put('engineers', updated);
    return updated;
  }

  async deleteEngineer(id: string): Promise<void> {
    await this.db.delete('engineers', id);
  }

  // ============================================
  // DASHBOARD OPERATIONS
  // ============================================

  async getDashboardMetrics(): Promise<CRMDashboardMetrics> {
    const leads = await this.db.getAll<CRMLead>('leads');

    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => !['confirmed', 'lost'].includes(l.stage)).length;
    const wonDeals = leads.filter(l => l.stage === 'confirmed').length;
    const lostDeals = leads.filter(l => l.stage === 'lost').length;
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    // Calculate by stage
    const stageDistribution: Record<string, number> = {};
    leads.forEach(l => {
      stageDistribution[l.stage] = (stageDistribution[l.stage] || 0) + 1;
    });

    // Calculate average deal size
    const wonLeads = leads.filter(l => l.stage === 'confirmed' && l.expectedValue);
    const totalValue = wonLeads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
    const avgDealSize = wonLeads.length > 0 ? totalValue / wonLeads.length : 0;

    // Upcoming follow-ups
    const now = new Date();
    const upcomingFollowUps = leads
      .filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) > now)
      .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime())
      .slice(0, 5);

    // Overdue follow-ups
    const overdueFollowUps = leads
      .filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < now && !['confirmed', 'lost'].includes(l.stage))
      .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime());

    return {
      totalLeads,
      activeLeads,
      wonDeals,
      lostDeals,
      conversionRate,
      stageDistribution,
      avgDealSize,
      upcomingFollowUps,
      overdueFollowUps,
      recentActivities: []
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getCurrentCompanyId(): string | null {
    return this.companyId;
  }

  setCurrentCompanyId(companyId: string): void {
    this.companyId = companyId;
  }

  async initialize(): Promise<void> {
    await this.db.open();
  }

  async dispose(): Promise<void> {
    this.db.close();
  }
}

// Factory function
export const createLocalAdapter = (config?: CRMAdapterConfig): LocalCRMAdapter => {
  return new LocalCRMAdapter();
};
