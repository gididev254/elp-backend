// Reports service — role-scoped overview + CSV export.
// Mirrors the frontend `lib/reports/overview.ts` and `/api/reports/*` handlers.

import { db } from "../config/database";
import { getLeaderScopeFilter } from "../permissions/representativePermissions";
import type { LeaderScopeFilter, ResolvedUser, ServiceResult } from "../types/auth";

export type ReportView =
  | "chapter"
  | "finance"
  | "events"
  | "content"
  | "mentorship"
  | "alumni"
  | "cohort";

export interface ReportOverview {
  view: ReportView;
  scopeLabel: string;
  summary: { label: string; value: string; hint?: string }[];
  chart: {
    title: string;
    series: { key: string; label: string; color?: string }[];
    data: { label: string; value: number; value2?: number }[];
  };
  table: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  };
}

function resolveReportView(
  primaryRole: string | null,
  restrictToCohort: boolean,
): ReportView {
  if (restrictToCohort) return "cohort";
  switch (primaryRole) {
    case "SUPER_ADMIN":
    case "PRESIDENT":
    case "VICE_PRESIDENT":
    case "SECRETARY_GENERAL":
      return "chapter";
    case "TREASURER":
      return "finance";
    case "ORGANIZING_SECRETARY":
      return "events";
    case "COMMUNICATIONS_DIRECTOR":
      return "content";
    case "MENTORSHIP_COORDINATOR":
      return "mentorship";
    case "ALUMNI_MANAGER":
      return "alumni";
    default:
      return "chapter";
  }
}

function describeScope(
  view: ReportView,
  scope: LeaderScopeFilter,
): string {
  if (scope.restrictToCohort) {
    const genderLabel =
      scope.gender === "male" ? "Male" : scope.gender === "female" ? "Female" : "";
    const yearLabel = scope.yearOfStudy ? `Year ${scope.yearOfStudy} ` : "";
    return `${genderLabel} ${yearLabel}cohort`.replace(/\s+/g, " ").trim();
  }
  switch (view) {
    case "finance":
      return "Treasury";
    case "events":
      return "Events & Activities";
    case "content":
      return "Communications";
    case "mentorship":
      return "Mentorship";
    case "alumni":
      return "Alumni Network";
    default:
      return "Chapter-wide";
  }
}

export async function buildReportOverview(
  user: ResolvedUser,
): Promise<ServiceResult<ReportOverview>> {
  const scope = getLeaderScopeFilter(user);
  const view = resolveReportView(user.primaryRole, scope.restrictToCohort);
  const scopeLabel = describeScope(view, scope);

  let overview: ReportOverview;
  switch (view) {
    case "chapter":
      overview = await buildChapterOverview(scopeLabel);
      break;
    case "finance":
      overview = await buildFinanceOverview(scopeLabel);
      break;
    case "events":
      overview = await buildEventsOverview(scopeLabel);
      break;
    case "content":
      overview = await buildContentOverview(scopeLabel);
      break;
    case "mentorship":
      overview = await buildMentorshipOverview(scopeLabel);
      break;
    case "alumni":
      overview = await buildAlumniOverview(scopeLabel);
      break;
    case "cohort":
      overview = await buildCohortOverview(scopeLabel, scope);
      break;
  }
  return { ok: true, status: 200, data: overview };
}

async function buildChapterOverview(scopeLabel: string): Promise<ReportOverview> {
  const now = new Date();
  const [
    totalLeaders,
    activeEvents,
    publishedNews,
    financeByType,
    mentorshipAssignments,
    alumniCount,
    attendanceCounts,
    upcomingEventsCount,
  ] = await Promise.all([
    db.user.count({
      where: { status: "active", userRoles: { some: { role: { key: "LEADER" } } } },
    }),
    db.event.count({ where: { status: { in: ["published", "ongoing"] } } }),
    db.newsArticle.count({ where: { status: "published" } }),
    db.financialRecord.groupBy({ by: ["type"], _sum: { amount: true } }),
    db.mentorshipAssignment.count({ where: { status: "active" } }),
    db.alumni.count({ where: { status: "active" } }),
    db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
    db.event.count({
      where: { status: { in: ["published", "ongoing"] }, startAt: { gte: now } },
    }),
  ]);

  const totalIncome =
    financeByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    financeByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const totalAttendance = attendanceCounts.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceCounts.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const months: { label: string; income: number; expenditure: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("en", { month: "short" }),
      income: 0,
      expenditure: 0,
    });
  }
  const records = await db.financialRecord.findMany({
    where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
    select: { type: true, amount: true, date: true },
  });
  for (const r of records) {
    const offset =
      (now.getFullYear() - r.date.getFullYear()) * 12 +
      (now.getMonth() - r.date.getMonth());
    const idx = 5 - offset;
    if (idx >= 0 && idx < 6) {
      if (r.type === "income") months[idx].income += r.amount;
      else months[idx].expenditure += r.amount;
    }
  }

  const topEvents = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 5,
    include: { _count: { select: { registrations: true, attendance: true } } },
  });

  return {
    view: "chapter",
    scopeLabel,
    summary: [
      { label: "Active leaders", value: String(totalLeaders) },
      {
        label: "Upcoming events",
        value: String(upcomingEventsCount),
        hint: `${activeEvents} published total`,
      },
      { label: "Published news", value: String(publishedNews) },
      { label: "Total income", value: `KES ${Math.round(totalIncome).toLocaleString()}` },
      { label: "Total expenditure", value: `KES ${Math.round(totalExpenditure).toLocaleString()}` },
      { label: "Net balance", value: `KES ${Math.round(totalIncome - totalExpenditure).toLocaleString()}` },
      {
        label: "Attendance rate",
        value: `${attendanceRate}%`,
        hint: `${presentCount} of ${totalAttendance} marks`,
      },
      { label: "Mentorship assignments", value: String(mentorshipAssignments) },
      { label: "Alumni records", value: String(alumniCount) },
    ],
    chart: {
      title: "Income vs Expenditure (last 6 months)",
      series: [
        { key: "value", label: "Income", color: "hsl(var(--chart-1))" },
        { key: "value2", label: "Expenditure", color: "hsl(var(--chart-2))" },
      ],
      data: months.map((m) => ({ label: m.label, value: m.income, value2: m.expenditure })),
    },
    table: {
      title: "Recent events",
      columns: ["Title", "Date", "Registrations", "Attendance"],
      rows: topEvents.map((e) => [
        e.title,
        e.startAt.toLocaleDateString(),
        e._count.registrations,
        e._count.attendance,
      ]),
    },
  };
}

async function buildFinanceOverview(scopeLabel: string): Promise<ReportOverview> {
  const [totalsByType, byCategoryRaw, budgets] = await Promise.all([
    db.financialRecord.groupBy({ by: ["type"], _sum: { amount: true } }),
    db.financialRecord.groupBy({ by: ["category", "type"], _sum: { amount: true } }),
    db.budget.findMany({ where: { status: "approved" } }),
  ]);

  const totalIncome = totalsByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    totalsByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const net = totalIncome - totalExpenditure;
  const plannedIncome = budgets.reduce((s, b) => s + b.plannedIncome, 0);
  const plannedExpenditure = budgets.reduce((s, b) => s + b.plannedExpenditure, 0);
  const incomeVariance = plannedIncome - totalIncome;
  const expenditureVariance = plannedExpenditure - totalExpenditure;

  const categoryMap = new Map<string, { income: number; expenditure: number }>();
  for (const row of byCategoryRaw) {
    const key = row.category ?? "other";
    if (!categoryMap.has(key)) categoryMap.set(key, { income: 0, expenditure: 0 });
    const bucket = categoryMap.get(key)!;
    if (row.type === "income") bucket.income += row._sum.amount ?? 0;
    else bucket.expenditure += row._sum.amount ?? 0;
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([label, v]) => ({ label, value: v.income, value2: v.expenditure }))
    .sort((a, b) => b.value + b.value2 - (a.value + a.value2))
    .slice(0, 6);

  const recentTx = await db.financialRecord.findMany({
    orderBy: { date: "desc" },
    take: 8,
    include: { recordedBy: { include: { profile: { select: { fullName: true } } } } },
  });

  return {
    view: "finance",
    scopeLabel,
    summary: [
      { label: "Total income", value: `KES ${Math.round(totalIncome).toLocaleString()}` },
      { label: "Total expenditure", value: `KES ${Math.round(totalExpenditure).toLocaleString()}` },
      { label: "Net balance", value: `KES ${Math.round(net).toLocaleString()}`, hint: net >= 0 ? "Surplus" : "Deficit" },
      { label: "Approved budgets", value: String(budgets.length) },
      { label: "Planned income", value: `KES ${Math.round(plannedIncome).toLocaleString()}` },
      { label: "Planned expenditure", value: `KES ${Math.round(plannedExpenditure).toLocaleString()}` },
      { label: "Income variance", value: `KES ${Math.round(incomeVariance).toLocaleString()}`, hint: incomeVariance >= 0 ? "Under plan" : "Over plan" },
      { label: "Expenditure variance", value: `KES ${Math.round(expenditureVariance).toLocaleString()}`, hint: expenditureVariance >= 0 ? "Under budget" : "Over budget" },
    ],
    chart: {
      title: "Transactions by category",
      series: [
        { key: "value", label: "Income", color: "hsl(var(--chart-1))" },
        { key: "value2", label: "Expenditure", color: "hsl(var(--chart-2))" },
      ],
      data: categoryData,
    },
    table: {
      title: "Recent transactions",
      columns: ["Date", "Type", "Category", "Description", "Amount"],
      rows: recentTx.map((t) => [
        t.date.toLocaleDateString(),
        t.type,
        t.category ?? "—",
        t.description.length > 40 ? t.description.slice(0, 40) + "…" : t.description,
        `KES ${Math.round(t.amount).toLocaleString()}`,
      ]),
    },
  };
}

async function buildEventsOverview(scopeLabel: string): Promise<ReportOverview> {
  const now = new Date();
  const [upcoming, pastEvents, totalRegistrations, attendanceCounts, byCategory] =
    await Promise.all([
      db.event.count({
        where: { status: { in: ["published", "ongoing"] }, startAt: { gte: now } },
      }),
      db.event.count({ where: { status: "completed" } }),
      db.eventRegistration.count(),
      db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
      db.event.groupBy({ by: ["category"], _count: { _all: true } }),
    ]);

  const totalAttendance = attendanceCounts.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceCounts.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const recentEvents = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 8,
    include: { _count: { select: { registrations: true, attendance: true } } },
  });

  return {
    view: "events",
    scopeLabel,
    summary: [
      { label: "Upcoming events", value: String(upcoming) },
      { label: "Past (completed) events", value: String(pastEvents) },
      { label: "Total registrations", value: String(totalRegistrations) },
      { label: "Attendance rate", value: `${attendanceRate}%`, hint: `${presentCount} of ${totalAttendance} marks` },
    ],
    chart: {
      title: "Events by category",
      series: [{ key: "value", label: "Events", color: "hsl(var(--chart-1))" }],
      data: byCategory.map((c) => ({
        label: c.category ?? "uncategorised",
        value: c._count._all,
      })),
    },
    table: {
      title: "Recent events",
      columns: ["Title", "Date", "Category", "Registrations", "Attendance"],
      rows: recentEvents.map((e) => [
        e.title,
        e.startAt.toLocaleDateString(),
        e.category ?? "—",
        e._count.registrations,
        e._count.attendance,
      ]),
    },
  };
}

async function buildContentOverview(scopeLabel: string): Promise<ReportOverview> {
  const [news, announcements, gallery, resources, newsByCategory] = await Promise.all([
    db.newsArticle.count({ where: { status: "published" } }),
    db.announcement.count({ where: { status: "published" } }),
    db.galleryMedia.count({ where: { status: "published" } }),
    db.resource.count({ where: { status: "published" } }),
    db.newsArticle.groupBy({
      by: ["category"],
      where: { status: "published" },
      _count: { _all: true },
    }),
  ]);

  const recentNews = await db.newsArticle.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 8,
    include: { author: { include: { profile: { select: { fullName: true } } } } },
  });

  return {
    view: "content",
    scopeLabel,
    summary: [
      { label: "Published news", value: String(news) },
      { label: "Published announcements", value: String(announcements) },
      { label: "Gallery items", value: String(gallery) },
      { label: "Resources", value: String(resources) },
    ],
    chart: {
      title: "News by category",
      series: [{ key: "value", label: "Articles", color: "hsl(var(--chart-1))" }],
      data: newsByCategory.map((c) => ({
        label: c.category ?? "uncategorised",
        value: c._count._all,
      })),
    },
    table: {
      title: "Recent articles",
      columns: ["Title", "Category", "Author", "Published"],
      rows: recentNews.map((n) => [
        n.title.length > 50 ? n.title.slice(0, 50) + "…" : n.title,
        n.category ?? "—",
        n.author?.profile?.fullName ?? "—",
        n.publishedAt ? n.publishedAt.toLocaleDateString() : "—",
      ]),
    },
  };
}

async function buildMentorshipOverview(scopeLabel: string): Promise<ReportOverview> {
  const [assignments, sessions, byStatus, activeAssignments] = await Promise.all([
    db.mentorshipAssignment.count(),
    db.mentorshipSession.count(),
    db.mentorshipAssignment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.mentorshipAssignment.count({ where: { status: "active" } }),
  ]);

  const completed = byStatus.find((s) => s.status === "completed")?._count._all ?? 0;
  const completionRate =
    assignments > 0 ? Math.round((completed / assignments) * 100) : 0;

  const recentSessions = await db.mentorshipSession.findMany({
    orderBy: { heldAt: "desc" },
    take: 8,
    include: {
      mentor: { include: { profile: { select: { fullName: true } } } },
      mentee: { include: { profile: { select: { fullName: true } } } },
    },
  });

  return {
    view: "mentorship",
    scopeLabel,
    summary: [
      { label: "Total assignments", value: String(assignments) },
      { label: "Active assignments", value: String(activeAssignments) },
      { label: "Sessions logged", value: String(sessions) },
      { label: "Completion rate", value: `${completionRate}%`, hint: `${completed} completed` },
    ],
    chart: {
      title: "Assignments by status",
      series: [{ key: "value", label: "Assignments", color: "hsl(var(--chart-1))" }],
      data: byStatus.map((s) => ({ label: s.status, value: s._count._all })),
    },
    table: {
      title: "Recent sessions",
      columns: ["Title", "Date", "Mentor", "Mentee"],
      rows: recentSessions.map((s) => [
        s.title,
        s.heldAt.toLocaleDateString(),
        s.mentor.profile?.fullName ?? "—",
        s.mentee?.profile?.fullName ?? "—",
      ]),
    },
  };
}

async function buildAlumniOverview(scopeLabel: string): Promise<ReportOverview> {
  const [total, byEngagement, byGradYear] = await Promise.all([
    db.alumni.count({ where: { status: "active" } }),
    db.alumni.groupBy({
      by: ["engagementLevel"],
      where: { status: "active" },
      _count: { _all: true },
    }),
    db.alumni.groupBy({
      by: ["graduationYear"],
      where: { status: "active" },
      _count: { _all: true },
      orderBy: { graduationYear: "desc" },
      take: 12,
    }),
  ]);

  const recentAlumni = await db.alumni.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    view: "alumni",
    scopeLabel,
    summary: [
      { label: "Total alumni", value: String(total) },
      { label: "Active engagement", value: String(byEngagement.find((e) => e.engagementLevel === "active")?._count._all ?? 0) },
      { label: "Mentors", value: String(byEngagement.find((e) => e.engagementLevel === "mentor")?._count._all ?? 0) },
      { label: "Passive", value: String(byEngagement.find((e) => e.engagementLevel === "passive")?._count._all ?? 0) },
    ],
    chart: {
      title: "Alumni by graduation year",
      series: [{ key: "value", label: "Graduates", color: "hsl(var(--chart-1))" }],
      data: byGradYear.map((g) => ({
        label: String(g.graduationYear),
        value: g._count._all,
      })),
    },
    table: {
      title: "Recent alumni records",
      columns: ["Name", "Graduation", "Engagement", "Occupation"],
      rows: recentAlumni.map((a) => [
        a.fullName,
        String(a.graduationYear),
        a.engagementLevel,
        a.currentOccupation ?? "—",
      ]),
    },
  };
}

async function buildCohortOverview(
  scopeLabel: string,
  scope: LeaderScopeFilter,
): Promise<ReportOverview> {
  const profileWhere: Record<string, unknown> = {};
  if (scope.gender) profileWhere.gender = scope.gender;
  if (scope.yearOfStudy) profileWhere.yearOfStudy = scope.yearOfStudy;

  const totalLeaders = await db.user.count({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
  });

  const cohortKey = scope.gender === "male" ? "male_y1" : "female_y1";
  const concerns = await db.concern.groupBy({
    by: ["status"],
    where: { cohort: cohortKey },
    _count: { _all: true },
  });
  const totalConcerns = concerns.reduce((s, c) => s + c._count._all, 0);

  const cohortUserIds = await db.user.findMany({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
    select: { id: true },
  });
  const cohortIdList = cohortUserIds.map((u) => u.id);

  const attendanceRows = cohortIdList.length
    ? await db.attendance.groupBy({
        by: ["status"],
        where: { userId: { in: cohortIdList } },
        _count: { _all: true },
      })
    : [];
  const totalAttendance = attendanceRows.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceRows.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const bySchool = await db.profile.groupBy({
    by: ["school"],
    where: profileWhere,
    _count: { _all: true },
  });

  const cohortMembers = await db.user.findMany({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
    include: { profile: true },
    orderBy: { profile: { fullName: "asc" } },
    take: 12,
  });

  return {
    view: "cohort",
    scopeLabel,
    summary: [
      { label: "Leaders in cohort", value: String(totalLeaders) },
      { label: "Attendance rate", value: `${attendanceRate}%`, hint: `${presentCount} of ${totalAttendance} marks` },
      { label: "Concerns submitted", value: String(totalConcerns), hint: "Your cohort" },
      { label: "Open concerns", value: String(concerns.find((c) => c.status === "open")?._count._all ?? 0) },
    ],
    chart: {
      title: "Cohort by school",
      series: [{ key: "value", label: "Leaders", color: "hsl(var(--chart-1))" }],
      data: bySchool.map((s) => ({ label: s.school ?? "Unknown", value: s._count._all })),
    },
    table: {
      title: "Cohort members",
      columns: ["Name", "Year", "School", "Email"],
      rows: cohortMembers.map((u) => [
        u.profile?.fullName ?? u.email,
        u.profile?.yearOfStudy ? `Year ${u.profile.yearOfStudy}` : "—",
        u.profile?.school ?? "—",
        u.email,
      ]),
    },
  };
}

// ===========================================================================
// CSV export
// ===========================================================================

export type ExportType =
  | "leaders"
  | "events"
  | "finance"
  | "attendance"
  | "mentorship"
  | "alumni";

export interface ExportResult {
  csv: string;
  filename: string;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(
  columns: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const header = columns.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  return `${header}\n${body}`;
}

async function exportLeaders(scope: LeaderScopeFilter): Promise<ExportResult> {
  const where: Record<string, unknown> = {
    status: "active",
    userRoles: { some: { role: { key: "LEADER" } } },
  };
  if (scope.restrictToCohort) {
    where.profile = {
      ...(scope.gender ? { gender: scope.gender } : {}),
      ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
    };
  }
  const leaders = await db.user.findMany({
    where,
    include: { profile: true, userRoles: { include: { role: true } } },
    orderBy: { profile: { fullName: "asc" } },
    take: 500,
  });
  const rows = leaders.map((u) => [
    u.profile?.fullName ?? "Unknown",
    u.email,
    u.profile?.gender ?? "",
    u.profile?.yearOfStudy ?? "",
    u.profile?.school ?? "",
    u.profile?.program ?? "",
    u.profile?.phone ?? "",
    u.status,
    u.userRoles.map((ur) => ur.role.name).join("; "),
  ]);
  return {
    csv: toCsv(
      ["Name", "Email", "Gender", "Year", "School", "Program", "Phone", "Status", "Roles"],
      rows,
    ),
    filename: `leaders-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

async function exportEvents(): Promise<ExportResult> {
  const events = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 500,
    include: { _count: { select: { registrations: true, attendance: true } } },
  });
  const rows = events.map((e) => [
    e.title,
    e.category ?? "",
    e.startAt.toISOString(),
    e.venue ?? "",
    e.status,
    e._count.registrations,
    e._count.attendance,
  ]);
  return {
    csv: toCsv(
      ["Title", "Category", "Start (ISO)", "Venue", "Status", "Registrations", "Attendance"],
      rows,
    ),
    filename: `events-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

async function exportFinance(): Promise<ExportResult> {
  const records = await db.financialRecord.findMany({
    orderBy: { date: "desc" },
    take: 500,
  });
  const rows = records.map((r) => [
    r.date.toISOString().slice(0, 10),
    r.type,
    r.category ?? "",
    r.description,
    r.amount,
    r.currency,
    r.reference ?? "",
  ]);
  return {
    csv: toCsv(
      ["Date", "Type", "Category", "Description", "Amount", "Currency", "Reference"],
      rows,
    ),
    filename: `finance-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

async function exportAttendance(scope: LeaderScopeFilter): Promise<ExportResult> {
  let userIdFilter: string[] | null = null;
  if (scope.restrictToCohort) {
    const cohortUsers = await db.user.findMany({
      where: {
        status: "active",
        userRoles: { some: { role: { key: "LEADER" } } },
        profile: {
          ...(scope.gender ? { gender: scope.gender } : {}),
          ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
        },
      },
      select: { id: true },
    });
    userIdFilter = cohortUsers.map((u) => u.id);
  }

  const where = userIdFilter ? { userId: { in: userIdFilter } } : {};
  const records = await db.attendance.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    take: 1000,
    include: {
      user: { include: { profile: { select: { fullName: true, gender: true, yearOfStudy: true } } } },
      event: { select: { title: true, startAt: true } },
    },
  });
  const rows = records.map((a) => [
    a.event.title,
    a.event.startAt.toISOString().slice(0, 10),
    a.user.profile?.fullName ?? a.user.email,
    a.user.profile?.gender ?? "",
    a.user.profile?.yearOfStudy ?? "",
    a.status,
    a.recordedAt.toISOString().slice(0, 10),
    a.note ?? "",
  ]);
  return {
    csv: toCsv(
      ["Event", "Event Date", "Leader", "Gender", "Year", "Attendance Status", "Recorded At", "Note"],
      rows,
    ),
    filename: `attendance-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

async function exportMentorship(): Promise<ExportResult> {
  const assignments = await db.mentorshipAssignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      mentor: { include: { profile: { select: { fullName: true } } } },
      mentee: { include: { profile: { select: { fullName: true } } } },
      _count: { select: { sessions: true } },
    },
  });
  const rows = assignments.map((a) => [
    a.mentor.profile?.fullName ?? a.mentor.email,
    a.mentee.profile?.fullName ?? a.mentee.email,
    a.status,
    a.notes ?? "",
    a._count.sessions,
    a.createdAt.toISOString().slice(0, 10),
  ]);
  return {
    csv: toCsv(
      ["Mentor", "Mentee", "Status", "Notes", "Sessions", "Created At"],
      rows,
    ),
    filename: `mentorship-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

async function exportAlumni(): Promise<ExportResult> {
  const alumni = await db.alumni.findMany({
    where: { status: "active" },
    orderBy: { graduationYear: "desc" },
    take: 500,
  });
  const rows = alumni.map((a) => [
    a.fullName,
    a.email,
    a.graduationYear,
    a.formerRole ?? "",
    a.school ?? "",
    a.program ?? "",
    a.currentOccupation ?? "",
    a.engagementLevel,
  ]);
  return {
    csv: toCsv(
      ["Name", "Email", "Graduation Year", "Former Role", "School", "Program", "Current Occupation", "Engagement"],
      rows,
    ),
    filename: `alumni-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function exportReport(
  type: ExportType,
  user: ResolvedUser,
): Promise<ServiceResult<ExportResult>> {
  const scope = getLeaderScopeFilter(user);
  let result: ExportResult;
  switch (type) {
    case "leaders":
      result = await exportLeaders(scope);
      break;
    case "events":
      result = await exportEvents();
      break;
    case "finance":
      result = await exportFinance();
      break;
    case "attendance":
      result = await exportAttendance(scope);
      break;
    case "mentorship":
      result = await exportMentorship();
      break;
    case "alumni":
      result = await exportAlumni();
      break;
  }
  return { ok: true, status: 200, data: result };
}
