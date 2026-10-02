// Re-export Prisma types so controllers/services don't have to import
// from `@prisma/client` directly. Keeps the import graph clean and makes
// swapping the ORM later a one-file change.

export * from "@prisma/client";
