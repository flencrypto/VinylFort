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
 *
 * Handles "any-of" substitution: for the OpenAI integration, either
 * OPENAI_API_KEY or DEEPSEEK_API_KEY satisfies the OPENAI_API_KEY requirement,
 * since DeepSeek is a drop-in alternative for all AI tasks.
 */
export function getIntegrationStatus(
  integration: IntegrationRequirement,
): IntegrationStatus {
  let missingVars = getMissingEnvVars(integration.requiredEnvVars)
  let configured = missingVars.length === 0

  // Special-case: OPENAI_API_KEY requirement is satisfied by either key.
  if (integration.id === "openai") {
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    const hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY

    if (hasOpenAIKey || hasDeepSeekKey) {
      missingVars = missingVars.filter((v) => v !== "OPENAI_API_KEY")
      configured = missingVars.length === 0
    }
  }

  return {
    id: integration.id,
    configured,
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
