// Audit log service — read-only list with filters (action, actor, search, date range).

import { db } from "../config/database";
import type { ServiceResult } from "../types/auth";

export interface ListAuditQuery {
  action?: string;
  actorId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  context: string | null;
  ip: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export async function listAudit(
  query: ListAuditQuery,
): Promise<
  ServiceResult<{
    items: AuditLogRow[];
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  }>
> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.actorId) where.actorId = query.actorId;

  const range: Record<string, Date> = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  if (Object.keys(range).length > 0) where.createdAt = range;

  if (query.search) {
    where.actor = {
      OR: [
        { email: { contains: query.search } },
        {
          profile: {
            OR: [
              { fullName: { contains: query.search } },
              { preferredName: { contains: query.search } },
            ],
          },
        },
      ],
    };
  }

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, preferredName: true } },
          },
        },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return {
    ok: true,
    status: 200,
    data: {
      items: items.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        action: a.action,
        target: a.target,
        context: a.context,
        ip: a.ip,
        createdAt: a.createdAt.toISOString(),
        actor: a.actor
          ? {
              id: a.actor.id,
              email: a.actor.email,
              name:
                a.actor.profile?.preferredName ||
                a.actor.profile?.fullName ||
                a.actor.email,
            }
          : null,
      })),
      page,
      pageSize,
      total,
      pages,
    },
  };
}
