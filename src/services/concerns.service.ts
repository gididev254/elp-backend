// Concerns service — Year-1 Rep → Executive feedback channel.
// Mirrors the frontend `/api/concerns` route handlers.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateConcernInput,
  UpdateConcernStatusInput,
} from "../validators/concerns.validator";

export async function listConcerns(
  actor: ResolvedUser,
): Promise<ServiceResult<unknown>> {
  const canManage =
    actor.permissions.has("concerns.manage") ||
    actor.permissions.has("admin.system");

  const where = canManage ? {} : { submittedById: actor.id };

  const concerns = await db.concern.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      submittedBy: { include: { profile: true } },
      assignedTo: { include: { profile: true } },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: concerns.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        cohort: c.cohort,
        status: c.status,
        submittedBy: {
          id: c.submittedBy.id,
          name: c.submittedBy.profile?.fullName ?? c.submittedBy.email,
        },
        assignedTo: c.assignedTo
          ? {
              id: c.assignedTo.id,
              name: c.assignedTo.profile?.fullName ?? c.assignedTo.email,
            }
          : null,
        createdAt: c.createdAt.toISOString(),
      })),
    },
  };
}

export async function createConcern(
  input: CreateConcernInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string }>> {
  const isMaleY1Rep = actor.permissions.has("leaders.view.male_y1");
  const isFemaleY1Rep =
    actor.permissions.has("leaders.view.female_y1") ||
    actor.permissions.has("leaders.view.female_y1_readonly");
  const isSuperAdmin = actor.permissions.has("admin.system");

  if (!isSuperAdmin) {
    if (input.cohort === "male_y1" && !isMaleY1Rep) {
      return {
        ok: false,
        error: "You can only submit concerns for your own cohort.",
        status: 403,
      };
    }
    if (input.cohort === "female_y1" && !isFemaleY1Rep) {
      return {
        ok: false,
        error: "You can only submit concerns for your own cohort.",
        status: 403,
      };
    }
  }

  const concern = await db.concern.create({
    data: {
      title: input.title,
      body: input.body,
      cohort: input.cohort,
      submittedById: actor.id,
      status: "open",
    },
  });

  // Notify all executives who can manage concerns.
  const execs = await db.user.findMany({
    where: {
      status: "active",
      userRoles: {
        some: {
          role: {
            permissions: {
              some: { permission: { key: "concerns.manage" } },
            },
          },
        },
      },
    },
  });
  for (const ex of execs) {
    await db.notification
      .create({
        data: {
          userId: ex.id,
          type: "concern_update",
          title: `New concern from ${actor.name ?? "Year-1 Rep"}`,
          body: input.title,
          link: "/dashboard/concerns",
        },
      })
      .catch(() => undefined);
  }

  await recordAudit({
    actorId: actor.id,
    action: "concern.create",
    target: `concern:${concern.id}`,
    context: { cohort: input.cohort, title: input.title },
    ip,
  });

  return { ok: true, status: 201, data: { id: concern.id, status: concern.status } };
}

export async function updateConcernStatus(
  id: string,
  input: UpdateConcernStatusInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ message: string; status: string }>> {
  const concern = await db.concern.findUnique({ where: { id } });
  if (!concern) {
    return { ok: false, error: "Concern not found.", status: 404 };
  }

  await db.concern.update({
    where: { id },
    data: {
      status: input.status,
      assignedTo:
        input.status === "open"
          ? { disconnect: true }
          : { connect: { id: actor.id } },
    },
  });

  await db.notification
    .create({
      data: {
        userId: concern.submittedById,
        type: "concern_update",
        title: `Concern ${input.status}`,
        body: `"${concern.title}" was ${input.status} by ${actor.name ?? "an executive"}.`,
        link: "/dashboard/concerns",
      },
    })
    .catch(() => undefined);

  await recordAudit({
    actorId: actor.id,
    action: `concern.status.${input.status}`,
    target: `concern:${id}`,
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: { message: "Status updated.", status: input.status },
  };
}
