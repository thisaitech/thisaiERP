import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash, Plus, CalendarBlank, User } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { createInvoice } from '../services/invoiceService'

const COURSES = [
  { id: '1', name: 'FULLSTACK AI', sellingPrice: 35000 },
  { id: '2', name: 'AI ENGINEER', sellingPrice: 25000 },
  { id: '3', name: 'UI/UX DESIGN AI', sellingPrice: 10000 },
  { id: '4', name: 'SPOKEN ENGLISH AI', sellingPrice: 10000 },
  { id: '5', name: 'VIBE CODING', sellingPrice: 15000 },
  { id: '6', name: 'AI & GEN AI', sellingPrice: 6000 },
  { id: '7', name: 'AI & GEN AI & PROMPT ENGINEERING', sellingPrice: 10000 },
  { id: '8', name: 'AI AUTOMATIONS', sellingPrice: 15000 },
  { id: '9', name: 'PYTHON WITH ML(AI)', sellingPrice: 15000 },
  { id: '10', name: 'BASIC COMPUTER COURSE', sellingPrice: 10000 },
  { id: '11', name: 'INTERNSHIP', sellingPrice: 4000 },
]

const COURSE_DURATIONS = ['1 Week', '2 Weeks', '1 Month', '45 Days', '2 Months', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years', 'Or More']

type LineItem = {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  rate: number
  amount: number
  duration: string
}

type StudentLike = {
  id?: string
  name?: string
  phone?: string
  email?: string
  address?: string
  admissionDetails?: {
    gender?: string
    dateOfBirth?: string
    emergencyContact?: {
      name?: string
      phone?: string
    }
  }
}

type Props = {
  open: boolean
  onClose: () => void
  student: StudentLike | null
  existingInvoices?: any[]
  onSaved?: () => void
}

const todayISO = () => new Date().toISOString().split('T')[0]

const newLine = (): LineItem => ({
  id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'Course',
  rate: 0,
  amount: 0,
  duration: '1 Month',
})

const getSafeYear = (dateValue?: string) => {
  if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return Number(dateValue.slice(0, 4)) || new Date().getFullYear()
  }
  return new Date().getFullYear()
}

const genAdmissionNo = (existingInvoices: any[] = [], dateValue?: string) => {
  const year = getSafeYear(dateValue)
  let maxSeq = 0
  for (const inv of existingInvoices) {
    const invoiceNo = String(inv?.invoiceNumber || '').trim()
    const match = invoiceNo.match(/^ADM-(\d{4})-(\d{1,6})$/i)
    if (!match) continue
    if (Number(match[1]) !== year) continue
    maxSeq = Math.max(maxSeq, Number(match[2]) || 0)
  }
  return `ADM-${year}-${String(maxSeq + 1).padStart(2, '0')}`
}

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors'

const AddAdmissionModal = ({ open, onClose, student, existingInvoices = [], onSaved }: Props) => {
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [invoiceNumber, setInvoiceNumber] = useState(genAdmissionNo(existingInvoices, todayISO()))
  const [paidAmount, setPaidAmount] = useState('0')
  const [items, setItems] = useState<LineItem[]>([newLine()])
  const [saving, setSaving] = useState(false)
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  const studentName = (student?.name || 'Student').trim()
  const studentPhone = student?.phone || ''

  // Reset form whenever the modal opens for a (new) student.
  useEffect(() => {
    if (open) {
      const d = todayISO()
      setInvoiceDate(d)
      setInvoiceNumber(genAdmissionNo(existingInvoices, d))
      setPaidAmount('0')
      setItems([newLine()])
      setSaving(false)
      setGender(student?.admissionDetails?.gender || '')
      setDateOfBirth(student?.admissionDetails?.dateOfBirth || '')
      setAddress(student?.address || '')
      setParentName(student?.admissionDetails?.emergencyContact?.name || '')
      setParentPhone(String(student?.admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id])

  const total = useMemo(() => items.reduce((s, l) => s + (Number(l.amount) || 0), 0), [items])

  const recalc = (line: LineItem): LineItem => {
    const rate = Number(line.rate) || 0
    return { ...line, quantity: 1, rate, amount: rate }
  }

  const pickCourse = (lineId: string, courseId: string) => {
    const course = COURSES.find((c) => c.id === courseId)
    setItems((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? recalc({
              ...l,
              itemId: course?.id || '',
              itemName: course?.name || '',
              rate: Number(course?.sellingPrice ?? l.rate) || 0,
            })
          : l
      )
    )
  }

  const handleSave = async () => {
    if (!student) return
    if (!invoiceDate) return toast.error('Date is required')
    if (paidAmount.trim() === '' || Number.isNaN(Number(paidAmount))) return toast.error('Paid Amount is required')

    const lines = items.map(recalc)
    if (!lines.some((l) => l.itemId && l.itemName.trim())) return toast.error('Please select a course')
    for (const l of lines) {
      if (!l.itemId || !l.itemName.trim()) return toast.error('Please select a course for every row')
      if (!(Number(l.amount) > 0)) return toast.error('Please enter a fee greater than 0 for every course')
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const paidAmountNumber = Math.max(0, Number(paidAmount || 0))
      const cleanItems = lines.map((l) => ({ ...l, unit: l.unit || 'Course' }))
      const payload: any = {
        type: 'sale',
        invoiceNumber: invoiceNumber.trim() || genAdmissionNo(existingInvoices, invoiceDate),
        invoiceDate,
        partyId: student.id || '',
        partyName: studentName,
        phone: studentPhone,
        email: student.email || '',
        address: address.trim(),
        gender: gender.trim(),
        dateOfBirth: dateOfBirth.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        items: cleanItems,
        subtotal: total,
        total,
        grandTotal: total,
        paidAmount: Math.min(paidAmountNumber, total),
        status: paidAmountNumber >= total ? 'paid' : paidAmountNumber > 0 ? 'partial' : 'pending',
        notes: '',
        createdAt: now,
        updatedAt: now,
      }
      await createInvoice(payload)
      toast.success('Admission saved')
      onSaved?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save admission')
    } finally {
      setSaving(false)
    }
  }

  const chevron = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Admission</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">For {studentName}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Admission Details */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Admission Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Admission No</label>
                      <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={cn(inputClass, 'mt-1')} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
                      <div className="relative mt-1">
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className={cn(inputClass, 'pr-10 cursor-pointer')}
                        />
                        <CalendarBlank size={16} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Paid Amount</label>
                      <input
                        type="number"
                        min={0}
                        value={paidAmount}
                        onFocus={() => { if (paidAmount === '0') setPaidAmount('') }}
                        onBlur={() => { if (paidAmount.trim() === '') setPaidAmount('0') }}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                  </div>
                </section>

                {/* Student (read-only) */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Student</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <User size={18} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{studentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{studentPhone || 'No phone'}</p>
                    </div>
                  </div>
                </section>

                {/* Additional Information (optional) */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Additional Information</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Optional — you can skip these and still save admission</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gender</label>
                      <div className="relative mt-1">
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className={cn(inputClass, 'appearance-none pr-8')}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {chevron}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date of Birth</label>
                      <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={cn(inputClass, 'mt-1')} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address</label>
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Address" className={cn(inputClass, 'mt-1 resize-none')} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Parent / Guardian Name</label>
                      <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Parent or guardian name" className={cn(inputClass, 'mt-1')} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Parent Mobile Number</label>
                      <input
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                  </div>
                </section>

                {/* Courses */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Course Details</h4>
                  {items.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Course</label>
                        <div className="relative">
                          <select value={line.itemId} onChange={(e) => pickCourse(line.id, e.target.value)} className={cn(inputClass, 'appearance-none pr-8 truncate')}>
                            <option value="">Select course...</option>
                            {COURSES.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {chevron}
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Duration</label>
                        <div className="relative">
                          <select
                            value={line.duration}
                            onChange={(e) => setItems((prev) => prev.map((l) => (l.id === line.id ? { ...l, duration: e.target.value } : l)))}
                            className={cn(inputClass, 'appearance-none pr-8 truncate')}
                          >
                            {COURSE_DURATIONS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          {chevron}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fee</label>
                        <input
                          type="number"
                          value={line.rate === 0 ? '' : line.rate}
                          onChange={(e) => setItems((prev) => prev.map((l) => (l.id === line.id ? recalc({ ...l, rate: Number(e.target.value || 0) }) : l)))}
                          className={cn(inputClass, 'mt-1')}
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== line.id) : prev))}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                          title="Remove"
                        >
                          <Trash size={16} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setItems((prev) => [...prev, newLine()])}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium"
                  >
                    <Plus size={16} weight="bold" /> Add Course
                  </button>

                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Total</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{Number(total).toLocaleString('en-IN')}</span>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:brightness-95">
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className={cn('px-5 py-2 rounded-xl font-semibold text-white', saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700')}
                >
                  {saving ? 'Saving...' : 'Save Admission'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AddAdmissionModal
