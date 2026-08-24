import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../errors/http-error';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: res.locals.requestId
      }
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ success: false, error: { code: 'DATABASE_VALIDATION_ERROR', message: 'Stored data failed validation', requestId: res.locals.requestId } });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid resource identifier', requestId: res.locals.requestId } });
    return;
  }

  if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'A unique field already exists', requestId: res.locals.requestId } });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error', requestId: res.locals.requestId }
  });
};
