// Local CRM Service - Uses IndexedDB instead of Firebase
// This is a drop-in replacement for crmService.ts for standalone mode

import { LocalCRMAdapter, CRMEngineer } from '../adapters/localAdapter';
import {
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMDrawing,
  CRMQuotation,
  CRMAttachment,
  CRMAuditLog,
  CRMSettings,
  CRMListResponse,
  CRMFilters,
  CRMDashboardMetrics
} from '../types';

// Export CRMEngineer type
export type { CRMEngineer };

// Singleton adapter instance
let adapter: LocalCRMAdapter | null = null;

const getAdapter = (): LocalCRMAdapter => {
  if (!adapter) {
    adapter = new LocalCRMAdapter();
    adapter.initialize();
  }
  return adapter;
};

// ============================================
// LEAD OPERATIONS
// ============================================

export const createLead = async (
  leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string = 'user'
): Promise<CRMLead> => {
  const lead = await getAdapter().createLead({
    ...leadData,
    createdBy: userId,
    updatedBy: userId
  });

  // Create initial activity
  await createActivity({
    leadId: lead.id,
    type: 'note',
    title: 'Lead created',
    description: `New lead "${lead.name}" was created`,
    createdBy: userId
  });

  return lead;
};

export const getLead = async (id: string): Promise<CRMLead | null> => {
  return getAdapter().getLead(id);
};

export const getLeads = async (
  filters: CRMFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<CRMListResponse<CRMLead>> => {
  const result = await getAdapter().getLeads(filters, page, pageSize);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.limit,
    hasMore: result.hasMore || false
  };
};

export const getLeadsWithoutOrdering = async (): Promise<CRMListResponse<CRMLead>> => {
  return getLeads({}, 1, 1000);
};

export const updateLead = async (
  id: string,
  updates: Partial<CRMLead>,
  userId: string = 'user'
): Promise<CRMLead> => {
  const oldLead = await getLead(id);
  const lead = await getAdapter().updateLead(id, {
    ...updates,
    updatedBy: userId
  });

  // Create activity for stage change
  if (oldLead && updates.stage && oldLead.stage !== updates.stage) {
    await createActivity({
      leadId: id,
      type: 'stage_change',
      title: `Stage changed to ${updates.stage}`,
      description: `Lead moved from "${oldLead.stage}" to "${updates.stage}"`,
      createdBy: userId
    });
  }

  return lead;
};

export const deleteLead = async (id: string, userId: string = 'user'): Promise<void> => {
  await getAdapter().deleteLead(id);
};

// ============================================
// ACTIVITY OPERATIONS
// ============================================

export const createActivity = async (
  activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMActivity> => {
  return getAdapter().createActivity(activityData);
};

export const getLeadActivities = async (leadId: string): Promise<CRMActivity[]> => {
  return getAdapter().getLeadActivities(leadId);
};

export const deleteActivity = async (id: string): Promise<void> => {
  return getAdapter().deleteActivity(id);
};

export const deleteAllLeadActivities = async (leadId: string): Promise<void> => {
  const activities = await getLeadActivities(leadId);
  for (const activity of activities) {
    await deleteActivity(activity.id);
  }
};

// ============================================
// SITE VISIT OPERATIONS
// ============================================

export const createSiteVisit = async (
  visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'photos' | 'updatedBy'>
): Promise<CRMSiteVisit> => {
  return getAdapter().createSiteVisit({
    ...visitData,
    status: 'scheduled',
    photos: [],
    updatedBy: visitData.createdBy
  });
};

export const getLeadSiteVisits = async (leadId: string): Promise<CRMSiteVisit[]> => {
  return getAdapter().getLeadSiteVisits(leadId);
};

export const deleteSiteVisit = async (id: string): Promise<void> => {
  return getAdapter().deleteSiteVisit(id);
};

export const deleteAllLeadSiteVisits = async (leadId: string): Promise<void> => {
  const visits = await getLeadSiteVisits(leadId);
  for (const visit of visits) {
    await deleteSiteVisit(visit.id);
  }
};

// ============================================
// REQUIREMENTS OPERATIONS
// ============================================

export const createRequirements = async (
  reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMRequirements> => {
  return getAdapter().createRequirements(reqData);
};

export const getLeadRequirements = async (leadId: string): Promise<CRMRequirements | null> => {
  return getAdapter().getLeadRequirements(leadId);
};

// ============================================
// DRAWING OPERATIONS (Stub - not fully implemented in local mode)
// ============================================

export const createDrawing = async (
  drawingData: Omit<CRMDrawing, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMDrawing> => {
  console.warn('Drawing creation not fully implemented in local mode');
  return {
    ...drawingData,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  } as CRMDrawing;
};

export const getLeadDrawings = async (leadId: string): Promise<CRMDrawing[]> => {
  console.warn('Drawing retrieval not fully implemented in local mode');
  return [];
};

// ============================================
// QUOTATION OPERATIONS (Stub - not fully implemented in local mode)
// ============================================

export const createQuotation = async (
  quotationData: Omit<CRMQuotation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMQuotation> => {
  console.warn('Quotation creation not fully implemented in local mode');
  return {
    ...quotationData,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  } as CRMQuotation;
};

export const getLeadQuotations = async (leadId: string): Promise<CRMQuotation[]> => {
  console.warn('Quotation retrieval not fully implemented in local mode');
  return [];
};

// ============================================
// ATTACHMENT OPERATIONS
// ============================================

export const uploadAttachment = async (
  file: File,
  leadId: string,
  entityType: string,
  entityId: string,
  category?: string,
  userId: string = 'user'
): Promise<CRMAttachment> => {
  const result = await getAdapter().uploadFile(file, `attachments/${leadId}/${file.name}`);

  return getAdapter().createAttachment({
    leadId,
    entityType: entityType as any,
    entityId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    fileUrl: result.url,
    category,
    createdBy: userId,
    updatedBy: userId
  });
};

export const getLeadAttachments = async (leadId: string): Promise<CRMAttachment[]> => {
  return getAdapter().getLeadAttachments(leadId);
};

// ============================================
// AUDIT LOG OPERATIONS
// ============================================

export const createAuditLog = async (
  logData: Omit<CRMAuditLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  await getAdapter().createAuditLog(logData);
};

export const getLeadAuditLogs = async (leadId: string): Promise<CRMAuditLog[]> => {
  return getAdapter().getLeadAuditLogs(leadId);
};

// ============================================
// SETTINGS OPERATIONS
// ============================================

export const getCRMSettings = async (): Promise<CRMSettings | null> => {
  return getAdapter().getSettings();
};

export const updateCRMSettings = async (
  updates: Partial<CRMSettings>,
  userId: string = 'user'
): Promise<CRMSettings> => {
  return getAdapter().updateSettings({
    ...updates,
    updatedBy: userId
  });
};

// ============================================
// DASHBOARD OPERATIONS
// ============================================

export const getDashboardMetrics = async (): Promise<CRMDashboardMetrics> => {
  return getAdapter().getDashboardMetrics();
};

// ============================================
// ENGINEER OPERATIONS
// ============================================

export const createEngineer = async (
  engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMEngineer> => {
  return getAdapter().createEngineer(engineerData);
};

export const getEngineers = async (): Promise<CRMEngineer[]> => {
  return getAdapter().getEngineers();
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const convertLeadToProject = async (leadId: string, userId: string = 'user'): Promise<any> => {
  const lead = await getLead(leadId);
  if (!lead) throw new Error('Lead not found');

  await updateLead(leadId, { stage: 'confirmed' }, userId);

  return {
    id: leadId,
    name: lead.projectName,
    clientName: lead.name,
    status: 'active'
  };
};

export const seedCRMData = async (): Promise<void> => {
  // Create sample leads
  const sampleLeads = [
    {
      name: 'John Smith',
      phone: '9876543210',
      email: 'john@example.com',
      projectName: 'Villa Construction',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      source: 'Website',
      stage: 'lead_created' as const,
      priority: 'high' as const,
      expectedValue: 5000000,
      sqft: 3000,
      projectType: 'Residential',
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      name: 'Sarah Johnson',
      phone: '9876543211',
      email: 'sarah@example.com',
      projectName: 'Office Building',
      address: '456 Business Park',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      source: 'Referral',
      stage: 'qualified' as const,
      priority: 'medium' as const,
      expectedValue: 15000000,
      sqft: 10000,
      projectType: 'Commercial',
      createdBy: 'system',
      updatedBy: 'system'
    }
  ];

  for (const lead of sampleLeads) {
    await createLead(lead, 'system');
  }

  // Create sample engineers
  const sampleEngineers = [
    { name: 'Raj Kumar', phone: '9876543220', specialization: 'Civil', status: 'active' as const },
    { name: 'Priya Sharma', phone: '9876543221', specialization: 'Structural', status: 'active' as const }
  ];

  for (const eng of sampleEngineers) {
    await createEngineer(eng);
  }
};

export const seedTestDataWithoutCompanyId = seedCRMData;
