// CRM Module Configuration
// This file allows the CRM module to be configured for different ERP integrations

export interface CRMConfig {
  // Module identification
  moduleId: string;
  moduleName: string;
  version: string;

  // Base paths for routing
  basePath: string; // e.g., '/crm' or '/modules/crm'

  // Firebase collections (scoped to avoid conflicts)
  collections: {
    leads: string;
    activities: string;
    siteVisits: string;
    requirements: string;
    drawings: string;
    quotations: string;
    attachments: string;
    auditLogs: string;
    settings: string;
    engineers: string;
  };

  // Storage configuration
  storage: {
    driver: 'firebase' | 'local' | 's3';
    bucket?: string;
    publicBaseUrl?: string;
  };

  // Integration hooks
  integrations: {
    // Project handover integration
    projects: {
      enabled: boolean;
      createProjectFromLead?: (leadData: any) => Promise<{ projectId: string; projectUrl?: string }>;
      projectUrlTemplate?: string; // e.g., '/projects/{projectId}'
    };

    // User/role management integration
    auth: {
      getCurrentUser?: () => any;
      checkPermission?: (permission: string, user: any) => boolean;
      roles: string[]; // Available roles in the ERP
    };

    // Notification system integration
    notifications: {
      send?: (type: string, data: any) => Promise<void>;
    };
  };

  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    showPoweredBy: boolean;
  };

  // Feature toggles
  features: {
    leadQualification: boolean;
    quotationApproval: boolean;
    siteVisitGeoLocation: boolean;
    duplicateDetection: boolean;
    auditLogs: boolean;
    fileAttachments: boolean;
  };

  // Workflow configuration
  workflow: {
    stages: string[];
    requiredFieldsPerStage: Record<string, string[]>;
    autoTransitions: boolean;
  };

  // Default settings
  defaults: {
    leadSource: string;
    priority: 'medium';
    timeline: string;
    currency: string;
  };
}

// Default CRM configuration
export const defaultCRMConfig: CRMConfig = {
  moduleId: 'construction-crm',
  moduleName: 'Construction CRM',
  version: '1.0.0',
  basePath: '/crm',

  collections: {
    leads: 'crm_leads',
    activities: 'crm_activities',
    siteVisits: 'crm_site_visits',
    requirements: 'crm_requirements',
    drawings: 'crm_drawings',
    quotations: 'crm_quotations',
    attachments: 'crm_attachments',
    auditLogs: 'crm_audit_logs',
    settings: 'crm_settings',
    engineers: 'crm_engineers'
  },

  storage: {
    driver: 'firebase'
  },

  integrations: {
    projects: {
      enabled: false
    },
    auth: {
      roles: ['admin', 'manager', 'sales', 'engineer']
    },
    notifications: {}
  },

  ui: {
    theme: 'auto',
    primaryColor: '#3b82f6',
    showPoweredBy: false
  },

  features: {
    leadQualification: true,
    quotationApproval: true,
    siteVisitGeoLocation: true,
    duplicateDetection: true,
    auditLogs: true,
    fileAttachments: true
  },

  workflow: {
    stages: [
      'lead_created',
      'qualified',
      'site_visit_scheduled',
      'requirements_collected',
      'drawing_prepared',
      'quotation_sent',
      'negotiation',
      'confirmed',
      'waiting',
      'lost'
    ],
    requiredFieldsPerStage: {
      lead_created: ['name', 'phone', 'source'],
      site_visit_scheduled: ['visitAt', 'engineerId'],
      requirements_collected: ['projectType', 'sqft', 'budgetMin'],
      drawing_prepared: ['drawingFile'],
      quotation_sent: ['quotationFile']
    },
    autoTransitions: false
  },

  defaults: {
    leadSource: 'website',
    priority: 'medium',
    timeline: '3-6 months',
    currency: 'INR'
  }
};

// Export current config (can be overridden by ERP)
export let crmConfig: CRMConfig = { ...defaultCRMConfig };

// Function to configure CRM module
export const configureCRM = (config: Partial<CRMConfig>) => {
  crmConfig = { ...defaultCRMConfig, ...config };
};

// Helper functions for integration
export const getCRMPath = (path: string) => `${crmConfig.basePath}${path}`;
export const getCRMCollection = (collection: keyof CRMConfig['collections']) => crmConfig.collections[collection];

export default crmConfig;































