import { apiDelete, apiGet, apiPost, apiPut } from '../../services/apiClient'
import { ADMISSIONS_CRM_SETTINGS_ID, CRM_DEFAULTS } from '../constants'
import type { CRMLead, CRMPriority, CRMSettings, CRMStage, CRMStatus, CRMListResponse, CRMOneResponse } from '../types'

const STAGES: CRMStage[] = [
  'enquiry_received',
  'contacted',
  'counselling_scheduled',
  'counselling_completed',
  'application_submitted',
  'documents_collected',
  'fee_discussion',
  'admitted',
  'waiting',
  'lost',
]

const STATUSES: CRMStatus[] = ['open', 'admitted', 'lost', 'waiting']
const PRIORITIES: CRMPriority[] = ['low', 'medium', 'high', 'urgent']

function isStage(value: any): value is CRMStage {
  return typeof value === 'string' && (STAGES as string[]).includes(value)
}

function isStatus(value: any): value is CRMStatus {
  return typeof value === 'string' && (STATUSES as string[]).includes(value)
}

function isPriority(value: any): value is CRMPriority {
  return typeof value === 'string' && (PRIORITIES as string[]).includes(value)
}

function inferStageFromLegacy(lead: any): CRMStage {
  const legacy = String(lead?.status || '').toLowerCase()
  if (legacy === 'converted') return 'admitted'
  if (legacy === 'lost') return 'lost'
  if (legacy === 'contacted') return 'contacted'
  return 'enquiry_received'
}

function inferStatusFromStage(stage: CRMStage): CRMStatus {
  if (stage === 'admitted') return 'admitted'
  if (stage === 'lost') return 'lost'
  if (stage === 'waiting') return 'waiting'
  return 'open'
}

function normalizeLead(raw: any): CRMLead {
  const now = new Date().toISOString()
  const stage = isStage(raw?.stage) ? raw.stage : inferStageFromLegacy(raw)
  const status = isStatus(raw?.status) ? raw.status : inferStatusFromStage(stage)

  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || ''),
    phone: String(raw?.phone || ''),
    email: raw?.email ? String(raw.email) : undefined,
    courseInterest:
      raw?.courseInterest ? String(raw.courseInterest) : raw?.projectName ? String(raw.projectName) : undefined,
    source: raw?.source ? String(raw.source) : undefined,
    priority: isPriority(raw?.priority) ? raw.priority : 'medium',
    stage,
    status,
    notes: raw?.notes ? String(raw.notes) : undefined,
    nextFollowUpAt: raw?.nextFollowUpAt ? String(raw.nextFollowUpAt) : undefined,
    expectedFee:
      typeof raw?.expectedFee === 'number'
        ? raw.expectedFee
        : typeof raw?.expectedValue === 'number'
          ? raw.expectedValue
          : undefined,
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

export async function listLeads(): Promise<CRMLead[]> {
  const res = await apiGet<CRMListResponse<any>>('/leads')
  const rows = res.data || []
  const leads = rows.map(normalizeLead)
  leads.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return leads
}

export async function createLead(input: Partial<CRMLead> & { name: string; phone: string }): Promise<CRMLead> {
  const now = new Date().toISOString()
  const stage = isStage(input.stage) ? input.stage : 'enquiry_received'
  const status = isStatus(input.status) ? input.status : inferStatusFromStage(stage)
  const priority = isPriority(input.priority) ? input.priority : 'medium'

  const payload: any = {
    ...input,
    priority,
    stage,
    status,
    createdAt: now,
    updatedAt: now,
  }

  const res = await apiPost<CRMOneResponse<any>>('/leads', payload)
  return normalizeLead(res.data)
}

export async function saveLead(lead: CRMLead): Promise<CRMLead> {
  const now = new Date().toISOString()
  const payload = { ...lead, updatedAt: now }
  const res = await apiPut<CRMOneResponse<any>>(`/leads/${encodeURIComponent(lead.id)}`, payload)
  return normalizeLead(res.data)
}

export async function deleteLead(id: string): Promise<void> {
  await apiDelete<{ ok: boolean }>(`/leads/${encodeURIComponent(id)}`)
}

export function getDefaultSettings(): CRMSettings {
  const now = new Date().toISOString()
  return {
    id: ADMISSIONS_CRM_SETTINGS_ID,
    leadSources: [...CRM_DEFAULTS.LEAD_SOURCES],
    lostReasons: [...CRM_DEFAULTS.LOST_REASONS],
    programs: [...CRM_DEFAULTS.PROGRAMS],
    followUpChecklist: [...CRM_DEFAULTS.FOLLOW_UP_CHECKLIST],
    stageLabels: {},
    currencySymbol: CRM_DEFAULTS.CURRENCY_SYMBOL,
    updatedAt: now,
  }
}

export async function getSettings(): Promise<CRMSettings> {
  try {
    const res = await apiGet<CRMOneResponse<any>>(`/settings/${encodeURIComponent(ADMISSIONS_CRM_SETTINGS_ID)}`)
    const raw = res.data || {}
    return {
      ...getDefaultSettings(),
      ...raw,
      id: ADMISSIONS_CRM_SETTINGS_ID,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('status 404')) {
      return getDefaultSettings()
    }
    throw err
  }
}

export async function saveSettings(settings: CRMSettings): Promise<CRMSettings> {
  const now = new Date().toISOString()
  const payload = { ...settings, id: ADMISSIONS_CRM_SETTINGS_ID, updatedAt: now }
  const res = await apiPut<CRMOneResponse<any>>(`/settings/${encodeURIComponent(ADMISSIONS_CRM_SETTINGS_ID)}`, payload)
  const raw = res.data || {}
  return {
    ...getDefaultSettings(),
    ...raw,
    id: ADMISSIONS_CRM_SETTINGS_ID,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

