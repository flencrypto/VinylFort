import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAllIntegrationStatuses } from "@/lib/integrations/server"
import { getIntegration } from "@/lib/integrations/requirements"
import { AddGatedCards } from "@/components/setup/add-gated-cards"

export default async function AddPage() {
  const statuses = getAllIntegrationStatuses()
  const openaiReq = getIntegration("openai")!
  const openaiStatus = statuses["openai"]!

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Add / Scan</h1>
        <p className="text-sm text-vv-text/60 mt-1">Add records via quick form, barcode, or photos.</p>
      </div>

      <AddGatedCards openaiIntegration={openaiReq} openaiStatus={openaiStatus} />

      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-semibold">Drafts</div>
        <div className="text-sm text-vv-text/60 mt-2">No drafts yet. Start adding a record to create a draft.</div>
        <Button className="mt-3" variant="outline">
          New quick-add draft
        </Button>
      </Card>
    </div>
  )
}
