// CRM Database Adapter Types
// This file defines the interface that any database adapter must implement
// to work with the CRM module. This allows the CRM to be database-agnostic.

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
  CRMDashboardMetrics
} from '../types';

// Pagination result type
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

// File upload result
export interface FileUploadResult {
  url: string;
  path: string;
}

// Database Adapter Interface
// Any database (Firebase, MongoDB, PostgreSQL, MySQL, REST API, etc.)
// can implement this interface to work with the CRM module
export interface CRMDatabaseAdapter {
  // ============================================
  // LEAD OPERATIONS
  // ============================================
  createLead(leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead>;
  getLead(id: string): Promise<CRMLead | null>;
  getLeads(filters: CRMFilters, page: number, pageSize: number): Promise<PaginatedResult<CRMLead>>;
  updateLead(id: string, updates: Partial<CRMLead>): Promise<CRMLead>;
  deleteLead(id: string): Promise<void>;

  // ============================================
  // ACTIVITY OPERATIONS
  // ============================================
  createActivity(activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity>;
  getLeadActivities(leadId: string): Promise<CRMActivity[]>;
  updateActivity(id: string, updates: Partial<CRMActivity>): Promise<CRMActivity>;
  deleteActivity(id: string): Promise<void>;

  // ============================================
  // SITE VISIT OPERATIONS
  // ============================================
  createSiteVisit(visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSiteVisit>;
  getLeadSiteVisits(leadId: string): Promise<CRMSiteVisit[]>;
  updateSiteVisit(id: string, updates: Partial<CRMSiteVisit>): Promise<CRMSiteVisit>;
  deleteSiteVisit(id: string): Promise<void>;

  // ============================================
  // REQUIREMENTS OPERATIONS
  // ============================================
  createRequirements(reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMRequirements>;
  getLeadRequirements(leadId: string): Promise<CRMRequirements | null>;
  updateRequirements(id: string, updates: Partial<CRMRequirements>): Promise<CRMRequirements>;

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================
  uploadFile(file: File, path: string): Promise<FileUploadResult>;
  createAttachment(attachmentData: Omit<CRMAttachment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMAttachment>;
  getLeadAttachments(leadId: string): Promise<CRMAttachment[]>;
  deleteAttachment(id: string, filePath?: string): Promise<void>;

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================
  createAuditLog(logData: Omit<CRMAuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  getLeadAuditLogs(leadId: string): Promise<CRMAuditLog[]>;

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================
  getSettings(): Promise<CRMSettings | null>;
  updateSettings(settings: Partial<CRMSettings>): Promise<CRMSettings>;

  // ============================================
  // ENGINEER OPERATIONS
  // ============================================
  createEngineer(engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMEngineer>;
  getEngineers(): Promise<CRMEngineer[]>;
  updateEngineer(id: string, updates: Partial<CRMEngineer>): Promise<CRMEngineer>;
  deleteEngineer(id: string): Promise<void>;

  // ============================================
  // DASHBOARD OPERATIONS
  // ============================================
  getDashboardMetrics(): Promise<CRMDashboardMetrics>;

  // ============================================
  // UTILITY METHODS
  // ============================================
  // Get the current company/tenant ID (for multi-tenant support)
  getCurrentCompanyId(): string | null;

  // Set the current company/tenant ID
  setCurrentCompanyId(companyId: string): void;

  // Initialize the adapter (connect to database, etc.)
  initialize(): Promise<void>;

  // Cleanup/disconnect
  dispose(): Promise<void>;
}

// Adapter configuration type
export interface CRMAdapterConfig {
  // Database type identifier
  type: 'firebase' | 'mongodb' | 'postgresql' | 'mysql' | 'rest-api' | 'custom';

  // Connection settings (specific to each adapter type)
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    apiUrl?: string;
    apiKey?: string;
    [key: string]: any;
  };

  // Multi-tenant configuration
  multiTenant?: {
    enabled: boolean;
    tenantIdField?: string; // Default: 'companyId'
  };

  // File storage configuration
  storage?: {
    type: 'local' | 'firebase' | 's3' | 'azure' | 'cloudinary' | 'custom';
    config?: {
      bucket?: string;
      region?: string;
      accessKey?: string;
      secretKey?: string;
      [key: string]: any;
    };
  };
}

// Export a type for the adapter factory
export type CRMAdapterFactory = (config: CRMAdapterConfig) => CRMDatabaseAdapter;
