// Firebase Adapter for CRM Module
// This adapter implements the CRMDatabaseAdapter interface for Firebase/Firestore

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import {
  CRMDatabaseAdapter,
  CRMAdapterConfig,
  PaginatedResult,
  FileUploadResult
} from './types';
import {
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMAttachment,
  CRMAuditLog,
  CRMSettings,
  CRMEngineer,
  CRMFilters,
  CRMDashboardMetrics,
  CRMStage
} from '../types';
import { CRM_STAGES } from '../constants';

// Helper to convert Firestore timestamps to Date objects
const fromFirestore = (data: any): any => {
  if (!data) return data;

  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    } else if (result[key] && typeof result[key] === 'object' && result[key].seconds) {
      result[key] = new Date(result[key].seconds * 1000);
    }
  }
  return result;
};

// Helper to convert Date objects to Firestore timestamps
const toFirestore = (data: any): any => {
  if (!data) return data;

  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Date) {
      result[key] = Timestamp.fromDate(result[key]);
    }
  }
  return result;
};

// Get collection reference with CRM prefix
const getCollection = (collectionName: string) => {
  return collection(db, `crm_${collectionName}`);
};

export class FirebaseCRMAdapter implements CRMDatabaseAdapter {
  private companyId: string | null = null;
  private config: CRMAdapterConfig;

  constructor(config: CRMAdapterConfig) {
    this.config = config;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getCurrentCompanyId(): string | null {
    if (this.companyId) return this.companyId;

    // Try to get from localStorage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.companyId || parsed.companyId || null;
      }
    } catch (e) {
      console.warn('Failed to get companyId from localStorage');
    }
    return null;
  }

  setCurrentCompanyId(companyId: string): void {
    this.companyId = companyId;
  }

  async initialize(): Promise<void> {
    // Firebase adapter initialized
  }

  async dispose(): Promise<void> {
    // Firebase adapter disposed
  }

  // ============================================
  // LEAD OPERATIONS
  // ============================================

  async createLead(leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead> {
    const now = new Date();
    const companyId = this.getCurrentCompanyId();

    const lead: CRMLead = {
      ...leadData,
      id: '',
      companyId: companyId || '',
      stage: leadData.stage || 'new',
      status: leadData.status || 'active',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('leads'), toFirestore(lead));
    lead.id = docRef.id;

    return lead;
  }

  async getLead(id: string): Promise<CRMLead | null> {
    const docRef = doc(getCollection('leads'), id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const leadData = fromFirestore(docSnap.data()) as CRMLead;
    leadData.id = docSnap.id;
    return leadData;
  }

  async getLeads(filters: CRMFilters, page: number, pageSize: number): Promise<PaginatedResult<CRMLead>> {
    const companyId = this.getCurrentCompanyId();

    try {
      let q;
      if (companyId) {
        q = query(
          getCollection('leads'),
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc'),
          limit(1000)
        );
      } else {
        q = query(
          getCollection('leads'),
          orderBy('createdAt', 'desc'),
          limit(1000)
        );
      }

      const snapshot = await getDocs(q);

      let allLeads = snapshot.docs.map(doc => {
        const leadData = fromFirestore(doc.data()) as CRMLead;
        leadData.id = doc.id;
        return leadData;
      });

      // Apply client-side filters
      if (filters.stage && filters.stage.length > 0) {
        allLeads = allLeads.filter(lead => filters.stage!.includes(lead.stage));
      }
      if (filters.status && filters.status.length > 0) {
        allLeads = allLeads.filter(lead => filters.status!.includes(lead.status));
      }
      if (filters.priority && filters.priority.length > 0) {
        allLeads = allLeads.filter(lead => filters.priority!.includes(lead.priority));
      }
      if (filters.source && filters.source.length > 0) {
        allLeads = allLeads.filter(lead => filters.source!.includes(lead.source));
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        allLeads = allLeads.filter(lead =>
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.phone?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.projectName?.toLowerCase().includes(searchLower)
        );
      }

      const total = allLeads.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedLeads = allLeads.slice(startIndex, startIndex + pageSize);

      return {
        data: paginatedLeads,
        total,
        page,
        limit: pageSize,
        hasMore: startIndex + pageSize < total
      };
    } catch (error) {
      console.error('Error fetching leads:', error);
      // Fallback without ordering
      try {
        const simpleQuery = companyId
          ? query(getCollection('leads'), where('companyId', '==', companyId))
          : query(getCollection('leads'));

        const snapshot = await getDocs(simpleQuery);

        let allLeads = snapshot.docs.map(doc => {
          const leadData = fromFirestore(doc.data()) as CRMLead;
          leadData.id = doc.id;
          return leadData;
        });

        // Sort client-side
        allLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          data: allLeads.slice((page - 1) * pageSize, page * pageSize),
          total: allLeads.length,
          page,
          limit: pageSize
        };
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return { data: [], total: 0, page, limit: pageSize };
      }
    }
  }

  async updateLead(id: string, updates: Partial<CRMLead>): Promise<CRMLead> {
    const docRef = doc(getCollection('leads'), id);
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await updateDoc(docRef, toFirestore(updateData));

    const updated = await this.getLead(id);
    if (!updated) throw new Error('Lead not found after update');
    return updated;
  }

  async deleteLead(id: string): Promise<void> {
    const docRef = doc(getCollection('leads'), id);
    await deleteDoc(docRef);
  }

  // ============================================
  // ACTIVITY OPERATIONS
  // ============================================

  async createActivity(activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity> {
    const now = new Date();

    const activity: CRMActivity = {
      ...activityData,
      id: '',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('activities'), toFirestore(activity));
    activity.id = docRef.id;

    return activity;
  }

  async getLeadActivities(leadId: string): Promise<CRMActivity[]> {
    try {
      const q = query(
        getCollection('activities'),
        where('leadId', '==', leadId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMActivity);
    } catch (error) {
      // Fallback without orderBy
      const fallbackQuery = query(
        getCollection('activities'),
        where('leadId', '==', leadId)
      );
      const snapshot = await getDocs(fallbackQuery);
      const activities = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMActivity);
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return activities;
    }
  }

  async updateActivity(id: string, updates: Partial<CRMActivity>): Promise<CRMActivity> {
    const docRef = doc(getCollection('activities'), id);
    await updateDoc(docRef, toFirestore({ ...updates, updatedAt: new Date() }));

    const docSnap = await getDoc(docRef);
    return fromFirestore({ id: docSnap.id, ...docSnap.data() }) as CRMActivity;
  }

  async deleteActivity(id: string): Promise<void> {
    await deleteDoc(doc(getCollection('activities'), id));
  }

  // ============================================
  // SITE VISIT OPERATIONS
  // ============================================

  async createSiteVisit(visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSiteVisit> {
    const now = new Date();
    const companyId = this.getCurrentCompanyId();

    const visit: CRMSiteVisit = {
      ...visitData,
      id: '',
      companyId: companyId || '',
      status: 'scheduled',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('siteVisits'), toFirestore(visit));
    visit.id = docRef.id;

    return visit;
  }

  async getLeadSiteVisits(leadId: string): Promise<CRMSiteVisit[]> {
    try {
      const q = query(
        getCollection('siteVisits'),
        where('leadId', '==', leadId),
        orderBy('visitAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMSiteVisit);
    } catch (error) {
      const fallbackQuery = query(
        getCollection('siteVisits'),
        where('leadId', '==', leadId)
      );
      const snapshot = await getDocs(fallbackQuery);
      const visits = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMSiteVisit);
      visits.sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime());
      return visits;
    }
  }

  async updateSiteVisit(id: string, updates: Partial<CRMSiteVisit>): Promise<CRMSiteVisit> {
    const docRef = doc(getCollection('siteVisits'), id);
    await updateDoc(docRef, toFirestore({ ...updates, updatedAt: new Date() }));

    const docSnap = await getDoc(docRef);
    return fromFirestore({ id: docSnap.id, ...docSnap.data() }) as CRMSiteVisit;
  }

  async deleteSiteVisit(id: string): Promise<void> {
    await deleteDoc(doc(getCollection('siteVisits'), id));
  }

  // ============================================
  // REQUIREMENTS OPERATIONS
  // ============================================

  async createRequirements(reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMRequirements> {
    const now = new Date();

    const requirements: CRMRequirements = {
      ...reqData,
      id: '',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('requirements'), toFirestore(requirements));
    requirements.id = docRef.id;

    return requirements;
  }

  async getLeadRequirements(leadId: string): Promise<CRMRequirements | null> {
    const q = query(
      getCollection('requirements'),
      where('leadId', '==', leadId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return fromFirestore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() }) as CRMRequirements;
  }

  async updateRequirements(id: string, updates: Partial<CRMRequirements>): Promise<CRMRequirements> {
    const docRef = doc(getCollection('requirements'), id);
    await updateDoc(docRef, toFirestore({ ...updates, updatedAt: new Date() }));

    const docSnap = await getDoc(docRef);
    return fromFirestore({ id: docSnap.id, ...docSnap.data() }) as CRMRequirements;
  }

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================

  async uploadFile(file: File, path: string): Promise<FileUploadResult> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return { url, path };
  }

  async createAttachment(attachmentData: Omit<CRMAttachment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMAttachment> {
    const now = new Date();

    const attachment: CRMAttachment = {
      ...attachmentData,
      id: '',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('attachments'), toFirestore(attachment));
    attachment.id = docRef.id;

    return attachment;
  }

  async getLeadAttachments(leadId: string): Promise<CRMAttachment[]> {
    try {
      const q = query(
        getCollection('attachments'),
        where('leadId', '==', leadId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMAttachment);
    } catch (error) {
      const fallbackQuery = query(
        getCollection('attachments'),
        where('leadId', '==', leadId)
      );
      const snapshot = await getDocs(fallbackQuery);
      const attachments = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMAttachment);
      attachments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return attachments;
    }
  }

  async deleteAttachment(id: string, filePath?: string): Promise<void> {
    if (filePath) {
      try {
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      } catch (e) {
        console.warn('Failed to delete file from storage:', e);
      }
    }
    await deleteDoc(doc(getCollection('attachments'), id));
  }

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================

  async createAuditLog(logData: Omit<CRMAuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date();

    const log: CRMAuditLog = {
      ...logData,
      id: '',
      createdAt: now,
      updatedAt: now
    };

    await addDoc(getCollection('auditLogs'), toFirestore(log));
  }

  async getLeadAuditLogs(leadId: string): Promise<CRMAuditLog[]> {
    const q = query(
      getCollection('auditLogs'),
      where('leadId', '==', leadId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMAuditLog);
  }

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  async getSettings(): Promise<CRMSettings | null> {
    const companyId = this.getCurrentCompanyId();
    if (!companyId) return null;

    const q = query(
      getCollection('settings'),
      where('companyId', '==', companyId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return fromFirestore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() }) as CRMSettings;
  }

  async updateSettings(settings: Partial<CRMSettings>): Promise<CRMSettings> {
    const companyId = this.getCurrentCompanyId();
    const existing = await this.getSettings();

    if (existing) {
      const docRef = doc(getCollection('settings'), existing.id);
      await updateDoc(docRef, toFirestore({ ...settings, updatedAt: new Date() }));
      return { ...existing, ...settings } as CRMSettings;
    } else {
      const now = new Date();
      const newSettings: CRMSettings = {
        id: '',
        companyId: companyId || '',
        leadSources: settings.leadSources || [],
        lostReasons: settings.lostReasons || [],
        projectTypes: settings.projectTypes || [],
        siteVisitChecklist: settings.siteVisitChecklist || [],
        pipelineStages: settings.pipelineStages || [],
        areaUnitLabel: settings.areaUnitLabel || 'sqft',
        currencySymbol: settings.currencySymbol || '₹',
        businessType: settings.businessType || 'construction',
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(getCollection('settings'), toFirestore(newSettings));
      newSettings.id = docRef.id;
      return newSettings;
    }
  }

  // ============================================
  // ENGINEER OPERATIONS
  // ============================================

  async createEngineer(engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMEngineer> {
    const now = new Date();
    const companyId = this.getCurrentCompanyId();

    const engineer: CRMEngineer = {
      ...engineerData,
      id: '',
      companyId: companyId || '',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(getCollection('engineers'), toFirestore(engineer));
    engineer.id = docRef.id;

    return engineer;
  }

  async getEngineers(): Promise<CRMEngineer[]> {
    const companyId = this.getCurrentCompanyId();

    const q = companyId
      ? query(getCollection('engineers'), where('companyId', '==', companyId))
      : query(getCollection('engineers'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMEngineer);
  }

  async updateEngineer(id: string, updates: Partial<CRMEngineer>): Promise<CRMEngineer> {
    const docRef = doc(getCollection('engineers'), id);
    await updateDoc(docRef, toFirestore({ ...updates, updatedAt: new Date() }));

    const docSnap = await getDoc(docRef);
    return fromFirestore({ id: docSnap.id, ...docSnap.data() }) as CRMEngineer;
  }

  async deleteEngineer(id: string): Promise<void> {
    await deleteDoc(doc(getCollection('engineers'), id));
  }

  // ============================================
  // DASHBOARD OPERATIONS
  // ============================================

  async getDashboardMetrics(): Promise<CRMDashboardMetrics> {
    const { data: leads } = await this.getLeads({}, 1, 10000);

    const stageCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    // Initialize stage counts
    Object.keys(CRM_STAGES).forEach(stage => {
      stageCounts[stage] = 0;
    });

    let totalValue = 0;
    let wonValue = 0;
    let wonCount = 0;

    leads.forEach(lead => {
      // Count by stage
      if (lead.stage) {
        stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
      }

      // Count by status
      if (lead.status) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      }

      // Calculate values
      if (lead.expectedValue) {
        totalValue += lead.expectedValue;
        if (lead.status === 'won') {
          wonValue += lead.expectedValue;
          wonCount++;
        }
      }
    });

    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
    const averageDealSize = wonCount > 0 ? wonValue / wonCount : 0;

    return {
      totalLeads,
      stageCounts: stageCounts as Record<CRMStage, number>,
      statusCounts: statusCounts as Record<string, number>,
      conversionRate,
      averageDealSize,
      upcomingFollowUps: [],
      overdueFollowUps: [],
      recentActivities: []
    };
  }
}

// Factory function to create Firebase adapter
export const createFirebaseAdapter = (config: CRMAdapterConfig): CRMDatabaseAdapter => {
  return new FirebaseCRMAdapter(config);
};
