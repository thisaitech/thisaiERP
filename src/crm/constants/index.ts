// Admissions CRM constants (student lead pipeline)

import type { CRMStage, CRMPriority } from '../types'

export const ADMISSIONS_CRM_SETTINGS_ID = 'admissions_crm_settings'

export const CRM_STAGES: Record<
  CRMStage,
  {
    label: string
    description: string
    color: string
    order: number
    category: 'prospect' | 'active' | 'closed'
  }
> = {
  enquiry_received: {
    label: 'Enquiry Received',
    description: 'New student enquiry received',
    color: 'bg-blue-100 text-blue-800',
    order: 1,
    category: 'prospect',
  },
  contacted: {
    label: 'Contacted',
    description: 'Student contacted (call/WhatsApp/email)',
    color: 'bg-green-100 text-green-800',
    order: 2,
    category: 'prospect',
  },
  counselling_scheduled: {
    label: 'Counselling Scheduled',
    description: 'Counselling session scheduled',
    color: 'bg-yellow-100 text-yellow-800',
    order: 3,
    category: 'active',
  },
  counselling_completed: {
    label: 'Counselling Completed',
    description: 'Counselling completed and next steps shared',
    color: 'bg-purple-100 text-purple-800',
    order: 4,
    category: 'active',
  },
  application_submitted: {
    label: 'Application Submitted',
    description: 'Application submitted by student',
    color: 'bg-indigo-100 text-indigo-800',
    order: 5,
    category: 'active',
  },
  documents_collected: {
    label: 'Documents Collected',
    description: 'Documents collected/verified',
    color: 'bg-cyan-100 text-cyan-800',
    order: 6,
    category: 'active',
  },
  fee_discussion: {
    label: 'Fee Discussion',
    description: 'Fees discussed / offer shared',
    color: 'bg-orange-100 text-orange-800',
    order: 7,
    category: 'active',
  },
  admitted: {
    label: 'Admitted',
    description: 'Student admission confirmed',
    color: 'bg-emerald-100 text-emerald-800',
    order: 8,
    category: 'closed',
  },
  waiting: {
    label: 'Waiting',
    description: 'Waiting for student response',
    color: 'bg-gray-100 text-gray-800',
    order: 9,
    category: 'active',
  },
  lost: {
    label: 'Lost',
    description: 'Enquiry lost / admission not converted',
    color: 'bg-red-100 text-red-800',
    order: 10,
    category: 'closed',
  },
}

export const CRM_PRIORITIES: Record<
  CRMPriority,
  {
    label: string
    color: string
    value: number
  }
> = {
  low: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-800',
    value: 1,
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800',
    value: 2,
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800',
    value: 3,
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-800',
    value: 4,
  },
}

export const CRM_DEFAULTS = {
  LEAD_SOURCES: ['Website', 'Facebook', 'Instagram', 'Referral', 'Walk-in', 'WhatsApp', 'Phone Call', 'Other'],
  LOST_REASONS: [
    'Fees too high',
    'Joined another institute',
    'Not interested',
    'Not reachable',
    'Schedule mismatch',
    'Other',
  ],
  PROGRAMS: [
    'Full Stack Development',
    'Data Science',
    'UI/UX Design',
    'Digital Marketing',
    'Spoken English',
    'Tally / Accounting',
  ],
  FOLLOW_UP_CHECKLIST: [
    'Call / WhatsApp follow-up',
    'Share course details / brochure',
    'Schedule counselling session',
    'Collect required documents',
    'Share fee structure',
    'Confirm admission date',
  ],
  CURRENCY_SYMBOL: '\u20B9',
}

export function getStageLabel(stage: CRMStage, stageLabels?: Partial<Record<CRMStage, string>>): string {
  return stageLabels?.[stage] || CRM_STAGES[stage].label
}
