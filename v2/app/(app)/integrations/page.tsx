import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAllIntegrationStatuses } from "@/lib/integrations/server"
import { INTEGRATIONS } from "@/lib/integrations/requirements"

export default async function IntegrationsPage() {
  const statuses = getAllIntegrationStatuses()

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-vv-text/60 mt-1">
            Connect external services to enrich your Vault.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/setup">Setup guide →</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map((integration) => {
          const status = statuses[integration.id]!
          return (
            <Card key={integration.id} className="bg-vv-panel border-vv-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{integration.name}</span>
                    {status.configured ? (
                      <Badge className="gap-1 text-xs bg-vv-success/10 text-vv-success border-vv-success/30 border">
                        <CheckCircle2 className="h-3 w-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs border-vv-warning/40 text-vv-warning bg-vv-warning/5"
                      >
                        <XCircle className="h-3 w-3" />
                        Not configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-vv-text/65 mt-1">{integration.description}</p>
                  {!status.configured && status.missingVars.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {status.missingVars.map((v) => (
                        <code
                          key={v}
                          className="text-xs font-mono px-1.5 py-0.5 rounded bg-vv-card border border-vv-warning/25 text-vv-warning/80"
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-vv-border bg-vv-panel hover:bg-vv-card shrink-0"
                  asChild
                >
                  <Link href="/setup">
                    {status.configured ? "Details" : "Set up"}
                  </Link>
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-vv-text/50">
        Keys are stored in{" "}
        <code className="font-mono">v2/.env.local</code> and are never
        exposed to the browser.{" "}
        <Link href="/setup" className="text-vv-cyan hover:underline">
          Full setup instructions →
        </Link>
      </p>
    </div>
  )
}
