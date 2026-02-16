import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { getParties } from '../services/partyService'
import { getItems } from '../services/itemService'
import { createInvoice, deleteInvoice, getInvoices } from '../services/invoiceService'

type Student = { id: string; name?: string; companyName?: string; phone?: string; email?: string }
type Course = { id: string; name: string; sellingPrice?: number; unit?: string }

type AdmissionItem = {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

const newLine = (): AdmissionItem => ({
  id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'Course',
  rate: 0,
  amount: 0,
})

const genAdmissionNo = () => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ADM-${yy}${mm}-${rand}`
}

const Sales: React.FC = () => {
  const { userData } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [invoices, setInvoices] = useState<any[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  // Create modal
  const [showForm, setShowForm] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState(genAdmissionNo())
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [items, setItems] = useState<AdmissionItem[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [paidAmount, setPaidAmount] = useState<number>(0)

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0), [items])

  const load = async () => {
    setLoading(true)
    try {
      const [inv, st, co] = await Promise.all([
        getInvoices('sale'),
        getParties('both'),
        getItems(),
      ])
      setInvoices(inv || [])
      setStudents(st as any)
      setCourses(co as any)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load admissions data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const resetForm = () => {
    setInvoiceNumber(genAdmissionNo())
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setStudentSearch('')
    setSelectedStudentId('')
    setPhone('')
    setEmail('')
    setItems([newLine()])
    setNotes('')
    setPaidAmount(0)
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
  }

  const recalcLine = (line: AdmissionItem): AdmissionItem => {
    const qty = Number(line.quantity) || 0
    const rate = Number(line.rate) || 0
    return { ...line, quantity: qty, rate, amount: qty * rate }
  }

  const handlePickCourse = (lineId: string, courseId: string) => {
    const c = courses.find((x) => x.id === courseId)
    setItems((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const next = {
          ...l,
          itemId: c?.id || '',
          itemName: c?.name || '',
          unit: (c as any)?.unit || 'Course',
          rate: Number(c?.sellingPrice ?? l.rate) || 0,
        }
        return recalcLine(next)
      })
    )
  }

  const handleSave = async () => {
    if (!selectedStudentId) return toast.error('Please select a student')
    const cleanItems = items
      .map(recalcLine)
      .filter((l) => l.itemId && l.quantity > 0)

    if (cleanItems.length === 0) return toast.error('Please add at least 1 course')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payload: any = {
        type: 'sale',
        invoiceNumber,
        invoiceDate,
        partyId: selectedStudentId,
        partyName: selectedStudent?.name || selectedStudent?.companyName || studentSearch || 'Student',
        phone: phone || selectedStudent?.phone || '',
        email: email || selectedStudent?.email || '',
        items: cleanItems,
        subtotal: total,
        total,
        grandTotal: total,
        paidAmount: Math.min(Number(paidAmount) || 0, total),
        status: (Number(paidAmount) || 0) >= total ? 'paid' : (Number(paidAmount) || 0) > 0 ? 'partial' : 'pending',
        notes,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userData?.uid || '',
      }

      await createInvoice(payload)
      toast.success('Admission saved')
      setShowForm(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save admission')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this admission?')) return
    try {
      await deleteInvoice(id)
      toast.success('Admission deleted')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete')
    }
  }

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students.slice(0, 20)
    return students
      .filter((s) => `${s.name || s.companyName || ''} ${s.phone || ''}`.toLowerCase().includes(q))
      .slice(0, 20)
  }, [students, studentSearch])

  return (
    <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900 p-6">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Admissions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage admissions</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} weight="bold" />
            New Admission
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Admissions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? 'Loading...' : `${invoices.length} record(s)`}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Admission No</th>
                  <th className="text-left px-4 py-2 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 font-semibold">Student</th>
                  <th className="text-right px-4 py-2 font-semibold">Total</th>
                  <th className="text-right px-4 py-2 font-semibold">Paid</th>
                  <th className="text-right px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 20).map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700/60">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{inv.invoiceNumber || inv.id}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{(inv.invoiceDate || inv.createdAt || '').slice(0, 10)}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{inv.partyName || 'Student'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">₹{Number(inv.total || inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">₹{Number(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && !loading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                      No admissions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-800 dark:text-slate-100">New Admission</div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Admission No</label>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Paid Amount</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Student</label>
                  <input
                    value={selectedStudent ? (selectedStudent.name || selectedStudent.companyName || '') : studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      setSelectedStudentId('')
                    }}
                    placeholder="Search student..."
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  {!selectedStudentId && studentSearch.trim().length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id)
                            setStudentSearch('')
                            setPhone(s.phone || '')
                            setEmail(s.email || '')
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60',
                            'flex items-center justify-between gap-3'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {s.name || s.companyName || 'Student'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.phone || ''}</div>
                          </div>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No students found</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Courses</div>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => [...prev, newLine()])}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Course
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {items.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Course</label>
                        <select
                          value={line.itemId}
                          onChange={(e) => handlePickCourse(line.id, e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option value="">Select course...</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Qty</label>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) =>
                            setItems((prev) => prev.map((l) => (l.id === line.id ? recalcLine({ ...l, quantity: Number(e.target.value) }) : l)))
                          }
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fee</label>
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) =>
                            setItems((prev) => prev.map((l) => (l.id === line.id ? recalcLine({ ...l, rate: Number(e.target.value) }) : l)))
                          }
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((l) => l.id !== line.id))}
                          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600"
                          title="Remove"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-300">Total</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{Number(total).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className={cn(
                  'px-5 py-2 rounded-xl font-semibold text-white',
                  saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {saving ? 'Saving...' : 'Save Admission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales
