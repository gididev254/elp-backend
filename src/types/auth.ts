// Auth-related types shared across the backend.

export interface ResolvedUser {
  id: string;
  email: string;
  name: string | null;
  roleKeys: string[]; // all assigned role keys
  primaryRole: string | null; // first executive/admin role, or LEADER
  permissions: Set<string>; // flattened permission keys (RBAC)
  status: string;
}

// Year-1 Rep scoping result — used to constrain leader / attendance
// queries to a gender+year cohort at the service layer.
export interface LeaderScopeFilter {
  gender?: string;
  yearOfStudy?: number;
  restrictToCohort: boolean;
  readOnly: boolean;
}

// Standardised API envelope returned by service-layer functions when they
// need to surface a non-200 outcome to the controller.
export type ServiceResult<T> =
  | { ok: true; data: T; status?: number }
  | { ok: false; error: string; status: number; details?: unknown };
