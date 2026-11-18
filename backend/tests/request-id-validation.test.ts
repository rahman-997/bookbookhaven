import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from '../src/middleware/request-context';

function invoke(incomingId: string | undefined) {
  const req = { method: 'GET', path: '/health', header: () => incomingId } as unknown as Request;
  const res = new EventEmitter() as Response;
  res.locals = {};
  res.setHeader = jest.fn() as unknown as Response['setHeader'];
  const next = jest.fn();
  requestContext(req, res, next as NextFunction);
  const value = (res.setHeader as jest.Mock).mock.calls[0]?.[1] as string;
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.locals.requestId).toBe(value);
  return value;
}

describe('untrusted request ID validation', () => {
  it('preserves well-formed client identifiers', () => {
    expect(invoke('client:build-12.audit_2026')).toBe('client:build-12.audit_2026');
    expect(invoke('a'.repeat(128))).toBe('a'.repeat(128));
  });

  it.each(['', 'x'.repeat(129), 'x\\r\\nunsafe', 'unsafe space', 'unsafe\\tvalue', '⚠️'])(
    'generates a safe ID instead of reflecting an unsafe header',
    (incoming) => {
      const id = invoke(incoming);
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(id).not.toBe(incoming);
    },
  );
});
