export const APP_ROLES = ['student', 'mentor', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const DEFAULT_APP_ROLE: AppRole = 'student';

/*
 * Role is stored in Clerk's publicMetadata (server-written, not user-writable).
 * unsafeMetadata is intentionally NOT used for role — it is client-writable,
 * which would allow a user to escalate their own role by patching the field.
 *
 * JWT template in Clerk Dashboard:
 *   { "role": "{{ user.public_metadata.role | default: \"student\" }}" }
 *
 * publicMetadata.role is set by the backend on POST /api/v1/auth/sync.
 */
type RoleCarrier = {
  publicMetadata?: Record<string, unknown> | null;
} | null | undefined;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole);
}

export function getAppRole(user: RoleCarrier): AppRole {
  return isAppRole(user?.publicMetadata?.role) ? user.publicMetadata!.role as AppRole : DEFAULT_APP_ROLE;
}

export function isStudentRole(role: AppRole) {
  return role === 'student';
}

export function isStaffRole(role: AppRole) {
  return role === 'mentor' || role === 'admin';
}
