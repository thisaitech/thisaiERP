import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarBlank, Eye, Pencil, Plus, Printer, Trash, Users, Wallet, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { createParty, getParties, updateParty } from '../services/partyService'
import { createInvoice, deleteInvoice, getInvoices, updateInvoice } from '../services/invoiceService'
import MobilePageScaffold from '../components/mobile/MobilePageScaffold'
import MobileStatCards from '../components/mobile/MobileStatCards'
import MobileSearchBar from '../components/mobile/MobileSearchBar'
import MobileListCard from '../components/mobile/MobileListCard'
import MobileActionMenu from '../components/mobile/MobileActionMenu'
import MobileBottomSheet from '../components/mobile/MobileBottomSheet'
import MobileFormSection from '../components/mobile/MobileFormSection'
import StudentDetailsModal from '../components/StudentDetailsModal'
import PeriodFilterDropdown, { type PeriodFilterValue } from '../components/PeriodFilterDropdown'
import { formatStatAmount, formatStatCount } from '../utils/formatStatAmount'
import { DEFAULT_COURSES } from '../constants/courses'

const HARDCODED_COURSES = DEFAULT_COURSES

type Student = {
  id: string
  name?: string
  companyName?: string
  phone?: string
  email?: string
  address?: string
  billingAddress?: {
    street?: string
    city?: string
    state?: string
    pinCode?: string
    country?: string
  }
  admissionDetails?: {
    gender?: string
    dateOfBirth?: string
    emergencyContact?: {
      name?: string
      phone?: string
    }
  }
}
type Course = { id: string; name: string; sellingPrice?: number; unit?: string }

type AdmissionItem = {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  rate: number
  amount: number
  duration: string
}

const COURSE_DURATIONS = ['1 Week', '2 Weeks', '1 Month', '45 Days', '2 Months', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years', 'Or More']

const newLine = (): AdmissionItem => ({
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

const Sales: React.FC = () => {
  const location = useLocation()
  const todayISO = new Date().toISOString().split('T')[0]
  const { userData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [viewingStudent, setViewingStudent] = useState<{ student: any; name: string; phone: string } | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [admissionSearch, setAdmissionSearch] = useState('')
  const [admissionPeriod, setAdmissionPeriod] = useState<PeriodFilterValue>('all')
  const [editingAdmissionId, setEditingAdmissionId] = useState('')
  const [editingPartyId, setEditingPartyId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayISO)
  const [invoiceNumber, setInvoiceNumber] = useState(genAdmissionNo([], todayISO))
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [items, setItems] = useState<AdmissionItem[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [paidAmount, setPaidAmount] = useState<string>('0')
  const [focusedFeeLineId, setFocusedFeeLineId] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768)
  const [showOptionalAddress, setShowOptionalAddress] = useState(false)
  const [showOptionalDob, setShowOptionalDob] = useState(false)
  const [showOptionalGender, setShowOptionalGender] = useState(false)
  const [showOptionalParent, setShowOptionalParent] = useState(false)
  const [showOptionalNotes, setShowOptionalNotes] = useState(false)

  const syncOptionalVisibility = (data: {
    address?: string
    dateOfBirth?: string
    gender?: string
    parentName?: string
    parentPhone?: string
    notes?: string
  }) => {
    setShowOptionalAddress(!!data.address?.trim())
    setShowOptionalDob(!!data.dateOfBirth?.trim())
    setShowOptionalGender(!!data.gender?.trim())
    setShowOptionalParent(!!(data.parentName?.trim() || data.parentPhone?.trim()))
    setShowOptionalNotes(!!data.notes?.trim())
  }

  const resetOptionalVisibility = () => {
    setShowOptionalAddress(false)
    setShowOptionalDob(false)
    setShowOptionalGender(false)
    setShowOptionalParent(false)
    setShowOptionalNotes(false)
  }

  useEffect(() => {
    if (location.state?.preselectPartyId && students.length > 0 && !selectedStudentId) {
      const p = students.find(s => String(s.id) === String(location.state.preselectPartyId))
      if (p) {
        setShowForm(true)
        setFormMode('create')
        setSelectedStudentId(p.id)
        setStudentSearch(p.name || p.companyName || '')
        setPhone(p.phone || '')
        setAddress(p.address || p.billingAddress?.street || '')
        setGender((p as any).admissionDetails?.gender || '')
        setDateOfBirth((p as any).admissionDetails?.dateOfBirth || '')
        setParentName((p as any).admissionDetails?.emergencyContact?.name || '')
        setParentPhone(String((p as any).admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10))
        syncOptionalVisibility({
          address: p.address || p.billingAddress?.street || '',
          dateOfBirth: (p as any).admissionDetails?.dateOfBirth || '',
          gender: (p as any).admissionDetails?.gender || '',
          parentName: (p as any).admissionDetails?.emergencyContact?.name || '',
          parentPhone: String((p as any).admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10),
        })
        // Clean up state so we don't re-trigger on refresh
        window.history.replaceState({}, '')
      }
    }
  }, [location.state, students, selectedStudentId])

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
      const [inv, st] = await Promise.all([getInvoices('sale'), getParties('both')])
      setInvoices(inv || [])
      setStudents(st as any)
      setCourses(HARDCODED_COURSES as any)
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
    const nextDate = new Date().toISOString().split('T')[0]
    setFormMode('create')
    setEditingAdmissionId('')
    setEditingPartyId('')
    setInvoiceDate(nextDate)
    setInvoiceNumber(genAdmissionNo(invoices, nextDate))
    setStudentSearch('')
    setSelectedStudentId('')
    setShowStudentSuggestions(false)
    setPhone('')
    setEmail('')
    setAddress('')
    setGender('')
    setDateOfBirth('')
    setParentName('')
    setParentPhone('')
    setItems([newLine()])
    setNotes('')
    setPaidAmount('0')
    setFocusedFeeLineId(null)
    resetOptionalVisibility()
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

  const handlePickCourse = (lineId: string, courseId: string) => {
    const selectedCourse = courses.find((c) => c.id === courseId)
    setItems((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line
        const nextLine = {
          ...line,
          itemId: selectedCourse?.id || '',
          itemName: selectedCourse?.name || '',
          unit: selectedCourse?.unit || 'Course',
          rate: Number(selectedCourse?.sellingPrice ?? line.rate) || 0,
        }
        return recalcLine(nextLine)
      })
    )
  }

  const handleRemoveCourseLine = (lineId: string) => {
    setItems((prev) => {
      const next = prev.filter((l) => l.id !== lineId)
      return next.length > 0 ? next : [newLine()]
    })
  }

  const openExisting = (inv: any, mode: 'edit' | 'view') => {
    const resolvedDate = ((inv.invoiceDate || inv.date || inv.createdAt || '').toString()).slice(0, 10) || new Date().toISOString().split('T')[0]
    setFormMode(mode)
    setEditingAdmissionId(inv.id || '')
    setInvoiceDate(resolvedDate)
    setInvoiceNumber(inv.invoiceNumber || genAdmissionNo(invoices, resolvedDate))

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
    const linkedStudentAddress = String(linkedStudent?.billingAddress?.street || linkedStudent?.address || '').trim()
    const invoiceAddress = String(inv?.address || inv?.partyAddress?.street || inv?.billingAddress?.street || '').trim()

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
    setAddress(invoiceAddress || linkedStudentAddress || '')
    setGender(inv.gender || inv.admissionDetails?.gender || linkedStudent?.admissionDetails?.gender || '')
    setDateOfBirth(inv.dateOfBirth || inv.admissionDetails?.dateOfBirth || linkedStudent?.admissionDetails?.dateOfBirth || '')
    setParentName(inv.parentName || inv.admissionDetails?.emergencyContact?.name || linkedStudent?.admissionDetails?.emergencyContact?.name || '')
    setParentPhone(String(inv.parentPhone || inv.admissionDetails?.emergencyContact?.phone || linkedStudent?.admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10))

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
            duration: it.duration || '1 Month',
          })
        })
      : []

    setItems(mappedItems.length > 0 ? mappedItems : [newLine()])
    setNotes(inv.notes || '')
    setPaidAmount(String(Number(inv.paidAmount || 0)))
    setFocusedFeeLineId(null)
    syncOptionalVisibility({
      address: invoiceAddress || linkedStudentAddress || '',
      dateOfBirth: inv.dateOfBirth || inv.admissionDetails?.dateOfBirth || linkedStudent?.admissionDetails?.dateOfBirth || '',
      gender: inv.gender || inv.admissionDetails?.gender || linkedStudent?.admissionDetails?.gender || '',
      parentName: inv.parentName || inv.admissionDetails?.emergencyContact?.name || linkedStudent?.admissionDetails?.emergencyContact?.name || '',
      parentPhone: String(inv.parentPhone || inv.admissionDetails?.emergencyContact?.phone || linkedStudent?.admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10),
      notes: inv.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (isViewMode) {
      setShowForm(false)
      return
    }

    // Validate all fields are filled before saving
    const studentNameToValidate = (selectedStudent?.name || selectedStudent?.companyName || studentSearch || '').trim()
    if (!invoiceNumber.trim()) return toast.error('Admission No is required')
    if (!invoiceDate) return toast.error('Date is required')
    if (paidAmount.trim() === '' || Number.isNaN(Number(paidAmount))) return toast.error('Paid Amount is required')
    if (!studentNameToValidate) return toast.error('Student Name is required')
    if (!/^\d{10}$/.test(phone.trim())) return toast.error('Enter a valid 10-digit phone number')

    const validationLines = items.map(recalcLine)
    if (!validationLines.some((l) => l.itemId && l.itemName.trim().length > 0)) {
      return toast.error('Please select a course')
    }
    for (const line of validationLines) {
      if (!line.itemId || !line.itemName.trim()) return toast.error('Please select a course for every row')
      if (!(Number(line.amount) > 0)) return toast.error('Please enter a fee greater than 0 for every course')
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
            billingAddress: { street: address.trim(), city: '', state: '', pinCode: '', country: 'India' },
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
      .filter((l) => l.itemId && l.itemName.trim().length > 0 && l.quantity > 0)
      .map((l) => ({ ...l, unit: l.unit || 'Course' }))
    if (cleanItems.length === 0) return toast.error('Please add at least 1 course')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const paidAmountNumber = Math.max(0, Number(paidAmount || 0))
      const linkedStudentId = admissionStudentId || (formMode === 'edit' ? editingPartyId : '')
      if (formMode === 'edit' && linkedStudentId) {
        const studentNameForUpdate = typedStudentName || admissionStudent?.name || admissionStudent?.companyName || ''
        const existingStudentRecord = students.find((s) => s.id === linkedStudentId)
        const existingBillingAddress = existingStudentRecord?.billingAddress || {}
        if (studentNameForUpdate) {
          await updateParty(linkedStudentId, {
            name: studentNameForUpdate,
            companyName: studentNameForUpdate,
            displayName: studentNameForUpdate,
            phone: phone.trim(),
            email: email.trim(),
            billingAddress: {
              street: address.trim(),
              city: existingBillingAddress.city || '',
              state: existingBillingAddress.state || '',
              pinCode: existingBillingAddress.pinCode || '',
              country: existingBillingAddress.country || 'India',
            },
            updatedAt: now,
          } as any)
          setStudents((prev) =>
            prev.map((s) =>
              s.id === linkedStudentId
                ? {
                    ...s,
                    name: studentNameForUpdate,
                    companyName: studentNameForUpdate,
                    phone: phone.trim(),
                    email: email.trim(),
                    billingAddress: {
                      ...(s.billingAddress || {}),
                      street: address.trim(),
                    },
                  }
                : s
            )
          )
        }
      }

      const payload: any = {
        type: 'sale',
        invoiceNumber: invoiceNumber.trim() || genAdmissionNo(invoices, invoiceDate),
        invoiceDate,
        partyId: linkedStudentId || admissionStudentId,
        partyName: admissionStudent?.name || admissionStudent?.companyName || typedStudentName || 'Student',
        phone: phone || admissionStudent?.phone || '',
        email: email || admissionStudent?.email || '',
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

  const openStudentDetails = (inv: any) => {
    const targetPhone = String(inv?.phone || '').replace(/\D/g, '')
    const targetName = String(inv?.partyName || '').toLowerCase().trim()
    const match = students.find((s: any) => {
      if (inv?.partyId && s.id) return s.id === inv.partyId
      const sName = String(s.name || s.companyName || '').toLowerCase().trim()
      const sPhone = String(s.phone || '').replace(/\D/g, '')
      return (targetName && sName === targetName) || (targetPhone && sPhone === targetPhone)
    })
    setViewingStudent({ student: match || null, name: inv?.partyName || 'Student', phone: inv?.phone || '' })
  }

  const handlePrint = (inv: any) => {
    const win = window.open('', '_blank', 'width=620,height=760')
    if (!win) {
      toast.error('Allow pop-ups to print')
      return
    }
    const rupee = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN')
    const lineRows = (Array.isArray(inv.items) ? inv.items : [])
      .map((it: any) => `<tr><td>${it.itemName || it.name || 'Course'}</td><td>${it.duration || '-'}</td><td style="text-align:right">${rupee(it.amount ?? (Number(it.quantity || 1) * Number(it.rate || 0)))}</td></tr>`)
      .join('')
    win.document.write(`
      <html>
        <head>
          <title>Admission ${inv.invoiceNumber || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            .muted { color: #64748b; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            td, th { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            td.label { color: #64748b; width: 40%; }
            td.value { font-weight: 600; text-align: right; }
            th { text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .total { font-size: 16px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Admission Receipt</h1>
          <div class="muted">${inv.invoiceNumber || inv.id || ''}</div>
          <table>
            <tr><td class="label">Date</td><td class="value">${(inv.invoiceDate || inv.createdAt || '').slice(0, 10)}</td></tr>
            <tr><td class="label">Student</td><td class="value">${inv.partyName || 'Student'}</td></tr>
            <tr><td class="label">Phone</td><td class="value">${inv.phone || '-'}</td></tr>
            <tr><td class="label">Status</td><td class="value">${inv.status || 'pending'}</td></tr>
          </table>
          <table>
            <thead><tr><th>Course</th><th>Duration</th><th style="text-align:right">Fee</th></tr></thead>
            <tbody>${lineRows || '<tr><td colspan="3">-</td></tr>'}</tbody>
          </table>
          <table>
            <tr><td class="label">Total</td><td class="value">${rupee(inv.total || inv.grandTotal || 0)}</td></tr>
            <tr><td class="label">Paid</td><td class="value">${rupee(inv.paidAmount || 0)}</td></tr>
            <tr><td class="label total">Balance</td><td class="value total">${rupee(Number(inv.total || inv.grandTotal || 0) - Number(inv.paidAmount || 0))}</td></tr>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students.slice(0, 20)
    return students.filter((s) => `${s.name || s.companyName || ''} ${s.phone || ''}`.toLowerCase().includes(q)).slice(0, 20)
  }, [students, studentSearch])

  const filteredInvoices = useMemo(() => {
    const q = admissionSearch.trim().toLowerCase()

    const matchesPeriod = (inv: any) => {
      if (admissionPeriod === 'all') return true
      const raw = inv.invoiceDate || inv.createdAt || ''
      const dateStr = String(raw).slice(0, 10)
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      const now = new Date()
      if (admissionPeriod === 'today') {
        return dateStr === now.toISOString().slice(0, 10)
      } else if (admissionPeriod === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo && d <= now
      } else if (admissionPeriod === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      } else if (admissionPeriod === 'year') {
        return d.getFullYear() === now.getFullYear()
      }
      return true
    }

    const matched = invoices.filter((inv) => {
      if (!matchesPeriod(inv)) return false
      if (!q) return true
      return `${inv.invoiceNumber || ''} ${inv.partyName || ''} ${inv.phone || ''}`.toLowerCase().includes(q)
    })

    // Deduplicate by invoice number — keep highest-status record to avoid
    // showing the same admission twice (once PENDING, once PAID) after an edit.
    const statusRank = (s: string) => s === 'paid' ? 2 : s === 'partial' ? 1 : 0
    const deduped = new Map<string, any>()
    for (const inv of matched) {
      const key = String(inv.invoiceNumber || inv.id || '').trim().toLowerCase()
      if (!key) continue
      const existing = deduped.get(key)
      if (!existing) {
        deduped.set(key, inv)
      } else {
        const invRank = statusRank(String(inv.status || ''))
        const existRank = statusRank(String(existing.status || ''))
        if (invRank > existRank) {
          deduped.set(key, inv)
        } else if (invRank === existRank) {
          const invTime = String(inv.updatedAt || inv.createdAt || '')
          const existTime = String(existing.updatedAt || existing.createdAt || '')
          if (invTime > existTime) deduped.set(key, inv)
        }
      }
    }
    return [...deduped.values()]
  }, [invoices, admissionSearch, admissionPeriod])

  const totalAdmissionsAmount = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || inv.grandTotal || 0), 0),
    [filteredInvoices]
  )
  const totalPaidAmount = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0),
    [filteredInvoices]
  )

  const recentInvoices = useMemo(() => {
    // filteredInvoices is already deduplicated — just sort by date and limit.
    return [...filteredInvoices]
      .sort((a, b) => {
        const dateA = String(a.invoiceDate || a.createdAt || '')
        const dateB = String(b.invoiceDate || b.createdAt || '')
        return dateB.localeCompare(dateA)
      })
      .slice(0, 40)
  }, [filteredInvoices])
  const uniqueCourses = useMemo(() => {
    const seenNames = new Set<string>()
    return courses.filter((course) => {
      const normalizedName = String(course.name || '').trim().toLowerCase()
      if (!normalizedName) return true
      if (seenNames.has(normalizedName)) return false
      seenNames.add(normalizedName)
      return true
    })
  }, [courses])

  useEffect(() => {
    if (!showForm || formMode !== 'create') return
    setInvoiceNumber(genAdmissionNo(invoices, invoiceDate))
  }, [showForm, formMode, invoices, invoiceDate])

  const inputClass = (mobile: boolean) =>
    mobile
      ? 'w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all'
      : 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

  const labelClass = (mobile: boolean) =>
    mobile ? 'text-sm font-medium mb-1.5 block' : 'text-xs font-semibold text-slate-600 dark:text-slate-300'

  const wrapSection = (mobile: boolean, title: string, children: React.ReactNode) => {
    if (mobile) return <div className="space-y-3">{children}</div>
    return <MobileFormSection title={title}>{children}</MobileFormSection>
  }

  const showNativeDatePicker = (input: HTMLInputElement | null) => {
    if (!input || isViewMode) return

    const showPicker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker
    if (!showPicker) return

    try {
      showPicker.call(input)
    } catch {
      // Some browsers only allow showPicker from a direct user gesture.
    }
  }

  const formFields = (mobile: boolean) => (
    <div className={mobile ? 'space-y-4' : 'space-y-4'}>
      {wrapSection(mobile, 'Admission Details', (
        <div className={cn('grid gap-3', mobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3')}>
          <div>
            <label className={labelClass(mobile)}>Admission No</label>
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} disabled={isViewMode} className={inputClass(mobile)} />
          </div>
          <div>
            <label className={labelClass(mobile)}>Date</label>
            <div className="relative">
              <input
                id="admission-date-input"
                type="date"
                value={invoiceDate}
                onClick={(e) => showNativeDatePicker(e.currentTarget)}
                onFocus={(e) => showNativeDatePicker(e.currentTarget)}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={isViewMode}
                className={cn(inputClass(mobile), !isViewMode && 'cursor-pointer pr-11')}
              />
              {!isViewMode && (
                <button
                  type="button"
                  aria-label="Open date picker"
                  onClick={() => {
                    const input = document.getElementById('admission-date-input') as HTMLInputElement | null
                    input?.focus()
                    showNativeDatePicker(input)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <CalendarBlank size={18} weight="bold" />
                </button>
              )}
            </div>
          </div>
          {!mobile && (
            <div>
              <label className={labelClass(mobile)}>Paid Amount</label>
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
          )}
        </div>
      ))}

      {wrapSection(mobile, 'Student', (
        <div className={cn('grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
          <div className="relative">
            <label className={labelClass(mobile)}>Student Name</label>
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
              placeholder="Search student name..."
              disabled={isViewMode}
              className={inputClass(mobile)}
            />
            {!isViewMode && !selectedStudentId && showStudentSuggestions && studentSearch.trim().length > 0 && filteredStudents.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 ">
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
                      setAddress(s.billingAddress?.street || s.address || '')
                      setGender((s as any).admissionDetails?.gender || '')
                      setDateOfBirth((s as any).admissionDetails?.dateOfBirth || '')
                      setParentName((s as any).admissionDetails?.emergencyContact?.name || '')
                      setParentPhone(String((s as any).admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10))
                      syncOptionalVisibility({
                        address: s.billingAddress?.street || s.address || '',
                        dateOfBirth: (s as any).admissionDetails?.dateOfBirth || '',
                        gender: (s as any).admissionDetails?.gender || '',
                        parentName: (s as any).admissionDetails?.emergencyContact?.name || '',
                        parentPhone: String((s as any).admissionDetails?.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10),
                      })
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
          <div>
            <label className={labelClass(mobile)}>{mobile ? 'Phone Number' : 'Phone'}</label>
            {mobile ? (
              <div className="flex">
                <div className="flex items-center justify-center px-3 py-2.5 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground font-medium select-none">
                  +91
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onFocus={() => setShowStudentSuggestions(false)}
                  disabled={isViewMode}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className={cn(inputClass(mobile), 'rounded-l-none')}
                  placeholder="10 digit number"
                />
              </div>
            ) : (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onFocus={() => setShowStudentSuggestions(false)}
                disabled={isViewMode}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={inputClass(mobile)}
                placeholder="Phone number"
              />
            )}
          </div>
        </div>
      ))}

      {wrapSection(mobile, 'Course', (
        <div className="space-y-3">
          {items.map((line) => (
            <div key={line.id} className={cn('grid gap-2 items-end', mobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-12')}>
              <div className={mobile ? '' : 'md:col-span-5'}>
                <label className={cn(labelClass(mobile), !mobile && 'mb-1 block')}>Course</label>
                <div className="relative">
                  <select
                    value={line.itemId}
                    onChange={(e) => handlePickCourse(line.id, e.target.value)}
                    disabled={isViewMode}
                    className={cn(inputClass(mobile), 'appearance-none pr-8 truncate')}
                  >
                    <option value="">Select course...</option>
                    {uniqueCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className={mobile ? '' : 'md:col-span-3'}>
                <label className={cn(labelClass(mobile), !mobile && 'mb-1 block')}>Duration</label>
                <div className="relative">
                  <select
                    value={line.duration}
                    onChange={(e) => setItems((prev) => prev.map((l) => (l.id === line.id ? { ...l, duration: e.target.value } : l)))}
                    disabled={isViewMode}
                    className={cn(inputClass(mobile), 'appearance-none pr-8 truncate')}
                  >
                    {COURSE_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className={mobile ? '' : 'md:col-span-2'}>
                <label className={labelClass(mobile)}>Fee</label>
                <input
                  type="number"
                  value={focusedFeeLineId === line.id && Number(line.rate || 0) === 0 ? '' : line.rate}
                  onFocus={() => setFocusedFeeLineId(line.id)}
                  onBlur={(e) => {
                    if (e.target.value.trim() === '') {
                      setItems((prev) => prev.map((l) => (l.id === line.id ? recalcLine({ ...l, rate: 0 }) : l)))
                    }
                    setFocusedFeeLineId((prev) => (prev === line.id ? null : prev))
                  }}
                  onChange={(e) => setItems((prev) => prev.map((l) => (l.id === line.id ? recalcLine({ ...l, rate: Number(e.target.value || 0) }) : l)))}
                  disabled={isViewMode}
                  className={inputClass(mobile)}
                />
              </div>
              {mobile && (
                <div>
                  <label className={labelClass(mobile)}>Paid Amount</label>
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
              )}
              {!isViewMode && (
                <div className={cn(mobile ? 'col-span-2' : 'md:col-span-2', 'flex justify-end')}>
                  <button
                    type="button"
                    onClick={() => handleRemoveCourseLine(line.id)}
                    className={cn(
                      'text-sm font-medium flex items-center gap-1 text-red-600 hover:text-red-700',
                      !mobile && 'mobile-secondary-btn'
                    )}
                    title="Remove"
                  >
                    <Trash size={16} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}

          {!isViewMode && (
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newLine()])}
              className={mobile ? 'text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1' : 'mobile-secondary-btn'}
            >
              {mobile && <Plus size={14} weight="bold" />}
              Add Course
            </button>
          )}

          <div className={cn('space-y-2 pt-2', mobile ? 'border-t border-border' : 'border-t border-slate-200 dark:border-slate-700')}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-300">Total Fees</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{Number(total).toLocaleString('en-IN')}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-300">Total Paid Amount</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{Number(paidAmount || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      ))}

      {mobile ? (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Optional Information</p>

          <div>
            {!showOptionalAddress && !isViewMode ? (
              <button
                type="button"
                onClick={() => setShowOptionalAddress(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Address
              </button>
            ) : (showOptionalAddress || (isViewMode && address.trim())) ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <label className={labelClass(mobile)}>Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} disabled={isViewMode} placeholder="Address" className={cn(inputClass(mobile), 'resize-none')} />
              </motion.div>
            ) : null}
          </div>

          <div>
            {!showOptionalDob && !isViewMode ? (
              <button
                type="button"
                onClick={() => setShowOptionalDob(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Date of Birth
              </button>
            ) : (showOptionalDob || (isViewMode && dateOfBirth.trim())) ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <label className={labelClass(mobile)}>Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isViewMode} className={inputClass(mobile)} />
              </motion.div>
            ) : null}
          </div>

          <div>
            {!showOptionalGender && !isViewMode ? (
              <button
                type="button"
                onClick={() => setShowOptionalGender(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Gender
              </button>
            ) : (showOptionalGender || (isViewMode && gender.trim())) ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <label className={labelClass(mobile)}>Gender</label>
                <div className="relative">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={isViewMode} className={cn(inputClass(mobile), 'appearance-none pr-8')}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>

          <div>
            {!showOptionalParent && !isViewMode ? (
              <button
                type="button"
                onClick={() => setShowOptionalParent(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Parent / Guardian
              </button>
            ) : (showOptionalParent || (isViewMode && (parentName.trim() || parentPhone.trim()))) ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <label className={labelClass(mobile)}>Parent / Guardian Name</label>
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} disabled={isViewMode} placeholder="Parent or guardian name" className={inputClass(mobile)} />
                <label className={labelClass(mobile)}>Parent Mobile Number</label>
                <input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isViewMode}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className={inputClass(mobile)}
                />
              </motion.div>
            ) : null}
          </div>

          <div>
            {!showOptionalNotes && !isViewMode ? (
              <button
                type="button"
                onClick={() => setShowOptionalNotes(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Notes
              </button>
            ) : (showOptionalNotes || (isViewMode && notes.trim())) ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <label className={labelClass(mobile)}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={isViewMode} className={cn(inputClass(mobile), 'resize-none')} />
              </motion.div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <MobileFormSection title="Additional Information">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Optional — you can skip these and still save admission</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gender</label>
                <div className="relative mt-1">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={isViewMode} className={cn(inputClass(false), 'appearance-none pr-8')}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isViewMode} className={cn(inputClass(false), 'mt-1')} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} disabled={isViewMode} placeholder="Address" className={cn(inputClass(false), 'mt-1 resize-none')} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Parent / Guardian Name</label>
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} disabled={isViewMode} placeholder="Parent or guardian name" className={cn(inputClass(false), 'mt-1')} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Parent Mobile Number</label>
                <input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isViewMode}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className={cn(inputClass(false), 'mt-1')}
                />
              </div>
            </div>
          </MobileFormSection>

          <MobileFormSection title="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={isViewMode} className={inputClass(false)} />
          </MobileFormSection>
        </>
      )}
    </div>
  )

  const footerActions = (mobile = false) => (
    <div className={cn('flex w-full gap-3')}>
      <button
        onClick={() => setShowForm(false)}
        className={cn(
          mobile
            ? 'flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors'
            : 'mobile-secondary-btn'
        )}
      >
        {isViewMode ? 'Close' : 'Cancel'}
      </button>
      {!isViewMode && (
        <button
          disabled={saving}
          onClick={handleSave}
          className={cn(
            mobile
              ? 'flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50'
              : 'mobile-primary-btn',
            saving && 'opacity-70 pointer-events-none'
          )}
        >
          {saving ? (formMode === 'edit' ? 'Updating...' : 'Saving...') : (formMode === 'edit' ? 'Update Admission' : 'Save Admission')}
        </button>
      )}
    </div>
  )

  return (
    <div className="erp-module-page p-3 md:p-6 md:bg-slate-50 dark:bg-slate-900">
      <MobilePageScaffold
        title=""
        className="md:hidden"
      >
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2 md:gap-4 mb-3">
          {/* Left Side: KPI Cards */}
          <div className="erp-module-kpi-grid">
            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm min-w-0">
              <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Total Admission">Total</h3>
              <div className="erp-inline-stat-scroll mt-0.5">
                <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">{formatStatCount(filteredInvoices.length)}</p>
              </div>
            </div>

            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm min-w-0">
              <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Paid Amount">Paid</h3>
              <div className="erp-inline-stat-scroll mt-0.5">
                <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">
                  {formatStatAmount(totalPaidAmount)}
                </p>
              </div>
            </div>

            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm min-w-0">
              <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Pending Amount">Pending</h3>
              <div className="erp-inline-stat-scroll mt-0.5">
                <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">
                  {formatStatAmount(Math.max(totalAdmissionsAmount - totalPaidAmount, 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Action Button + Date Filters */}
          <div className="flex w-full flex-row items-center justify-end gap-1.5 flex-shrink-0 sm:w-auto">
            <PeriodFilterDropdown value={admissionPeriod} onChange={setAdmissionPeriod} />
            <button onClick={openNew} className="erp-module-primary-btn">
              <Plus size={14} weight="bold" />
              <span>Admission</span>
            </button>
          </div>
        </div>
        <MobileSearchBar value={admissionSearch} onChange={setAdmissionSearch} placeholder="Search by admission, student or phone" />
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading admissions...</p>}

          {!loading && admissionSearch.trim() === '' && filteredInvoices.length > 0 && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Admissions</p>
          )}

          {!loading &&
            recentInvoices.map((inv) => (
              <MobileListCard
                key={inv.id}
                title={inv.partyName || 'Student'}
                onTitleClick={() => openStudentDetails(inv)}
                subtitle={inv.invoiceNumber || inv.id}
                fields={[
                  { id: 'date', label: 'Date', value: (inv.invoiceDate || inv.createdAt || '').slice(0, 10) },
                  { id: 'phone', label: 'Phone', value: inv.phone || '-' },
                  { id: 'total', label: 'Total', value: `₹${Number(inv.total || inv.grandTotal || 0).toLocaleString('en-IN')}` },
                  { id: 'paid', label: 'Paid', value: `₹${Number(inv.paidAmount || 0).toLocaleString('en-IN')}` },
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
                      { id: 'print', label: 'Print', icon: <Printer size={14} />, onClick: () => handlePrint(inv) },
                      { id: 'delete', label: 'Delete', icon: <Trash size={14} />, tone: 'danger', onClick: () => handleDelete(inv.id) },
                    ]}
                  />
                }
              />
            ))}

          {!loading && filteredInvoices.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              {admissionSearch.trim() !== '' ? 'No admissions found' : 'No admissions yet'}
            </div>
          )}
        </div>
      </MobilePageScaffold>

      <div className="hidden md:block w-full space-y-6 rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <div className="erp-module-panel overflow-hidden border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 ">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 dark:border-slate-700 dark:bg-slate-900/70 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Admissions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{loading ? 'Loading...' : `${invoices.length} record(s)`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="erp-module-table-header bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
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
                  <tr key={inv.id} className="border-t border-slate-200 dark:border-slate-700 dark:border-slate-700/60">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{inv.invoiceNumber || inv.id}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{(inv.invoiceDate || inv.createdAt || '').slice(0, 10)}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => openStudentDetails(inv)}
                        title="View student details"
                        className="text-blue-600 dark:text-blue-400 font-medium text-left cursor-pointer hover:underline transition-colors"
                      >
                        {inv.partyName || 'Student'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">₹{Number(inv.total || inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">₹{Number(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button onClick={() => openExisting(inv, 'view')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" title="View"><Eye size={16} weight="duotone" /></button>
                        <button onClick={() => openExisting(inv, 'edit')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" title="Edit"><Pencil size={16} weight="duotone" /></button>
                        <button onClick={() => handlePrint(inv)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="Print"><Printer size={16} weight="duotone" /></button>
                        <button onClick={() => handleDelete(inv.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash size={16} weight="duotone" /></button>
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
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="font-bold text-base text-foreground">{modalTitle}</div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{formFields(true)}</div>
            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors text-sm">
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
              {!isViewMode && (
                <button disabled={saving} onClick={handleSave} className={cn('flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50', saving && 'opacity-70 pointer-events-none')}>
                  {saving ? (formMode === 'edit' ? 'Updating...' : 'Saving...') : (formMode === 'edit' ? 'Update Admission' : 'Save Admission')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobileViewport && (
        <MobileBottomSheet open={showForm} title={modalTitle} onClose={() => setShowForm(false)} footer={footerActions(true)}>
          {formFields(true)}
        </MobileBottomSheet>
      )}

      <StudentDetailsModal
        open={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        student={viewingStudent?.student}
        studentName={viewingStudent?.name}
        phone={viewingStudent?.phone}
        invoices={invoices}
      />
    </div>
  )
}

export default Sales
