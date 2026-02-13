import sqlite3 from 'sqlite3'
import { createPool, type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'
import type { Env } from './env'

export type SqliteDB = { driver: 'sqlite'; sqlite: sqlite3.Database }
export type MysqlDB = { driver: 'mysql'; pool: Pool }
export type DB = SqliteDB | MysqlDB

export function openDb(env: Env): DB {
  if (env.DB_DRIVER === 'mysql') {
    const pool = createPool({
      host: env.MYSQL_HOST!,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER!,
      password: env.MYSQL_PASSWORD!,
      database: env.MYSQL_DATABASE!,
      waitForConnections: true,
      connectionLimit: env.MYSQL_CONNECTION_LIMIT,
      charset: 'utf8mb4',
      ssl: env.MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
    })

    return { driver: 'mysql', pool }
  }

  // sqlite3 opens (and creates) the DB file at `DATABASE_PATH`.
  return { driver: 'sqlite', sqlite: new sqlite3.Database(env.DATABASE_PATH) }
}

export function closeDb(db: DB): Promise<void> {
  if (db.driver === 'mysql') return db.pool.end()
  return new Promise((resolve, reject) => {
    db.sqlite.close((err) => (err ? reject(err) : resolve()))
  })
}

export async function run(db: DB, sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  if (db.driver === 'mysql') {
    const [result] = await db.pool.execute<ResultSetHeader>(sql, params)
    return { lastID: Number(result.insertId) || 0, changes: Number(result.affectedRows) || 0 }
  }

  return new Promise((resolve, reject) => {
    db.sqlite.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

export async function get<T>(db: DB, sql: string, params: any[] = []): Promise<T | undefined> {
  if (db.driver === 'mysql') {
    const [rows] = await db.pool.execute<RowDataPacket[]>(sql, params)
    return (rows as unknown as T[])[0]
  }

  return new Promise((resolve, reject) => {
    db.sqlite.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row as T | undefined)
    })
  })
}

export async function all<T>(db: DB, sql: string, params: any[] = []): Promise<T[]> {
  if (db.driver === 'mysql') {
    const [rows] = await db.pool.execute<RowDataPacket[]>(sql, params)
    return rows as unknown as T[]
  }

  return new Promise((resolve, reject) => {
    db.sqlite.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve((rows || []) as T[])
    })
  })
}

async function ensureMysqlIndexes(db: MysqlDB): Promise<void> {
  // MySQL doesn't support CREATE INDEX IF NOT EXISTS consistently across versions.
  // We attempt to create and ignore duplicate errors.
  const statements = [
    `CREATE INDEX idx_records_company_type ON records(companyId, type)`,
    `CREATE INDEX idx_records_company_type_updated ON records(companyId, type, updatedAt)`,
  ]

  for (const sql of statements) {
    try {
      await run(db, sql)
    } catch {
      // ignore (likely "Duplicate key name")
    }
  }
}

export async function initDb(db: DB): Promise<void> {
  if (db.driver === 'mysql') {
    await run(
      db,
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        displayName VARCHAR(255) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        companyId VARCHAR(128) NOT NULL,
        role VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        createdAt VARCHAR(40) NOT NULL,
        lastLogin VARCHAR(40) NOT NULL,
        UNIQUE KEY uniq_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )

    await run(
      db,
      `CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(128) PRIMARY KEY,
        companyId VARCHAR(128) NOT NULL,
        type VARCHAR(64) NOT NULL,
        data LONGTEXT NOT NULL,
        createdAt VARCHAR(40) NOT NULL,
        updatedAt VARCHAR(40) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )

    await ensureMysqlIndexes(db)
    return
  }

  // Users table (auth)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      displayName TEXT NOT NULL,
      companyName TEXT NOT NULL,
      companyId TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastLogin TEXT NOT NULL
    )`
  )

  // Generic records table for all ERP entities.
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`
  )

  await run(db, `CREATE INDEX IF NOT EXISTS idx_records_company_type ON records(companyId, type)`)
  await run(db, `CREATE INDEX IF NOT EXISTS idx_records_company_type_updated ON records(companyId, type, updatedAt)`)
}

export type DbUserRow = {
  id: string
  email: string
  passwordHash: string
  displayName: string
  companyName: string
  companyId: string
  role: string
  status: string
  createdAt: string
  lastLogin: string
}

export async function getUserByEmail(db: DB, email: string): Promise<DbUserRow | undefined> {
  return get<DbUserRow>(db, `SELECT * FROM users WHERE email = ?`, [email.toLowerCase()])
}

export async function getUserById(db: DB, id: string): Promise<DbUserRow | undefined> {
  return get<DbUserRow>(db, `SELECT * FROM users WHERE id = ?`, [id])
}

export async function insertUser(db: DB, user: DbUserRow): Promise<void> {
  await run(
    db,
    `INSERT INTO users (id, email, passwordHash, displayName, companyName, companyId, role, status, createdAt, lastLogin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email.toLowerCase(),
      user.passwordHash,
      user.displayName,
      user.companyName,
      user.companyId,
      user.role,
      user.status,
      user.createdAt,
      user.lastLogin,
    ]
  )
}

export async function updateUserLastLogin(db: DB, userId: string, isoNow: string): Promise<void> {
  await run(db, `UPDATE users SET lastLogin = ? WHERE id = ?`, [isoNow, userId])
}

export type DbRecordRow = {
  id: string
  companyId: string
  type: string
  data: string
  createdAt: string
  updatedAt: string
}

export async function listRecords(db: DB, companyId: string, type: string): Promise<DbRecordRow[]> {
  return all<DbRecordRow>(
    db,
    `SELECT * FROM records WHERE companyId = ? AND type = ? ORDER BY updatedAt DESC`,
    [companyId, type]
  )
}

export async function getRecord(db: DB, companyId: string, type: string, id: string): Promise<DbRecordRow | undefined> {
  return get<DbRecordRow>(
    db,
    `SELECT * FROM records WHERE companyId = ? AND type = ? AND id = ?`,
    [companyId, type, id]
  )
}

export async function upsertRecord(
  db: DB,
  rec: { id: string; companyId: string; type: string; data: string; createdAt: string; updatedAt: string }
): Promise<void> {
  if (db.driver === 'mysql') {
    await run(
      db,
      `INSERT INTO records (id, companyId, type, data, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         companyId = ?,
         type = ?,
         data = ?,
         createdAt = ?,
         updatedAt = ?`,
      [
        rec.id,
        rec.companyId,
        rec.type,
        rec.data,
        rec.createdAt,
        rec.updatedAt,
        rec.companyId,
        rec.type,
        rec.data,
        rec.createdAt,
        rec.updatedAt,
      ]
    )
    return
  }

  await run(
    db,
    `INSERT INTO records (id, companyId, type, data, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       companyId = excluded.companyId,
       type = excluded.type,
       data = excluded.data,
       createdAt = excluded.createdAt,
       updatedAt = excluded.updatedAt`,
    [rec.id, rec.companyId, rec.type, rec.data, rec.createdAt, rec.updatedAt]
  )
}

export async function deleteRecord(db: DB, companyId: string, type: string, id: string): Promise<void> {
  await run(db, `DELETE FROM records WHERE companyId = ? AND type = ? AND id = ?`, [companyId, type, id])
}

