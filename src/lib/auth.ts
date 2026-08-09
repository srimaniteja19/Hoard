export const DEFAULT_SINGLE_TENANT_USER_ID = "usr_owner_default";

export async function getAuthenticatedUserId(): Promise<string> {
  // Single-tenant default owner ID. When Better-Auth / OAuth session is present,
  // this returns session.user.id.
  return process.env.SINGLE_TENANT_USER_ID || DEFAULT_SINGLE_TENANT_USER_ID;
}
