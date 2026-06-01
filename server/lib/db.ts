// Single shared Prisma client for the whole server.
// Instantiating a new PrismaClient per request opens a fresh connection pool each time and quickly exhausts the database's connection limit, so we keep exactly one instance and reuse it everywhere.
// In dev, tsx hot-reloads re-run this module on every change; stashing the client on globalThis stops each reload from leaking another client.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
