import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { User } from './user.model';

function publicUser(user: { _id: unknown; name: string; email: string; role: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

function signToken(userId: string) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw new HttpError(409, 'Email is already registered');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });
  return { user: publicUser(user), token: signToken(String(user._id)) };
}

export async function login(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new HttpError(401, 'Invalid email or password');

  return { user: publicUser(user), token: signToken(String(user._id)) };
}

export async function getUserById(id: string) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  return publicUser(user);
}
