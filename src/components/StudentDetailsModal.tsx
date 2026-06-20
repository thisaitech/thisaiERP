import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  User,
  Phone,
  EnvelopeSimple,
  MapPin,
  GraduationCap,
  Receipt,
  Wallet,
  Clock,
  CalendarBlank,
  GenderIntersex,
  Cake,
  UsersThree,
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import type { Party } from '../types'

type StudentDetailsModalProps = {
  open: boolean
  onClose: () => void
  student?: Party | null
  studentName?: string
  phone?: string
  invoices: any[]
}

const rupee = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN')
const onlyDigits = (s: any) => String(s || '').replace(/\D/g, '')
const getPaid = (inv: any) => Number(inv?.paidAmount ?? inv?.payment?.paidAmount ?? 0)
const getTotal = (inv: any) => Number(inv?.total ?? inv?.grandTotal ?? 0)
const getDate = (inv: any) => String(inv?.invoiceDate || inv?.date || inv?.createdAt || '').slice(0, 10)

const pickFirst = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

const formatGender = (value: string) => {
  if (!value) return '—'
  if (value === 'male') return 'Male'
  if (value === 'female') return 'Female'
  if (value === 'other') return 'Other'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatDisplayDate = (value: string) => {
  if (!value) return '—'
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const StudentDetailsModal = ({ open, onClose, student, studentName, phone, invoices }: StudentDetailsModalProps) => {
  const name = (student?.name || student?.companyName || studentName || 'Student').trim()
  const studentPhone = student?.phone || phone || ''
  const email = student?.email || ''
  const partyId = student?.id || ''

  const partyDetails = (student as any)?.admissionDetails

  const address = useMemo(() => {
    const a: any = student?.billingAddress || {}
    return [a.street, a.city, a.state, a.pinCode].filter(Boolean).join(', ')
  }, [student])

  // Match this student's admissions from the invoice list.
  const admissions = useMemo(() => {
    const targetName = name.toLowerCase()
    const targetPhone = onlyDigits(studentPhone)
    return (invoices || [])
      .filter((inv) => {
        if (partyId && inv?.partyId) return inv.partyId === partyId
        const nameMatch = String(inv?.partyName || '').toLowerCase().trim() === targetName
        const phoneMatch = targetPhone.length > 0 && onlyDigits(inv?.phone) === targetPhone
        return nameMatch || phoneMatch
      })
      .sort((a, b) => getDate(b).localeCompare(getDate(a)))
  }, [invoices, partyId, name, studentPhone])

  const latestAdmission = admissions[0]

  const profileInfo = useMemo(() => ({
    name,
    phone: pickFirst(latestAdmission?.phone, studentPhone) || '—',
    email: pickFirst(latestAdmission?.email, email) || '—',
    gender: formatGender(pickFirst(latestAdmission?.gender, partyDetails?.gender)),
    dateOfBirth: formatDisplayDate(pickFirst(latestAdmission?.dateOfBirth, partyDetails?.dateOfBirth)),
    address: pickFirst(latestAdmission?.address, address, student?.billingAddress?.street) || '—',
    parentName: pickFirst(latestAdmission?.parentName, partyDetails?.emergencyContact?.name) || '—',
    parentPhone: pickFirst(latestAdmission?.parentPhone, partyDetails?.emergencyContact?.phone) || '—',
  }), [name, latestAdmission, studentPhone, email, partyDetails, address, student])

  const fees = useMemo(() => {
    const total = admissions.reduce((s, inv) => s + getTotal(inv), 0)
    const paid = admissions.reduce((s, inv) => s + getPaid(inv), 0)
    return { total, paid, pending: Math.max(0, total - paid) }
  }, [admissions])

  const payments = useMemo(
    () =>
      admissions
        .filter((inv) => getPaid(inv) > 0)
        .map((inv) => ({
          id: inv.id,
          date: getDate(inv),
          reference: inv.invoiceNumber || inv.id,
          amount: getPaid(inv),
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [admissions]
  )

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const statusBadge = (status: string) => (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
        status === 'paid'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : status === 'partial'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      )}
    >
      {status || 'pending'}
    </span>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                    {initials || <User size={20} weight="bold" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{studentPhone || 'No phone'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* 1. Basic Information */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={16} weight="duotone" className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Basic Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow icon={<User size={14} />} label="Name" value={profileInfo.name} />
                    <InfoRow icon={<Phone size={14} />} label="Phone" value={profileInfo.phone} />
                    <InfoRow icon={<EnvelopeSimple size={14} />} label="Email" value={profileInfo.email} />
                    <InfoRow icon={<GenderIntersex size={14} />} label="Gender" value={profileInfo.gender} />
                    <InfoRow icon={<Cake size={14} />} label="Date of Birth" value={profileInfo.dateOfBirth} />
                    <InfoRow icon={<MapPin size={14} />} label="Address" value={profileInfo.address} />
                    <InfoRow icon={<UsersThree size={14} />} label="Parent / Guardian Name" value={profileInfo.parentName} />
                    <InfoRow icon={<Phone size={14} />} label="Parent Mobile Number" value={profileInfo.parentPhone} />
                  </div>
                </section>

                {/* 2. Admission Details */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={16} weight="duotone" className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Admission Details</h4>
                    <span className="ml-auto text-xs text-slate-400">{admissions.length} admission(s)</span>
                  </div>
                  {admissions.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No admissions found.</p>
                  ) : (
                    <div className="space-y-3">
                      {admissions.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Receipt size={14} weight="duotone" className="text-slate-500 shrink-0" />
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {inv.invoiceNumber || inv.id}
                              </span>
                            </div>
                            {statusBadge(inv.status)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <CalendarBlank size={13} />
                            <span>{formatDisplayDate(getDate(inv))}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                            <div>
                              <span className="text-slate-400">Total Fee</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{rupee(getTotal(inv))}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Paid Amount</span>
                              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{rupee(getPaid(inv))}</p>
                            </div>
                          </div>
                          {(inv.gender || inv.dateOfBirth || inv.address || inv.parentName || inv.parentPhone) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-xs border-t border-slate-100 dark:border-slate-700 pt-2">
                              {inv.gender ? <MiniField label="Gender" value={formatGender(inv.gender)} /> : null}
                              {inv.dateOfBirth ? <MiniField label="Date of Birth" value={formatDisplayDate(inv.dateOfBirth)} /> : null}
                              {inv.address ? <MiniField label="Address" value={inv.address} className="sm:col-span-2" /> : null}
                              {inv.parentName ? <MiniField label="Parent / Guardian" value={inv.parentName} /> : null}
                              {inv.parentPhone ? <MiniField label="Parent Mobile" value={inv.parentPhone} /> : null}
                            </div>
                          )}
                          {Array.isArray(inv.items) && inv.items.length > 0 && (
                            <div className="space-y-1">
                              {inv.items.map((it: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs gap-2"
                                >
                                  <span className="text-slate-700 dark:text-slate-200 truncate">
                                    {it.itemName || it.name || 'Course'}
                                    {it.duration ? (
                                      <span className="text-slate-400"> · {it.duration}</span>
                                    ) : null}
                                  </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-200 shrink-0">
                                    {rupee(it.amount ?? Number(it.quantity || 1) * Number(it.rate || 0))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {inv.notes ? (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-[11px] uppercase tracking-wide text-slate-400">Notes</p>
                              <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{inv.notes}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 3. Fee Details */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} weight="duotone" className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Fee Details</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FeeCard label="Total Fee" value={rupee(fees.total)} tone="slate" />
                    <FeeCard label="Paid" value={rupee(fees.paid)} tone="emerald" />
                    <FeeCard label="Pending" value={rupee(fees.pending)} tone="rose" />
                  </div>
                </section>

                {/* 4. Payment History */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} weight="duotone" className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Payment History</h4>
                  </div>
                  {payments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                              {p.reference}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.date}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            +{rupee(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 text-slate-400">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{value}</p>
    </div>
  </div>
)

const MiniField = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={className}>
    <p className="text-slate-400">{label}</p>
    <p className="font-medium text-slate-700 dark:text-slate-200 break-words">{value}</p>
  </div>
)

const FeeCard = ({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'rose' }) => (
  <div
    className={cn(
      'rounded-lg p-3 text-center border',
      tone === 'slate' && 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700',
      tone === 'emerald' && 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40',
      tone === 'rose' && 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40'
    )}
  >
    <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    <p
      className={cn(
        'mt-1 text-base font-bold',
        tone === 'slate' && 'text-slate-800 dark:text-slate-100',
        tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
        tone === 'rose' && 'text-rose-600 dark:text-rose-400'
      )}
    >
      {value}
    </p>
  </div>
)

export default StudentDetailsModal
