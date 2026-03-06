"use client"

import { Card } from "@/components/ui/card"
import { IntegrationGate } from "@/components/setup/integration-gate"
import type { IntegrationRequirement, IntegrationStatus } from "@/lib/integrations/requirements"

interface Props {
  openaiIntegration: IntegrationRequirement
  openaiStatus: IntegrationStatus
}

const CARDS = [
  {
    id: "quick-add",
    title: "Quick Add",
    desc: "Fill in artist, title, and condition manually.",
    icon: "✍️",
    requiresAI: false,
  },
  {
    id: "barcode",
    title: "Barcode",
    desc: "Enter a barcode to find candidate pressings.",
    icon: "🔍",
    requiresAI: true,
  },
  {
    id: "photos",
    title: "Photos",
    desc: "Upload label/runout photos and attach to a record.",
    icon: "📷",
    requiresAI: true,
  },
]

export function AddGatedCards({ openaiIntegration, openaiStatus }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARDS.map((card) => {
        const cardInner = (
          <button
            type="button"
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vv-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-vv-panel rounded-vv"
          >
            <Card className="bg-vv-panel border-vv-border p-4 hover:bg-vv-card transition-colors relative">
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="font-semibold">{card.title}</div>
              <div className="text-sm text-vv-text/65 mt-1">{card.desc}</div>
              {card.requiresAI && !openaiStatus.configured && (
                <div className="mt-2 text-xs text-vv-warning/80">Requires AI setup</div>
              )}
            </Card>
          </button>
        )

        if (card.requiresAI) {
          return (
            <IntegrationGate
              key={card.id}
              integration={openaiIntegration}
              status={openaiStatus}
            >
              {cardInner}
            </IntegrationGate>
          )
        }

        return (
          <div key={card.id}>
            {cardInner}
          </div>
        )
      })}
    </div>
  )
}
