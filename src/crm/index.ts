// ============================================================================
// CRM MODULE - COMPREHENSIVE EXPORT
// ============================================================================
// This is the main entry point for the Construction CRM module.
// All functionality is exported from this single file for easy importing.
// ============================================================================

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================
// Core entity types and interfaces
export type {
  CRMStage,
  CRMStatus,
  CRMPriority,
  CRMActivityType,
  CRMRole,
  CRMBaseEntity,
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMDrawing,
  CRMQuotation,
  CRMQuotationItem,
  CRMAttachment,
  CRMAuditLog,
  CRMSettings,
  CRMQuotationTemplate,
  CRMNotificationSettings,
  CRMListResponse,
  CRMFilters,
  CRMLeadForm,
  CRMDashboardMetrics,
  CRMPipelineColumn,
  CRMPipelineBoard,
  CRMFileUpload,
  CRMUploadResult,
  CRMProjectHandover,
  CRMProjectResult
} from './types';

// Engineer type from crmService
export type { CRMEngineer } from './services/crmService';

// ============================================================================
// 2. CONSTANTS & CONFIGURATION
// ============================================================================
// Stage, priority, activity type definitions with metadata
export {
  CRM_STAGES,
  CRM_PRIORITIES,
  CRM_ACTIVITY_TYPES,
  CRM_ROLES,
  CRM_DEFAULTS,
  STAGE_TRANSITIONS,
  REQUIRED_FIELDS,
  DASHBOARD_METRICS,
  FILE_UPLOAD,
  NOTIFICATIONS,
  PAGINATION,
  DATE_FORMATS,
  VALIDATION
} from './constants';

// Module configuration
export {
  defaultCRMConfig,
  crmConfig,
  configureCRM,
  getCRMPath,
  getCRMCollection
} from './config';
export type { CRMConfig } from './config';

// ============================================================================
// 3. DATABASE ADAPTERS (for custom database support)
// ============================================================================
// Adapter factory and management
export {
  initializeCRMAdapter,
  getCRMAdapter,
  setCRMAdapter,
  disposeCRMAdapter
} from './adapters';

// Firebase adapter
export {
  FirebaseCRMAdapter,
  createFirebaseAdapter
} from './adapters/firebaseAdapter';

// Adapter types
export type {
  CRMDatabaseAdapter,
  CRMAdapterConfig,
  CRMAdapterFactory,
  PaginatedResult,
  FileUploadResult
} from './adapters/types';

// ============================================================================
// 4. CONTEXT & STATE MANAGEMENT
// ============================================================================
// CRM Provider and hook for React applications
export { CRMProvider, useCRM } from './contexts/CRMContext';

// ============================================================================
// 5. FIREBASE SERVICES (Direct Firebase Operations)
// ============================================================================
// Lead operations
export {
  createLead,
  getLead,
  getLeads,
  updateLead,
  deleteLead,
  getLeadsWithoutOrdering
} from './services/crmService';

// Activity operations
export {
  createActivity,
  getLeadActivities,
  deleteActivity,
  deleteAllLeadActivities
} from './services/crmService';

// Site visit operations
export {
  createSiteVisit,
  getLeadSiteVisits,
  deleteSiteVisit,
  deleteAllLeadSiteVisits
} from './services/crmService';

// Requirements operations
export {
  createRequirements,
  getLeadRequirements
} from './services/crmService';

// Drawing operations
export {
  createDrawing,
  getLeadDrawings
} from './services/crmService';

// Quotation operations
export {
  createQuotation,
  getLeadQuotations
} from './services/crmService';

// Attachment operations
export {
  uploadAttachment,
  getLeadAttachments
} from './services/crmService';

// Audit log operations
export {
  createAuditLog,
  getLeadAuditLogs
} from './services/crmService';

// Settings operations
export {
  getCRMSettings,
  updateCRMSettings
} from './services/crmService';

// Dashboard operations
export {
  getDashboardMetrics
} from './services/crmService';

// Engineer operations
export {
  createEngineer,
  getEngineers
} from './services/crmService';

// Utility & integration functions
export {
  convertLeadToProject,
  seedCRMData,
  seedTestDataWithoutCompanyId,
  debugCRMCollections,
  debugLeadData,
  cleanupAllSiteVisitsAndActivities
} from './services/crmService';

// ============================================================================
// 6. ADAPTER-BASED SERVICES (Database-Agnostic Operations)
// ============================================================================
// These use the adapter pattern for database abstraction
export {
  createLead as createLeadAdapter,
  getLead as getLeadAdapter,
  getLeads as getLeadsAdapter,
  updateLead as updateLeadAdapter,
  deleteLead as deleteLeadAdapter,
  createActivity as createActivityAdapter,
  getLeadActivities as getLeadActivitiesAdapter,
  createSiteVisit as createSiteVisitAdapter,
  getLeadSiteVisits as getLeadSiteVisitsAdapter,
  updateSiteVisit as updateSiteVisitAdapter,
  createRequirements as createRequirementsAdapter,
  getLeadRequirements as getLeadRequirementsAdapter,
  updateRequirements as updateRequirementsAdapter,
  uploadAttachment as uploadAttachmentAdapter,
  getLeadAttachments as getLeadAttachmentsAdapter,
  getCRMSettings as getCRMSettingsAdapter,
  updateCRMSettings as updateCRMSettingsAdapter,
  createEngineer as createEngineerAdapter,
  getEngineers as getEngineersAdapter,
  getDashboardMetrics as getDashboardMetricsAdapter
} from './services/crmAdapterService';

// ============================================================================
// 7. LOCAL STORAGE SERVICES (IndexedDB - Offline Support)
// ============================================================================
// Attachment local storage
export {
  uploadAttachmentLocal,
  getLeadAttachmentsLocal,
  deleteAttachmentLocal,
  clearAllAttachmentsLocal,
  getAllAttachmentsLocal,
  localAttachmentToCRMAttachment,
  crmAttachmentToLocalAttachment
} from './services/localAttachmentService';

// Site visit local storage
export {
  createSiteVisitLocal,
  getLeadSiteVisitsLocal,
  deleteSiteVisitLocal,
  clearAllSiteVisitsLocal,
  getAllSiteVisitsLocal,
  localSiteVisitToCRMSiteVisit,
  crmSiteVisitToLocalSiteVisit
} from './services/localAttachmentService';

// ============================================================================
// 8. UI COMPONENTS
// ============================================================================
// Dashboard component
export { default as CRMDashboard } from './components/CRMDashboard';

// Leads list component
export { default as CRMLeadsList } from './components/CRMLeadsList';

// Pipeline board component (Kanban drag-and-drop)
export { default as CRMPipelineBoardComponent } from './components/CRMPipelineBoard';

// Create lead modal
export { default as CreateLeadModal } from './components/CreateLeadModal';

// Toast notification system
export { ToastProvider, useToast } from './components/Toast';

// ============================================================================
// 9. PAGE COMPONENTS
// ============================================================================
// Main CRM page with tabs (Dashboard, Leads, Pipeline, Settings)
export { default as CRMPage } from './pages/CRMPage';

// Lead detail page
export { default as CRMLeadDetail } from './pages/CRMLeadDetail';

// Settings page
export { default as CRMSettingsPage } from './pages/CRMSettings';

// Standalone CRM component (self-contained with providers)
export { default as CRMStandalone } from './CRMStandalone';

// ============================================================================
// 10. DEFAULT EXPORT
// ============================================================================
// Export CRMPage as default for convenient importing
export { default } from './pages/CRMPage';
