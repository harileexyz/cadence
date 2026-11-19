import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const cached = globalForPrisma.prisma;

export const prisma =
  cached && "user" in cached && "session" in cached
    ? cached
    : new PrismaClient({
        log:
          process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
