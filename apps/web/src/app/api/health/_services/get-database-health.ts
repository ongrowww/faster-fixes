import { prisma } from "@workspace/db";

export async function getDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" as const };
  } catch {
    return { status: "unhealthy" as const };
  }
}

export type GetDatabaseHealthOutput = Awaited<
  ReturnType<typeof getDatabaseHealth>
>;
