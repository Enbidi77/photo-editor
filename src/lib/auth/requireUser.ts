import 'server-only';
import { getCurrentUser } from './getCurrentUser';
import { User } from '@supabase/supabase-js';

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
