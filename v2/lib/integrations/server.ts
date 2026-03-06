/**
 * Server-only integration helpers.
 * Reads process.env — DO NOT import this file from client components.
 */

import type { IntegrationRequirement, IntegrationStatus } from "./requirements"
import { INTEGRATIONS } from "./requirements"

/**
 * Returns the subset of `required` env var names that are not currently set.
 */
export function getMissingEnvVars(required: string[]): string[] {
  return required.filter((v) => !process.env[v])
}

/**
 * Returns the configured/missing status for a single integration.
 */
export function getIntegrationStatus(
  integration: IntegrationRequirement,
): IntegrationStatus {
  const missingVars = getMissingEnvVars(integration.requiredEnvVars)
  return {
    id: integration.id,
    configured: missingVars.length === 0,
    missingVars,
  }
}

/**
 * Returns configured/missing status for every registered integration.
 * Safe to serialise and pass as a prop to Client Components.
 */
export function getAllIntegrationStatuses(): Record<string, IntegrationStatus> {
  return Object.fromEntries(
    INTEGRATIONS.map((i) => [i.id, getIntegrationStatus(i)]),
  )
}
