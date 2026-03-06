import { NextResponse } from "next/server"
import { getAllIntegrationStatuses } from "@/lib/integrations/server"

/**
 * GET /api/setup/status
 *
 * Returns which integrations are configured (env vars present) vs missing.
 * Never exposes secret values — only booleans and the names of missing vars.
 */
export async function GET() {
  const statuses = getAllIntegrationStatuses()
  return NextResponse.json({ integrations: statuses })
}
