import { NextResponse } from "next/server";

import { getDatabaseHealth } from "./_services/get-database-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getDatabaseHealth();
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
  });
}
