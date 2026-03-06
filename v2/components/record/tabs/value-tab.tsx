"use client"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { IntegrationGate } from "@/components/setup/integration-gate"
import { getIntegration, getIntegrationStatusOrDefault } from "@/lib/integrations/requirements"
import type { RecordProps } from "@/components/record/types"
import type { IntegrationStatus } from "@/lib/integrations/requirements"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ValueTabProps {
  record: RecordProps
  integrationStatuses?: Record<string, IntegrationStatus>
}

export default function ValueTab({ record, integrationStatuses = {} }: ValueTabProps) {
  const discogsReq = getIntegration("discogs")!
  const discogsStatus = getIntegrationStatusOrDefault(integrationStatuses, "discogs")

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-semibold">Valuation</div>
        <Separator className="my-3 bg-vv-divider" />
        <div className="text-sm text-vv-text/70 space-y-3">
          <div>Estimated range: <span className="text-vv-text">—</span></div>
          <div>Confidence: <span className="text-vv-text">{record.valuationConfidence ?? "—"}</span></div>
          {discogsStatus.configured ? (
            <div className="text-vv-text/60">
              Comps data connected. Enrich this record to compute a range.
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-vv-text/60">Connect Discogs comps to compute a range.</span>
              <IntegrationGate integration={discogsReq} status={discogsStatus}>
                <Button size="sm" variant="outline" className="border-vv-border bg-vv-panel hover:bg-vv-card">
                  Connect Discogs
                </Button>
              </IntegrationGate>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-semibold">What would improve confidence</div>
        <Separator className="my-3 bg-vv-divider" />
        <ul className="text-sm text-vv-text/70 list-disc pl-5 space-y-1">
          <li>Add runout photo or matrix text</li>
          <li>Confirm label variation / cat#</li>
          <li>Add condition notes (playback)</li>
        </ul>
        <div className="mt-3">
          <Link href="/setup" className="text-xs text-vv-cyan hover:underline">
            Setup integrations →
          </Link>
        </div>
      </Card>
    </div>
  )
}
