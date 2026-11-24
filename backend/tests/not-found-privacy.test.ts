import { notFound } from '../src/middleware/not-found';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../src/errors/http-error';

describe('notFound middleware', () => {
  it('does not expose query parameters or sensitive URL content', () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/unknown?access_token=private-secret&email=patient%40example.com'
    } as Request;
    let received: unknown;
    notFound(request, {} as Response, ((error: unknown) => { received = error; }) as NextFunction);
    expect(received).toBeInstanceOf(HttpError);
    const error = received as HttpError;
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('ROUTE_NOT_FOUND');
    expect(error.message).not.toContain('private-secret');
    expect(error.message).not.toContain('patient');
    expect(error.message).not.toContain('access_token');
  });
});
