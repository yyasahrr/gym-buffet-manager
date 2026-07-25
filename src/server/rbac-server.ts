import type { JwtPayload } from './jwt';
import { verifyToken } from './jwt';

export interface ServerSession extends JwtPayload {}

/** استخراج نشست از هدر Authorization (Bearer <token>). */
export function getSessionFromRequest(req: Request): ServerSession | null {
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyToken(match[1]);
}
