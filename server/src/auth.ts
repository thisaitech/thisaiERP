import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export type AuthUser = {
  id: string
  email: string
  companyId: string
  role: 'admin' | 'manager' | 'cashier'
}

export type JwtPayload = {
  sub: string
  email: string
  companyId: string
  role: AuthUser['role']
}

export function signJwt(payload: JwtPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload
}

export type AuthedRequest = Request & { user?: JwtPayload }

export function requireAuth(secret: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || ''
    const [kind, token] = header.split(' ')
    if (kind !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    try {
      req.user = verifyJwt(token, secret)
      return next()
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

