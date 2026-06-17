import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { firestoreDb } from './firebase'

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

function currentCompanyId(): string {
  const raw = localStorage.getItem('user')
  if (!raw) throw new Error('Not authenticated')
  const user = JSON.parse(raw)
  if (!user.companyId) throw new Error('Missing company profile')
  return user.companyId
}

function parsePath(path: string): { collectionName: string; id?: string } {
  const [collectionName, id] = path.replace(/^\/+/, '').split('/').map(decodeURIComponent)
  if (!collectionName) throw new Error(`Invalid API path: ${path}`)
  return { collectionName, id }
}

function makeId(collectionName: string): string {
  return `${collectionName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefined(entryValue)])
    )
  }

  return value
}

export async function apiGet<T>(path: string): Promise<T> {
  const { collectionName, id } = parsePath(path)
  const companyId = currentCompanyId()

  if (id) {
    const snap = await getDoc(doc(firestoreDb, collectionName, id))
    if (!snap.exists()) throw new Error('Not found')
    return { data: snap.data() } as T
  }

  const q = query(collection(firestoreDb, collectionName), where('companyId', '==', companyId))
  const snap = await getDocs(q)
  const data = snap.docs
    .map((d) => d.data())
    .sort((a: any, b: any) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return { data } as ListResponse<unknown> as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { collectionName } = parsePath(path)
  const companyId = currentCompanyId()
  const now = new Date().toISOString()
  const payload = typeof body === 'object' && body !== null ? { ...(body as any) } : {}
  const id = typeof payload.id === 'string' && payload.id ? payload.id : makeId(collectionName)
  const data = {
    ...payload,
    id,
    companyId,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  }

  const cleanData = removeUndefined(data)
  await setDoc(doc(firestoreDb, collectionName, id), cleanData as Record<string, unknown>)
  return { data: cleanData } as OneResponse<unknown> as T
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const { collectionName, id } = parsePath(path)
  if (!id) throw new Error(`Missing record id for ${path}`)
  const companyId = currentCompanyId()
  const ref = doc(firestoreDb, collectionName, id)
  const existing = await getDoc(ref)
  const existingData = existing.exists() ? existing.data() : {}
  const now = new Date().toISOString()
  const payload = typeof body === 'object' && body !== null ? { ...(body as any) } : {}
  const data = {
    ...existingData,
    ...payload,
    id,
    companyId,
    createdAt: existingData.createdAt || payload.createdAt || now,
    updatedAt: now,
  }

  const cleanData = removeUndefined(data)
  await setDoc(ref, cleanData as Record<string, unknown>)
  return { data: cleanData } as OneResponse<unknown> as T
}

export async function apiDelete<T>(path: string): Promise<T> {
  const { collectionName, id } = parsePath(path)
  if (!id) throw new Error(`Missing record id for ${path}`)
  await deleteDoc(doc(firestoreDb, collectionName, id))
  return { ok: true } as T
}
