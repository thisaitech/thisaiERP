import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { DB } from './db'
import { getUserByEmail, insertUser } from './db'
import type { Env } from './env'

function deriveCompanyId(email: string, companyName: string) {
  const source = companyName && companyName.trim().length > 0 ? companyName : email.split('@')[1] || ''

  return (
    source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'default-company'
  )
}

export async function ensureDefaultAdmin(db: DB, env: Env): Promise<void> {
  if (!env.DEFAULT_ADMIN_EMAIL || !env.DEFAULT_ADMIN_PASSWORD) return

  const email = env.DEFAULT_ADMIN_EMAIL.trim().toLowerCase()
  const existing = await getUserByEmail(db, email)
  if (existing) return

  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash(env.DEFAULT_ADMIN_PASSWORD, 10)
  const companyName = env.DEFAULT_ADMIN_COMPANY || 'Thisai Technology'

  await insertUser(db, {
    id: uuidv4(),
    email,
    passwordHash,
    displayName: env.DEFAULT_ADMIN_NAME || 'ThisAI Admin',
    companyName,
    companyId: deriveCompanyId(email, companyName),
    role: 'admin',
    status: 'active',
    createdAt: now,
    lastLogin: now,
  })
}
