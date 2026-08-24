import 'dotenv/config';
import { z } from 'zod';

const DEVELOPMENT_SECRET = 'development-only-secret-change-me';
const DEVELOPMENT_ADMIN_PASSWORD = 'ChangeMe123!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().min(1).default('0.0.0.0'),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/bookhaven'),
  JWT_SECRET: z.string().min(16).default(DEVELOPMENT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ADMIN_EMAIL: z.string().email().default('admin@bookhaven.local'),
  ADMIN_PASSWORD: z.string().min(8).default(DEVELOPMENT_ADMIN_PASSWORD)
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production') {
  if (parsed.JWT_SECRET === DEVELOPMENT_SECRET || parsed.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be explicitly configured with at least 32 characters in production');
  }
  if (parsed.ADMIN_PASSWORD === DEVELOPMENT_ADMIN_PASSWORD || parsed.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be explicitly configured with at least 12 characters in production');
  }
  if (parsed.MONGO_URI.startsWith('mongodb://localhost')) {
    throw new Error('MONGO_URI must be explicitly configured in production');
  }
  if (parsed.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
    throw new Error('CORS_ORIGIN cannot contain * when credentials are enabled in production');
  }
}

export const env = parsed;
