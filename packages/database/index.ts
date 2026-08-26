import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const databaseAdapter =
  process.env.DATABASE_ADAPTER ??
  (process.env.NODE_ENV === "production" ? "neon" : "postgres");

if (databaseAdapter !== "neon" && databaseAdapter !== "postgres") {
  throw new Error(
    `Unsupported DATABASE_ADAPTER: ${databaseAdapter}. Use "neon" or "postgres".`,
  );
}

// Keep Neon as the production default for upstream compatibility. Self-hosted
// installations can select the standard PostgreSQL TCP adapter explicitly.
const adapter =
  databaseAdapter === "neon"
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export { prisma };
