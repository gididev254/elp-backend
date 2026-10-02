// Embuni ELC — Database seed.
// Creates: permissions, roles (with role-permission matrix), super admin,
// 11 executive accounts, plus a batch of dummy Leaders with realistic
// Kenyan context. Idempotent: safe to re-run.
//
// Run with: `bun run db:seed`
//
// IMPORTANT: All credentials here are dev/demo only. Change before production.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../../frontend/src/lib/rbac/permissions";
import { ROLES } from "../../frontend/src/lib/rbac/roles";

const db = new PrismaClient();

const SUPER_ADMIN_EMAIL = "admin@embuni.ac.ke";
const SUPER_ADMIN_PASSWORD = "Embuni@2026";
const DEFAULT_PASSWORD = "Leader@2026"; // for dummy seeded accounts

type ExecSeed = {
  roleKey: string;
  fullName: string;
  email: string;
  gender: "male" | "female";
  yearOfStudy: number;
  school: string;
  program: string;
  phone: string;
  bio: string;
};

const EXEC_SEEDS: ExecSeed[] = [
  {
    roleKey: "PRESIDENT",
    fullName: "Brian Kamau Wanjiru",
    email: "president.elc@embuni.ac.ke",
    gender: "male",
    yearOfStudy: 4,
    school: "School of Business & Economics",
    program: "BSc Economics",
    phone: "+254712345678",
    bio: "Leading the chapter with focus on continuity, mentorship and impact.",
  },
  {
    roleKey: "VICE_PRESIDENT",
    fullName: "Faith Wanjiku Mwangi",
    email: "vp.elc@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 3,
    school: "School of Education & Social Sciences",
    program: "Bachelor of Education (Arts)",
    phone: "+254722345678",
    bio: "Supporting chapter initiatives and coordinating executive responsibilities.",
  },
  {
    roleKey: "SECRETARY_GENERAL",
    fullName: "Daniel Otieno Ochieng",
    email: "secretary.elc@embuni.ac.ke",
    gender: "male",
    yearOfStudy: 3,
    school: "School of Education & Social Sciences",
    program: "BA Political Science",
    phone: "+254733456789",
    bio: "Custodian of chapter records, minutes and official documentation.",
  },
  {
    roleKey: "ORGANIZING_SECRETARY",
    fullName: "Grace Auma Akinyi",
    email: "organizing.elc@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 2,
    school: "School of Agriculture",
    program: "BSc Agricultural Economics",
    phone: "+254711234567",
    bio: "Coordinating chapter events, activities and attendance.",
  },
  {
    roleKey: "TREASURER",
    fullName: "Kevin Maina Kariuki",
    email: "treasurer.elc@embuni.ac.ke",
    gender: "male",
    yearOfStudy: 4,
    school: "School of Business & Economics",
    program: "BSc Finance",
    phone: "+254712876543",
    bio: "Managing chapter finances, budgets and financial reporting.",
  },
  {
    roleKey: "COMMUNICATIONS_DIRECTOR",
    fullName: "Mercy Njeri Gathoni",
    email: "comms.elc@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 3,
    school: "School of Pure & Applied Sciences",
    program: "BSc Media Science",
    phone: "+254722876543",
    bio: "Chapter announcements, news and communications lead.",
  },
  {
    roleKey: "MENTORSHIP_COORDINATOR",
    fullName: "Samuel Kiprono Bett",
    email: "mentorship.elc@embuni.ac.ke",
    gender: "male",
    yearOfStudy: 4,
    school: "School of Pure & Applied Sciences",
    program: "BSc Computer Science",
    phone: "+254733876543",
    bio: "Coordinating mentorship programs and pairing mentors with mentees.",
  },
  {
    roleKey: "ALUMNI_MANAGER",
    fullName: "Janet Wambui Njoroge",
    email: "alumni.elc@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 4,
    school: "School of Business & Economics",
    program: "BSc Human Resource Management",
    phone: "+254711876543",
    bio: "Maintaining alumni records and engagement activities.",
  },
  {
    roleKey: "MALE_Y1_REPRESENTATIVE",
    fullName: "Erick Mutiso Mwende",
    email: "male.y1.rep@embuni.ac.ke",
    gender: "male",
    yearOfStudy: 1,
    school: "School of Engineering",
    program: "BSc Civil Engineering",
    phone: "+254712111222",
    bio: "Representing Male Year 1 Leaders in chapter affairs.",
  },
  {
    roleKey: "FEMALE_Y1_REPRESENTATIVE",
    fullName: "Cynthia Akoth Oluoch",
    email: "female.y1.rep@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 1,
    school: "School of Nursing",
    program: "BSc Nursing",
    phone: "+254722111222",
    bio: "Representing Female Year 1 Leaders in chapter affairs.",
  },
  {
    roleKey: "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
    fullName: "Sharon Chepngetich Koech",
    email: "asst.female.y1.rep@embuni.ac.ke",
    gender: "female",
    yearOfStudy: 1,
    school: "School of Agriculture",
    program: "BSc Food Science and Nutrition",
    phone: "+254733111222",
    bio: "Supporting the Female Year 1 Representative.",
  },
];

type LeaderSeed = {
  fullName: string;
  email: string;
  gender: "male" | "female";
  yearOfStudy: number;
  school: string;
  program: string;
  phone: string;
};

// 16 dummy Leaders — balanced across genders and years, heavy on Year 1 so
// the Y1 reps' dashboards have meaningful data.
const LEADER_SEEDS: LeaderSeed[] = [
  // Year 1 males (5)
  { fullName: "Victor Omondi Onyango", email: "v.omondi@embuni.ac.ke", gender: "male", yearOfStudy: 1, school: "School of Engineering", program: "BSc Electrical Engineering", phone: "+254712000001" },
  { fullName: "Felix Kipkirui Langat", email: "f.kipkirui@embuni.ac.ke", gender: "male", yearOfStudy: 1, school: "School of Pure & Applied Sciences", program: "BSc Mathematics", phone: "+254712000002" },
  { fullName: "Antony Mwangi Kamau", email: "a.mwangi2@embuni.ac.ke", gender: "male", yearOfStudy: 1, school: "School of Business & Economics", program: "BSc Economics", phone: "+254712000003" },
  { fullName: "Brian Kiptoo Biwott", email: "b.kiptoo@embuni.ac.ke", gender: "male", yearOfStudy: 1, school: "School of Agriculture", program: "BSc Agronomy", phone: "+254712000004" },
  { fullName: "Dennis Githinji Njagi", email: "d.githinji@embuni.ac.ke", gender: "male", yearOfStudy: 1, school: "School of Education & Social Sciences", program: "Bachelor of Education (Science)", phone: "+254712000005" },
  // Year 1 females (6 — so Female Y1 rep has more)
  { fullName: "Aisha Mohamed Hassan", email: "a.mohamed@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Nursing", program: "BSc Nursing", phone: "+254722000001" },
  { fullName: "Joy Wanjiru Kamau", email: "j.wanjiru@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Business & Economics", program: "BSc Accounting", phone: "+254722000002" },
  { fullName: "Faith Chepngeno Kiprono", email: "f.chepngeno@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Agriculture", program: "BSc Food Science", phone: "+254722000003" },
  { fullName: "Maryanne Atieno Owuor", email: "m.atieno@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Education & Social Sciences", program: "BA Sociology", phone: "+254722000004" },
  { fullName: "Tabitha Wairimu Gathoni", email: "t.wairimu@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Education & Social Sciences", program: "Bachelor of Education (Arts)", phone: "+254722000005" },
  { fullName: "Phyllis Mumbi Karanja", email: "p.mumbi@embuni.ac.ke", gender: "female", yearOfStudy: 1, school: "School of Pure & Applied Sciences", program: "BSc Library Science", phone: "+254722000006" },
  // Other years (5)
  { fullName: "Peter Njoroge Wachira", email: "p.njoroge@embuni.ac.ke", gender: "male", yearOfStudy: 2, school: "School of Engineering", program: "BSc Mechanical Engineering", phone: "+254712000006" },
  { fullName: "Ann Wairimu Kuria", email: "a.wairimu@embuni.ac.ke", gender: "female", yearOfStudy: 2, school: "School of Business & Economics", program: "BSc Marketing", phone: "+254722000007" },
  { fullName: "Joseph Mutua Kithuka", email: "j.mutua@embuni.ac.ke", gender: "male", yearOfStudy: 3, school: "School of Agriculture", program: "BSc Agricultural Economics", phone: "+254712000007" },
  { fullName: "Lucy Akinyi Owino", email: "l.akinyi@embuni.ac.ke", gender: "female", yearOfStudy: 3, school: "School of Nursing", program: "BSc Nursing", phone: "+254722000008" },
  { fullName: "David Kariuki Gikonyo", email: "d.kariuki@embuni.ac.ke", gender: "male", yearOfStudy: 4, school: "School of Pure & Applied Sciences", program: "BSc Physics", phone: "+254712000008" },
];

// Sample content for public-facing pages
const PROGRAM_SEEDS = [
  { title: "ELC Mentorship Circle", slug: "elc-mentorship-circle", category: "mentorship", summary: "Pairing senior leaders with first-year leaders for guidance.", description: "The ELC Mentorship Circle connects experienced chapter leaders with Year 1 leaders for academic, career and personal guidance. Each cohort runs one academic semester.", coverUrl: "/images/programs/program-1.png", status: "published" },
  { title: "Leadership Development Series", slug: "leadership-development-series", category: "leadership", summary: "Monthly leadership workshops featuring guest speakers.", description: "A monthly series of leadership workshops featuring guest speakers from industry, government, and civil society. Topics include project management, public speaking, and ethical leadership.", coverUrl: "/images/programs/program-2.png", status: "published" },
  { title: "Community Outreach Initiative", slug: "community-outreach-initiative", category: "community", summary: "Chapter-led service activities in Embu County.", description: "Quarterly community service activities coordinated with local partners in Embu County. Past activities include school visits, environmental clean-ups, and tree planting.", coverUrl: "/images/programs/program-3.png", status: "published" },
  { title: "Career Readiness Program", slug: "career-readiness-program", category: "career", summary: "Workshops on CVs, interviews and professional skills.", description: "A multi-week program covering CV writing, interview preparation, networking, and workplace etiquette. Open to all chapter leaders.", coverUrl: "/images/programs/program-4.png", status: "published" },
];

const EVENT_SEEDS = [
  { title: "Chapter Opening Ceremony 2026", slug: "chapter-opening-2026", category: "ceremony", summary: "Official launch of the 2026 chapter activities.", description: "Join us as we kick off the 2026 chapter year. The President will outline the year's strategic priorities, followed by networking.", coverUrl: "/images/events/event-1.png", venue: "Main Auditorium", location: "University of Embu Main Campus", startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: "published", capacity: 200 },
  { title: "Tree Planting Drive", slug: "tree-planting-drive", category: "outreach", summary: "Community service: planting trees at Embu primary schools.", description: "ELC leaders will plant 500 trees across three primary schools in Embu County. Transport and lunch provided.", coverUrl: "/images/events/event-2.png", venue: "Embu Town Primary Schools", location: "Embu Town", startAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: "published", capacity: 50 },
  { title: "Mentorship Launch Session", slug: "mentorship-launch-session", category: "workshop", summary: "First mentorship circle meeting of the semester.", description: "Mentors and mentees meet for the first time, set goals and agree on the meeting cadence for the semester.", coverUrl: "/images/events/event-3.png", venue: "Seminar Room 2", location: "School of Business", startAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), status: "published", capacity: 60 },
  { title: "Career Fair 2026", slug: "career-fair-2026", category: "social", summary: "Connect with employers and alumni in industry.", description: "Annual career fair bringing together employers, alumni, and chapter leaders for networking and recruitment conversations.", coverUrl: "/images/events/event-4.png", venue: "Student Centre Hall", location: "University of Embu", startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: "published", capacity: 300 },
  { title: "Cultural Night", slug: "cultural-night-2026", category: "social", summary: "Celebrating our diversity through music, dance, and food.", description: "An evening of cultural performances celebrating the diversity of the University of Embu community.", coverUrl: "/images/events/event-5.png", venue: "Open Air Theatre", location: "University of Embu", startAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: "completed", capacity: 400 },
  { title: "Alumni Networking Reception", slug: "alumni-networking-reception", category: "social", summary: "Reconnecting with past chapter leaders.", description: "An evening reception for current leaders to connect with ELC alumni who are now in industry, government, and postgraduate study.", coverUrl: "/images/events/event-6.png", venue: "Grand Hotel Embu", location: "Embu Town", startAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), status: "completed", capacity: 80 },
];

const NEWS_SEEDS = [
  { title: "Chapter Welcomes 2026 Executive Team", slug: "welcome-2026-executive", category: "announcement", summary: "Meet the 11-member executive team leading the chapter this year.", body: "The Embuni Equity Leaders Chapter is proud to announce the 2026 executive team, comprising the President, Vice President, Secretary General, Organizing Secretary, Treasurer, Communications Director, Mentorship Coordinator, Alumni Manager, and three Year 1 Representatives (Male, Female, and Assistant Female). Each role brings distinct responsibilities and the team is committed to advancing the chapter's mission.", coverUrl: "/images/news/news-1.png", status: "published" },
  { title: "New Mentorship Program Opens for Applications", slug: "mentorship-program-applications-open", category: "update", summary: "Year 1 leaders can now apply to join the ELC Mentorship Circle.", body: "The Mentorship Coordinator is pleased to announce that applications for the ELC Mentorship Circle are now open. The program pairs Year 1 leaders with experienced mentors for a semester of guided growth. Apply via the dashboard.", coverUrl: "/images/news/news-4.png", status: "published" },
  { title: "Annual General Meeting Minutes Published", slug: "agm-2025-minutes", category: "minute", summary: "Minutes from the 2025 Annual General Meeting are now available.", body: "The Secretary General has published the official minutes from the 2025 Annual General Meeting. Members may review the minutes in the Resources section. Highlights include the year-in-review, audited financials, and the 2026 strategic priorities.", coverUrl: "/images/news/news-5.png", status: "published" },
  { title: "Tree Planting Drive: A Day of Service", slug: "tree-planting-recap", category: "story", summary: "Recap of our community service event planting trees in Embu County.", body: "Last weekend, 45 chapter leaders planted 500 trees across three primary schools in Embu County. The Organizing Secretary coordinated logistics with school heads and the County Government. Thanks to all who participated.", coverUrl: "/images/news/news-2.png", status: "published" },
  { title: "Leadership Summit 2026: Key Takeaways", slug: "leadership-summit-2026-recap", category: "event_recap", summary: "Highlights from the chapter's annual leadership summit.", body: "The 2026 Leadership Summit brought together chapter leaders, alumni, and guest speakers for a day of workshops and panel discussions. Key themes included ethical leadership, digital stewardship, and community engagement.", coverUrl: "/images/news/news-3.png", status: "published" },
  { title: "Alumni Homecoming: Reconnecting Across Cohorts", slug: "alumni-homecoming-2026", category: "story", summary: "Past leaders returned to share their journeys with current members.", body: "The annual alumni homecoming drew over 80 past chapter members to campus for an evening of networking, storytelling, and mentorship. The Alumni Manager extends sincere thanks to all who attended.", coverUrl: "/images/news/news-6.png", status: "published" },
];

const GALLERY_SEEDS = [
  { title: "Chapter Opening Ceremony", caption: "Leaders gather at the main auditorium for the 2026 opening ceremony.", imageUrl: "/images/gallery/gallery-1.png", album: "Opening 2026" },
  { title: "Award Presentation", caption: "Recognising outstanding contributions to the chapter.", imageUrl: "/images/gallery/gallery-2.png", album: "Awards 2025" },
  { title: "Workshop Breakout", caption: "Small-group brainstorming during the leadership workshop.", imageUrl: "/images/gallery/gallery-3.png", album: "Workshops" },
  { title: "Team Building", caption: "Outdoor activities strengthen chapter bonds.", imageUrl: "/images/gallery/gallery-4.png", album: "Team Building" },
  { title: "Graduation Celebration", caption: "Celebrating our graduands at the end of the academic year.", imageUrl: "/images/gallery/gallery-5.png", album: "Graduation 2025" },
  { title: "Community Service", caption: "Volunteers paint a school wall during community outreach.", imageUrl: "/images/gallery/gallery-6.png", album: "Outreach" },
];

const RESOURCE_SEEDS = [
  { title: "Chapter Constitution", slug: "chapter-constitution", description: "The official constitution of the Embuni Equity Leaders Chapter.", category: "policy", fileUrl: "/documents/chapter-constitution.pdf", visibility: "public", status: "published" },
  { title: "Meeting Minutes Template", slug: "meeting-minutes-template", description: "Standard template for recording chapter meeting minutes.", category: "template", fileUrl: "/documents/minutes-template.docx", visibility: "leaders", status: "published" },
  { title: "Event Proposal Form", slug: "event-proposal-form", description: "Form for proposing a new chapter event.", category: "form", fileUrl: "/documents/event-proposal-form.docx", visibility: "leaders", status: "published" },
  { title: "Code of Conduct", slug: "code-of-conduct", description: "Code of conduct binding on all chapter leaders.", category: "policy", fileUrl: "/documents/code-of-conduct.pdf", visibility: "public", status: "published" },
  { title: "Financial Reporting Guide", slug: "financial-reporting-guide", description: "How-to guide for the Treasurer on monthly financial reporting.", category: "guide", fileUrl: "/documents/finance-reporting-guide.pdf", visibility: "executive", status: "published" },
  { title: "Mentorship Pairing Guidelines", slug: "mentorship-pairing-guidelines", description: "Criteria and process for pairing mentors with mentees.", category: "guide", fileUrl: "/documents/mentorship-pairing.pdf", visibility: "leaders", status: "published" },
];

const AVATARS = [
  "/images/avatars/avatar-1.png",
  "/images/avatars/avatar-2.png",
  "/images/avatars/avatar-3.png",
  "/images/avatars/avatar-4.png",
  "/images/avatars/avatar-5.png",
  "/images/avatars/avatar-6.png",
  "/images/avatars/avatar-7.png",
  "/images/avatars/avatar-8.png",
];

async function main() {
  console.log("→ Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description ?? null, module: perm.module, action: perm.action, scope: perm.scope ?? null },
      create: { key: perm.key, name: perm.name, description: perm.description ?? null, module: perm.module, action: perm.action, scope: perm.scope ?? null },
    });
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions`);

  console.log("→ Seeding roles + role-permission matrix...");
  for (const role of ROLES) {
    const created = await db.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        category: role.category,
        isExecutive: role.isExecutive,
        isSystem: role.isSystem ?? false,
      },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        category: role.category,
        isExecutive: role.isExecutive,
        isSystem: role.isSystem ?? false,
      },
      include: { permissions: true },
    });

    // Reconcile permissions: remove stale, add missing.
    const desiredPermKeys = new Set(role.permissions);
    const existingPermKeys = new Set(created.permissions.map((rp) => rp.permissionId));
    const allPerms = await db.permission.findMany();

    // Remove permissions no longer in the role definition.
    for (const rp of created.permissions) {
      const perm = allPerms.find((p) => p.id === rp.permissionId);
      if (perm && !desiredPermKeys.has(perm.key)) {
        await db.rolePermission.delete({ where: { id: rp.id } });
      }
    }
    // Add missing permissions.
    for (const permKey of desiredPermKeys) {
      const perm = allPerms.find((p) => p.key === permKey);
      if (perm && !existingPermKeys.has(perm.id)) {
        await db.rolePermission.create({
          data: { roleId: created.id, permissionId: perm.id },
        });
      }
    }
  }
  console.log(`  ✓ ${ROLES.length} roles`);

  console.log("→ Seeding Super Admin...");
  const superAdminRole = await db.role.findUnique({ where: { key: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role missing");
  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const superAdmin = await db.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { passwordHash: superAdminHash, status: "active" },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash: superAdminHash,
      status: "active",
      emailVerified: new Date(),
      profile: {
        create: {
          fullName: "System Administrator",
          preferredName: "Admin",
          phone: "+254700000000",
          bio: "Technical administrator account for system management.",
          avatarUrl: AVATARS[0],
        },
      },
    },
    include: { userRoles: true },
  });
  if (!superAdmin.userRoles.some((ur) => ur.roleId === superAdminRole.id)) {
    await db.userRole.create({ data: { userId: superAdmin.id, roleId: superAdminRole.id } });
  }

  console.log("→ Seeding 11 executive accounts...");
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const leaderRole = await db.role.findUnique({ where: { key: "LEADER" } });
  if (!leaderRole) throw new Error("LEADER role missing");

  for (const exec of EXEC_SEEDS) {
    const role = await db.role.findUnique({ where: { key: exec.roleKey } });
    if (!role) throw new Error(`Role ${exec.roleKey} missing`);

    const user = await db.user.upsert({
      where: { email: exec.email },
      update: { passwordHash: defaultHash, status: "active" },
      create: {
        email: exec.email,
        passwordHash: defaultHash,
        status: "active",
        emailVerified: new Date(),
        profile: {
          create: {
            fullName: exec.fullName,
            preferredName: exec.fullName.split(" ")[0],
            gender: exec.gender,
            yearOfStudy: exec.yearOfStudy,
            school: exec.school,
            program: exec.program,
            phone: exec.phone,
            bio: exec.bio,
            avatarUrl: AVATARS[EXEC_SEEDS.indexOf(exec) % AVATARS.length],
          },
        },
      },
      include: { userRoles: true },
    });

    // Assign executive role (and LEADER base role).
    if (!user.userRoles.some((ur) => ur.roleId === role.id)) {
      await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
    if (!user.userRoles.some((ur) => ur.roleId === leaderRole.id)) {
      await db.userRole.create({ data: { userId: user.id, roleId: leaderRole.id } });
    }
  }

  console.log("→ Seeding dummy Leaders...");
  for (const leader of LEADER_SEEDS) {
    const user = await db.user.upsert({
      where: { email: leader.email },
      update: { passwordHash: defaultHash, status: "active" },
      create: {
        email: leader.email,
        passwordHash: defaultHash,
        status: "active",
        emailVerified: new Date(),
        profile: {
          create: {
            fullName: leader.fullName,
            preferredName: leader.fullName.split(" ")[0],
            gender: leader.gender,
            yearOfStudy: leader.yearOfStudy,
            school: leader.school,
            program: leader.program,
            phone: leader.phone,
            bio: "Chapter leader.",
            avatarUrl: AVATARS[LEADER_SEEDS.indexOf(leader) % AVATARS.length],
          },
        },
      },
      include: { userRoles: true },
    });
    if (!user.userRoles.some((ur) => ur.roleId === leaderRole.id)) {
      await db.userRole.create({ data: { userId: user.id, roleId: leaderRole.id } });
    }
  }

  console.log("→ Seeding programs...");
  for (const p of PROGRAM_SEEDS) {
    await db.program.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...p,
        description: p.description,
        publishedAt: p.status === "published" ? new Date() : null,
      },
    });
  }

  console.log("→ Seeding events...");
  for (const e of EVENT_SEEDS) {
    await db.event.upsert({
      where: { slug: e.slug },
      update: {},
      create: {
        title: e.title,
        slug: e.slug,
        summary: e.summary,
        description: e.description,
        category: e.category,
        coverUrl: e.coverUrl,
        venue: e.venue,
        location: e.location,
        startAt: e.startAt,
        status: e.status,
        capacity: e.capacity,
        publishedAt: e.status === "published" || e.status === "completed" ? new Date() : null,
      },
    });
  }

  console.log("→ Seeding news...");
  for (const n of NEWS_SEEDS) {
    await db.newsArticle.upsert({
      where: { slug: n.slug },
      update: {},
      create: {
        title: n.title,
        slug: n.slug,
        summary: n.summary,
        body: n.body,
        category: n.category,
        coverUrl: n.coverUrl,
        status: n.status,
        publishedAt: n.status === "published" ? new Date() : null,
        authorId: superAdmin.id,
      },
    });
  }

  console.log("→ Seeding gallery...");
  const existingGallery = await db.galleryMedia.count();
  if (existingGallery === 0) {
    await db.galleryMedia.createMany({ data: GALLERY_SEEDS });
  }

  console.log("→ Seeding resources...");
  for (const r of RESOURCE_SEEDS) {
    await db.resource.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
  }

  console.log("→ Seeding welcome notifications for super admin...");
  const existingNotif = await db.notification.count({ where: { userId: superAdmin.id } });
  if (existingNotif === 0) {
    await db.notification.create({
      data: {
        userId: superAdmin.id,
        type: "system",
        title: "Welcome to Embuni ELC",
        body: "This is the technical administrator account. Use it to approve registrations and manage roles.",
        link: "/dashboard/admin",
      },
    });
  }

  console.log("→ Seeding finance records (demo)...");
  const treasurer = await db.user.findUnique({ where: { email: "treasurer.elc@embuni.ac.ke" } });
  const existingFinance = await db.financialRecord.count();
  if (existingFinance === 0 && treasurer) {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    await db.financialRecord.createMany({
      data: [
        { type: "income", category: "membership", amount: 15000, description: "Membership contributions - September", date: monthAgo, reference: "MPESA-SEP", recordedById: treasurer.id },
        { type: "income", category: "donations", amount: 25000, description: "Alumni donation - Career Fair", date: monthAgo, recordedById: treasurer.id },
        { type: "income", category: "events", amount: 8000, description: "Cultural Night ticket sales", date: twoMonthsAgo, recordedById: treasurer.id },
        { type: "expenditure", category: "supplies", amount: 4500, description: "Stationery for opening ceremony", date: monthAgo, reference: "REC-001", recordedById: treasurer.id },
        { type: "expenditure", category: "transport", amount: 6000, description: "Transport to tree planting sites", date: monthAgo, reference: "MPESA-TR1", recordedById: treasurer.id },
        { type: "expenditure", category: "events", amount: 12000, description: "Cultural Night refreshments", date: twoMonthsAgo, recordedById: treasurer.id },
        { type: "expenditure", category: "supplies", amount: 2200, description: "Branded t-shirts for executives", date: twoMonthsAgo, recordedById: treasurer.id },
      ],
    });
  }

  const existingBudgets = await db.budget.count();
  if (existingBudgets === 0) {
    await db.budget.createMany({
      data: [
        { title: "2026 Annual Chapter Budget", fiscalYear: "2026", plannedIncome: 250000, plannedExpenditure: 220000, status: "approved", notes: "Approved at the 2025 AGM." },
        { title: "Q1 2026 Operations", fiscalYear: "2026", quarter: "Q1", plannedIncome: 60000, plannedExpenditure: 55000, status: "approved" },
        { title: "Q2 2026 Operations", fiscalYear: "2026", quarter: "Q2", plannedIncome: 65000, plannedExpenditure: 60000, status: "draft" },
      ],
    });
  }

  console.log("→ Seeding mentorship assignments + sessions...");
  const existingAssignments = await db.mentorshipAssignment.count();
  if (existingAssignments === 0) {
    // Use the Mentorship Coordinator as mentor, and some Year-1 leaders as mentees.
    const mentor = await db.user.findUnique({ where: { email: "mentorship.elc@embuni.ac.ke" } });
    const president = await db.user.findUnique({ where: { email: "president.elc@embuni.ac.ke" } });
    const mentee1 = await db.user.findUnique({ where: { email: "v.omondi@embuni.ac.ke" } });
    const mentee2 = await db.user.findUnique({ where: { email: "a.mohamed@embuni.ac.ke" } });
    const mentee3 = await db.user.findUnique({ where: { email: "f.kipkirui@embuni.ac.ke" } });
    const mentee4 = await db.user.findUnique({ where: { email: "j.wanjiru@embuni.ac.ke" } });

    if (mentor && mentee1) {
      const a1 = await db.mentorshipAssignment.create({ data: { mentorId: mentor.id, menteeId: mentee1.id, status: "active", notes: "Academic and career guidance." } });
      const a2 = mentee2 ? await db.mentorshipAssignment.create({ data: { mentorId: mentor.id, menteeId: mentee2.id, status: "active", notes: "Year 1 transition support." } }) : null;
      const a3 = president && mentee3 ? await db.mentorshipAssignment.create({ data: { mentorId: president.id, menteeId: mentee3.id, status: "active", notes: "Leadership track mentoring." } }) : null;
      const a4 = president && mentee4 ? await db.mentorshipAssignment.create({ data: { mentorId: president.id, menteeId: mentee4.id, status: "completed", notes: "Completed spring 2026 cycle." } }) : null;

      // Seed some sessions
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (a1) await db.mentorshipSession.create({ data: { assignmentId: a1.id, mentorId: mentor.id, menteeId: mentee1.id, title: "Initial mentoring meeting", notes: "Discussed academic goals and study habits.", heldAt: monthAgo } });
      if (a1) await db.mentorshipSession.create({ data: { assignmentId: a1.id, mentorId: mentor.id, menteeId: mentee1.id, title: "Follow-up: exam preparation", notes: "Reviewed past papers and time management.", heldAt: weekAgo } });
      if (a2 && mentee2) await db.mentorshipSession.create({ data: { assignmentId: a2.id, mentorId: mentor.id, menteeId: mentee2.id, title: "Welcome and orientation", notes: "Introduced chapter resources and mentorship goals.", heldAt: twoWeeksAgo } });
      if (a3 && president && mentee3) await db.mentorshipSession.create({ data: { assignmentId: a3.id, mentorId: president.id, menteeId: mentee3.id, title: "Leadership fundamentals", notes: "Discussed leadership styles and chapter vision.", heldAt: twoWeeksAgo } });
      if (a4 && president && mentee4) await db.mentorshipSession.create({ data: { assignmentId: a4.id, mentorId: president.id, menteeId: mentee4.id, title: "Final wrap-up session", notes: "Reviewed progress and set post-program goals.", heldAt: monthAgo } });
    }
  }

  console.log("→ Seeding alumni records...");
  const existingAlumni = await db.alumni.count();
  if (existingAlumni === 0) {
    await db.alumni.createMany({
      data: [
        { fullName: "James Mwangi Kamau", email: "james.mwangi@alumni.embuni.ac.ke", phone: "+254712100100", graduationYear: 2024, formerRole: "President (2023-2024)", school: "School of Business & Economics", program: "BSc Economics", currentOccupation: "Management Trainee", company: "Equity Bank Kenya", linkedinUrl: "https://linkedin.com/in/jamesmwangi", bio: "Former chapter president, now a management trainee at Equity Bank.", avatarUrl: "/images/avatars/avatar-1.png", engagementLevel: "mentor", status: "active" },
        { fullName: "Peninah Wanjiku Mburu", email: "peninah.mburu@alumni.embuni.ac.ke", phone: "+254722100200", graduationYear: 2023, formerRole: "Vice President (2022-2023)", school: "School of Education & Social Sciences", program: "Bachelor of Education (Arts)", currentOccupation: "Teacher", company: "Embu High School", bio: "Educator and chapter alumna committed to youth mentorship.", avatarUrl: "/images/avatars/avatar-2.png", engagementLevel: "active", status: "active" },
        { fullName: "Collins Kiprotich Bett", email: "collins.bett@alumni.embuni.ac.ke", phone: "+254733100300", graduationYear: 2024, formerRole: "Treasurer (2023-2024)", school: "School of Business & Economics", program: "BSc Finance", currentOccupation: "Financial Analyst", company: "KCB Group", linkedinUrl: "https://linkedin.com/in/collinsbett", bio: "Finance professional and former chapter treasurer.", avatarUrl: "/images/avatars/avatar-3.png", engagementLevel: "active", status: "active" },
        { fullName: "Brenda Akinyi Otieno", email: "brenda.otieno@alumni.embuni.ac.ke", phone: "+254711100400", graduationYear: 2022, formerRole: "Communications Director (2021-2022)", school: "School of Pure & Applied Sciences", program: "BSc Media Science", currentOccupation: "Digital Marketing Specialist", company: "Safaricom", bio: "Media and communications professional.", avatarUrl: "/images/avatars/avatar-4.png", engagementLevel: "passive", status: "active" },
        { fullName: "Samuel Njoroge Gathuru", email: "samuel.gathuru@alumni.embuni.ac.ke", phone: "+254712100500", graduationYear: 2021, formerRole: "Secretary General (2020-2021)", school: "School of Education & Social Sciences", program: "BA Political Science", currentOccupation: "Policy Officer", company: "County Government of Embu", bio: "Public policy professional and chapter alumnus.", avatarUrl: "/images/avatars/avatar-5.png", engagementLevel: "passive", status: "active" },
        { fullName: "Faith Wairimu Kamau", email: "faith.wairimu@alumni.embuni.ac.ke", phone: "+254722100600", graduationYear: 2023, formerRole: "Organizing Secretary (2022-2023)", school: "School of Agriculture", program: "BSc Agricultural Economics", currentOccupation: "Agribusiness Consultant", company: "Self-employed", bio: "Agribusiness entrepreneur supporting local farmers.", avatarUrl: "/images/avatars/avatar-6.png", engagementLevel: "mentor", status: "active" },
        { fullName: "Dennis Mutua Mwanzia", email: "dennis.mutua@alumni.embuni.ac.ke", phone: "+254733100700", graduationYear: 2020, formerRole: "Mentorship Coordinator (2019-2020)", school: "School of Engineering", program: "BSc Mechanical Engineering", currentOccupation: "Project Engineer", company: "Bamburi Cement", linkedinUrl: "https://linkedin.com/in/dennismutua", bio: "Engineer and lifelong mentor.", avatarUrl: "/images/avatars/avatar-7.png", engagementLevel: "uncontactable", status: "archived" },
      ],
    });
  }

  console.log("\n=== Seed complete ===");
  console.log(`Super admin login: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);
  console.log(`Executive demo login (any exec): e.g. president.elc@embuni.ac.ke / ${DEFAULT_PASSWORD}`);
  console.log(`Leader demo login: e.g. v.omondi@embuni.ac.ke / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
