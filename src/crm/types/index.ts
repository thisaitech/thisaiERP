// CRM Module Type Definitions

export type CRMStage =
  | 'lead_created'
  | 'qualified'
  | 'site_visit_scheduled'
  | 'requirements_collected'
  | 'drawing_prepared'
  | 'quotation_sent'
  | 'negotiation'
  | 'confirmed'
  | 'waiting'
  | 'lost';

export type CRMStatus = 'open' | 'won' | 'lost' | 'waiting';

export type CRMPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CRMActivityType =
  | 'call'
  | 'meeting'
  | 'site_visit'
  | 'email'
  | 'whatsapp'
  | 'note'
  | 'follow_up';

export type CRMRole = 'admin' | 'manager' | 'sales' | 'engineer' | 'viewer';

// Base entity interface
export interface CRMBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  companyId?: string; // For multi-tenant support
}

// Lead entity
export interface CRMLead extends CRMBaseEntity {
  leadCode: string; // Auto-generated: LEAD-2024-001
  name: string;
  phone: string;
  email?: string;
  projectName: string;
  address: string;
  city: string;
  source: string;
  priority: CRMPriority;

  // Assignment
  assignedSalesId?: string;
  assignedEngineerId?: string;

  // Pipeline
  stage: CRMStage;
  status: CRMStatus;

  // Project details
  expectedValue?: number;
  budgetMin?: number;
  budgetMax?: number;
  sqft?: number;
  projectType?: string;
  timeline?: string;

  // Follow-up
  nextFollowUpAt?: Date;
  lastContactAt?: Date;

  // Metadata
  tags?: string[];
  notes?: string;
  competitor?: string;

  // Won/Lost details
  wonReason?: string;
  lostReason?: string;
  lostCompetitor?: string;
  tokenAdvance?: number;

  // Integration
  projectId?: string; // When converted to project
}

// Activity entity
export interface CRMActivity extends CRMBaseEntity {
  leadId: string;
  type: CRMActivityType;
  title: string;
  description: string;
  scheduledAt?: Date;
  completedAt?: Date;
  reminderAt?: Date;
  outcome?: string;
  duration?: number; // in minutes
  location?: string; // for meetings/site visits
  participants?: string[]; // email/phone array
}

// Site Visit entity
export interface CRMSiteVisit extends CRMBaseEntity {
  leadId: string;
  visitAt: Date;
  engineerId: string;
  engineerName: string;
  notes: string;
  checklist: Record<string, boolean>; // Dynamic checklist items
  geoLat?: number;
  geoLng?: number;
  photos?: string[]; // File URLs
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Requirements entity
export interface CRMRequirements extends CRMBaseEntity {
  leadId: string;
  requirements: {
    projectType: string;
    sqft: number;
    floors: number;
    budget: number;
    timeline: string;
    style: string;
    rooms: number;
    specialFeatures: string[];
    constraints: string[];
  };
  notes: string;
  attachments: string[]; // File URLs
}

// Drawing entity
export interface CRMDrawing extends CRMBaseEntity {
  leadId: string;
  version: number; // V1, V2, V3...
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  remarks: string;
  approvedBy?: string;
  approvedAt?: Date;
}

// Quotation entity
export interface CRMQuotation extends CRMBaseEntity {
  leadId: string;
  quoteNo: string; // Auto-generated: QUOTE-2024-001
  version: number;
  title: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected';

  // Financials
  items: CRMQuotationItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;

  // Files
  pdfUrl?: string;

  // Approval workflow
  approvedBy?: string;
  approvedAt?: Date;
  sentAt?: Date;
  sentBy?: string;
  validUntil?: Date;

  // Terms
  terms: string;
  notes: string;
}

export interface CRMQuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  category: string;
}

// Attachment entity
export interface CRMAttachment extends CRMBaseEntity {
  leadId: string;
  entityType: 'lead' | 'site_visit' | 'requirement' | 'drawing' | 'quotation';
  entityId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
}

// Audit Log entity
export interface CRMAuditLog extends CRMBaseEntity {
  leadId: string;
  action: string; // 'stage_changed', 'assigned', 'file_uploaded', etc.
  entityType?: string;
  entityId?: string;
  fromValue?: any;
  toValue?: any;
  metaData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Engineer entity
export interface CRMEngineer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  specialization: string;
  experience?: number;
  status: 'active' | 'inactive';
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Settings entity
export interface CRMSettings {
  id: string;
  companyId?: string;
  leadSources: string[];
  lostReasons: string[];
  wonReasons?: string[];
  projectTypes: string[];
  quotationTemplates?: CRMQuotationTemplate[];
  siteVisitChecklist: string[];
  pipelineStages?: Record<string, string>; // Maps stage key to custom label
  stageConfig?: Record<CRMStage, { enabled: boolean; requiredFields: string[] }>;
  permissions?: Record<CRMRole, string[]>;
  notifications: CRMNotificationSettings;
  currency?: string;
  areaUnit?: string;
  businessType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CRMQuotationTemplate {
  id: string;
  name: string;
  description: string;
  items: CRMQuotationItem[];
  taxRate: number;
  terms: string;
}

export interface CRMNotificationSettings {
  leadAssigned: boolean;
  stageChanged: boolean;
  followUpDue: boolean;
  quotationSent: boolean;
  leadWon: boolean;
  leadLost: boolean;
}

// API Response types
export interface CRMListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CRMFilters {
  stage?: CRMStage[];
  status?: CRMStatus[];
  assignedTo?: string[];
  priority?: CRMPriority[];
  source?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Form types
export interface CRMLeadForm {
  name: string;
  phone: string;
  email?: string;
  projectName: string;
  address: string;
  city: string;
  source: string;
  priority: CRMPriority;
  expectedValue?: number;
  budgetMin?: number;
  budgetMax?: number;
  sqft?: number;
  projectType?: string;
  timeline?: string;
  notes?: string;
}

// Dashboard metrics
export interface CRMDashboardMetrics {
  totalLeads: number;
  activeLeads?: number;
  wonDeals?: number;
  lostDeals?: number;
  stageCounts?: Record<CRMStage, number>;
  stageDistribution?: Record<string, number>;
  statusCounts?: Record<CRMStatus, number>;
  conversionRate: number;
  averageDealSize?: number;
  avgDealSize?: number;
  upcomingFollowUps: CRMLead[] | CRMActivity[];
  overdueFollowUps: CRMLead[] | CRMActivity[];
  recentActivities: CRMActivity[];
}

// Pipeline board types
export interface CRMPipelineColumn {
  id: CRMStage;
  title: string;
  leads: CRMLead[];
  color: string;
}

export interface CRMPipelineBoard {
  columns: CRMPipelineColumn[];
  totalLeads: number;
}

// File upload types
export interface CRMFileUpload {
  file: File;
  category?: string;
  description?: string;
}

export interface CRMUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Integration types
export interface CRMProjectHandover {
  leadId: string;
  projectData: {
    customerName: string;
    phone: string;
    address: string;
    projectName: string;
    budget: number;
    referenceLeadId: string;
  };
}

export interface CRMProjectResult {
  success: boolean;
  projectId?: string;
  projectUrl?: string;
  error?: string;
}




























