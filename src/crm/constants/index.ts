// CRM Module Constants

import { CRMStage, CRMPriority, CRMActivityType, CRMRole } from '../types';

// Stage definitions with metadata
export const CRM_STAGES: Record<CRMStage, {
  label: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  category: 'prospect' | 'active' | 'closed';
}> = {
  lead_created: {
    label: 'Lead Created',
    description: 'New lead has been created',
    color: 'bg-blue-100 text-blue-800',
    icon: 'UserPlus',
    order: 1,
    category: 'prospect'
  },
  qualified: {
    label: 'Qualified',
    description: 'Lead has been qualified and is ready for follow-up',
    color: 'bg-green-100 text-green-800',
    icon: 'CheckCircle',
    order: 2,
    category: 'prospect'
  },
  site_visit_scheduled: {
    label: 'Site Visit Scheduled',
    description: 'Site visit has been scheduled with engineer',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'Calendar',
    order: 3,
    category: 'active'
  },
  requirements_collected: {
    label: 'Requirements Collected',
    description: 'Customer requirements have been gathered',
    color: 'bg-purple-100 text-purple-800',
    icon: 'ClipboardText',
    order: 4,
    category: 'active'
  },
  drawing_prepared: {
    label: 'Drawing Prepared',
    description: 'Drawings have been prepared and shared',
    color: 'bg-indigo-100 text-indigo-800',
    icon: 'Blueprint',
    order: 5,
    category: 'active'
  },
  quotation_sent: {
    label: 'Quotation Sent',
    description: 'Quotation has been sent to customer',
    color: 'bg-orange-100 text-orange-800',
    icon: 'FileText',
    order: 6,
    category: 'active'
  },
  negotiation: {
    label: 'Negotiation',
    description: 'In negotiation phase with customer',
    color: 'bg-pink-100 text-pink-800',
    icon: 'Chat',
    order: 7,
    category: 'active'
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Lead has been confirmed and ready for project handover',
    color: 'bg-emerald-100 text-emerald-800',
    icon: 'CheckCircle2',
    order: 8,
    category: 'closed'
  },
  waiting: {
    label: 'Waiting',
    description: 'Waiting for customer response',
    color: 'bg-gray-100 text-gray-800',
    icon: 'Clock',
    order: 9,
    category: 'active'
  },
  lost: {
    label: 'Lost',
    description: 'Lead has been lost',
    color: 'bg-red-100 text-red-800',
    icon: 'X',
    order: 10,
    category: 'closed'
  }
};

// Priority levels
export const CRM_PRIORITIES: Record<CRMPriority, {
  label: string;
  color: string;
  icon: string;
  value: number;
}> = {
  low: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-800',
    icon: 'ArrowDown',
    value: 1
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'Minus',
    value: 2
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800',
    icon: 'ArrowUp',
    value: 3
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-800',
    icon: 'AlertTriangle',
    value: 4
  }
};

// Activity types
export const CRM_ACTIVITY_TYPES: Record<CRMActivityType, {
  label: string;
  icon: string;
  color: string;
  requiresScheduling: boolean;
  trackable: boolean;
}> = {
  call: {
    label: 'Phone Call',
    icon: 'Phone',
    color: 'bg-blue-100 text-blue-800',
    requiresScheduling: false,
    trackable: true
  },
  meeting: {
    label: 'Meeting',
    icon: 'Users',
    color: 'bg-green-100 text-green-800',
    requiresScheduling: true,
    trackable: true
  },
  site_visit: {
    label: 'Site Visit',
    icon: 'MapPin',
    color: 'bg-purple-100 text-purple-800',
    requiresScheduling: true,
    trackable: true
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    color: 'bg-indigo-100 text-indigo-800',
    requiresScheduling: false,
    trackable: true
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'bg-emerald-100 text-emerald-800',
    requiresScheduling: false,
    trackable: true
  },
  note: {
    label: 'Note',
    icon: 'FileText',
    color: 'bg-gray-100 text-gray-800',
    requiresScheduling: false,
    trackable: false
  },
  follow_up: {
    label: 'Follow-up',
    icon: 'Clock',
    color: 'bg-yellow-100 text-yellow-800',
    requiresScheduling: true,
    trackable: true
  }
};

// Roles and permissions
export const CRM_ROLES: Record<CRMRole, {
  label: string;
  permissions: string[];
  color: string;
}> = {
  admin: {
    label: 'Administrator',
    permissions: [
      'leads.create', 'leads.read', 'leads.update', 'leads.delete',
      'activities.create', 'activities.read', 'activities.update', 'activities.delete',
      'site_visits.create', 'site_visits.read', 'site_visits.update', 'site_visits.delete',
      'quotations.create', 'quotations.read', 'quotations.update', 'quotations.delete', 'quotations.approve',
      'drawings.create', 'drawings.read', 'drawings.update', 'drawings.approve',
      'settings.manage', 'reports.view', 'audit.view'
    ],
    color: 'bg-red-100 text-red-800'
  },
  manager: {
    label: 'Manager',
    permissions: [
      'leads.create', 'leads.read', 'leads.update',
      'activities.create', 'activities.read', 'activities.update',
      'site_visits.create', 'site_visits.read', 'site_visits.update',
      'quotations.create', 'quotations.read', 'quotations.update',
      'drawings.create', 'drawings.read', 'drawings.update',
      'reports.view'
    ],
    color: 'bg-blue-100 text-blue-800'
  },
  sales: {
    label: 'Sales',
    permissions: [
      'leads.create', 'leads.read', 'leads.update',
      'activities.create', 'activities.read', 'activities.update',
      'site_visits.read',
      'quotations.create', 'quotations.read', 'quotations.update',
      'reports.view'
    ],
    color: 'bg-green-100 text-green-800'
  },
  engineer: {
    label: 'Engineer',
    permissions: [
      'leads.read',
      'site_visits.create', 'site_visits.read', 'site_visits.update',
      'drawings.create', 'drawings.read', 'drawings.update',
      'requirements.create', 'requirements.read', 'requirements.update'
    ],
    color: 'bg-purple-100 text-purple-800'
  },
  viewer: {
    label: 'Viewer',
    permissions: [
      'leads.read',
      'activities.read',
      'site_visits.read',
      'quotations.read',
      'drawings.read',
      'requirements.read'
    ],
    color: 'bg-gray-100 text-gray-800'
  }
};

// Default settings
export const CRM_DEFAULTS = {
  LEAD_SOURCES: [
    'Website',
    'Facebook',
    'Google Ads',
    'Referral',
    'Cold Call',
    'Walk-in',
    'Email Campaign',
    'Other'
  ],
  LOST_REASONS: [
    'Price too high',
    'Competition',
    'Project cancelled',
    'Not interested',
    'Budget constraints',
    'Timeline issues',
    'Location constraints',
    'Other'
  ],
  WON_REASONS: [
    'Competitive pricing',
    'Quality of service',
    'Good reputation',
    'Customer referral',
    'Fast response time',
    'Unique design',
    'Trust and reliability',
    'Other'
  ],
  PROJECT_TYPES: [
    'Residential House',
    'Commercial Building',
    'Apartment Complex',
    'Villa',
    'Office Building',
    'Retail Space',
    'Warehouse',
    'Other'
  ],
  SITE_VISIT_CHECKLIST: [
    'Site accessibility checked',
    'Existing structure assessment done',
    'Soil condition verified',
    'Utility connections identified',
    'Neighboring properties noted',
    'Legal documents verified',
    'Measurements taken',
    'Photos captured'
  ],
  CURRENCY: 'INR',
  QUOTE_VALIDITY_DAYS: 30,
  FOLLOW_UP_REMINDER_HOURS: 24
};

// Stage transition rules
export const STAGE_TRANSITIONS: Record<CRMStage, CRMStage[]> = {
  lead_created: ['qualified', 'site_visit_scheduled', 'lost'],
  qualified: ['site_visit_scheduled', 'requirements_collected', 'lost'],
  site_visit_scheduled: ['requirements_collected', 'waiting', 'lost'],
  requirements_collected: ['drawing_prepared', 'waiting', 'lost'],
  drawing_prepared: ['quotation_sent', 'waiting', 'lost'],
  quotation_sent: ['negotiation', 'confirmed', 'waiting', 'lost'],
  negotiation: ['confirmed', 'quotation_sent', 'waiting', 'lost'],
  confirmed: [], // Terminal state
  waiting: ['site_visit_scheduled', 'requirements_collected', 'drawing_prepared', 'quotation_sent', 'negotiation', 'confirmed', 'lost'],
  lost: [] // Terminal state
};

// Required fields per stage
export const REQUIRED_FIELDS: Record<CRMStage, string[]> = {
  lead_created: ['name', 'phone', 'source'],
  qualified: [],
  site_visit_scheduled: ['nextFollowUpAt'],
  requirements_collected: ['projectType', 'sqft', 'budgetMin'],
  drawing_prepared: [], // At least one drawing attachment required
  quotation_sent: [], // At least one quotation required
  negotiation: [],
  confirmed: ['wonReason'],
  waiting: ['nextFollowUpAt'],
  lost: ['lostReason']
};

// Dashboard metrics
export const DASHBOARD_METRICS = {
  CONVERSION_STAGES: ['quotation_sent', 'confirmed'] as CRMStage[],
  ACTIVE_STAGES: ['qualified', 'site_visit_scheduled', 'requirements_collected', 'drawing_prepared', 'quotation_sent', 'negotiation', 'waiting'] as CRMStage[],
  CLOSED_STAGES: ['confirmed', 'lost'] as CRMStage[]
};

// File upload settings
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed'
  ],
  CATEGORIES: {
    photos: ['image/jpeg', 'image/png', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    archives: ['application/zip', 'application/x-rar-compressed']
  }
};

// Notification settings
export const NOTIFICATIONS = {
  LEAD_ASSIGNED: 'lead_assigned',
  STAGE_CHANGED: 'stage_changed',
  FOLLOW_UP_DUE: 'follow_up_due',
  QUOTATION_SENT: 'quotation_sent',
  LEAD_WON: 'lead_won',
  LEAD_LOST: 'lead_lost',
  SITE_VISIT_SCHEDULED: 'site_visit_scheduled',
  DRAWING_READY: 'drawing_ready'
};

// Pagination settings
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZES: [10, 20, 50, 100]
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, hh:mm a',
  INPUT: 'yyyy-MM-dd',
  INPUT_DATETIME: 'yyyy-MM-dd\'T\'HH:mm'
};

// Validation rules
export const VALIDATION = {
  PHONE_REGEX: /^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  LEAD_CODE_PREFIX: 'LEAD',
  QUOTE_CODE_PREFIX: 'QUOTE',
  MIN_BUDGET: 10000,
  MAX_BUDGET: 100000000
};



















