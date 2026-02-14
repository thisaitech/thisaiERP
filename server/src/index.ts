import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { loadEnv } from './env'
import { initDb, openDb } from './db'
import { ensureDefaultAdmin } from './bootstrapAdmin'
import { buildAuthRouter } from './routes/auth'
import { buildEntityRouter } from './routes/entity'
import { requireAuth } from './auth'

async function main() {
  const env = loadEnv()

  const db = openDb(env)
  await initDb(db)
  await ensureDefaultAdmin(db, env)

  const app = express()

  app.use(express.json({ limit: '5mb' }))
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    })
  )

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', buildAuthRouter({ db, jwtSecret: env.JWT_SECRET }))

  const auth = requireAuth(env.JWT_SECRET)
  app.use('/api/items', auth, buildEntityRouter({ db, type: 'items' }))
  app.use('/api/parties', auth, buildEntityRouter({ db, type: 'parties' }))
  app.use('/api/invoices', auth, buildEntityRouter({ db, type: 'invoices' }))
  app.use('/api/expenses', auth, buildEntityRouter({ db, type: 'expenses' }))
  app.use('/api/quotations', auth, buildEntityRouter({ db, type: 'quotations' }))
  app.use('/api/leads', auth, buildEntityRouter({ db, type: 'leads' }))
  app.use('/api/banking', auth, buildEntityRouter({ db, type: 'banking' }))
  app.use('/api/settings', auth, buildEntityRouter({ db, type: 'settings' }))
  app.use('/api/permissions', auth, buildEntityRouter({ db, type: 'permissions' }))

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`)
  })
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
