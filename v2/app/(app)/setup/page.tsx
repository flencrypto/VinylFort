import Link from "next/link"
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getAllIntegrationStatuses } from "@/lib/integrations/server"
import { INTEGRATIONS } from "@/lib/integrations/requirements"

export const metadata = {
  title: "Setup — VinylVault",
}

export default async function SetupPage() {
  const statuses = getAllIntegrationStatuses()
  const configured = INTEGRATIONS.filter((i) => statuses[i.id]?.configured)
  const missing = INTEGRATIONS.filter((i) => !statuses[i.id]?.configured)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Setup &amp; Integrations</h1>
        <p className="text-sm text-vv-text/60 mt-1">
          Configure external services to unlock all VinylVault features. Keys are
          stored in <code className="font-mono text-xs bg-vv-card px-1 py-0.5 rounded">v2/.env.local</code> and
          are never exposed to the browser.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={configured.length === INTEGRATIONS.length ? "default" : "secondary"}
          className="gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          {configured.length} / {INTEGRATIONS.length} configured
        </Badge>
        {missing.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {missing.length} missing
          </Badge>
        )}
      </div>

      {/* Per-integration cards */}
      <div className="space-y-4">
        {INTEGRATIONS.map((integration) => {
          const status = statuses[integration.id]!
          return (
            <Card
              key={integration.id}
              className={`bg-vv-panel border-vv-border p-5 space-y-4 ${
                !status.configured ? "ring-1 ring-vv-warning/20" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{integration.name}</span>
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
                        Missing
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-vv-text/65 mt-1">{integration.description}</p>
                </div>
              </div>

              {/* Missing vars */}
              {!status.configured && status.missingVars.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-2">
                    Missing env vars
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {status.missingVars.map((v) => (
                      <code
                        key={v}
                        className="text-xs font-mono px-2 py-1 rounded bg-vv-card border border-vv-warning/30 text-vv-warning"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup steps */}
              {!status.configured && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-2">
                    How to set up
                  </p>
                  <ol className="space-y-1 text-sm text-vv-text/75">
                    {integration.whereToGet.map((step, i) => (
                      <li key={i} className="leading-snug">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Optional vars */}
              {integration.optionalEnvVars && integration.optionalEnvVars.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-1">
                    Optional env vars
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {integration.optionalEnvVars.map((v) => (
                      <code
                        key={v}
                        className="text-xs font-mono px-2 py-1 rounded bg-vv-card border border-vv-divider text-vv-text/60"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependent features */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-2">
                  Features unlocked
                </p>
                <ul className="space-y-0.5 text-sm text-vv-text/70">
                  {integration.dependentActions.map((action) => (
                    <li key={action} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-vv-text/30 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notes + links */}
              <div className="flex flex-col gap-3">
                {integration.notes && (
                  <p className="text-xs text-vv-text/50 border-t border-vv-divider pt-3">
                    {integration.notes}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {integration.officialLinks.map((link) => (
                    <Button
                      key={link}
                      variant="outline"
                      size="sm"
                      className="border-vv-border bg-vv-panel hover:bg-vv-card gap-1.5"
                      asChild
                    >
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        Developer portal
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Separator className="bg-vv-divider" />

      {/* Env file hint */}
      <Card className="bg-vv-panel border-vv-border p-4">
        <div className="font-medium text-sm mb-2">Adding environment variables</div>
        <p className="text-sm text-vv-text/65 mb-3">
          Create a file at <code className="font-mono text-xs bg-vv-card px-1 py-0.5 rounded">v2/.env.local</code>{" "}
          (it is git-ignored) and add your keys:
        </p>
        <pre className="text-xs font-mono bg-vv-card border border-vv-border rounded-vv p-3 overflow-x-auto text-vv-text/80">
          {`# v2/.env.local\n# XAI_API_KEY is optional — enables Grok fact-checking\nDISCOGS_USER_TOKEN=your-token-here\nEBAY_CLIENT_ID=your-client-id\nEBAY_CLIENT_SECRET=your-client-secret\nOPENAI_API_KEY=sk-...\nXAI_API_KEY=xai-...`}
        </pre>
        <p className="text-xs text-vv-text/50 mt-3">
          Restart the dev server (<code className="font-mono">pnpm dev</code> or{" "}
          <code className="font-mono">npm run dev</code>) after changing{" "}
          <code className="font-mono">.env.local</code>.
        </p>
      </Card>

      <div className="text-sm">
        <Link href="/integrations" className="text-vv-cyan hover:underline">
          ← Back to Integrations
        </Link>
      </div>
    </div>
  )
}
