"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { IntegrationRequirement, IntegrationStatus } from "@/lib/integrations/requirements"

interface IntegrationGateProps {
  /** Full requirement metadata from the requirements registry. */
  integration: IntegrationRequirement
  /** Current configured/missing status (fetched server-side by the parent page). */
  status: IntegrationStatus
  children: React.ReactNode
}

/**
 * Wraps any CTA (button, link, …) with a credential gate.
 *
 * - If the integration is configured → renders children unchanged.
 * - If not configured → intercepts the click, shows an explanatory
 *   dialog with env var names, setup steps, and a link to /setup.
 *
 * Uses event capture so the child's own onClick never fires when gated.
 */
export function IntegrationGate({
  integration,
  status,
  children,
}: IntegrationGateProps) {
  const [open, setOpen] = useState(false)

  if (status.configured) {
    return <>{children}</>
  }

  return (
    <>
      {/* Intercept click in the capture phase before the child handler fires */}
      <div
        className="contents"
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-vv-warning shrink-0" />
              {integration.name} — Setup Required
            </DialogTitle>
            <DialogDescription>{integration.description}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            {/* Missing vars */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-2">
                Missing environment variables
              </p>
              <div className="flex flex-wrap gap-1.5">
                {status.missingVars.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="font-mono text-xs border-vv-warning/40 text-vv-warning bg-vv-warning/5"
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-vv-text/50 mb-2">
                How to get it
              </p>
              <ol className="space-y-1 text-sm text-vv-text/75">
                {integration.whereToGet.map((step, i) => (
                  <li key={i} className="leading-snug">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Notes */}
            {integration.notes ? (
              <p className="text-xs text-vv-text/55 border-t border-vv-divider pt-3">
                {integration.notes}
              </p>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {integration.officialLinks.map((link) => (
                <Button
                  key={link}
                  variant="outline"
                  size="sm"
                  className="border-vv-border bg-vv-panel hover:bg-vv-card gap-1.5"
                  asChild
                >
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    Get credentials
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              ))}
              <Button size="sm" asChild>
                <Link href="/setup" onClick={() => setOpen(false)}>
                  View all requirements →
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
