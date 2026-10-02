// Route index — mounts all module routers under the `/api` prefix.

import { Router, type Request, type Response } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import adminRoutes from "./admin.routes";
import leadersRoutes from "./leaders.routes";
import rolesRoutes from "./roles.routes";
import permissionsRoutes from "./permissions.routes";
import programsRoutes from "./programs.routes";
import eventsRoutes from "./events.routes";
import attendanceRoutes from "./attendance.routes";
import announcementsRoutes from "./announcements.routes";
import notificationsRoutes from "./notifications.routes";
import alumniRoutes from "./alumni.routes";
import auditRoutes from "./audit.routes";
import concernsRoutes from "./concerns.routes";
import financeRoutes from "./finance.routes";
import galleryRoutes from "./gallery.routes";
import mentorshipRoutes from "./mentorship.routes";
import messagesRoutes from "./messages.routes";
import reportsRoutes from "./reports.routes";
import searchRoutes from "./search.routes";
import uploadRoutes from "./upload.routes";
import { healthController } from "../controllers/auth.controller";

const api = Router();

// Health check — unauthenticated, used by uptime monitors.
api.get("/health", healthController);

// Identity & RBAC.
api.use("/auth", authRoutes);
api.use("/users", usersRoutes);
api.use("/admin", adminRoutes);
api.use("/leaders", leadersRoutes);
api.use("/roles", rolesRoutes);
api.use("/permissions", permissionsRoutes);

// Programs & events.
api.use("/programs", programsRoutes);
api.use("/events", eventsRoutes);
api.use("/attendance", attendanceRoutes);

// Communications.
api.use("/announcements", announcementsRoutes);
api.use("/notifications", notificationsRoutes);
api.use("/messages", messagesRoutes);

// Treasury.
api.use("/finance", financeRoutes);

// Mentorship & alumni.
api.use("/mentorship", mentorshipRoutes);
api.use("/alumni", alumniRoutes);

// Gallery & uploads.
api.use("/gallery", galleryRoutes);
api.use("/upload", uploadRoutes);

// Year-1 Rep concerns.
api.use("/concerns", concernsRoutes);

// Reports & search.
api.use("/reports", reportsRoutes);
api.use("/search", searchRoutes);

// Audit trail (read-only).
api.use("/audit", auditRoutes);

// API root — lists mounted modules.
api.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Embuni ELC API",
    version: "0.2.0",
    modules: [
      "auth",
      "users",
      "admin",
      "leaders",
      "roles",
      "permissions",
      "programs",
      "events",
      "attendance",
      "announcements",
      "notifications",
      "messages",
      "finance",
      "mentorship",
      "alumni",
      "gallery",
      "upload",
      "concerns",
      "reports",
      "search",
      "audit",
    ],
  });
});

export default api;
