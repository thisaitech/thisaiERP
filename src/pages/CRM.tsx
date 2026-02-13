import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { createLead, deleteLead, getLeads, type Lead, type LeadStatus } from '../services/leadService'

const emptyForm = () => ({
  name: '',
  phone: '',
  email: '',
  status: 'new' as LeadStatus,
  notes: '',
})

const CRM: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => {
      const hay = `${l.name} ${l.phone || ''} ${l.email || ''} ${l.status || ''} ${l.notes || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [leads, query])

  const load = async () => {
    setLoading(true)
    try {
      const rows = await getLeads()
      setLeads(rows || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load CRM leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const onCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Enter lead name')
      return
    }

    setSaving(true)
    try {
      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      })
      toast.success('Lead created')
      setShowNew(false)
      setForm(emptyForm())
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    try {
      await deleteLead(id)
      toast.success('Lead deleted')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete lead')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-900 px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">CRM</h1>
          <p className="text-xs text-slate-500">Manage enquiries and follow-ups</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} weight="bold" />
          New Lead
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full sm:max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-background"
          />
          <div className="text-xs text-muted-foreground">{filtered.length} leads</div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No leads yet</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">{l.name}</td>
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{l.phone || '-'}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                          l.status === 'new' && 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                          l.status === 'contacted' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                          l.status === 'converted' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                          l.status === 'lost' && 'bg-rose-500/10 text-rose-600 border-rose-500/20',
                        )}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{(l.updatedAt || '').slice(0, 10) || '-'}</td>
                    <td className="py-2 pr-1 text-right">
                      <button
                        onClick={() => onDelete(l.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-800 dark:text-slate-100">New Lead</div>
              <button
                onClick={() => {
                  setShowNew(false)
                  setForm(emptyForm())
                }}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="Student / Enquiry name"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="Phone"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="Email"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LeadStatus }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="converted">converted</option>
                  <option value="lost">lost</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  rows={3}
                  placeholder="Notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNew(false)
                  setForm(emptyForm())
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CRM
