// Admissions CRM types (student lead pipeline)

export type CRMPriority = 'low' | 'medium' | 'high' | 'urgent'

export type CRMStage =
  | 'enquiry_received'
  | 'contacted'
  | 'counselling_scheduled'
  | 'counselling_completed'
  | 'application_submitted'
  | 'documents_collected'
  | 'fee_discussion'
  | 'admitted'
  | 'waiting'
  | 'lost'

export type CRMStatus = 'open' | 'admitted' | 'lost' | 'waiting'

export interface CRMLead {
  id: string
  name: string
  phone: string
  email?: string

  courseInterest?: string
  source?: string

  priority: CRMPriority
  stage: CRMStage
  status: CRMStatus

  notes?: string
  nextFollowUpAt?: string // ISO datetime
  expectedFee?: number

  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}

export interface CRMDashboardMetrics {
  totalLeads: number
  stageCounts: Record<CRMStage, number>
  statusCounts: Record<CRMStatus, number>
  conversionRate: number
}

export interface CRMSettings {
  id: string
  leadSources: string[]
  lostReasons: string[]
  programs: string[]
  followUpChecklist: string[]
  stageLabels?: Partial<Record<CRMStage, string>>
  currencySymbol?: string
  updatedAt: string
}

export interface CRMFilters {
  stage?: CRMStage[]
  status?: CRMStatus[]
  priority?: CRMPriority[]
  source?: string[]
  search?: string
}

export interface CRMListResponse<T> {
  data: T[]
}

export interface CRMOneResponse<T> {
  data: T
}







