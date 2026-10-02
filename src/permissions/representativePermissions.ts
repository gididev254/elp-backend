// Year-1 Representative cohort scoping logic.
// MIRRORS the frontend `src/lib/rbac/server.ts` `getLeaderScopeFilter`.
//
// Returns a filter object that the service layer spreads into a Prisma
// `where` clause to constrain leader / attendance queries to the cohort
// the current user is allowed to see.

import type { LeaderScopeFilter, ResolvedUser } from "../types/auth";

export function getLeaderScopeFilter(user: ResolvedUser | null): LeaderScopeFilter {
  if (!user) return { restrictToCohort: true, readOnly: true };

  // Super admin & executives with leaders.view (all) see everyone.
  if (
    user.permissions.has("admin.system") ||
    user.permissions.has("leaders.view")
  ) {
    return { restrictToCohort: false, readOnly: false };
  }
  if (user.permissions.has("leaders.view.male_y1")) {
    return { gender: "male", yearOfStudy: 1, restrictToCohort: true, readOnly: false };
  }
  if (user.permissions.has("leaders.view.female_y1")) {
    return { gender: "female", yearOfStudy: 1, restrictToCohort: true, readOnly: false };
  }
  if (user.permissions.has("leaders.view.female_y1_readonly")) {
    return { gender: "female", yearOfStudy: 1, restrictToCohort: true, readOnly: true };
  }

  // Leader with no leaders.view at all — can only see self.
  return { restrictToCohort: true, readOnly: true };
}

// Whether a user can record/manage attendance at all (any cohort or all).
export function canManageAttendance(user: ResolvedUser | null): boolean {
  if (!user) return false;
  if (user.permissions.has("admin.system")) return true;
  return (
    user.permissions.has("attendance.manage") ||
    user.permissions.has("attendance.manage.male_y1") ||
    user.permissions.has("attendance.manage.female_y1")
  );
}

// Returns the gender scope a Year-1 rep is allowed to record attendance for.
// Returns null if the user can record attendance for everyone (admin / OrgSec).
export function getAttendanceGenderScope(
  user: ResolvedUser | null,
): "male" | "female" | "all" | null {
  if (!user) return null;
  if (user.permissions.has("admin.system") || user.permissions.has("attendance.manage")) {
    return "all";
  }
  if (user.permissions.has("attendance.manage.male_y1")) return "male";
  if (user.permissions.has("attendance.manage.female_y1")) return "female";
  return null;
}
