import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { User } from './user.model';

function publicUser(user: { _id: unknown; name: string; email: string; role: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

function issueToken(userId: string) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, options);
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || !decoded.exp || !decoded.iat) {
    throw new Error('Could not determine JWT lifetime');
  }
  return { token, expiresInSeconds: Math.max(1, decoded.exp - decoded.iat) };
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw new HttpError(409, 'Email is already registered');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });
  return { user: publicUser(user), ...issueToken(String(user._id)) };
}

export async function login(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new HttpError(401, 'Invalid email or password');

  return { user: publicUser(user), ...issueToken(String(user._id)) };
}

export async function getUserById(id: string) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  return publicUser(user);
}
