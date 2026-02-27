/**
 * src/ebay/browseService.ts
 *
 * Node.js TypeScript client for the eBay Browse API.
 * Lets CLI scripts and server-side tooling search eBay listings
 * using a pre-obtained App Token (client credentials grant).
 *
 * Usage:
 *   const { browseSearch } = await import("./browseService");
 *   const items = await browseSearch("Black Sabbath Paranoid", options);
 */

import { EbayGraphQLClientOptions } from "./graphqlClient";

export type { EbayGraphQLClientOptions };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EbayPrice = {
  currency: string;
  value: string;
};

export type EbayItemSummary = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price: EbayPrice;
  buyingOptions: string[];
  condition?: { conditionId: string; conditionDisplayName: string };
  seller?: { username: string; feedbackScore: number; feedbackPercentage: string };
  image?: { imageUrl: string };
  itemLocation?: string;
  shippingOptions?: Array<{
    shippingCost: EbayPrice;
    shippingCostType: string;
    minEstimatedDeliveryDate?: string;
    maxEstimatedDeliveryDate?: string;
  }>;
};

export type BrowseSearchOptions = {
  /** eBay category ID. Defaults to 176985 (Vinyl Records). */
  categoryId?: string;
  /** Max results to return (1–200). Default 20. */
  limit?: number;
  /** eBay filter string, e.g. "buyingOptions:{FIXED_PRICE},conditions:{USED}" */
  filter?: string;
  /** Sort field: "price" | "-price" | "newlyListed" | "endingSoonest" */
  sort?: string;
  /** eBay marketplace ID. Defaults to EBAY_GB. */
  marketplaceId?: string;
};

export type AppTokenOptions = {
  clientId: string;
  clientSecret: string;
  /** eBay OAuth endpoint. Default: https://api.ebay.com/identity/v1/oauth2/token */
  oauthEndpoint?: string;
};

// ---------------------------------------------------------------------------
// App Token (Client Credentials grant)
// ---------------------------------------------------------------------------

/**
 * Obtain an eBay App Token via the Client Credentials OAuth flow.
 * Suitable for read-only Browse API calls; does NOT require a user login.
 *
 * @param opts - clientId + clientSecret from eBay developer portal
 * @returns Bearer token string
 */
export async function getEbayAppToken(opts: AppTokenOptions): Promise<string> {
  const endpoint =
    opts.oauthEndpoint ?? "https://api.ebay.com/identity/v1/oauth2/token";

  const credentials = Buffer.from(
    `${opts.clientId}:${opts.clientSecret}`,
  ).toString("base64");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`eBay OAuth ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Browse API
// ---------------------------------------------------------------------------

const BROWSE_BASE = "https://api.ebay.com/buy/browse/v1";

/** Default vinyl records category ID on eBay */
const VINYL_CATEGORY_ID = "176985";

/**
 * Search eBay item listings via the Browse API.
 *
 * @param query   - free-text search query (e.g. "Black Sabbath Paranoid vinyl")
 * @param token   - App Token from {@link getEbayAppToken}
 * @param opts    - optional search parameters
 * @returns array of {@link EbayItemSummary}
 */
export async function browseSearch(
  query: string,
  token: string,
  opts: BrowseSearchOptions = {},
): Promise<EbayItemSummary[]> {
  const {
    categoryId = VINYL_CATEGORY_ID,
    limit = 20,
    filter = "",
    sort = "price",
    marketplaceId = "EBAY_GB",
  } = opts;

  const params = new URLSearchParams({
    q: query,
    category_ids: categoryId,
    limit: String(limit),
    fieldgroups: "EXTENDED",
  });

  if (filter) params.set("filter", filter);
  if (sort) params.set("sort", sort);

  const response = await fetch(
    `${BROWSE_BASE}/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`eBay Browse API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { itemSummaries?: EbayItemSummary[] };
  return data.itemSummaries ?? [];
}

/**
 * Convenience wrapper: search for a vinyl record by artist + title.
 *
 * @param artist  - artist name
 * @param title   - album / release title
 * @param token   - App Token
 * @param opts    - optional search parameters (limit, filter, sort, marketplaceId)
 * @returns array of {@link EbayItemSummary}, sorted by price ascending by default
 */
export async function searchVinylRecord(
  artist: string,
  title: string,
  token: string,
  opts: BrowseSearchOptions = {},
): Promise<EbayItemSummary[]> {
  const query = [artist, title].filter(Boolean).join(" ").trim();
  return browseSearch(query, token, {
    sort: "price",
    ...opts,
  });
}

/**
 * Get full item details for a single eBay listing.
 *
 * @param itemId  - eBay item ID (e.g. "v1|123456789|0" or just "123456789")
 * @param token   - App Token
 * @param marketplaceId - default EBAY_GB
 */
export async function getItem(
  itemId: string,
  token: string,
  marketplaceId = "EBAY_GB",
): Promise<unknown> {
  const response = await fetch(
    `${BROWSE_BASE}/item/${encodeURIComponent(itemId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`eBay Browse API ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Format an eBay price object to a human-readable string.
 *
 * @example formatPrice({ currency: "GBP", value: "12.99" }) → "£12.99"
 */
export function formatPrice(price: EbayPrice): string {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
  const sym = symbols[price.currency] ?? `${price.currency} `;
  return `${sym}${parseFloat(price.value).toFixed(2)}`;
}
