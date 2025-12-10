// Party (Customer/Supplier) Service
// CRUD operations and business logic for parties
// OFFLINE-FIRST: Always save locally first, sync silently when online

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import type { Party } from '../types'
import { validateGSTIN, getStateCodeFromGSTIN } from './taxCalculations'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

// Local storage fallback key (for backward compatibility)
const LOCAL_STORAGE_KEY = 'thisai_crm_parties'

// Helper to generate offline-safe ID
const generateOfflineId = () => `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Check if ID is offline-generated
const isOfflineId = (id: string) => id.startsWith('party_') || id.startsWith('offline_')

/**
 * Get all parties (with optional filter)
 * OFFLINE-FIRST: Returns from IndexedDB first, then syncs with Firebase in background
 */
export async function getParties(type?: 'customer' | 'supplier' | 'both'): Promise<Party[]> {
  // STEP 1: Always try IndexedDB first (instant, works offline)
  let localParties: Party[] = []
  try {
    localParties = await getAllFromOffline<Party>(STORES.PARTIES)
    if (type) {
      localParties = localParties.filter(p => p.type === type)
    }
    // Sort by companyName
    localParties.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''))
  } catch (error) {
    console.warn('IndexedDB read failed, trying localStorage:', error)
    localParties = getPartiesFromLocalStorage(type)
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('📱 Offline mode: Returning', localParties.length, 'parties from local storage')
    return localParties
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  try {
    const partiesRef = collection(db!, COLLECTIONS.PARTIES)
    let q

    if (type) {
      q = query(partiesRef, where('type', '==', type))
    } else {
      q = query(partiesRef)
    }

    const snapshot = await getDocs(q)
    const serverParties = snapshot.docs.map(docToParty)

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyParties = localParties.filter(p => isOfflineId(p.id))
    const mergedParties = [...serverParties, ...localOnlyParties]

    // Update local cache with server data (in background)
    for (const party of serverParties) {
      saveToOffline(STORES.PARTIES, party).catch(() => {})
    }

    // Sort by companyName
    return mergedParties.sort((a, b) =>
      (a.companyName || '').localeCompare(b.companyName || '')
    )
  } catch (error) {
    console.warn('Firebase fetch failed, returning local data:', error)
    return localParties
  }
}

/**
 * Get party by ID
 * OFFLINE-FIRST: Checks IndexedDB first, then Firebase
 */
export async function getPartyById(id: string): Promise<Party | null> {
  // STEP 1: Try IndexedDB first
  try {
    const localParty = await getFromOffline<Party>(STORES.PARTIES, id)
    if (localParty) {
      return localParty
    }
  } catch (error) {
    console.warn('IndexedDB read failed:', error)
  }

  // STEP 2: Check localStorage fallback
  const localParties = getPartiesFromLocalStorage()
  const localStorageParty = localParties.find(p => p.id === id)
  if (localStorageParty) {
    return localStorageParty
  }

  // STEP 3: If offline or Firebase not ready, return null
  if (!isDeviceOnline() || !isFirebaseReady()) {
    return null
  }

  // STEP 4: Try Firebase
  try {
    const docRef = doc(db!, COLLECTIONS.PARTIES, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const party = docToParty(docSnap)
      // Cache in IndexedDB for future offline access
      saveToOffline(STORES.PARTIES, party).catch(() => {})
      return party
    }
    return null
  } catch (error) {
    console.error('Error fetching party:', error)
    return null
  }
}

/**
 * Find party by GSTIN
 */
export async function findPartyByGSTIN(gstin: string): Promise<Party | null> {
  if (!validateGSTIN(gstin)) {
    return null
  }

  if (!isFirebaseReady()) {
    const parties = getPartiesFromLocalStorage()
    return parties.find(p => p.gstDetails?.gstin === gstin) || null
  }

  try {
    const partiesRef = collection(db!, COLLECTIONS.PARTIES)
    const q = query(partiesRef, where('gstDetails.gstin', '==', gstin))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return docToParty(snapshot.docs[0])
    }
    return null
  } catch (error) {
    console.error('Error finding party by GSTIN:', error)
    return null
  }
}

/**
 * Helper function to deeply remove undefined values from an object
 */
function removeUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedDeep(item))
  }

  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedDeep(value)
      }
    }
    return cleaned
  }

  return obj
}

/**
 * Create new party - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 * No alerts, no popups - completely silent operation
 */
export async function createParty(partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Promise<Party | null> {
  console.log('[createParty] Starting offline-first creation...')

  const now = new Date().toISOString()
  const id = generateOfflineId()

  // Deep clean undefined values (Firestore doesn't accept undefined)
  const cleanData = removeUndefinedDeep(partyData)

  const newParty: Party = {
    ...cleanData,
    id,
    createdAt: now,
    updatedAt: now,
    // Offline-first metadata
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as Party

  // STEP 1: Always save to IndexedDB first (instant, never fails)
  try {
    await saveToOffline(STORES.PARTIES, newParty)
    // Also save to localStorage for backward compatibility
    savePartyToLocalStorage(newParty)
    console.log('[createParty] ✅ Party saved locally:', id)
  } catch (error) {
    console.error('[createParty] Failed to save locally:', error)
    // Still try to continue with localStorage only
    savePartyToLocalStorage(newParty)
  }

  // STEP 2: If online, sync to Firebase silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      // Remove offline metadata before sending to Firebase
      const serverData = removeUndefinedDeep({
        ...partyData,
        createdAt: now,
        updatedAt: now
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.PARTIES), serverData)

      // Update local party with Firebase ID and mark as synced
      const syncedParty: Party = {
        ...newParty,
        id: docRef.id,
        _pendingSync: false,
        _syncedAt: now
      } as Party

      // Remove old offline ID record and save with new Firebase ID
      await deleteFromOffline(STORES.PARTIES, id)
      await saveToOffline(STORES.PARTIES, syncedParty)

      // Update localStorage too
      deletePartyFromLocalStorage(id)
      savePartyToLocalStorage(syncedParty)

      console.log('[createParty] ✅ Synced to Firebase:', docRef.id)
      return syncedParty
    } catch (error) {
      console.warn('[createParty] Firebase sync failed, queuing for later:', error)
      // Add to sync queue for later retry
      await addToSyncQueue('create', STORES.PARTIES, newParty)
    }
  } else {
    // Offline - add to sync queue for later
    console.log('[createParty] 📱 Offline mode - queuing for sync')
    await addToSyncQueue('create', STORES.PARTIES, newParty)
  }

  return newParty
}

/**
 * Update existing party - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function updateParty(id: string, updates: Partial<Party>): Promise<boolean> {
  const now = new Date().toISOString()

  // STEP 1: Get existing party from local
  let existingParty: Party | null = null
  try {
    existingParty = await getFromOffline<Party>(STORES.PARTIES, id)
  } catch (error) {
    const localParties = getPartiesFromLocalStorage()
    existingParty = localParties.find(p => p.id === id) || null
  }

  if (!existingParty) {
    console.error('[updateParty] Party not found:', id)
    return false
  }

  const updatedParty: Party = {
    ...existingParty,
    ...updates,
    updatedAt: now,
    _pendingSync: !isDeviceOnline() || isOfflineId(id),
    _savedAt: now
  } as Party

  // STEP 2: Always save to IndexedDB first (instant)
  try {
    await saveToOffline(STORES.PARTIES, updatedParty)
    updatePartyInLocalStorage(id, updatedParty)
    console.log('[updateParty] ✅ Updated locally:', id)
  } catch (error) {
    console.error('[updateParty] Local save failed:', error)
    updatePartyInLocalStorage(id, updatedParty)
  }

  // STEP 3: If online and not an offline-only record, sync to Firebase
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const serverData = removeUndefinedDeep({
        ...updates,
        updatedAt: now
      })
      const docRef = doc(db!, COLLECTIONS.PARTIES, id)
      await updateDoc(docRef, serverData)

      // Mark as synced
      updatedParty._pendingSync = false
      updatedParty._syncedAt = now
      await saveToOffline(STORES.PARTIES, updatedParty)

      console.log('[updateParty] ✅ Synced to Firebase:', id)
    } catch (error) {
      console.warn('[updateParty] Firebase sync failed, queuing:', error)
      await addToSyncQueue('update', STORES.PARTIES, updatedParty)
    }
  } else if (!isOfflineId(id)) {
    // Only queue if it has a Firebase ID (not offline-created)
    await addToSyncQueue('update', STORES.PARTIES, updatedParty)
  }

  return true
}

/**
 * Delete party - OFFLINE FIRST
 * Always deletes locally first, then syncs to Firebase silently when online
 */
export async function deleteParty(id: string): Promise<boolean> {
  // STEP 1: Always delete from local first (instant)
  try {
    await deleteFromOffline(STORES.PARTIES, id)
    deletePartyFromLocalStorage(id)
    console.log('[deleteParty] ✅ Deleted locally:', id)
  } catch (error) {
    console.error('[deleteParty] Local delete failed:', error)
    deletePartyFromLocalStorage(id)
  }

  // STEP 2: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const docRef = doc(db!, COLLECTIONS.PARTIES, id)
      await deleteDoc(docRef)
      console.log('[deleteParty] ✅ Deleted from Firebase:', id)
    } catch (error) {
      console.warn('[deleteParty] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.PARTIES, { id })
    }
  } else if (!isOfflineId(id)) {
    // Queue for sync if has Firebase ID but currently offline
    await addToSyncQueue('delete', STORES.PARTIES, { id })
  }
  // If it's an offline-only record, no need to sync deletion

  return true
}

/**
 * Find or create party from scanned invoice data
 * This is the auto-create logic for parties
 */
export async function findOrCreatePartyFromInvoice(
  name: string,
  gstin?: string,
  phone?: string,
  email?: string,
  address?: string,
  city?: string,
  state?: string,
  pinCode?: string,
  type: 'customer' | 'supplier' = 'supplier'
): Promise<Party | null> {
  // If GSTIN provided, try to find existing party
  if (gstin && validateGSTIN(gstin)) {
    const existing = await findPartyByGSTIN(gstin)
    if (existing) {
      // Update with new information if available
      const updates: Partial<Party> = {}
      if (phone && !existing.phone) updates.phone = phone
      if (email && !existing.email) updates.email = email
      if (address && !existing.billingAddress.street) {
        updates.billingAddress = {
          ...existing.billingAddress,
          street: address || '',
          city: city || existing.billingAddress.city,
          state: state || existing.billingAddress.state,
          pinCode: pinCode || existing.billingAddress.pinCode
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateParty(existing.id, updates)
      }

      return existing
    }
  }

  // Create new party
  const stateCode = gstin ? getStateCodeFromGSTIN(gstin) : ''

  const newPartyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'> = {
    type,
    companyName: name,
    displayName: name,
    phone: phone || '',
    email: email || '',
    contacts: [],
    billingAddress: {
      street: address || '',
      city: city || '',
      state: state || '',
      pinCode: pinCode || '',
      country: 'India'
    },
    sameAsShipping: true,
    gstDetails: gstin ? {
      gstin,
      gstType: 'Regular',
      stateCode
    } : undefined,
    openingBalance: 0,
    currentBalance: 0,
    createdBy: 'AI Scanner',
    isActive: true
  }

  return await createParty(newPartyData)
}

// Helper function to convert Firestore document to Party
function docToParty(doc: QueryDocumentSnapshot<DocumentData>): Party {
  const data = doc.data()
  return {
    ...data,
    id: doc.id
  } as Party
}

// ============================================
// LOCAL STORAGE FALLBACK FUNCTIONS
// ============================================

function getPartiesFromLocalStorage(type?: 'customer' | 'supplier' | 'both'): Party[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return []

    const parties: Party[] = JSON.parse(stored)

    if (type) {
      return parties.filter(p => p.type === type)
    }

    return parties
  } catch (error) {
    console.error('Error reading from local storage:', error)
    return []
  }
}

function savePartyToLocalStorage(party: Party): void {
  try {
    const parties = getPartiesFromLocalStorage()
    parties.push(party)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parties))
  } catch (error) {
    console.error('Error saving to local storage:', error)
  }
}

function updatePartyInLocalStorage(id: string, updates: Partial<Party>): boolean {
  try {
    const parties = getPartiesFromLocalStorage()
    const index = parties.findIndex(p => p.id === id)

    if (index === -1) return false

    parties[index] = { ...parties[index], ...updates }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parties))
    return true
  } catch (error) {
    console.error('Error updating local storage:', error)
    return false
  }
}

function deletePartyFromLocalStorage(id: string): boolean {
  try {
    const parties = getPartiesFromLocalStorage()
    const filtered = parties.filter(p => p.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting from local storage:', error)
    return false
  }
}

/**
 * Migrate old party records to new format
 * Converts 'name', 'gstin', 'state' fields to proper Party interface format
 */
export async function migratePartyData(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  try {
    // Handle localStorage migration
    if (!isFirebaseReady()) {
      const parties = getPartiesFromLocalStorage()
      let needsSave = false

      for (const party of parties) {
        const partyAny = party as any
        let modified = false

        // Migrate 'name' to 'displayName' and 'companyName'
        if (partyAny.name && !party.displayName) {
          party.displayName = partyAny.name
          party.companyName = partyAny.name
          delete partyAny.name
          modified = true
        }

        // Migrate 'gstin' to 'gstDetails'
        if (partyAny.gstin && !party.gstDetails) {
          party.gstDetails = { gstin: partyAny.gstin }
          delete partyAny.gstin
          modified = true
        }

        // Migrate 'state' to 'billingAddress.state'
        if (partyAny.state && (!party.billingAddress || !party.billingAddress.state)) {
          party.billingAddress = {
            street: partyAny.billingAddress || '',
            city: '',
            state: partyAny.state,
            pincode: '',
            country: 'India'
          }
          delete partyAny.state
          modified = true
        }

        // Ensure billingAddress exists
        if (!party.billingAddress) {
          party.billingAddress = {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          }
          modified = true
        }

        // Ensure required fields exist
        if (!party.phone) party.phone = ''
        if (!party.email) party.email = ''
        if (!party.contacts) party.contacts = []
        if (party.sameAsShipping === undefined) party.sameAsShipping = true
        if (party.openingBalance === undefined) party.openingBalance = 0
        if (party.currentBalance === undefined) party.currentBalance = 0

        if (modified) {
          updated++
          needsSave = true
        }
      }

      if (needsSave) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parties))
      }

      return { success: true, updated, errors }
    }

    // Handle Firebase migration
    const partiesRef = collection(db!, COLLECTIONS.PARTIES)
    const snapshot = await getDocs(partiesRef)

    for (const docSnap of snapshot.docs) {
      try {
        const data = docSnap.data() as any
        const updates: any = {}
        let needsUpdate = false

        // Migrate 'name' to 'displayName' and 'companyName'
        if (data.name && !data.displayName) {
          updates.displayName = data.name
          updates.companyName = data.name
          updates.name = null // Remove old field
          needsUpdate = true
        }

        // Migrate 'gstin' to 'gstDetails'
        if (data.gstin && !data.gstDetails) {
          updates.gstDetails = { gstin: data.gstin }
          updates.gstin = null // Remove old field
          needsUpdate = true
        }

        // Migrate 'state' to 'billingAddress.state'
        if (data.state && (!data.billingAddress || !data.billingAddress.state)) {
          updates.billingAddress = {
            street: data.billingAddress || '',
            city: '',
            state: data.state,
            pincode: '',
            country: 'India'
          }
          updates.state = null // Remove old field
          needsUpdate = true
        }

        // Ensure billingAddress exists
        if (!data.billingAddress && !updates.billingAddress) {
          updates.billingAddress = {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          }
          needsUpdate = true
        }

        // Ensure required fields exist
        if (!data.phone) {
          updates.phone = ''
          needsUpdate = true
        }
        if (!data.email) {
          updates.email = ''
          needsUpdate = true
        }
        if (!data.contacts) {
          updates.contacts = []
          needsUpdate = true
        }
        if (data.sameAsShipping === undefined) {
          updates.sameAsShipping = true
          needsUpdate = true
        }
        if (data.openingBalance === undefined) {
          updates.openingBalance = 0
          needsUpdate = true
        }
        if (data.currentBalance === undefined) {
          updates.currentBalance = 0
          needsUpdate = true
        }

        if (needsUpdate) {
          await updateDoc(doc(db!, COLLECTIONS.PARTIES, docSnap.id), updates)
          updated++
        }
      } catch (error) {
        const errorMsg = `Failed to migrate party ${docSnap.id}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return { success: true, updated, errors }
  } catch (error) {
    console.error('Migration error:', error)
    return { success: false, updated, errors: [...errors, String(error)] }
  }
}

// ============================================
// LIVE OUTSTANDING BALANCE (2025 Standard)
// Vyapar/Marg/Zoho style - shows everywhere
// ============================================

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(absAmount)

  return amount < 0 ? `-${formatted}` : formatted
}

/**
 * Get outstanding color based on amount
 * Green = positive (they owe us - receivable)
 * Red = negative (we owe them - advance/credit)
 * Grey = zero (settled)
 */
function getOutstandingColor(amount: number): 'green' | 'red' | 'grey' {
  if (amount > 0) return 'green'
  if (amount < 0) return 'red'
  return 'grey'
}

/**
 * Calculate outstanding balance for a party
 * Outstanding = Opening Balance + Total Sales - Total Receipts - Credit Notes
 *
 * For customers: Positive = they owe us, Negative = we owe them (advance)
 * For suppliers: Positive = we owe them, Negative = they owe us (advance)
 */
export async function calculatePartyOutstanding(partyId: string): Promise<{
  outstanding: number
  outstandingFormatted: string
  outstandingColor: 'green' | 'red' | 'grey'
}> {
  try {
    // Get the party to get opening balance
    const party = await getPartyById(partyId)
    if (!party) {
      return { outstanding: 0, outstandingFormatted: '₹0', outstandingColor: 'grey' }
    }

    let outstanding = party.openingBalance || 0

    // Get all invoices for this party
    if (isFirebaseReady()) {
      const invoicesRef = collection(db!, COLLECTIONS.INVOICES)

      // Get sales invoices where this party is the customer
      const salesQuery = query(invoicesRef, where('customerId', '==', partyId))
      const salesSnapshot = await getDocs(salesQuery)

      for (const doc of salesSnapshot.docs) {
        const invoice = doc.data()
        // Add invoice total (they owe us more)
        outstanding += Number(invoice.total || invoice.grandTotal || 0)
        // Subtract paid amount (they paid, so owe less)
        outstanding -= Number(invoice.paidAmount || 0)
      }

      // Also check purchases where this party is the supplier
      const purchasesQuery = query(invoicesRef, where('supplierId', '==', partyId))
      const purchasesSnapshot = await getDocs(purchasesQuery)

      for (const doc of purchasesSnapshot.docs) {
        const invoice = doc.data()
        // Subtract purchase total (we owe them more, so for our receivable view it's negative)
        // But for supplier, positive means we owe them
        if (party.type === 'supplier' || party.type === 'both') {
          outstanding += Number(invoice.total || invoice.grandTotal || 0)
          outstanding -= Number(invoice.paidAmount || 0)
        }
      }
    }

    // Use currentBalance if available (might be pre-calculated)
    if (party.currentBalance && party.currentBalance !== 0) {
      outstanding = party.currentBalance
    }

    return {
      outstanding,
      outstandingFormatted: formatCurrency(outstanding),
      outstandingColor: getOutstandingColor(outstanding)
    }
  } catch (error) {
    console.error('Error calculating outstanding for party:', partyId, error)
    return { outstanding: 0, outstandingFormatted: '₹0', outstandingColor: 'grey' }
  }
}

/**
 * Get all parties with their live outstanding balances
 * This is the main function for showing outstanding everywhere
 * Calculates from actual invoices for accurate real-time balances
 */
export async function getPartiesWithOutstanding(type?: 'customer' | 'supplier' | 'both'): Promise<Party[]> {
  const parties = await getParties(type)

  // If Firebase is not ready, return with static balances
  if (!isFirebaseReady()) {
    return parties.map(party => {
      const outstanding = party.currentBalance || party.openingBalance || 0
      return {
        ...party,
        outstanding,
        outstandingFormatted: formatCurrency(outstanding),
        outstandingColor: getOutstandingColor(outstanding)
      }
    })
  }

  // Get all invoices in one query for efficiency
  let allInvoices: any[] = []
  try {
    const invoicesRef = collection(db!, COLLECTIONS.INVOICES)
    const invoicesSnapshot = await getDocs(invoicesRef)
    allInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching invoices for outstanding calculation:', error)
  }

  // Calculate outstanding for each party from invoices
  const partiesWithOutstanding = parties.map(party => {
    let outstanding = party.openingBalance || 0

    // Get all possible party name variations (lowercase, trimmed)
    const partyNames = [
      party.displayName?.trim()?.toLowerCase(),
      party.companyName?.trim()?.toLowerCase(),
      party.name?.trim()?.toLowerCase()
    ].filter(Boolean) as string[]

    // For customers: add sales invoices, subtract payments
    if (party.type === 'customer' || party.type === 'both') {
      const customerInvoices = allInvoices.filter(inv => {
        // Skip purchase invoices
        if (inv.type === 'purchase' || inv.billType === 'purchase') return false

        // Match by ID (most reliable) - check all possible ID fields
        if (inv.customerId && party.id && inv.customerId === party.id) return true
        if (inv.partyId && party.id && inv.partyId === party.id) return true

        // Match by name - check ALL possible invoice name fields
        const invoiceNames = [
          inv.customerName?.trim()?.toLowerCase(),
          inv.partyName?.trim()?.toLowerCase(),  // Sales uses partyName
          inv.customer?.name?.trim()?.toLowerCase(),
          inv.customer?.trim()?.toLowerCase()
        ].filter(Boolean) as string[]

        // Check if ANY invoice name matches ANY party name
        for (const invName of invoiceNames) {
          for (const pName of partyNames) {
            if (invName === pName) return true
          }
        }

        return false
      })

      for (const invoice of customerInvoices) {
        const total = Number(invoice.total || invoice.grandTotal || invoice.amount || 0)
        // Check multiple possible paid amount fields
        const paid = Number(
          invoice.payment?.paidAmount ||
          invoice.paidAmount ||
          invoice.amountPaid ||
          (invoice.payment?.status === 'paid' ? (invoice.total || invoice.grandTotal || 0) : 0) ||
          0
        )
        outstanding += (total - paid)
      }
    }

    // For suppliers: add purchase invoices, subtract payments
    if (party.type === 'supplier' || party.type === 'both') {
      const supplierInvoices = allInvoices.filter(inv => {
        // Only count purchase invoices
        if (inv.type !== 'purchase' && inv.billType !== 'purchase') return false

        // Match by ID (most reliable)
        if (inv.supplierId && party.id && inv.supplierId === party.id) return true
        if (inv.partyId && party.id && inv.partyId === party.id) return true

        // Match by name - check ALL possible invoice name fields
        const invoiceNames = [
          inv.supplierName?.trim()?.toLowerCase(),
          inv.partyName?.trim()?.toLowerCase(),  // Purchases may use partyName
          inv.supplier?.name?.trim()?.toLowerCase(),
          inv.supplier?.trim()?.toLowerCase(),
          inv.vendor?.name?.trim()?.toLowerCase(),
          inv.vendorName?.trim()?.toLowerCase()
        ].filter(Boolean) as string[]

        // Check if ANY invoice name matches ANY party name
        for (const invName of invoiceNames) {
          for (const pName of partyNames) {
            if (invName === pName) return true
          }
        }

        return false
      })

      for (const invoice of supplierInvoices) {
        const total = Number(invoice.total || invoice.grandTotal || invoice.amount || 0)
        // Check multiple possible paid amount fields
        const paid = Number(
          invoice.payment?.paidAmount ||
          invoice.paidAmount ||
          invoice.amountPaid ||
          (invoice.payment?.status === 'paid' ? (invoice.total || invoice.grandTotal || 0) : 0) ||
          0
        )
        outstanding += (total - paid)
      }
    }

    // Also use currentBalance if manually set (override calculated)
    if (party.currentBalance && party.currentBalance !== 0) {
      outstanding = party.currentBalance
    }

    return {
      ...party,
      outstanding,
      outstandingFormatted: formatCurrency(outstanding),
      outstandingColor: getOutstandingColor(outstanding)
    }
  })

  return partiesWithOutstanding
}

/**
 * Update party's current balance (call this after invoice/payment operations)
 */
export async function updatePartyBalance(partyId: string, amountChange: number): Promise<boolean> {
  try {
    const party = await getPartyById(partyId)
    if (!party) return false

    const newBalance = (party.currentBalance || 0) + amountChange

    return await updateParty(partyId, {
      currentBalance: newBalance
    })
  } catch (error) {
    console.error('Error updating party balance:', error)
    return false
  }
}
