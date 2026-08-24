import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import * as controller from './auth.controller';
import { requireAuth } from './auth.middleware';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();
authRouter.post('/register', validateBody(registerSchema), controller.register);
authRouter.post('/login', validateBody(loginSchema), controller.login);
authRouter.get('/me', requireAuth, controller.me);
