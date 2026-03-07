/**
 * Client-safe integration requirements registry.
 * Contains metadata about each integration: what env vars are needed,
 * where to obtain credentials, and which features depend on it.
 *
 * No server-only code here — safe to import from client components.
 */

export interface IntegrationRequirement {
  id: string
  name: string
  description: string
  /** Server-side env var names that MUST be set for this integration to work. */
  requiredEnvVars: string[]
  /** Env vars that improve the integration but are not strictly required. */
  optionalEnvVars?: string[]
  /** True if the user must complete an OAuth flow in addition to setting env vars. */
  oauthRequired?: boolean
  /** Human-readable steps telling the user exactly where to get credentials. */
  whereToGet: string[]
  /** Official links to developer portals / docs. */
  officialLinks: string[]
  /** App routes that call this integration. */
  dependentRoutes: string[]
  /** Human-readable action labels that trigger this integration. */
  dependentActions: string[]
  notes?: string
}

export interface IntegrationStatus {
  id: string
  configured: boolean
  /** Names of required env vars that are currently unset. */
  missingVars: string[]
}

export const INTEGRATIONS: IntegrationRequirement[] = [
  {
    id: "discogs",
    name: "Discogs",
    description:
      "Import your collection, sync your wantlist, fetch pressing comp data, and identify variants.",
    requiredEnvVars: ["DISCOGS_USER_TOKEN"],
    optionalEnvVars: [],
    whereToGet: [
      "1. Sign in to discogs.com",
      "2. Go to Settings → Developers (https://www.discogs.com/settings/developers)",
      "3. Click 'Generate new token'",
      "4. Copy the token and add DISCOGS_USER_TOKEN=<token> to v2/.env.local",
    ],
    officialLinks: ["https://www.discogs.com/settings/developers"],
    dependentRoutes: ["/valuation", "/integrations", "/record/[id]"],
    dependentActions: [
      "Variant resolver — Find candidates",
      "Valuation — Collection comp range",
      "Library — Import from Discogs",
    ],
    notes:
      "Uses a personal access token. No OAuth required for read-only collection data.",
  },
  {
    id: "ebay",
    name: "eBay",
    description: "Pull sold listings for valuation comps using the eBay Browse API.",
    requiredEnvVars: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],
    optionalEnvVars: ["EBAY_USER_TOKEN", "EBAY_ACCESS_TOKEN"],
    oauthRequired: false,
    whereToGet: [
      "1. Create a developer account at developer.ebay.com",
      "2. Sign in and navigate to 'My Account → Application Keys'",
      "3. Create a new Keyset for Production",
      "4. Copy App ID → EBAY_CLIENT_ID and Cert ID → EBAY_CLIENT_SECRET in v2/.env.local",
      "5. (Optional) For order/inventory features, complete the Authorization Code OAuth flow and set EBAY_USER_TOKEN",
    ],
    officialLinks: [
      "https://developer.ebay.com/my/keys",
      "https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html",
    ],
    dependentRoutes: ["/valuation", "/integrations"],
    dependentActions: [
      "Valuation — eBay sold comps",
      "Deal finder — Browse listings",
    ],
    notes:
      "Client credentials (EBAY_CLIENT_ID + EBAY_CLIENT_SECRET) are sufficient for Browse API. " +
      "EBAY_USER_TOKEN is only required for order/inventory management endpoints.",
  },
  {
    id: "openai",
    name: "OpenAI / AI Provider",
    description:
      "AI-powered OCR for runout and label photos, pressing identification, and market analysis generation.",
    requiredEnvVars: ["OPENAI_API_KEY"],
    optionalEnvVars: [],
    whereToGet: [
      "1. Sign in to platform.openai.com",
      "2. Navigate to API Keys (https://platform.openai.com/api-keys)",
      "3. Click 'Create new secret key'",
      "4. Copy the key and add OPENAI_API_KEY=sk-... to v2/.env.local",
      "   TIP: Also configure the xAI (Grok) integration (XAI_API_KEY) for cross-validated valuations.",
    ],
    officialLinks: [
      "https://platform.openai.com/api-keys",
    ],
    dependentRoutes: ["/add"],
    dependentActions: [
      "Add record — Photos (OCR for label / runout text)",
      "Add record — Barcode lookup + AI pressing identification",
    ],
    notes:
      "Keys are server-only — never exposed to the browser.",
  },
  {
    id: "xai",
    name: "xAI (Grok) — AI Fact-Checker",
    description:
      "Uses xAI's Grok model alongside OpenAI to cross-validate valuations and pressing identifications. Both AIs work as a team: OpenAI leads, Grok fact-checks.",
    requiredEnvVars: ["XAI_API_KEY", "OPENAI_API_KEY"],
    optionalEnvVars: [],
    whereToGet: [
      "1. Sign in to console.x.ai (https://console.x.ai)",
      "2. Navigate to API Keys",
      "3. Click 'Create API key'",
      "4. Copy the key and add XAI_API_KEY=xai-... to v2/.env.local",
      "   NOTE: OPENAI_API_KEY must also be set — xAI supplements OpenAI, it does not replace it.",
    ],
    officialLinks: [
      "https://console.x.ai",
      "https://docs.x.ai/docs",
    ],
    dependentRoutes: ["/add"],
    dependentActions: [
      "Add record — Fact-checked pressing identification (Grok validates OpenAI result)",
    ],
    notes:
      "xAI acts as a second opinion: after OpenAI returns a result, Grok is queried " +
      "independently and its answer is compared. Discrepancies surface a confidence warning in the UI. " +
      "Key is server-only — never exposed to the browser. " +
      "Planned: extend Grok cross-validation to valuations (/valuation) and record detail (/record/[id]) once those flows are wired to xAI.",
  },
]

export function getIntegration(id: string): IntegrationRequirement | undefined {
  return INTEGRATIONS.find((i) => i.id === id)
}

export function getIntegrationStatusOrDefault(
  statuses: Record<string, IntegrationStatus>,
  id: string,
): IntegrationStatus {
  const req = getIntegration(id)
  return (
    statuses[id] ?? {
      id,
      configured: false,
      missingVars: req?.requiredEnvVars ?? [],
    }
  )
}
