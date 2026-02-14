import { config as loadEnvFile } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { loadEnv } from '../src/env.js'
import { closeDb, initDb, openDb, run } from '../src/db.js'

function usage(): never {
  // eslint-disable-next-line no-console
  console.log('Usage: npx tsx scripts/reset-user-password.ts <email> <newPassword>')
  process.exit(1)
}

async function main() {
  const [emailRaw, newPassword] = process.argv.slice(2)
  if (!emailRaw || !newPassword) usage()

  // Match server startup behavior: load `.env` from server/ or repo root.
  const envFiles = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '..', '.env')]
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      loadEnvFile({ path: file, override: true })
    }
  }

  const env = loadEnv()
  const db = openDb(env)
  await initDb(db)

  const email = emailRaw.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(newPassword, 10)

  const result = await run(db, `UPDATE users SET passwordHash = ? WHERE email = ?`, [passwordHash, email])
  await closeDb(db)

  if (result.changes === 0) {
    // eslint-disable-next-line no-console
    console.error(`No user found for email: ${email}`)
    process.exit(2)
  }

  // eslint-disable-next-line no-console
  console.log(`Password updated for: ${email}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

