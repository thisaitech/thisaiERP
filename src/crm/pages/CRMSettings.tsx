import React, { useEffect, useMemo, useState } from 'react'
import { ArrowClockwise, FloppyDisk, Plus, Trash, Warning } from '@phosphor-icons/react'
import { CRM_STAGES, getStageLabel } from '../constants'
import { useToast } from '../components/Toast'
import { useCRM } from '../contexts/CRMContext'
import type { CRMSettings, CRMStage } from '../types'
import { getDefaultSettings, saveSettings } from '../services/admissionsCrmApi'

type ArrayField = 'leadSources' | 'lostReasons' | 'programs' | 'followUpChecklist'

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const v = raw.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

function sanitizeSettings(input: CRMSettings): CRMSettings {
  const stageLabels = input.stageLabels || {}
  const cleanedStageLabels: NonNullable<CRMSettings['stageLabels']> = {}

  for (const stageKey of Object.keys(CRM_STAGES) as CRMStage[]) {
    const v = (stageLabels as any)[stageKey]
    if (typeof v !== 'string') continue
    const trimmed = v.trim()
    if (!trimmed) continue
    cleanedStageLabels[stageKey] = trimmed
  }

  return {
    ...input,
    leadSources: dedupePreserveOrder(input.leadSources || []),
    lostReasons: dedupePreserveOrder(input.lostReasons || []),
    programs: dedupePreserveOrder(input.programs || []),
    followUpChecklist: dedupePreserveOrder(input.followUpChecklist || []),
    stageLabels: cleanedStageLabels,
    currencySymbol: (input.currencySymbol || '').trim() || undefined,
  }
}

const ListCard: React.FC<{
  title: string
  addLabel: string
  placeholder: string
  items: string[]
  onChange: (items: string[]) => void
}> = ({ title, addLabel, placeholder, items, onChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{title}</h3>

      <div className="space-y-3">
        {items.map((value, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const next = [...items]
                next[index] = e.target.value
                onChange(next)
              }}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              placeholder={placeholder}
            />
            <button
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Remove"
            >
              <Trash size={16} />
            </button>
          </div>
        ))}

        <button
          onClick={() => onChange([...items, ''])}
          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
    </div>
  )
}

const CRMSettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const { settings, loading, error, refreshSettings } = useCRM()
  const [form, setForm] = useState<CRMSettings>(() => getDefaultSettings())
  const [saving, setSaving] = useState(false)

  const orderedStages = useMemo(() => {
    return (Object.entries(CRM_STAGES) as Array<[CRMStage, (typeof CRM_STAGES)[CRMStage]]>).sort(
      (a, b) => a[1].order - b[1].order
    )
  }, [])

  useEffect(() => {
    if (!settings) return
    setForm({
      ...getDefaultSettings(),
      ...settings,
      stageLabels: settings.stageLabels || {},
    })
  }, [settings])

  const updateArray = (field: ArrayField, next: string[]) => {
    setForm((prev) => ({ ...prev, [field]: next } as CRMSettings))
  }

  const handleReset = () => {
    const ok = window.confirm('Reset CRM settings to defaults? (This does not save automatically.)')
    if (!ok) return
    setForm(getDefaultSettings())
    showToast('info', 'Reset to defaults (not saved yet)')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleaned = sanitizeSettings(form)
      await saveSettings(cleaned)
      await refreshSettings()
      showToast('success', 'Settings saved')
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading.settings && !settings) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          {error ? (
            <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-300">
              <Warning size={16} />
              {error}
            </span>
          ) : (
            <span>Configure admissions CRM lists and pipeline labels</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ArrowClockwise size={16} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FloppyDisk size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard
          title="Lead Sources"
          addLabel="Add Source"
          placeholder="e.g., Instagram"
          items={form.leadSources || []}
          onChange={(next) => updateArray('leadSources', next)}
        />

        <ListCard
          title="Lost Reasons"
          addLabel="Add Reason"
          placeholder="e.g., Fees too high"
          items={form.lostReasons || []}
          onChange={(next) => updateArray('lostReasons', next)}
        />

        <ListCard
          title="Programs"
          addLabel="Add Program"
          placeholder="e.g., Data Science"
          items={form.programs || []}
          onChange={(next) => updateArray('programs', next)}
        />

        <ListCard
          title="Follow-up Checklist"
          addLabel="Add Item"
          placeholder="e.g., Share brochure"
          items={form.followUpChecklist || []}
          onChange={(next) => updateArray('followUpChecklist', next)}
        />

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Stage Labels (Optional)</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Override stage names shown in CRM. Leave blank to use defaults.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderedStages.map(([stageKey]) => (
              <div key={stageKey} className="flex items-center gap-3">
                <div className="w-44 text-sm text-slate-700 dark:text-slate-300">
                  {getStageLabel(stageKey)}
                </div>
                <input
                  type="text"
                  value={form.stageLabels?.[stageKey] || ''}
                  onChange={(e) => {
                    const next = { ...(form.stageLabels || {}) }
                    const v = e.target.value
                    if (v.trim()) next[stageKey] = v
                    else delete next[stageKey]
                    setForm((prev) => ({ ...prev, stageLabels: next }))
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder="Custom label"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Currency Symbol</label>
              <input
                type="text"
                value={form.currencySymbol || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, currencySymbol: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                placeholder="e.g., Rs., $, EUR"
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 flex items-end">
              Saved settings apply to your company account.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CRMSettingsPage

