import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Envelope, Phone, User, X } from '@phosphor-icons/react'
import { CRM_PRIORITIES } from '../constants'
import { useCRM } from '../contexts/CRMContext'
import type { CRMPriority } from '../types'
import { createLead } from '../services/admissionsCrmApi'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose }) => {
  const { addLead, settings, refreshLeads, refreshDashboard } = useCRM()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const programs = useMemo(() => settings?.programs || [], [settings])
  const sources = useMemo(() => settings?.leadSources || [], [settings])

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    courseInterest: '',
    source: sources[0] || 'Website',
    priority: 'medium' as CRMPriority,
    nextFollowUpAt: '',
    notes: '',
  })

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.phone.trim()) next.phone = 'Phone is required'

    // Basic 10-digit check (India) but allow international formats too.
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length > 0 && digits.length < 10) {
      next.phone = 'Please enter a valid phone number'
    }

    if (form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email.trim())) next.email = 'Invalid email address'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleClose = () => {
    if (loading) return
    setErrors({})
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const lead = await createLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        courseInterest: form.courseInterest.trim() || undefined,
        source: form.source || undefined,
        priority: form.priority,
        notes: form.notes.trim() || undefined,
        nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined,
      })

      addLead(lead)
      await Promise.all([refreshLeads(), refreshDashboard()])
      handleClose()

      setForm({
        name: '',
        phone: '',
        email: '',
        courseInterest: '',
        source: sources[0] || 'Website',
        priority: 'medium',
        nextFollowUpAt: '',
        notes: '',
      })
    } catch (err: any) {
      setErrors({ submit: err?.message || 'Failed to create lead' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create New Lead</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Add a new student enquiry to your pipeline</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Close"
              disabled={loading}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errors.submit ? (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {errors.submit}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Student Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder="Enter student name"
                />
                {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone *</label>
                <div className="mt-1 relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="Phone number"
                  />
                </div>
                {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <div className="mt-1 relative">
                  <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="Email (optional)"
                  />
                </div>
                {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Course / Program</label>
                <input
                  list="admissions-crm-programs"
                  value={form.courseInterest}
                  onChange={(e) => setForm((p) => ({ ...p, courseInterest: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder="e.g., Full Stack Development"
                />
                <datalist id="admissions-crm-programs">
                  {programs.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  {(sources.length ? sources : ['Website']).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as CRMPriority }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  {Object.entries(CRM_PRIORITIES).map(([key, pr]) => (
                    <option key={key} value={key}>
                      {pr.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Next Follow-up</label>
                <div className="mt-1 relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={form.nextFollowUpAt}
                    onChange={(e) => setForm((p) => ({ ...p, nextFollowUpAt: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  rows={3}
                  placeholder="Notes (optional)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreateLeadModal
