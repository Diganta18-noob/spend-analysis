import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
vi.mock('../db.js', async importOriginal => {
  const original = await importOriginal();
  return { ...original, upsertUser: vi.fn(), insertAuditLog: vi.fn(), getAccessibleAnalysis: vi.fn(async (id, access) => access.kind === 'admin' || access.ownerId === 'owner' ? { id, data: { transactions: [] } } : null), updateAccessibleAnalysis: vi.fn(async () => ({ id: 'a' })), deleteAnalysis: vi.fn(async (id, owner) => ({ deletedCount: owner === 'owner' ? 1 : 0 })) };
});
import { app } from '../server.js';
import { updateAccessibleAnalysis } from '../db.js';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
let server, base, previousKey;
beforeAll(async () => {
  previousKey = process.env.CLERK_JWT_KEY;
  process.env.CLERK_JWT_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
afterAll(async () => {
  if (previousKey === undefined) delete process.env.CLERK_JWT_KEY; else process.env.CLERK_JWT_KEY = previousKey;
  await new Promise(resolve => server.close(resolve));
});
const userToken = sub => jwt.sign({ sub }, keys.privateKey, { algorithm: 'RS256', expiresIn: '5m' });
const headers = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
describe('protected analysis routes with signed credentials', () => {
  it('rejects unauthenticated detail and mutations', async () => {
    expect((await fetch(`${base}/analyses/a`)).status).toBe(401);
    expect((await fetch(`${base}/analyses/a`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edits: [] }) })).status).toBe(401);
  });
  it('allows owner and admin details but hides cross-owner records', async () => {
    expect((await fetch(`${base}/analyses/a`, { headers: headers(userToken('owner')) })).status).toBe(200);
    expect((await fetch(`${base}/analyses/a`, { headers: headers(userToken('other')) })).status).toBe(404);
    const admin = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    expect((await fetch(`${base}/analyses/a`, { headers: headers(admin) })).status).toBe(200);
  });
  it('rejects payload replacement and accepts category-only changes', async () => {
    const options = { method: 'PUT', headers: headers(userToken('owner')) };
    expect((await fetch(`${base}/analyses/a`, { ...options, body: JSON.stringify({ transactions: [] }) })).status).toBe(400);
    expect((await fetch(`${base}/analyses/a`, { ...options, body: JSON.stringify({ edits: [{ index: 0, cat: 'Shopping' }] }) })).status).toBe(200);
    expect(updateAccessibleAnalysis).toHaveBeenCalledWith('a', [{ index: 0, cat: 'Shopping' }], { kind: 'owner', ownerId: 'owner' });
  });
  it('conceals cross-owner deletions and deletes an owned record', async () => {
    expect((await fetch(`${base}/v2/me/analyses/a`, { method: 'DELETE', headers: headers(userToken('other')) })).status).toBe(404);
    expect((await fetch(`${base}/v2/me/analyses/a`, { method: 'DELETE', headers: headers(userToken('owner')) })).status).toBe(200);
  });
});
