"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IntegrationGate } from "@/components/setup/integration-gate"
import type { IntegrationRequirement, IntegrationStatus } from "@/lib/integrations/requirements"

interface Props {
  discogsIntegration: IntegrationRequirement
  discogsStatus: IntegrationStatus
  ebayIntegration: IntegrationRequirement
  ebayStatus: IntegrationStatus
}

export function ValuationGatedContent({
  discogsIntegration,
  discogsStatus,
  ebayIntegration,
  ebayStatus,
}: Props) {
  const bothConfigured = discogsStatus.configured && ebayStatus.configured

  if (bothConfigured) {
    return (
      <>
        <div className="mt-2 text-3xl font-bold text-vv-text">—</div>
        <div className="text-sm text-vv-text/60 mt-1">
          Comps data connected. Value range will populate once records are enriched.
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mt-2 text-3xl font-bold text-vv-text">—</div>
      <div className="text-sm text-vv-text/60 mt-1 mb-3">
        Connect Discogs and eBay to compute a comps-based range.
      </div>
      <div className="flex flex-wrap gap-2">
        {!discogsStatus.configured && (
          <IntegrationGate integration={discogsIntegration} status={discogsStatus}>
            <Button size="sm" variant="outline" className="border-vv-border bg-vv-panel hover:bg-vv-card">
              Connect Discogs
            </Button>
          </IntegrationGate>
        )}
        {!ebayStatus.configured && (
          <IntegrationGate integration={ebayIntegration} status={ebayStatus}>
            <Button size="sm" variant="outline" className="border-vv-border bg-vv-panel hover:bg-vv-card">
              Connect eBay
            </Button>
          </IntegrationGate>
        )}
        <Button size="sm" variant="ghost" className="text-vv-text/60 hover:text-vv-text" asChild>
          <Link href="/setup">Setup guide</Link>
        </Button>
      </div>
    </>
  )
}
