import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { DB } from '../db'
import { getUserByEmail, insertUser, updateUserLastLogin } from '../db'
import { signJwt } from '../auth'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  companyName: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const deriveCompanyId = (email: string, companyName: string) => {
  const source = companyName && companyName.trim().length > 0 ? companyName : (email.split('@')[1] || '')
  return (
    source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'default-company'
  )
}

export function buildAuthRouter(opts: { db: DB; jwtSecret: string }) {
  const { db, jwtSecret } = opts
  const router = express.Router()

  // Register a new company admin (training-center single-tenant per companyId)
  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })

    const email = parsed.data.email.toLowerCase()
    const existing = await getUserByEmail(db, email)
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const isoNow = new Date().toISOString()
    const userId = uuidv4()
    const companyId = deriveCompanyId(email, parsed.data.companyName)
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    await insertUser(db, {
      id: userId,
      email,
      passwordHash,
      displayName: parsed.data.displayName,
      companyName: parsed.data.companyName,
      companyId,
      role: 'admin',
      status: 'active',
      createdAt: isoNow,
      lastLogin: isoNow,
    })

    const token = signJwt({ sub: userId, email, companyId, role: 'admin' }, jwtSecret)

    return res.json({
      token,
      user: {
        uid: userId,
        email,
        displayName: parsed.data.displayName,
        companyName: parsed.data.companyName,
        companyId,
        role: 'admin',
        status: 'active',
        createdAt: isoNow,
        lastLogin: isoNow,
      },
    })
  })

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })

    const email = parsed.data.email.toLowerCase()
    const user = await getUserByEmail(db, email)
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' })

    const isoNow = new Date().toISOString()
    await updateUserLastLogin(db, user.id, isoNow)

    const token = signJwt({ sub: user.id, email: user.email, companyId: user.companyId, role: user.role as any }, jwtSecret)

    return res.json({
      token,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        companyName: user.companyName,
        companyId: user.companyId,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: isoNow,
      },
    })
  })

  return router
}

