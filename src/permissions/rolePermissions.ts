// Embuni ELC — Role catalogue and role-permission matrix (backend copy).
// MIRRORS the frontend `src/lib/rbac/roles.ts` exactly.
// This is the SINGLE SOURCE OF TRUTH for which role has which permissions
// on the backend. It MUST stay in sync with the frontend copy so that
// requests authenticated by either surface get the same authorization.

import { PERMISSIONS } from "./permissions";

// ---------- Common permissions (every authenticated leader) ----------
const COMMON = [
  "dashboard.view",
  "profile.own.edit",
  "notifications.own.view",
  "concerns.submit",
  "programs.view",
  "events.view",
  "news.view",
  "announcements.view",
  "gallery.view",
  "resources.view",
] as const;

// ---------- Role definitions ----------
export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  category: "admin" | "executive" | "year_rep" | "leader";
  isExecutive: boolean;
  isSystem?: boolean;
  permissions: readonly string[];
}

export const ROLES: RoleDefinition[] = [
  {
    key: "SUPER_ADMIN",
    name: "Technical Administrator",
    description:
      "System-level administrator with full control over platform configuration, users, roles, and infrastructure.",
    category: "admin",
    isExecutive: false,
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    key: "PRESIDENT",
    name: "President",
    description:
      "Overall chapter oversight, executive management, approvals, chapter-wide reports, strategic activities.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "leaders.manage",
      "programs.manage",
      "events.manage",
      "attendance.view",
      "news.manage",
      "announcements.manage",
      "finance.view",
      "finance.manage",
      "mentorship.view",
      "mentorship.manage",
      "alumni.view",
      "alumni.manage",
      "gallery.manage",
      "resources.manage",
      "reports.view",
      "reports.generate",
      "reports.export",
      "meetings.view",
      "meetings.manage",
      "meetings.approve",
      "documents.view",
      "documents.upload",
      "documents.approve",
      "audit.view",
      "concerns.manage",
    ],
  },
  {
    key: "VICE_PRESIDENT",
    name: "Vice President",
    description:
      "Supports the President, oversees assigned activities, coordinates executive responsibilities, delegated authority.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "programs.manage",
      "events.manage",
      "attendance.view",
      "news.view",
      "announcements.manage",
      "finance.view",
      "mentorship.view",
      "alumni.view",
      "gallery.view",
      "resources.view",
      "reports.view",
      "reports.generate",
      "reports.export",
      "meetings.view",
      "meetings.manage",
      "documents.view",
      "documents.upload",
      "concerns.manage",
    ],
  },
  {
    key: "SECRETARY_GENERAL",
    name: "Secretary General",
    description:
      "Chapter administration, records management, meeting management, minutes, official documentation.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "leaders.manage",
      "programs.view",
      "events.manage",
      "attendance.manage",
      "news.manage",
      "announcements.manage",
      "gallery.view",
      "resources.manage",
      "reports.view",
      "reports.generate",
      "audit.view",
      "concerns.manage",
    ],
  },
  {
    key: "ORGANIZING_SECRETARY",
    name: "Organizing Secretary",
    description:
      "Event planning, activity coordination, logistics, meeting organization, attendance management.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "programs.manage",
      "events.manage",
      "attendance.manage",
      "news.view",
      "announcements.manage",
      "gallery.manage",
      "resources.manage",
      "reports.view",
    ],
  },
  {
    key: "TREASURER",
    name: "Treasurer",
    description:
      "Financial records, transactions, budgets, income and expenditure tracking, financial reports.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view", // limited - can view leader list for finance context
      "programs.view",
      "events.view",
      "finance.view",
      "finance.manage",
      "reports.view",
      "reports.generate",
    ],
  },
  {
    key: "COMMUNICATIONS_DIRECTOR",
    name: "Communications Director",
    description:
      "Announcements, news, communications, media, publicity, chapter content management.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "programs.view",
      "events.view",
      "news.manage",
      "announcements.manage",
      "gallery.manage",
      "resources.manage",
      "reports.view",
    ],
  },
  {
    key: "MENTORSHIP_COORDINATOR",
    name: "Mentorship Coordinator",
    description:
      "Mentorship programs, mentor and mentee coordination, mentorship activities, progress tracking.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "programs.view",
      "events.view",
      "mentorship.view",
      "mentorship.manage",
      "reports.view",
    ],
  },
  {
    key: "ALUMNI_MANAGER",
    name: "Alumni Manager",
    description:
      "Alumni records, alumni engagement, networking activities, alumni-related programs.",
    category: "executive",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view",
      "programs.view",
      "events.view",
      "alumni.view",
      "alumni.manage",
      "announcements.manage",
      "mentorship.view",
      "resources.manage",
      "reports.view",
      "reports.generate",
    ],
  },
  {
    key: "MALE_Y1_REPRESENTATIVE",
    name: "Male Year 1 Representative",
    description:
      "Represents Male Year 1 Leaders. Scoped visibility to male year-1 cohort only.",
    category: "year_rep",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view.male_y1",
      "attendance.manage.male_y1",
      "concerns.submit",
      "reports.view",
    ],
  },
  {
    key: "FEMALE_Y1_REPRESENTATIVE",
    name: "Female Year 1 Representative",
    description:
      "Represents Female Year 1 Leaders. Scoped visibility to female year-1 cohort only.",
    category: "year_rep",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view.female_y1",
      "attendance.manage.female_y1",
      "concerns.submit",
      "reports.view",
    ],
  },
  {
    key: "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
    name: "Assistant Female Year 1 Representative",
    description:
      "Support role for the Female Year 1 Representative. Read-only access to female year-1 cohort; cannot manage.",
    category: "year_rep",
    isExecutive: true,
    permissions: [
      ...COMMON,
      "leaders.view.female_y1_readonly",
      "attendance.view.female_y1",
      "concerns.submit",
    ],
  },
  {
    key: "LEADER",
    name: "Leader",
    description:
      "Ordinary chapter member. The base role for all registered and approved chapter leaders.",
    category: "leader",
    isExecutive: false,
    isSystem: true,
    permissions: COMMON,
  },
];

// ---------- Helpers ----------

export function getRoleDefinition(key: string): RoleDefinition | undefined {
  return ROLES.find((r) => r.key === key);
}

export function isExecutiveRole(key: string): boolean {
  return ROLES.find((r) => r.key === key)?.isExecutive ?? false;
}

// Resolve the permission set for a given role.
// Returns a Set of permission keys the role has.
export function resolveRolePermissions(roleKey: string): Set<string> {
  const role = getRoleDefinition(roleKey);
  if (!role) return new Set();
  return new Set(role.permissions);
}
