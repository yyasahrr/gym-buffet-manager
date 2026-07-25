import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '@/server/jwt';

const SECRET = 'test-secret';

describe('jwt', () => {
  it('signs and verifies a token roundtrip', () => {
    const t = signToken({ sub: 'u1', role: 'owner', tenantId: 't1' }, SECRET);
    const p = verifyToken(t, SECRET);
    expect(p).not.toBeNull();
    expect(p!.sub).toBe('u1');
    expect(p!.tenantId).toBe('t1');
    expect(p!.role).toBe('owner');
  });

  it('rejects tampered tokens', () => {
    const t = signToken({ sub: 'u1' }, SECRET);
    const last = t.slice(-1);
    const tampered = t.slice(0, -1) + (last === 'a' ? 'b' : 'a');
    expect(verifyToken(tampered, SECRET)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const t = signToken({ sub: 'u1' }, SECRET);
    expect(verifyToken(t, 'other-secret')).toBeNull();
  });

  it('rejects expired tokens', () => {
    const t = signToken({ sub: 'u1' }, SECRET, -10);
    expect(verifyToken(t, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not.a.jwt', SECRET)).toBeNull();
  });
});
