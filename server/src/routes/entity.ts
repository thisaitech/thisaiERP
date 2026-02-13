import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import type { DB } from '../db'
import { deleteRecord, getRecord, listRecords, upsertRecord } from '../db'
import type { AuthedRequest } from '../auth'

const anyJson = z.unknown()

export function buildEntityRouter(opts: { db: DB; type: string }) {
  const { db, type } = opts
  const router = express.Router()

  router.get('/', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthenticated' })

    const rows = await listRecords(db, companyId, type)
    const data = rows.map((r) => {
      try {
        return JSON.parse(r.data)
      } catch {
        return { id: r.id, _raw: r.data }
      }
    })
    return res.json({ data })
  })

  router.get('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthenticated' })

    const row = await getRecord(db, companyId, type, req.params.id)
    if (!row) return res.status(404).json({ error: 'Not found' })

    try {
      return res.json({ data: JSON.parse(row.data) })
    } catch {
      return res.json({ data: { id: row.id, _raw: row.data } })
    }
  })

  router.post('/', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthenticated' })

    const parsed = anyJson.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body' })

    const now = new Date().toISOString()
    const body: any = parsed.data || {}
    const id = (body && typeof body === 'object' && 'id' in body && typeof (body as any).id === 'string')
      ? (body as any).id
      : uuidv4()

    // Ensure stable timestamps.
    if (body && typeof body === 'object') {
      body.id = id
      body.createdAt = body.createdAt || now
      body.updatedAt = now
      ;(body as any).companyId = (body as any).companyId || companyId
    }

    await upsertRecord(db, {
      id,
      companyId,
      type,
      data: JSON.stringify(body),
      createdAt: body.createdAt || now,
      updatedAt: now,
    })

    return res.status(201).json({ data: body })
  })

  router.put('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthenticated' })

    const parsed = anyJson.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body' })

    const now = new Date().toISOString()
    const body: any = parsed.data || {}
    const id = req.params.id

    const existing = await getRecord(db, companyId, type, id)
    const createdAt = existing?.createdAt || now

    if (body && typeof body === 'object') {
      body.id = id
      body.createdAt = body.createdAt || createdAt
      body.updatedAt = now
      ;(body as any).companyId = (body as any).companyId || companyId
    }

    await upsertRecord(db, {
      id,
      companyId,
      type,
      data: JSON.stringify(body),
      createdAt: body.createdAt || createdAt,
      updatedAt: now,
    })

    return res.json({ data: body })
  })

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthenticated' })

    await deleteRecord(db, companyId, type, req.params.id)
    return res.json({ ok: true })
  })

  return router
}

