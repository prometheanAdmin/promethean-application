'use client';

import { api } from './api';

export interface AuthSyncResponse {
  user_id: string;
  roles: string[];
  is_new_user: boolean;
}

export interface SyncableClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  primaryEmailAddress?: {
    emailAddress: string;
  } | null;
}

export async function syncClerkUser(
  user: SyncableClerkUser,
  authToken?: string
): Promise<AuthSyncResponse | null> {
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  return api.post<AuthSyncResponse>(
    '/api/v1/auth/sync',
    {
      clerk_user_id: user.id,
      email,
      first_name: user.firstName ?? undefined,
      last_name: user.lastName ?? undefined,
      avatar_url: user.imageUrl ?? undefined,
    },
    authToken ? { authToken } : undefined
  );
}
