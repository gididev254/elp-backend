// Messages service — direct messaging between users.
// Mirrors the frontend `/api/messages` route handlers.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type { SendMessageInput } from "../validators/messages.validator";

// Role priority for "primary role" — mirrors resolveUser() in auth.service.
const EXEC_PRIORITY = [
  "SUPER_ADMIN",
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY_GENERAL",
  "ORGANIZING_SECRETARY",
  "TREASURER",
  "COMMUNICATIONS_DIRECTOR",
  "MENTORSHIP_COORDINATOR",
  "ALUMNI_MANAGER",
  "MALE_Y1_REPRESENTATIVE",
  "FEMALE_Y1_REPRESENTATIVE",
  "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
  "LEADER",
];

function pickPrimaryRole(roleKeys: string[]): string | null {
  if (roleKeys.length === 0) return null;
  for (const key of EXEC_PRIORITY) {
    if (roleKeys.includes(key)) return key;
  }
  return roleKeys[0]!;
}

export async function listMessages(
  box: "inbox" | "sent",
  actor: ResolvedUser,
): Promise<ServiceResult<{ box: string; items: unknown[] }>> {
  const messages = await db.message.findMany({
    where:
      box === "sent"
        ? { senderId: actor.id }
        : { recipientId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          profile: { select: { preferredName: true, fullName: true } },
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
      },
      recipient: {
        select: {
          id: true,
          email: true,
          profile: { select: { preferredName: true, fullName: true } },
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
      },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      box,
      items: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        subject: m.subject,
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
        sender: {
          id: m.sender.id,
          email: m.sender.email,
          name:
            m.sender.profile?.preferredName ??
            m.sender.profile?.fullName ??
            m.sender.email,
          primaryRole: pickPrimaryRole(m.sender.userRoles.map((ur) => ur.role.key)) ?? null,
          primaryRoleLabel: m.sender.userRoles[0]?.role?.name ?? null,
        },
        recipient: {
          id: m.recipient.id,
          email: m.recipient.email,
          name:
            m.recipient.profile?.preferredName ??
            m.recipient.profile?.fullName ??
            m.recipient.email,
          primaryRole: pickPrimaryRole(m.recipient.userRoles.map((ur) => ur.role.key)) ?? null,
          primaryRoleLabel: m.recipient.userRoles[0]?.role?.name ?? null,
        },
      })),
    },
  };
}

export async function sendMessage(
  input: SendMessageInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  if (input.recipientId === actor.id) {
    return { ok: false, error: "You cannot send a message to yourself.", status: 400 };
  }

  const recipient = await db.user.findUnique({
    where: { id: input.recipientId },
    select: {
      id: true,
      email: true,
      status: true,
    },
  });
  if (!recipient) {
    return { ok: false, error: "Recipient not found.", status: 404 };
  }
  if (recipient.status !== "active") {
    return { ok: false, error: "Recipient account is not active.", status: 400 };
  }

  const senderProfile = await db.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      profile: { select: { preferredName: true, fullName: true } },
    },
  });
  const senderName =
    senderProfile?.profile?.preferredName ??
    senderProfile?.profile?.fullName ??
    actor.email;

  // Create the message + a notification in a single transaction.
  const message = await db.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        senderId: actor.id,
        recipientId: input.recipientId,
        subject: input.subject,
        body: input.body,
      },
    });

    await tx.notification.create({
      data: {
        userId: recipient.id,
        type: "system",
        title: `New message from ${senderName}`,
        body: input.subject,
        link: "/dashboard/messages",
        read: false,
      },
    });

    return created;
  });

  await recordAudit({
    actorId: actor.id,
    action: "message.send",
    target: `message:${message.id}`,
    context: {
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      subject: message.subject,
      bodyLength: message.body.length,
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      subject: message.subject,
      body: message.body,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function getMessage(
  id: string,
  actor: ResolvedUser,
): Promise<ServiceResult<unknown>> {
  const message = await db.message.findUnique({
    where: { id },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          profile: { select: { preferredName: true, fullName: true } },
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
      },
      recipient: {
        select: {
          id: true,
          email: true,
          profile: { select: { preferredName: true, fullName: true } },
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
      },
    },
  });

  if (!message) {
    return { ok: false, error: "Message not found.", status: 404 };
  }

  if (message.senderId !== actor.id && message.recipientId !== actor.id) {
    return { ok: false, error: "You do not have access to this message.", status: 403 };
  }

  return {
    ok: true,
    status: 200,
    data: {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      subject: message.subject,
      body: message.body,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        name:
          message.sender.profile?.preferredName ??
          message.sender.profile?.fullName ??
          message.sender.email,
        primaryRole: pickPrimaryRole(message.sender.userRoles.map((ur) => ur.role.key)) ?? null,
        primaryRoleLabel: message.sender.userRoles[0]?.role?.name ?? null,
      },
      recipient: {
        id: message.recipient.id,
        email: message.recipient.email,
        name:
          message.recipient.profile?.preferredName ??
          message.recipient.profile?.fullName ??
          message.recipient.email,
        primaryRole: pickPrimaryRole(message.recipient.userRoles.map((ur) => ur.role.key)) ?? null,
        primaryRoleLabel: message.recipient.userRoles[0]?.role?.name ?? null,
      },
    },
  };
}

export async function deleteMessage(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; deleted: boolean }>> {
  const existing = await db.message.findUnique({
    where: { id },
    select: { id: true, senderId: true, recipientId: true, subject: true },
  });
  if (!existing) {
    return { ok: false, error: "Message not found.", status: 404 };
  }

  if (
    existing.senderId !== actor.id &&
    existing.recipientId !== actor.id
  ) {
    return { ok: false, error: "You can only delete your own messages.", status: 403 };
  }

  await db.message.delete({ where: { id } });

  await recordAudit({
    actorId: actor.id,
    action: "message.delete",
    target: `message:${existing.id}`,
    context: {
      subject: existing.subject,
      senderId: existing.senderId,
      recipientId: existing.recipientId,
      deletedBy: existing.senderId === actor.id ? "sender" : "recipient",
    },
    ip,
  });

  return { ok: true, status: 200, data: { id: existing.id, deleted: true } };
}

export async function markMessageRead(
  id: string,
  actor: ResolvedUser,
): Promise<ServiceResult<{ id: string; read: boolean }>> {
  const message = await db.message.findUnique({
    where: { id },
    select: { id: true, recipientId: true, read: true },
  });
  if (!message) {
    return { ok: false, error: "Message not found.", status: 404 };
  }
  if (message.recipientId !== actor.id) {
    return { ok: false, error: "Only the recipient can mark a message as read.", status: 403 };
  }
  if (message.read) {
    return { ok: true, status: 200, data: { id: message.id, read: true } };
  }

  await db.message.update({ where: { id }, data: { read: true } });
  return { ok: true, status: 200, data: { id: message.id, read: true } };
}

export async function listRecipients(
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: unknown[] }>> {
  const users = await db.user.findMany({
    where: {
      status: "active",
      NOT: { id: actor.id },
    },
    select: {
      id: true,
      email: true,
      profile: { select: { preferredName: true, fullName: true } },
      userRoles: { include: { role: { select: { key: true, name: true } } } },
    },
    orderBy: { email: "asc" },
    take: 500,
  });

  const items = users
    .map((u) => {
      const roleKeys = u.userRoles.map((ur) => ur.role.key);
      const primaryRoleKey = pickPrimaryRole(roleKeys);
      const primaryRoleRow = u.userRoles.find((ur) => ur.role.key === primaryRoleKey);
      const name = u.profile?.preferredName ?? u.profile?.fullName ?? u.email;
      return {
        id: u.id,
        name,
        email: u.email,
        role: primaryRoleKey ?? "LEADER",
        roleLabel: primaryRoleRow?.role?.name ?? "Leader",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ok: true, status: 200, data: { items } };
}
