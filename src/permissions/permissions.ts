// Embuni ELC — Permission catalogue (backend copy).
// MIRRORS the frontend `src/lib/rbac/permissions.ts` exactly.
// Both surfaces must remain in sync — when a permission is added here it
// must also be added there (and to the role-permission matrix below).

export const PERMISSIONS = [
  // Common (every authenticated leader)
  { key: "dashboard.view", name: "View dashboard", module: "dashboard", action: "view" },
  { key: "profile.own.edit", name: "Edit own profile", module: "profile", action: "edit", scope: "own" },
  { key: "notifications.own.view", name: "View own notifications", module: "notifications", action: "view", scope: "own" },
  { key: "concerns.submit", name: "Submit concerns/feedback", module: "concerns", action: "submit" },

  // Leaders
  { key: "leaders.view", name: "View all leaders", module: "leaders", action: "view", scope: "all" },
  { key: "leaders.view.male_y1", name: "View Male Year 1 leaders", module: "leaders", action: "view", scope: "male_y1" },
  { key: "leaders.view.female_y1", name: "View Female Year 1 leaders", module: "leaders", action: "view", scope: "female_y1" },
  { key: "leaders.view.female_y1_readonly", name: "View Female Year 1 leaders (read-only)", module: "leaders", action: "view", scope: "female_y1_readonly" },
  { key: "leaders.manage", name: "Manage leaders (create/update status)", module: "leaders", action: "manage", scope: "all" },

  // Programs
  { key: "programs.view", name: "View programs", module: "programs", action: "view" },
  { key: "programs.manage", name: "Manage programs", module: "programs", action: "manage" },

  // Events
  { key: "events.view", name: "View events", module: "events", action: "view" },
  { key: "events.manage", name: "Manage events", module: "events", action: "manage" },

  // Attendance
  { key: "attendance.view", name: "View attendance", module: "attendance", action: "view" },
  { key: "attendance.manage", name: "Record attendance", module: "attendance", action: "manage" },
  { key: "attendance.manage.male_y1", name: "Record attendance for Male Year 1", module: "attendance", action: "manage", scope: "male_y1" },
  { key: "attendance.manage.female_y1", name: "Record attendance for Female Year 1", module: "attendance", action: "manage", scope: "female_y1" },
  { key: "attendance.view.female_y1", name: "View attendance for Female Year 1 (read-only)", module: "attendance", action: "view", scope: "female_y1" },

  // News
  { key: "news.view", name: "View news", module: "news", action: "view" },
  { key: "news.manage", name: "Manage news", module: "news", action: "manage" },

  // Announcements
  { key: "announcements.view", name: "View announcements", module: "announcements", action: "view" },
  { key: "announcements.manage", name: "Manage announcements", module: "announcements", action: "manage" },

  // Finance
  { key: "finance.view", name: "View finance records", module: "finance", action: "view" },
  { key: "finance.manage", name: "Manage finance records", module: "finance", action: "manage" },

  // Mentorship
  { key: "mentorship.view", name: "View mentorship", module: "mentorship", action: "view" },
  { key: "mentorship.manage", name: "Manage mentorship", module: "mentorship", action: "manage" },

  // Alumni
  { key: "alumni.view", name: "View alumni", module: "alumni", action: "view" },
  { key: "alumni.manage", name: "Manage alumni", module: "alumni", action: "manage" },

  // Gallery
  { key: "gallery.view", name: "View gallery", module: "gallery", action: "view" },
  { key: "gallery.manage", name: "Manage gallery", module: "gallery", action: "manage" },

  // Resources
  { key: "resources.view", name: "View resources", module: "resources", action: "view" },
  { key: "resources.manage", name: "Manage resources", module: "resources", action: "manage" },

  // Reports
  { key: "reports.view", name: "View reports", module: "reports", action: "view" },
  { key: "reports.generate", name: "Generate reports", module: "reports", action: "generate" },
  { key: "reports.export", name: "Export reports", module: "reports", action: "export" },

  // Meetings
  { key: "meetings.view", name: "View meetings", module: "meetings", action: "view" },
  { key: "meetings.manage", name: "Manage meetings", module: "meetings", action: "manage" },
  { key: "meetings.approve", name: "Approve meeting minutes", module: "meetings", action: "approve" },

  // Documents
  { key: "documents.view", name: "View documents", module: "documents", action: "view" },
  { key: "documents.upload", name: "Upload documents", module: "documents", action: "upload" },
  { key: "documents.approve", name: "Approve documents", module: "documents", action: "approve" },

  // Audit
  { key: "audit.view", name: "View audit logs", module: "audit", action: "view" },

  // Administration
  { key: "admin.users", name: "Administer users", module: "admin", action: "users" },
  { key: "admin.roles", name: "Administer roles", module: "admin", action: "roles" },
  { key: "admin.system", name: "System administration", module: "admin", action: "system" },

  // Concerns management (for executive who receives concerns)
  { key: "concerns.manage", name: "Manage concerns/feedback", module: "concerns", action: "manage" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

// Map for quick lookup by key.
export const PERMISSION_BY_KEY: Record<
  string,
  (typeof PERMISSIONS)[number]
> = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p]));

// All permission keys as a plain array (for seeding / iteration).
export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key);
