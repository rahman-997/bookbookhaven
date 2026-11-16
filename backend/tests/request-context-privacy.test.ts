import { EventEmitter } from 'node:events';
import type { Request, Response, NextFunction } from 'express';

describe('request logging privacy', () => {
  it('does not log query strings on completed requests', async () => {
    jest.resetModules();
    jest.doMock('../src/config/env', () => ({ env: { NODE_ENV: 'production' } }));
    const { requestContext } = await import('../src/middleware/request-context');
    const response = new EventEmitter() as Response;
    response.locals = {};
    response.statusCode = 404;
    response.setHeader = jest.fn() as unknown as Response['setHeader'];
    const request = {
      method: 'GET',
      path: '/api/v1/books',
      originalUrl: '/api/v1/books?token=super-secret-value',
      header: () => undefined,
    } as unknown as Request;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      requestContext(request, response, (() => {}) as NextFunction);
      response.emit('finish');
      expect(log).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(String(log.mock.calls[0][0])) as { path: string };
      expect(entry.path).toBe('/api/v1/books');
      expect(JSON.stringify(entry)).not.toContain('super-secret-value');
    } finally {
      log.mockRestore();
      jest.dontMock('../src/config/env');
    }
  });
});
