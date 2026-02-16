import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash, ArrowRight, X, Calendar, MagnifyingGlass, TrendUp, CheckCircle, Clock, FileText } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { getPartiesWithOutstanding } from '../services/partyService'
import { getItems } from '../services/itemService'
import { getPartyName } from '../utils/partyUtils'
import {
  createQuotation,
  deleteQuotation,
  getQuotations,
  updateQuotation,
  generateQuotationNumber,
  type Quotation,
  type QuotationItem
} from '../services/quotationService'

const buildEmptyItem = (): QuotationItem => ({
  id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  description: '',
  quantity: 1,
  unit: 'Course',
  rate: 0,
  amount: 0,
  taxRate: 0,
  tax: 0
})

const Quotations: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [openCourseDropdownId, setOpenCourseDropdownId] = useState<string | null>(null)
  const studentInputRef = useRef<HTMLInputElement | null>(null)
  const studentDropdownRef = useRef<HTMLDivElement | null>(null)
  const courseDropdownRef = useRef<HTMLDivElement | null>(null)
  const courseInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [studentDropdownRect, setStudentDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const [courseDropdownRect, setCourseDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'partial' | 'returned'>('all')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])

  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber())
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  })
  const [partyName, setPartyName] = useState('')
  const [partyId, setPartyId] = useState('')
  const [partyPhone, setPartyPhone] = useState('')
  const [partyEmail, setPartyEmail] = useState('')
  const [partyAddress, setPartyAddress] = useState('')
  const [partyCity, setPartyCity] = useState('')
  const [partyState, setPartyState] = useState('')
  const [items, setItems] = useState<QuotationItem[]>([buildEmptyItem()])
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)

  const loadQuotations = async () => {
    setLoading(true)
    try {
      const data = await getQuotations()
      setQuotations(data)
    } catch (error) {
      console.error('Failed to load quotations:', error)
      toast.error('Failed to load quotations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuotations().catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const partyData = await getPartiesWithOutstanding('both')
        if (mounted) setStudents(partyData || [])
      } catch (error) {
        console.error('Failed to load students:', error)
      }
      try {
        const itemData = await getItems()
        if (mounted) setCourses(itemData || [])
      } catch (error) {
        console.error('Failed to load courses:', error)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!showForm) return
    // Refresh dropdown data when the form opens to ensure latest students/courses appear.
    getPartiesWithOutstanding('both')
      .then((partyData) => setStudents(partyData || []))
      .catch((error) => console.error('Failed to refresh students:', error))
    getItems()
      .then((itemData) => setCourses(itemData || []))
      .catch((error) => console.error('Failed to refresh courses:', error))
  }, [showForm])

  // Student dropdown: position under input (portal) and close on outside click.
  useEffect(() => {
    if (!showStudentDropdown) {
      setStudentDropdownRect(null)
      return
    }

    const updatePosition = () => {
      const el = studentInputRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setStudentDropdownRect({ left: r.left, top: r.bottom, width: r.width })
    }

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      const inputEl = studentInputRef.current
      const ddEl = studentDropdownRef.current
      if (!target) return
      if (inputEl && inputEl.contains(target)) return
      if (ddEl && ddEl.contains(target)) return
      setShowStudentDropdown(false)
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', onDocMouseDown, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', onDocMouseDown, true)
    }
  }, [showStudentDropdown])

  // Course dropdown: position under active row input (portal) and close on outside click.
  useEffect(() => {
    if (!openCourseDropdownId) {
      setCourseDropdownRect(null)
      return
    }

    const updatePosition = () => {
      const el = courseInputRefs.current[openCourseDropdownId] || null
      if (!el) return
      const r = el.getBoundingClientRect()
      setCourseDropdownRect({ left: r.left, top: r.bottom, width: r.width })
    }

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      const inputEl = courseInputRefs.current[openCourseDropdownId] || null
      const ddEl = courseDropdownRef.current
      if (!target) return
      if (inputEl && inputEl.contains(target)) return
      if (ddEl && ddEl.contains(target)) return
      setOpenCourseDropdownId(null)
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', onDocMouseDown, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', onDocMouseDown, true)
    }
  }, [openCourseDropdownId])

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowForm(true)
    }
  }, [searchParams])

  const resetForm = () => {
    setQuotationNumber(generateQuotationNumber())
    setQuotationDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 15)
    setValidUntil(d.toISOString().split('T')[0])
    setPartyName('')
    setPartyId('')
    setPartyPhone('')
    setPartyEmail('')
    setPartyAddress('')
    setPartyCity('')
    setPartyState('')
    setItems([buildEmptyItem()])
    setNotes('')
    setDiscount(0)
  }

  const updateItem = (
    id: string,
    field: 'description' | 'quantity' | 'unit' | 'rate' | 'taxRate',
    value: string
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated: QuotationItem = { ...item }
      if (field === 'quantity' || field === 'rate' || field === 'taxRate') {
        updated[field] = Number(value) || 0
      } else {
        updated[field] = value
      }
      const qty = Number(updated.quantity) || 0
      const rate = Number(updated.rate) || 0
      const taxRate = Number(updated.taxRate) || 0
      const lineBase = qty * rate
      const tax = Math.round(lineBase * (taxRate / 100) * 100) / 100
      const amount = Math.round((lineBase + tax) * 100) / 100
      return {
        ...updated,
        quantity: qty,
        rate,
        taxRate,
        tax,
        amount
      }
    }))
  }

  const handleSelectStudent = (party: any) => {
    const name = getPartyName(party)
    const billing = party.billingAddress || {}
    setPartyId(party.id || '')
    setPartyName(name)
    setPartyPhone(party.phone || '')
    setPartyEmail(party.email || '')
    setPartyAddress(billing.street || party.address || '')
    setPartyCity(billing.city || party.city || '')
    setPartyState(billing.state || party.state || '')
    setShowStudentDropdown(false)
  }

  const handleSelectCourse = (itemId: string, course: any) => {
    const rate = Number(course.sellingPrice ?? course.mrp ?? 0) || 0
    const taxRate = Number(course.tax?.gstRate ?? course.tax?.igst ?? ((course.tax?.cgst || 0) + (course.tax?.sgst || 0)) ?? 0) || 0
    const unit = course.unit || 'Course'
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const qty = Number(item.quantity) || 0
      const lineBase = qty * rate
      const tax = Math.round(lineBase * (taxRate / 100) * 100) / 100
      const amount = Math.round((lineBase + tax) * 100) / 100
      return {
        ...item,
        description: course.name || course.description || '',
        unit,
        rate,
        taxRate,
        tax,
        amount
      }
    }))
    setOpenCourseDropdownId(null)
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0)
    const taxAmount = items.reduce((sum, item) => sum + (Number(item.tax) || 0), 0)
    const grandTotal = Math.max(subtotal + taxAmount - (discount || 0), 0)
    return {
      subtotal,
      taxAmount,
      grandTotal
    }
  }, [items, discount])

  const periodFilteredQuotations = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 6)
    const monthAgo = new Date(now)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const yearAgo = new Date(now)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)

    return quotations.filter((q) => {
      const qDate = String(q.quotationDate || q.createdAt || '').split('T')[0]
      if (!qDate) return false

      if (periodFilter === 'today') return qDate === today
      if (periodFilter === 'week') return qDate >= weekAgo.toISOString().split('T')[0]
      if (periodFilter === 'month') return qDate >= monthAgo.toISOString().split('T')[0]
      if (periodFilter === 'year') return qDate >= yearAgo.toISOString().split('T')[0]
      if (periodFilter === 'custom') return qDate === customDate
      return true
    })
  }, [quotations, periodFilter, customDate])

  const isPaidStatus = (q: Quotation) => q.status === 'converted'
  const isPendingStatus = (q: Quotation) => q.status === 'draft' || q.status === 'sent'
  const isPartialStatus = (q: Quotation) => q.status === 'accepted'
  const isReturnedStatus = (q: Quotation) => q.status === 'rejected' || q.status === 'expired'

  const filteredQuotations = useMemo(() => {
    return periodFilteredQuotations.filter((q) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        q.quotationNumber.toLowerCase().includes(query) ||
        q.partyName.toLowerCase().includes(query) ||
        String(q.partyPhone || '').toLowerCase().includes(query)

      if (!matchesSearch) return false
      if (statusFilter === 'all') return true
      if (statusFilter === 'paid') return isPaidStatus(q)
      if (statusFilter === 'pending') return isPendingStatus(q)
      if (statusFilter === 'partial') return isPartialStatus(q)
      if (statusFilter === 'returned') return isReturnedStatus(q)
      return true
    })
  }, [periodFilteredQuotations, searchQuery, statusFilter])

  const summary = useMemo(() => {
    const quotationAmount = periodFilteredQuotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0)
    const collectedAmount = periodFilteredQuotations.filter(isPaidStatus).reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0)
    const pendingAmount = periodFilteredQuotations.filter(isPendingStatus).reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0)
    const invoiceCount = periodFilteredQuotations.filter((q) => q.status === 'converted').length
    return { quotationAmount, collectedAmount, pendingAmount, invoiceCount }
  }, [periodFilteredQuotations])

  const statusCounts = useMemo(() => {
    return {
      all: periodFilteredQuotations.length,
      paid: periodFilteredQuotations.filter(isPaidStatus).length,
      pending: periodFilteredQuotations.filter(isPendingStatus).length,
      partial: periodFilteredQuotations.filter(isPartialStatus).length,
      returned: periodFilteredQuotations.filter(isReturnedStatus).length
    }
  }, [periodFilteredQuotations])

  const formatCurrency = (value: number) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleSave = async () => {
    if (!partyName.trim()) {
      toast.error('Please enter student name')
      return
    }

    const validItems = items.filter(item => item.description.trim())
    if (validItems.length === 0) {
      toast.error('Add at least one course/service')
      return
    }

    setSaving(true)
    try {
      const quotationData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> = {
        quotationNumber,
        quotationDate,
        validUntil,
        status: 'draft',
        partyId: partyId || '',
        partyName: partyName.trim(),
        partyGSTIN: '',
        partyPhone: partyPhone.trim() || undefined,
        partyEmail: partyEmail.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        partyCity: partyCity.trim() || undefined,
        partyState: partyState.trim() || undefined,
        partyStateCode: '',
        items: validItems,
        subtotal: totals.subtotal,
        discount: discount || 0,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        notes: notes.trim() || undefined,
        termsAndConditions: '',
        paymentTerms: '',
        createdBy: 'system'
      }

      await createQuotation(quotationData)
      toast.success('Quotation created')
      resetForm()
      setShowForm(false)
      await loadQuotations()
    } catch (error) {
      console.error('Failed to create quotation:', error)
      toast.error('Failed to create quotation')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this quotation?')) return
    try {
      await deleteQuotation(id)
      toast.success('Quotation deleted')
      await loadQuotations()
    } catch (error) {
      console.error('Failed to delete quotation:', error)
      toast.error('Failed to delete quotation')
    }
  }

  const handleConvert = async (quotation: Quotation) => {
    try {
      const convertedInvoice = {
        invoiceNumber: quotation.quotationNumber,
        partyName: quotation.partyName,
        partyPhone: quotation.partyPhone,
        partyEmail: quotation.partyEmail,
        partyGSTIN: quotation.partyGSTIN,
        partyState: quotation.partyState,
        items: quotation.items.map(item => ({
          id: item.id,
          name: item.description,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          taxRate: item.taxRate,
          taxAmount: item.tax,
          hsnCode: item.hsn || ''
        })),
        discount: quotation.discount || 0,
        notes: quotation.notes || ''
      }

      sessionStorage.setItem('converted_invoice', JSON.stringify(convertedInvoice))
      await updateQuotation(quotation.id, {
        status: 'converted',
        convertedDate: new Date().toISOString(),
        convertedToInvoiceId: convertedInvoice.invoiceNumber
      })
      navigate('/sales', { state: { convertedInvoice } })
    } catch (error) {
      console.error('Failed to convert quotation:', error)
      toast.error('Failed to convert quotation')
    }
  }

  const resolvedStudentRect =
    studentDropdownRect ||
    (() => {
      const el = studentInputRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.bottom, width: r.width }
    })() ||
    (showForm && showStudentDropdown ? { left: 16, top: 16, width: 420 } : null)

  const resolvedCourseRect =
    courseDropdownRect ||
    (() => {
      const id = openCourseDropdownId
      if (!id) return null
      const el = courseInputRefs.current[id] || null
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.bottom, width: r.width }
    })() ||
    (showForm && openCourseDropdownId ? { left: 16, top: 72, width: 520 } : null)

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-900 px-4 py-4">
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
          <div className="2xl:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border-2 border-emerald-400 bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-emerald-600">
                <TrendUp size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-600">Quotations</div>
                <div className="text-3xl font-bold text-slate-900">{formatCurrency(summary.quotationAmount)}</div>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-rose-400 bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-rose-600">
                <CheckCircle size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-rose-600">Collected</div>
                <div className="text-3xl font-bold text-slate-900">{formatCurrency(summary.collectedAmount)}</div>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-amber-400 bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-amber-600">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-600">Pending</div>
                <div className="text-3xl font-bold text-slate-900">{formatCurrency(summary.pendingAmount)}</div>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-sky-400 bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sky-600">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-sky-600">Invoice</div>
                <div className="text-3xl font-bold text-slate-900">{summary.invoiceCount}</div>
              </div>
            </div>
          </div>

          <div className="2xl:col-span-3 flex flex-col gap-2">
            <div className="flex justify-end">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} weight="bold" />
                Add
              </button>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-end gap-1 flex-wrap">
              {(['today', 'week', 'month', 'year', 'all', 'custom'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodFilter(period)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    periodFilter === period ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {period === 'today' ? 'Today' :
                   period === 'week' ? 'Week' :
                   period === 'month' ? 'Month' :
                   period === 'year' ? 'Year' :
                   period === 'all' ? 'All' : 'Custom'}
                </button>
              ))}
            </div>
            {periodFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="ml-auto w-44 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 flex flex-col xl:flex-row xl:items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice, customer, mobile..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap xl:justify-end">
            {([
              { key: 'all', label: 'All' },
              { key: 'paid', label: 'Paid' },
              { key: 'pending', label: 'Pending' },
              { key: 'partial', label: 'Partial' },
              { key: 'returned', label: 'Returned' }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === tab.key ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={`${statusCounts[tab.key]} records`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-4">
          {/* Debug panel (temporary): helps confirm dropdown state and loaded counts */}
          <div className="mb-3 text-[10px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>students: {students.length}</span>
            <span>courses: {courses.length}</span>
            <span>studentDropdown: {String(showStudentDropdown)}</span>
            <span>studentRect: {resolvedStudentRect ? 'yes' : 'no'}</span>
            <span>courseOpen: {openCourseDropdownId ? 'yes' : 'no'}</span>
            <span>courseRect: {resolvedCourseRect ? 'yes' : 'no'}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t.quotations.createNewQuotation}</h2>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="p-1.5 rounded-md hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium">Quote Number</label>
              <input
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Quote Date</label>
              <div className="relative mt-1">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{t.quotations.validUntil}</label>
              <div className="relative mt-1">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="text-xs font-medium">
                {t.quotations.customerDetails}
                <span className="ml-2 text-[10px] text-muted-foreground">({students.length})</span>
              </label>
              <div className="relative mt-1">
                <input
                  ref={studentInputRef}
                  value={partyName}
                  onChange={(e) => {
                    setPartyName(e.target.value)
                    setShowStudentDropdown(true)
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Student name"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{t.quotations.phoneNumber}</label>
              <input
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                placeholder="Phone"
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">{t.quotations.emailAddress}</label>
              <input
                value={partyEmail}
                onChange={(e) => setPartyEmail(e.target.value)}
                placeholder="Email"
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">{t.quotations.billingAddress}</label>
              <input
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                placeholder="Address"
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">City</label>
              <input
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
                placeholder="City"
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">State</label>
              <input
                value={partyState}
                onChange={(e) => setPartyState(e.target.value)}
                placeholder="State"
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                {t.quotations.addItems}
                <span className="ml-2 text-[10px] text-muted-foreground">({courses.length})</span>
              </h3>
              <button
                onClick={() => setItems(prev => [...prev, buildEmptyItem()])}
                className="text-xs text-primary font-semibold"
              >
                + Add Course
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="relative col-span-12 md:col-span-4">
                    <input
                      ref={(el) => {
                        courseInputRefs.current[item.id] = el
                      }}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                      placeholder="Course / Service"
                      value={item.description}
                      onChange={(e) => {
                        updateItem(item.id, 'description', e.target.value)
                        setOpenCourseDropdownId(item.id)
                      }}
                      onFocus={() => setOpenCourseDropdownId(item.id)}
                    />
                  </div>
                  <input
                    type="number"
                    className="col-span-6 md:col-span-2 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                  />
                  <input
                    className="col-span-6 md:col-span-2 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-6 md:col-span-2 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    placeholder="Fee"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-4 md:col-span-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    placeholder="Tax %"
                    value={item.taxRate}
                    onChange={(e) => updateItem(item.id, 'taxRate', e.target.value)}
                  />
                  <div className="col-span-6 md:col-span-1 text-right text-sm font-semibold">
                    ₹{item.amount.toFixed(2)}
                  </div>
                  <button
                    onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                    className="col-span-2 md:col-span-0 text-destructive"
                    title="Remove"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs font-medium">{t.quotations.notesOptional}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder={t.quotations.addNotes}
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-sm border border-border rounded-md bg-background text-right"
                />
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                <span>Total</span>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Quotation'}
            </button>
          </div>
        </div>
      )}

      {/* Student dropdown rendered in a portal to avoid overflow/z-index clipping */}
      {showForm && showStudentDropdown && resolvedStudentRect && createPortal(
        <div
          ref={studentDropdownRef}
          style={{
            position: 'fixed',
            left: resolvedStudentRect.left,
            top: resolvedStudentRect.top + 4,
            width: resolvedStudentRect.width,
            zIndex: 99999
          }}
          className="bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {(() => {
            const query = (partyName || '').toLowerCase()
            const matches = (students || [])
              .filter((student: any) => {
                if (student.type && !['customer', 'both'].includes(student.type)) return false
                const name = getPartyName(student).toLowerCase()
                return (
                  name.includes(query) ||
                  (student.phone || '').includes(partyName || '') ||
                  (student.email || '').toLowerCase().includes(query)
                )
              })
              .slice(0, 10)

            if ((students || []).length === 0) {
              return <div className="px-3 py-2 text-xs text-muted-foreground">No students found</div>
            }

            if (matches.length === 0) {
              return <div className="px-3 py-2 text-xs text-muted-foreground">No matching students</div>
            }

            return matches.map((student: any) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
              >
                <div className="text-sm font-medium">{getPartyName(student)}</div>
                <div className="text-xs text-muted-foreground">
                  {(student.phone || 'No phone')}
                  {student.email ? ` • ${student.email}` : ''}
                </div>
              </button>
            ))
          })()}
        </div>,
        document.body
      )}

      {/* Course dropdown rendered in a portal to avoid overflow/z-index clipping */}
      {showForm && openCourseDropdownId && resolvedCourseRect && createPortal(
        <div
          ref={courseDropdownRef}
          style={{
            position: 'fixed',
            left: resolvedCourseRect.left,
            top: resolvedCourseRect.top + 4,
            width: resolvedCourseRect.width,
            zIndex: 99999
          }}
          className="bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {(() => {
            const activeId = openCourseDropdownId
            const active = items.find(i => i.id === activeId)
            const query = (active?.description || '').toLowerCase()
            const matches = (courses || [])
              .filter((course: any) => {
                const name = (course.name || course.description || '').toLowerCase()
                return (
                  name.includes(query) ||
                  (course.itemCode || '').toLowerCase().includes(query) ||
                  (course.category || '').toLowerCase().includes(query)
                )
              })
              .slice(0, 10)

            if ((courses || []).length === 0) {
              return <div className="px-3 py-2 text-xs text-muted-foreground">No courses found</div>
            }

            if (matches.length === 0) {
              return <div className="px-3 py-2 text-xs text-muted-foreground">No matching courses</div>
            }

            return matches.map((course: any) => (
              <button
                key={course.id}
                onClick={() => handleSelectCourse(activeId, course)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{course.name || course.description}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {course.category || 'Course'} {course.itemCode ? ` • ${course.itemCode}` : ''}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    ₹{Number(course.sellingPrice ?? course.mrp ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </button>
            ))
          })()}
        </div>,
        document.body
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent Course Quotes</h2>
          <span className="text-xs text-muted-foreground">{filteredQuotations.length} shown</span>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {searchQuery || statusFilter !== 'all' || periodFilter !== 'all' ? 'No matching course quotes' : 'No course quotes yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredQuotations.map((quotation) => (
              <div
                key={quotation.id}
                className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{quotation.quotationNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                      {quotation.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {quotation.partyName} • {quotation.quotationDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">₹{(quotation.grandTotal || 0).toLocaleString('en-IN')}</span>
                  <button
                    onClick={() => handleConvert(quotation)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
                  >
                    Convert to Admission
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(quotation.id)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-destructive text-xs font-semibold"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Quotations
