// Notifications service — list the current user's notifications and mark
// them as read. Mirrors frontend `/api/notifications/*`.

import { db } from "../config/database";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export async function listNotifications(
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: NotificationDTO[]; unreadCount: number }>> {
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: actor.id, read: false } }),
  ]);

  return {
    ok: true,
    status: 200,
    data: {
      items: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    },
  };
}

export async function markNotificationRead(
  id: string,
  actor: ResolvedUser,
): Promise<ServiceResult<{ message: string }>> {
  const notif = await db.notification.findUnique({ where: { id } });
  if (!notif) return { ok: false, error: "Notification not found.", status: 404 };
  if (notif.userId !== actor.id) {
    return { ok: false, error: "Not your notification.", status: 403 };
  }
  await db.notification.update({ where: { id }, data: { read: true } });
  return { ok: true, status: 200, data: { message: "Marked as read." } };
}

export async function markAllRead(
  actor: ResolvedUser,
): Promise<ServiceResult<{ message: string; updated: number }>> {
  const result = await db.notification.updateMany({
    where: { userId: actor.id, read: false },
    data: { read: true },
  });
  return {
    ok: true,
    status: 200,
    data: { message: "Marked all as read.", updated: result.count },
  };
}
