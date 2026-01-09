// Staff Master Service
// CRUD operations for Staff Master table

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import type { Staff } from '../types'

const LOCAL_STORAGE_KEY = 'thisai_staff_master'

// Helper: get current companyId from stored user
const getCurrentCompanyId = (): string | null => {
  try {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) return null
    const user = JSON.parse(userRaw)
    return user.companyId || null
  } catch {
    return null
  }
}

// Get staff from localStorage
const getLocalStaff = (): Staff[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!data) return []
    const allStaff = JSON.parse(data)
    const companyId = getCurrentCompanyId()
    if (!companyId) return allStaff
    return allStaff.filter((s: Staff) => s.companyId === companyId)
  } catch {
    return []
  }
}

// Save staff to localStorage
const saveLocalStaff = (staff: Staff[]) => {
  try {
    // Get all staff and update only current company's staff
    const allData = localStorage.getItem(LOCAL_STORAGE_KEY)
    let allStaff: Staff[] = allData ? JSON.parse(allData) : []
    const companyId = getCurrentCompanyId()

    if (companyId) {
      // Remove current company's staff and add updated ones
      allStaff = allStaff.filter(s => s.companyId !== companyId)
      allStaff = [...allStaff, ...staff]
    } else {
      allStaff = staff
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allStaff))
  } catch (error) {
    console.error('Error saving staff to localStorage:', error)
  }
}

// Generate next staff code (ST001, ST002, etc.)
export const generateStaffCode = async (): Promise<string> => {
  const staff = await getStaff()
  if (staff.length === 0) {
    return 'ST001'
  }

  // Find highest code number
  const codes = staff
    .map(s => s.staff_code)
    .filter(code => /^ST\d{3}$/.test(code))
    .map(code => parseInt(code.replace('ST', ''), 10))

  const maxCode = codes.length > 0 ? Math.max(...codes) : 0
  const nextCode = maxCode + 1
  return `ST${nextCode.toString().padStart(3, '0')}`
}

// Get all staff (active only by default)
export const getStaff = async (includeInactive = false): Promise<Staff[]> => {
  const companyId = getCurrentCompanyId()

  // Try Firebase first
  if (isFirebaseReady() && db && companyId) {
    try {
      const staffRef = collection(db, COLLECTIONS.STAFF_MASTER)
      // Query only by companyId to avoid needing a compound index
      const q = query(
        staffRef,
        where('companyId', '==', companyId)
      )

      const snapshot = await getDocs(q)
      const staff: Staff[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Staff))

      // Sort locally by staff_code
      staff.sort((a, b) => a.staff_code.localeCompare(b.staff_code))

      // Filter inactive if needed
      const filtered = includeInactive ? staff : staff.filter(s => s.isActive)

      // Sync to localStorage
      saveLocalStaff(staff)

      return filtered
    } catch (error) {
      console.error('Error fetching staff from Firebase:', error)
    }
  }

  // Fallback to localStorage
  const localStaff = getLocalStaff()
  const sorted = localStaff.sort((a, b) => a.staff_code.localeCompare(b.staff_code))
  return includeInactive ? sorted : sorted.filter(s => s.isActive)
}

// Helper to remove undefined values for Firebase
const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}

// Create new staff member
export const createStaff = async (staffData: Omit<Staff, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<Staff> => {
  const companyId = getCurrentCompanyId()
  const now = new Date().toISOString()

  const newStaff: Omit<Staff, 'id'> = {
    staff_code: staffData.staff_code,
    staff_name: staffData.staff_name,
    phone: staffData.phone || '',
    email: staffData.email || '',
    designation: staffData.designation || '',
    department: staffData.department || '',
    isActive: staffData.isActive,
    companyId: companyId || 'default',
    createdAt: now,
    updatedAt: now
  }

  // Try Firebase first
  if (isFirebaseReady() && db && companyId) {
    try {
      const staffRef = collection(db, COLLECTIONS.STAFF_MASTER)
      // Remove any undefined values before saving to Firebase
      const docRef = await addDoc(staffRef, removeUndefined(newStaff))

      const created: Staff = {
        id: docRef.id,
        ...newStaff
      }

      // Update localStorage
      const localStaff = getLocalStaff()
      saveLocalStaff([...localStaff, created])

      return created
    } catch (error) {
      console.error('Error creating staff in Firebase:', error)
    }
  }

  // Fallback to localStorage
  const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const created: Staff = {
    id,
    ...newStaff
  }

  const localStaff = getLocalStaff()
  saveLocalStaff([...localStaff, created])

  return created
}

// Update staff member
export const updateStaff = async (id: string, updates: Partial<Staff>): Promise<Staff | null> => {
  const now = new Date().toISOString()

  // Build update data, converting undefined to empty strings for optional fields
  const updateData: Record<string, any> = {
    updatedAt: now
  }

  if (updates.staff_code !== undefined) updateData.staff_code = updates.staff_code
  if (updates.staff_name !== undefined) updateData.staff_name = updates.staff_name
  if (updates.phone !== undefined) updateData.phone = updates.phone || ''
  if (updates.email !== undefined) updateData.email = updates.email || ''
  if (updates.designation !== undefined) updateData.designation = updates.designation || ''
  if (updates.department !== undefined) updateData.department = updates.department || ''
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive

  // Try Firebase first
  if (isFirebaseReady() && db) {
    try {
      const docRef = doc(db, COLLECTIONS.STAFF_MASTER, id)
      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating staff in Firebase:', error)
    }
  }

  // Update localStorage
  const localStaff = getLocalStaff()
  const index = localStaff.findIndex(s => s.id === id)

  if (index !== -1) {
    const updated: Staff = {
      ...localStaff[index],
      ...updateData
    }
    localStaff[index] = updated
    saveLocalStaff(localStaff)
    return updated
  }

  return null
}

// Delete staff member (soft delete - set isActive to false)
export const deleteStaff = async (id: string): Promise<boolean> => {
  return (await updateStaff(id, { isActive: false })) !== null
}

// Hard delete staff member
export const hardDeleteStaff = async (id: string): Promise<boolean> => {
  // Try Firebase first
  if (isFirebaseReady() && db) {
    try {
      const docRef = doc(db, COLLECTIONS.STAFF_MASTER, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting staff from Firebase:', error)
    }
  }

  // Update localStorage
  const localStaff = getLocalStaff()
  const filtered = localStaff.filter(s => s.id !== id)
  saveLocalStaff(filtered)

  return true
}

// Get staff by code
export const getStaffByCode = async (staffCode: string): Promise<Staff | null> => {
  const staff = await getStaff(true)
  return staff.find(s => s.staff_code === staffCode) || null
}

// Format staff for dropdown display: "ST001 – Ganesh"
export const formatStaffDisplay = (staff: Staff): string => {
  return `${staff.staff_code} – ${staff.staff_name}`
}
