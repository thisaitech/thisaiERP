import React, { useEffect, useMemo, useState } from 'react'
import { CurrencyInr, Eye, Pencil, Plus, Trash, Users, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { createParty, getParties, updateParty } from '../services/partyService'
import { getItems } from '../services/itemService'
import { createInvoice, deleteInvoice, getInvoices, updateInvoice } from '../services/invoiceService'
import MobilePageScaffold from '../components/mobile/MobilePageScaffold'
import MobileStatCards from '../components/mobile/MobileStatCards'
import MobileSearchBar from '../components/mobile/MobileSearchBar'
import MobileListCard from '../components/mobile/MobileListCard'
import MobileActionMenu from '../components/mobile/MobileActionMenu'
import MobileBottomSheet from '../components/mobile/MobileBottomSheet'
import MobileFormSection from '../components/mobile/MobileFormSection'
import MobileStickyCTA from '../components/mobile/MobileStickyCTA'

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
  itemId: 'address',
  itemName: '',
  quantity: 1,
  unit: 'Address',
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
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [admissionSearch, setAdmissionSearch] = useState('')
  const [editingAdmissionId, setEditingAdmissionId] = useState('')
  const [editingPartyId, setEditingPartyId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(genAdmissionNo())
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [items, setItems] = useState<AdmissionItem[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [paidAmount, setPaidAmount] = useState<string>('0')
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )
  const isViewMode = formMode === 'view'
  const modalTitle = formMode === 'create' ? 'New Admission' : formMode === 'edit' ? 'Edit Admission' : 'View Admission'
  const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0), [items])

  const load = async () => {
    setLoading(true)
    try {
      const [inv, st, co] = await Promise.all([getInvoices('sale'), getParties('both'), getItems()])
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
    setFormMode('create')
    setEditingAdmissionId('')
    setEditingPartyId('')
    setInvoiceNumber(genAdmissionNo())
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setStudentSearch('')
    setSelectedStudentId('')
    setShowStudentSuggestions(false)
    setPhone('')
    setEmail('')
    setItems([newLine()])
    setNotes('')
    setPaidAmount('0')
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
  }

  const normalizeStudentName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
  const normalizePhone = (value: string) => value.replace(/\D/g, '')

  const findMatchingStudent = (nameValue: string, phoneValue: string): Student | null => {
    const searchName = normalizeStudentName(nameValue)
    const searchPhone = normalizePhone(phoneValue)
    if (!searchName && !searchPhone) return null

    const exact = students.find((s) => {
      const studentName = normalizeStudentName(String(s.name || s.companyName || ''))
      const studentPhone = normalizePhone(String(s.phone || ''))
      const sameName = searchName.length > 0 && studentName === searchName
      const samePhone =
        searchPhone.length > 0 &&
        studentPhone.length > 0 &&
        (studentPhone === searchPhone || studentPhone.endsWith(searchPhone) || searchPhone.endsWith(studentPhone))
      return sameName || samePhone
    })
    if (exact) return exact

    if (!searchName) return null
    const prefixMatches = students.filter((s) => {
      const studentName = normalizeStudentName(String(s.name || s.companyName || ''))
      return studentName.startsWith(searchName)
    })
    return prefixMatches.length === 1 ? prefixMatches[0] : null
  }

  const recalcLine = (line: AdmissionItem): AdmissionItem => {
    const qty = 1
    const rate = Number(line.rate) || 0
    return { ...line, quantity: qty, rate, amount: qty * rate }
  }

  const openExisting = (inv: any, mode: 'edit' | 'view') => {
    setFormMode(mode)
    setEditingAdmissionId(inv.id || '')
    setInvoiceNumber(inv.invoiceNumber || genAdmissionNo())
    setInvoiceDate(((inv.invoiceDate || inv.date || inv.createdAt || '').toString()).slice(0, 10) || new Date().toISOString().split('T')[0])

    const invName = String(inv.partyName || '').trim().toLowerCase()
    const invPhone = String(inv.phone || '').replace(/\D/g, '')
    const linkedStudent =
      students.find((s) => {
        if (inv.partyId && s.id === inv.partyId) return true
        const studentName = String(s.name || s.companyName || '').trim().toLowerCase()
        const studentPhone = String(s.phone || '').replace(/\D/g, '')
        const sameName = invName.length > 0 && studentName === invName
        const samePhone =
          invPhone.length > 0 &&
          studentPhone.length > 0 &&
          (studentPhone === invPhone || studentPhone.endsWith(invPhone) || invPhone.endsWith(studentPhone))
        return sameName || samePhone
      }) || null
    setEditingPartyId(inv.partyId || linkedStudent?.id || '')

    if (linkedStudent) {
      setSelectedStudentId(linkedStudent.id)
      setStudentSearch('')
      setShowStudentSuggestions(false)
      setPhone(inv.phone || linkedStudent.phone || '')
      setEmail(inv.email || linkedStudent.email || '')
    } else {
      setSelectedStudentId('')
      setStudentSearch(inv.partyName || '')
      setShowStudentSuggestions(false)
      setPhone(inv.phone || '')
      setEmail(inv.email || '')
    }

    const mappedItems: AdmissionItem[] = Array.isArray(inv.items)
      ? inv.items.map((it: any, idx: number) => {
          const match = courses.find((c) => c.id === it.itemId || (it.itemName && c.name === it.itemName) || (it.name && c.name === it.name))
          const quantity = Number(it.quantity ?? it.qty ?? 1) || 1
          const rate = Number(it.rate ?? it.price ?? match?.sellingPrice ?? 0) || 0
          return recalcLine({
            id: `line_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            itemId: it.itemId || match?.id || '',
            itemName: it.itemName || it.name || match?.name || '',
            quantity,
            unit: it.unit || match?.unit || 'Course',
            rate,
            amount: Number(it.amount ?? quantity * rate) || quantity * rate,
          })
        })
      : []

    setItems(mappedItems.length > 0 ? mappedItems : [newLine()])
    setNotes(inv.notes || '')
    setPaidAmount(String(Number(inv.paidAmount || 0)))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (isViewMode) {
      setShowForm(false)
      return
    }

    const typedStudentName = (selectedStudent?.name || selectedStudent?.companyName || studentSearch || '').trim()
    let admissionStudentId = selectedStudentId
    let admissionStudent: Student | null = selectedStudent

    if (!admissionStudentId) {
      if (!typedStudentName) return toast.error('Please select or enter a student name')

      const inferredStudent = findMatchingStudent(typedStudentName, phone)
      if (inferredStudent) {
        admissionStudentId = inferredStudent.id
        admissionStudent = inferredStudent
        setEditingPartyId(inferredStudent.id)
        setSelectedStudentId(inferredStudent.id)
      } else if (formMode === 'edit') {
        admissionStudentId = editingPartyId || ''
      } else {
        try {
          const now = new Date().toISOString()
          const newStudent = await createParty({
            id: '',
            type: 'customer' as any,
            name: typedStudentName,
            companyName: typedStudentName,
            displayName: typedStudentName,
            phone: phone.trim(),
            email: email.trim(),
            contacts: [],
            billingAddress: { street: '', city: '', state: '', pinCode: '', country: 'India' },
            sameAsShipping: true,
            openingBalance: 0,
            currentBalance: 0,
            paymentTerms: 'Regular',
            createdBy: userData?.displayName || 'Admissions',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          } as any)
          admissionStudentId = newStudent.id
          admissionStudent = newStudent as any
          setSelectedStudentId(newStudent.id)
          setStudents((prev) => [newStudent as any, ...prev.filter((s) => s.id !== newStudent.id)])
        } catch (e: any) {
          return toast.error(e?.message || 'Failed to create student')
        }
      }
    }

    const cleanItems = items
      .map(recalcLine)
      .filter((l) => l.itemName.trim().length > 0 && l.quantity > 0)
      .map((l) => ({ ...l, itemId: l.itemId || 'address', unit: l.unit || 'Address' }))
    if (cleanItems.length === 0) return toast.error('Please enter address')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const paidAmountNumber = Math.max(0, Number(paidAmount || 0))
      const linkedStudentId = admissionStudentId || (formMode === 'edit' ? editingPartyId : '')
      if (formMode === 'edit' && linkedStudentId) {
        const studentNameForUpdate = typedStudentName || admissionStudent?.name || admissionStudent?.companyName || ''
        if (studentNameForUpdate) {
          await updateParty(linkedStudentId, {
            name: studentNameForUpdate,
            companyName: studentNameForUpdate,
            displayName: studentNameForUpdate,
            phone: phone.trim(),
            email: email.trim(),
            updatedAt: now,
          } as any)
          setStudents((prev) =>
            prev.map((s) =>
              s.id === linkedStudentId
                ? { ...s, name: studentNameForUpdate, companyName: studentNameForUpdate, phone: phone.trim(), email: email.trim() }
                : s
            )
          )
        }
      }

      const payload: any = {
        type: 'sale',
        invoiceNumber,
        invoiceDate,
        partyId: linkedStudentId || admissionStudentId,
        partyName: admissionStudent?.name || admissionStudent?.companyName || typedStudentName || 'Student',
        phone: phone || admissionStudent?.phone || '',
        email: email || admissionStudent?.email || '',
        items: cleanItems,
        subtotal: total,
        total,
        grandTotal: total,
        paidAmount: Math.min(paidAmountNumber, total),
        status: paidAmountNumber >= total ? 'paid' : paidAmountNumber > 0 ? 'partial' : 'pending',
        notes,
        updatedAt: now,
        createdByUserId: userData?.uid || '',
      }

      if (formMode === 'edit' && editingAdmissionId) {
        const ok = await updateInvoice(editingAdmissionId, payload)
        if (!ok) throw new Error('Admission not found')
        toast.success('Admission updated')
      } else {
        await createInvoice({ ...payload, createdAt: now })
        toast.success('Admission saved')
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || (formMode === 'edit' ? 'Failed to update admission' : 'Failed to save admission'))
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
    return students.filter((s) => `${s.name || s.companyName || ''} ${s.phone || ''}`.toLowerCase().includes(q)).slice(0, 20)
  }, [students, studentSearch])

  const filteredInvoices = useMemo(() => {
    const q = admissionSearch.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((inv) =>
      `${inv.invoiceNumber || ''} ${inv.partyName || ''} ${inv.phone || ''}`.toLowerCase().includes(q)
    )
  }, [invoices, admissionSearch])

  const totalAdmissionsAmount = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || inv.grandTotal || 0), 0),
    [filteredInvoices]
  )
  const totalPaidAmount = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0),
    [filteredInvoices]
  )

  const inputClass = (mobile: boolean) =>
    mobile ? 'mobile-control' : 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'

  const formFields = (mobile: boolean) => (
    <div className="space-y-4">
      <MobileFormSection title="Admission Details">
        <div className={cn('grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Admission No</label>
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} disabled={isViewMode} className={inputClass(mobile)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={isViewMode} className={inputClass(mobile)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Paid Amount</label>
            <input
              type="number"
              min={0}
              value={paidAmount}
              onFocus={() => {
                if (paidAmount === '0') setPaidAmount('')
              }}
              onBlur={() => {
                if (paidAmount.trim() === '') setPaidAmount('0')
              }}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={isViewMode}
              className={inputClass(mobile)}
            />
          </div>
        </div>
      </MobileFormSection>

      <MobileFormSection title="Student">
        <div className={cn('grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
          <div className="relative">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Student</label>
            <input
              value={selectedStudent ? (selectedStudent.name || selectedStudent.companyName || '') : studentSearch}
              onChange={(e) => {
                const value = e.target.value
                setStudentSearch(value)
                setSelectedStudentId('')
                setShowStudentSuggestions(value.trim().length > 0)
              }}
              onFocus={() => {
                if (!isViewMode && !selectedStudentId && studentSearch.trim().length > 0) {
                  setShowStudentSuggestions(true)
                }
              }}
              onBlur={() => {
                window.setTimeout(() => setShowStudentSuggestions(false), 120)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
                  setShowStudentSuggestions(false)
                }
              }}
              placeholder="Search student..."
              disabled={isViewMode}
              className={inputClass(mobile)}
            />
            {!isViewMode && !selectedStudentId && showStudentSuggestions && studentSearch.trim().length > 0 && filteredStudents.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id)
                      setStudentSearch('')
                      setShowStudentSuggestions(false)
                      setPhone(s.phone || '')
                      setEmail(s.email || '')
                    }}
                    className={cn('w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60', 'flex items-center justify-between gap-3')}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{s.name || s.companyName || 'Student'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.phone || ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={cn('grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => setShowStudentSuggestions(false)}
                disabled={isViewMode}
                className={inputClass(mobile)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setShowStudentSuggestions(false)}
                disabled={isViewMode}
                className={inputClass(mobile)}
              />
            </div>
          </div>
        </div>
      </MobileFormSection>

      <MobileFormSection title="Address" subtitle="Enter your address">
        <div className="space-y-3">
          {items.slice(0, 1).map((line) => (
            <div key={line.id} className={cn('grid gap-3 items-end', mobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12')}>
              <div className={mobile ? '' : 'md:col-span-8'}>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address</label>
                <input
                  type="text"
                  value={line.itemName}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((l) =>
                        l.id === line.id ? recalcLine({ ...l, itemId: 'address', itemName: e.target.value, unit: 'Address' }) : l
                      )
                    )
                  }
                  placeholder="Enter your address"
                  disabled={isViewMode}
                  className={inputClass(mobile)}
                />
              </div>
              <div className={mobile ? '' : 'md:col-span-4'}>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fee</label>
                <input
                  type="number"
                  value={line.rate}
                  onChange={(e) => setItems((prev) => prev.map((l) => (l.id === line.id ? recalcLine({ ...l, rate: Number(e.target.value) }) : l)))}
                  disabled={isViewMode}
                  className={inputClass(mobile)}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
            <div className="text-sm text-slate-600 dark:text-slate-300">Total</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">Rs {Number(total).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </MobileFormSection>

      <MobileFormSection title="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={mobile ? 4 : 3} disabled={isViewMode} className={inputClass(mobile)} />
      </MobileFormSection>
    </div>
  )

  const footerActions = (
    <>
      <button onClick={() => setShowForm(false)} className="mobile-secondary-btn">
        {isViewMode ? 'Close' : 'Cancel'}
      </button>
      {!isViewMode && (
        <button disabled={saving} onClick={handleSave} className={cn('mobile-primary-btn', saving && 'opacity-70 pointer-events-none')}>
          {saving ? (formMode === 'edit' ? 'Updating...' : 'Saving...') : (formMode === 'edit' ? 'Update Admission' : 'Save Admission')}
        </button>
      )}
    </>
  )

  return (
    <div className="erp-module-page p-3 md:p-6">
      <MobilePageScaffold
        title="Admissions"
        subtitle="Create and manage admissions"
        className="md:hidden"
        actions={
          <button onClick={openNew} className="mobile-primary-btn">
            <Plus size={16} weight="bold" />
            New
          </button>
        }
      >
        <MobileStatCards
          items={[
            { id: 'count', title: 'Admissions', value: `${filteredInvoices.length}`, subtitle: 'Records', icon: <Users size={18} weight="bold" className="text-blue-600" />, tone: 'primary' },
            { id: 'value', title: 'Total Amount', value: `Rs ${totalAdmissionsAmount.toLocaleString('en-IN')}`, subtitle: `Paid Rs ${totalPaidAmount.toLocaleString('en-IN')}`, icon: <CurrencyInr size={18} weight="bold" className="text-emerald-600" />, tone: 'success' },
          ]}
        />
        <MobileSearchBar value={admissionSearch} onChange={setAdmissionSearch} placeholder="Search by admission, student or phone" />
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading admissions...</p>}
          {!loading &&
            filteredInvoices.slice(0, 40).map((inv) => (
              <MobileListCard
                key={inv.id}
                title={inv.partyName || 'Student'}
                subtitle={inv.invoiceNumber || inv.id}
                fields={[
                  { id: 'date', label: 'Date', value: (inv.invoiceDate || inv.createdAt || '').slice(0, 10) },
                  { id: 'phone', label: 'Phone', value: inv.phone || '-' },
                  { id: 'total', label: 'Total', value: `Rs ${Number(inv.total || inv.grandTotal || 0).toLocaleString('en-IN')}` },
                  { id: 'paid', label: 'Paid', value: `Rs ${Number(inv.paidAmount || 0).toLocaleString('en-IN')}` },
                ]}
                status={
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase', inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                    {inv.status || 'pending'}
                  </span>
                }
                actions={
                  <MobileActionMenu
                    actions={[
                      { id: 'view', label: 'View', icon: <Eye size={14} />, onClick: () => openExisting(inv, 'view') },
                      { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: () => openExisting(inv, 'edit') },
                      { id: 'delete', label: 'Delete', icon: <Trash size={14} />, tone: 'danger', onClick: () => handleDelete(inv.id) },
                    ]}
                  />
                }
              />
            ))}
          {!loading && filteredInvoices.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No admissions found</div>}
        </div>
      </MobilePageScaffold>

      <div className="hidden md:block w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Admissions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage admissions</p>
          </div>
          <button onClick={openNew} className="erp-module-primary-btn">
            <Plus size={18} weight="bold" />
            New Admission
          </button>
        </div>

        <div className="erp-module-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Admissions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{loading ? 'Loading...' : `${invoices.length} record(s)`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="erp-module-table-header bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
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
                    <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">Rs {Number(inv.total || inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">Rs {Number(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button onClick={() => openExisting(inv, 'view')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" title="View"><Eye size={16} /></button>
                        <button onClick={() => openExisting(inv, 'edit')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(inv.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && !loading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={6}>No admissions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && !isMobileViewport && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-800 dark:text-slate-100">{modalTitle}</div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="p-5 max-h-[68vh] overflow-auto">{formFields(false)}</div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">{isViewMode ? 'Close' : 'Cancel'}</button>
              {!isViewMode && (
                <button disabled={saving} onClick={handleSave} className={cn('px-5 py-2 rounded-xl font-semibold text-white', saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700')}>
                  {saving ? (formMode === 'edit' ? 'Updating...' : 'Saving...') : (formMode === 'edit' ? 'Update Admission' : 'Save Admission')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobileViewport && (
        <MobileBottomSheet open={showForm} title={modalTitle} subtitle="Admission entry" onClose={() => setShowForm(false)} footer={<MobileStickyCTA>{footerActions}</MobileStickyCTA>}>
          {formFields(true)}
        </MobileBottomSheet>
      )}
    </div>
  )
}

export default Sales
