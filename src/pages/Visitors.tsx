import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Plus,
  UserList,
  MagnifyingGlass,
  Trash,
  PencilSimple,
  Eye,
  X,
  Spinner,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import PeriodFilterDropdown, { type PeriodFilterValue } from '../components/PeriodFilterDropdown'
import { toast } from 'sonner'
import MobilePageScaffold from '../components/mobile/MobilePageScaffold'
import MobileListCard from '../components/mobile/MobileListCard'
import MobileActionMenu from '../components/mobile/MobileActionMenu'
import useIsMobileViewport from '../hooks/useIsMobileViewport'
import { formatStatCount } from '../utils/formatStatAmount'
import { getItems } from '../services/itemService'
import {
  createVisitor,
  deleteVisitor,
  ENQUIRY_TYPE_LABELS,
  getVisitors,
  SOURCE_LABELS,
  updateVisitor,
  type EnquiryType,
  type Visitor,
  type VisitorSource,
} from '../services/visitorService'

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  enquiryType: 'training' as EnquiryType,
  course: '',
  profession: '',
  source: 'walk_in' as VisitorSource,
  sourceDetail: '',
  notes: '',
  visitDate: new Date().toISOString().split('T')[0],
}

const Visitors = () => {
  const isMobile = useIsMobileViewport()
  const location = useLocation()

  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | EnquiryType>('all')
  const [visitorPeriod, setVisitorPeriod] = useState<PeriodFilterValue>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [viewingVisitor, setViewingVisitor] = useState<Visitor | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rows, items] = await Promise.all([getVisitors(), getItems()])
      setVisitors(rows)
      const names = items
        .map((item) => item.name?.trim())
        .filter(Boolean) as string[]
      setCourseOptions([...new Set(names)].sort())
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load visitors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('action') === 'new') setShowForm(true)
  }, [location.search])

  const periodVisitors = useMemo(() => {
    if (visitorPeriod === 'all') return visitors
    const now = new Date()
    return visitors.filter((v) => {
      const dateStr = String(v.visitDate || '').slice(0, 10)
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      if (visitorPeriod === 'today') {
        return dateStr === now.toISOString().slice(0, 10)
      } else if (visitorPeriod === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo && d <= now
      } else if (visitorPeriod === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      } else if (visitorPeriod === 'year') {
        return d.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [visitors, visitorPeriod])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return periodVisitors.filter((v) => {
      if (filterType !== 'all' && v.enquiryType !== filterType) return false
      if (!q) return true
      return (
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.address.toLowerCase().includes(q) ||
        (v.course || '').toLowerCase().includes(q) ||
        (v.profession || '').toLowerCase().includes(q)
      )
    })
  }, [periodVisitors, search, filterType])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: periodVisitors.length,
      today: periodVisitors.filter((v) => v.visitDate === today).length,
      training: periodVisitors.filter((v) => v.enquiryType === 'training').length,
      it: periodVisitors.filter((v) => v.enquiryType === 'it').length,
    }
  }, [periodVisitors])

  const categoryTabs = useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: stats.total },
      { id: 'training' as const, label: 'Training', count: stats.training },
      { id: 'it' as const, label: 'IT', count: stats.it },
    ],
    [stats.total, stats.training, stats.it]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (visitor: Visitor) => {
    setEditingId(visitor.id)
    setForm({
      name: visitor.name,
      phone: visitor.phone,
      address: visitor.address,
      enquiryType: visitor.enquiryType,
      course: visitor.course || '',
      profession: visitor.profession || '',
      source: visitor.source,
      sourceDetail: visitor.sourceDetail || '',
      notes: visitor.notes || '',
      visitDate: visitor.visitDate || new Date().toISOString().split('T')[0],
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const openView = (visitor: Visitor) => {
    setViewingVisitor(visitor)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.phone.trim()) {
      toast.error('Phone number is required')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        enquiryType: form.enquiryType,
        course: form.course.trim() || undefined,
        profession: form.profession.trim() || undefined,
        source: form.source,
        sourceDetail: form.sourceDetail.trim() || undefined,
        notes: form.notes.trim() || undefined,
        visitDate: form.visitDate,
      }

      if (editingId) {
        await updateVisitor(editingId, payload)
        toast.success('Visitor updated')
      } else {
        await createVisitor(payload)
        toast.success('Visitor registered')
      }

      closeForm()
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save visitor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete visitor record for "${name}"?`)) return
    try {
      await deleteVisitor(id)
      toast.success('Visitor deleted')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete visitor')
    }
  }

  const formModal = (
    <AnimatePresence>
      {showForm && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70]"
            onClick={closeForm}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-3 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-card border border-border shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  {editingId ? 'Edit Visitor' : 'Register Visitor'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-xl bg-muted text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">Name *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="Visitor full name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Phone *</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="10-digit mobile number"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">Place / Address</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="City, area or full address"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Enquiry Type *</span>
                  <select
                    value={form.enquiryType}
                    onChange={(e) => setForm((f) => ({ ...f, enquiryType: e.target.value as EnquiryType }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="training">Training</option>
                    <option value="it">IT Services</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Visit Date</span>
                  <input
                    type="date"
                    value={form.visitDate}
                    onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Course Interested</span>
                  <input
                    type="text"
                    list="visitor-courses"
                    value={form.course}
                    onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="e.g. Python, Full Stack, Tally"
                  />
                  <datalist id="visitor-courses">
                    {courseOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Profession</span>
                  <input
                    type="text"
                    value={form.profession}
                    onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="Student, Engineer, Business owner..."
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Source</span>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as VisitorSource }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Source Details</span>
                  <input
                    type="text"
                    value={form.sourceDetail}
                    onChange={(e) => setForm((f) => ({ ...f, sourceDetail: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="Referral name, ad campaign, etc."
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none"
                    placeholder="Additional enquiry details..."
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2 pb-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Visitor' : 'Save Visitor'}
                </button>
              </div>
            </form>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  const visitorCard = (visitor: Visitor) => (
    <MobileListCard
      key={visitor.id}
      title={visitor.name}
      onTitleClick={() => openView(visitor)}
      subtitle={`${SOURCE_LABELS[visitor.source]}${visitor.sourceDetail ? ` · ${visitor.sourceDetail}` : ''} · ${visitor.visitDate}`}
      fields={[
        { id: 'date', label: 'Date', value: visitor.visitDate || '-' },
        { id: 'phone', label: 'Phone', value: visitor.phone || '-' },
        { id: 'course', label: 'Course', value: visitor.course || '—' },
        { id: 'address', label: 'Address', value: visitor.address || '—' },
      ]}
      status={
        <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase bg-blue-100 text-blue-700">
          {ENQUIRY_TYPE_LABELS[visitor.enquiryType]}
        </span>
      }
      actions={
        <MobileActionMenu
          actions={[
            { id: 'view', label: 'View', icon: <Eye size={14} />, onClick: () => openView(visitor) },
            { id: 'edit', label: 'Edit', icon: <PencilSimple size={14} />, onClick: () => openEdit(visitor) },
            { id: 'delete', label: 'Delete', icon: <Trash size={14} />, tone: 'danger', onClick: () => handleDelete(visitor.id, visitor.name) },
          ]}
        />
      }
    />
  )

  if (isMobile) {
    return (
      <>
        <MobilePageScaffold title="">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="erp-module-kpi-grid erp-module-kpi-grid--2">
              <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
                <div>
                  <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Total Visitors">Total</h3>
                  <div className="erp-inline-stat-scroll mt-0.5">
                    <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">{formatStatCount(stats.total)}</p>
                  </div>
                </div>
              </div>
              <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
                <div>
                  <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Today's Visitors">Today</h3>
                  <div className="erp-inline-stat-scroll mt-0.5">
                    <p className="erp-inline-stat-value text-blue-600 dark:text-blue-400">{formatStatCount(stats.today)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-row items-center justify-end gap-1.5 flex-shrink-0 sm:w-auto">
              <PeriodFilterDropdown value={visitorPeriod} onChange={setVisitorPeriod} />
              <button
                type="button"
                onClick={openCreate}
                className="erp-module-primary-btn"
                aria-label="Add visitor"
              >
                <Plus size={14} weight="bold" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <MagnifyingGlass size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={cn(
                    'erp-module-filter-chip w-full justify-center text-center',
                    filterType === tab.id
                      ? 'is-active'
                      : 'border border-slate-200 dark:border-slate-600'
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500 py-4 mt-4">Loading visitors...</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 mt-4">
              No visitors found
            </div>
          )}
          <div className="space-y-2 mt-4">{filtered.map(visitorCard)}</div>
        </MobilePageScaffold>
        {formModal}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Visitors', value: stats.total, color: 'text-slate-800 dark:text-slate-100' },
            { label: 'Today', value: stats.today, color: 'text-blue-600' },
            { label: 'Training', value: stats.training, color: 'text-blue-600' },
            { label: 'IT Services', value: stats.it, color: 'text-blue-600' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.value}</p>
            </div>
          ))}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, course, profession..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            {(['all', 'training', 'it'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors',
                  filterType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'
                )}
              >
                {type === 'all' ? 'All' : ENQUIRY_TYPE_LABELS[type]}
              </button>
            ))}
            <div className="flex items-center gap-1.5 shrink-0 overflow-visible">
              <PeriodFilterDropdown value={visitorPeriod} onChange={setVisitorPeriod} />
              <button
                type="button"
                onClick={openCreate}
                className="erp-module-primary-btn shrink-0"
              >
                <Plus size={14} weight="bold" />
                <span>Register Visitor</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Spinner size={24} className="animate-spin mr-2" />
            Loading visitors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <UserList size={40} className="mx-auto mb-3 opacity-40" />
            <p>No visitor records yet</p>
            <button type="button" onClick={openCreate} className="mt-3 text-blue-600 font-medium text-sm">
              Register first visitor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Phone</th>
                  <th className="px-3 py-3 font-medium">Address</th>
                  <th className="px-3 py-3 font-medium">Enquiry</th>
                  <th className="px-3 py-3 font-medium">Course</th>
                  <th className="px-3 py-3 font-medium">Profession</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((visitor) => (
                  <tr key={visitor.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openView(visitor)}
                        title="View visitor details"
                        className="font-medium text-blue-600 dark:text-blue-400 text-left cursor-pointer hover:underline transition-colors"
                      >
                        {visitor.name}
                      </button>
                    </td>
                    <td className="px-3 py-3">{visitor.phone}</td>
                    <td className="px-3 py-3 max-w-[180px] truncate">{visitor.address || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        visitor.enquiryType === 'training' ? 'bg-blue-100 text-blue-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {ENQUIRY_TYPE_LABELS[visitor.enquiryType]}
                      </span>
                    </td>
                    <td className="px-3 py-3">{visitor.course || '—'}</td>
                    <td className="px-3 py-3">{visitor.profession || '—'}</td>
                    <td className="px-3 py-3">
                      {SOURCE_LABELS[visitor.source]}
                      {visitor.sourceDetail ? ` (${visitor.sourceDetail})` : ''}
                    </td>
                    <td className="px-3 py-3">{visitor.visitDate}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openView(visitor)} title="View" className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                          <Eye size={16} weight="duotone" />
                        </button>
                        <button type="button" onClick={() => openEdit(visitor)} title="Edit" className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                          <PencilSimple size={16} weight="duotone" />
                        </button>
                        <button type="button" onClick={() => handleDelete(visitor.id, visitor.name)} title="Delete" className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash size={16} weight="duotone" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModal}

      {/* View Visitor Modal */}
      <AnimatePresence>
        {viewingVisitor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingVisitor(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewingVisitor(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Visitor Details</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{viewingVisitor.visitDate}</p>
                  </div>
                  <button onClick={() => setViewingVisitor(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  {[
                    { label: 'Name', value: viewingVisitor.name },
                    { label: 'Phone', value: viewingVisitor.phone },
                    { label: 'Address', value: viewingVisitor.address || '—' },
                    { label: 'Enquiry Type', value: ENQUIRY_TYPE_LABELS[viewingVisitor.enquiryType] || viewingVisitor.enquiryType },
                    { label: 'Course', value: viewingVisitor.course || '—' },
                    { label: 'Profession', value: viewingVisitor.profession || '—' },
                    { label: 'Source', value: SOURCE_LABELS[viewingVisitor.source] || viewingVisitor.source },
                    { label: 'Notes', value: viewingVisitor.notes || '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => { const v = viewingVisitor; setViewingVisitor(null); openEdit(v); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    <PencilSimple size={16} weight="duotone" /> Edit
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Visitors
