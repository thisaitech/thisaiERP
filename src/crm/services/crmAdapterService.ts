// CRM Adapter Service
// This service provides a clean API that uses the database adapter
// It can be used as a replacement for the direct Firebase service

import { getCRMAdapter } from '../adapters';
import {
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMAttachment,
  CRMSettings,
  CRMEngineer,
  CRMFilters,
  CRMDashboardMetrics
} from '../types';
import { PaginatedResult } from '../adapters/types';

// ============================================
// LEAD OPERATIONS
// ============================================

export const createLead = async (
  leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<CRMLead> => {
  const adapter = getCRMAdapter();
  const lead = await adapter.createLead({
    ...leadData,
    createdBy,
    updatedBy: createdBy
  });

  // Create audit log
  await adapter.createAuditLog({
    leadId: lead.id,
    action: 'lead_created',
    fromValue: null,
    toValue: JSON.stringify(lead),
    createdBy
  });

  return lead;
};

export const getLead = async (id: string): Promise<CRMLead | null> => {
  const adapter = getCRMAdapter();
  return adapter.getLead(id);
};

export const getLeads = async (
  filters: CRMFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedResult<CRMLead>> => {
  const adapter = getCRMAdapter();
  return adapter.getLeads(filters, page, pageSize);
};

export const updateLead = async (
  id: string,
  updates: Partial<CRMLead>,
  updatedBy: string
): Promise<CRMLead> => {
  const adapter = getCRMAdapter();

  // Get current lead for audit log
  const currentLead = await adapter.getLead(id);

  const lead = await adapter.updateLead(id, {
    ...updates,
    updatedBy
  });

  // Create audit log
  await adapter.createAuditLog({
    leadId: id,
    action: 'lead_updated',
    fromValue: currentLead ? JSON.stringify(currentLead) : null,
    toValue: JSON.stringify(lead),
    createdBy: updatedBy
  });

  return lead;
};

export const deleteLead = async (id: string, deletedBy: string): Promise<void> => {
  const adapter = getCRMAdapter();

  // Create audit log before deletion
  await adapter.createAuditLog({
    leadId: id,
    action: 'lead_deleted',
    fromValue: null,
    toValue: null,
    createdBy: deletedBy
  });

  await adapter.deleteLead(id);
};

// ============================================
// ACTIVITY OPERATIONS
// ============================================

export const createActivity = async (
  activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMActivity> => {
  const adapter = getCRMAdapter();
  return adapter.createActivity(activityData);
};

export const getLeadActivities = async (leadId: string): Promise<CRMActivity[]> => {
  const adapter = getCRMAdapter();
  return adapter.getLeadActivities(leadId);
};

// ============================================
// SITE VISIT OPERATIONS
// ============================================

export const createSiteVisit = async (
  visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>
): Promise<CRMSiteVisit> => {
  const adapter = getCRMAdapter();

  const visit = await adapter.createSiteVisit(visitData);

  // Also create an activity for this visit
  await adapter.createActivity({
    leadId: visitData.leadId,
    type: 'site_visit',
    title: `Site visit scheduled with ${visitData.engineerName}`,
    description: visitData.notes || 'Site visit scheduled',
    scheduledAt: visitData.visitAt,
    createdBy: visitData.createdBy || 'system'
  });

  return visit;
};

export const getLeadSiteVisits = async (leadId: string): Promise<CRMSiteVisit[]> => {
  const adapter = getCRMAdapter();
  return adapter.getLeadSiteVisits(leadId);
};

export const updateSiteVisit = async (
  id: string,
  updates: Partial<CRMSiteVisit>
): Promise<CRMSiteVisit> => {
  const adapter = getCRMAdapter();
  return adapter.updateSiteVisit(id, updates);
};

// ============================================
// REQUIREMENTS OPERATIONS
// ============================================

export const createRequirements = async (
  reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CRMRequirements> => {
  const adapter = getCRMAdapter();
  return adapter.createRequirements(reqData);
};

export const getLeadRequirements = async (leadId: string): Promise<CRMRequirements | null> => {
  const adapter = getCRMAdapter();
  return adapter.getLeadRequirements(leadId);
};

export const updateRequirements = async (
  id: string,
  updates: Partial<CRMRequirements>
): Promise<CRMRequirements> => {
  const adapter = getCRMAdapter();
  return adapter.updateRequirements(id, updates);
};

// ============================================
// ATTACHMENT OPERATIONS
// ============================================

export const uploadAttachment = async (
  file: File,
  leadId: string,
  entityType: string,
  entityId: string,
  uploadedBy: string,
  category?: string,
  description?: string
): Promise<CRMAttachment> => {
  const adapter = getCRMAdapter();

  // Generate unique file path
  const timestamp = Date.now();
  const filePath = `crm/${timestamp}-${file.name}`;

  // Upload file
  const { url } = await adapter.uploadFile(file, filePath);

  // Create attachment record
  return adapter.createAttachment({
    leadId,
    entityType: entityType as any,
    entityId,
    fileUrl: url,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    category,
    description,
    createdBy: uploadedBy,
    updatedBy: uploadedBy
  });
};

export const getLeadAttachments = async (leadId: string): Promise<CRMAttachment[]> => {
  const adapter = getCRMAdapter();
  return adapter.getLeadAttachments(leadId);
};

// ============================================
// SETTINGS OPERATIONS
// ============================================

export const getCRMSettings = async (): Promise<CRMSettings | null> => {
  const adapter = getCRMAdapter();
  return adapter.getSettings();
};

export const updateCRMSettings = async (
  settings: Partial<CRMSettings>,
  updatedBy: string
): Promise<CRMSettings> => {
  const adapter = getCRMAdapter();
  return adapter.updateSettings({
    ...settings,
    updatedBy
  });
};

// ============================================
// ENGINEER OPERATIONS
// ============================================

export const createEngineer = async (
  engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>
): Promise<CRMEngineer> => {
  const adapter = getCRMAdapter();
  return adapter.createEngineer(engineerData);
};

export const getEngineers = async (): Promise<CRMEngineer[]> => {
  const adapter = getCRMAdapter();
  return adapter.getEngineers();
};

// ============================================
// DASHBOARD OPERATIONS
// ============================================

export const getDashboardMetrics = async (): Promise<CRMDashboardMetrics> => {
  const adapter = getCRMAdapter();
  return adapter.getDashboardMetrics();
};
