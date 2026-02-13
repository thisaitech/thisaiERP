import { z } from 'zod'

const boolFromEnv = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase())
  return Boolean(v)
}, z.boolean())

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  DB_DRIVER: z.enum(['sqlite', 'mysql']).default('sqlite'),
  DATABASE_PATH: z.string().default('./data.sqlite'),

  // Hostinger (MySQL/MariaDB) configuration.
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_SSL: boolFromEnv.default(false),
  MYSQL_CONNECTION_LIMIT: z.coerce.number().default(10),

  JWT_SECRET: z.string().min(16).default('dev-secret-change-me-please'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
}).superRefine((env, ctx) => {
  if (env.DB_DRIVER !== 'mysql') return

  // In MySQL mode we require connection params.
  const required: Array<keyof typeof env> = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
  for (const k of required) {
    if (!env[k] || String(env[k]).trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required env var for MySQL: ${String(k)}`,
        path: [k],
      })
    }
  }
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    PORT: process.env.PORT,
    DB_DRIVER: process.env.DB_DRIVER,
    DATABASE_PATH: process.env.DATABASE_PATH,

    MYSQL_HOST: process.env.MYSQL_HOST,
    MYSQL_PORT: process.env.MYSQL_PORT,
    MYSQL_USER: process.env.MYSQL_USER,
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE,
    MYSQL_SSL: process.env.MYSQL_SSL,
    MYSQL_CONNECTION_LIMIT: process.env.MYSQL_CONNECTION_LIMIT,

    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  })

  if (!parsed.success) {
    // Keep error readable in production logs.
    throw new Error(`Invalid server env: ${parsed.error.message}`)
  }

  return parsed.data
}
