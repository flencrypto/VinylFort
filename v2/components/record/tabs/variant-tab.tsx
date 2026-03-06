"use client"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { IntegrationGate } from "@/components/setup/integration-gate"
import { getIntegration, getIntegrationStatusOrDefault } from "@/lib/integrations/requirements"
import type { RecordProps } from "@/components/record/types"
import type { IntegrationStatus } from "@/lib/integrations/requirements"

interface VariantTabProps {
  record: RecordProps
  integrationStatuses?: Record<string, IntegrationStatus>
}

export default function VariantTab({ record, integrationStatuses = {} }: VariantTabProps) {
  const discogsReq = getIntegration("discogs")!
  const discogsStatus = getIntegrationStatusOrDefault(integrationStatuses, "discogs")

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-semibold">Variant Resolver</div>
        <Separator className="my-3 bg-vv-divider" />
        <div className="text-sm text-vv-text/70 space-y-3">
          <div>Current state: <span className="text-vv-text">{record.variantConfidence ?? "—"} confidence</span></div>
          <div className="text-vv-text/60">
            Candidate pressings list + &quot;what to check next&quot; checklist.
          </div>
          <div className="flex gap-2">
            <IntegrationGate integration={discogsReq} status={discogsStatus}>
              <Button>Find candidates</Button>
            </IntegrationGate>
            <Button variant="outline" className="border-vv-border bg-vv-panel hover:bg-vv-card">
              Add matrix/runout
            </Button>
          </div>
        </div>
      </Card>

      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-semibold">Matrix / Runouts</div>
        <Separator className="my-3 bg-vv-divider" />
        <div className="text-sm text-vv-text/70">
          Side A / Side B entry, label text, barcode.
        </div>
      </Card>
    </div>
  )
}
