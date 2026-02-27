// Minimal GraphQL client for eBay GraphQL endpoint.
// Node 18+ recommended (native fetch).

export type EbayGraphQLClientOptions = {
  accessToken: string;
  marketplaceId?: string; // default EBAY_US for Inventory Mapping
  endpoint?: string;      // default https://graphqlapi.ebay.com/graphql
};

type GraphQLError = { message: string; [k: string]: unknown };

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

/**
 * Execute a GraphQL query or mutation against the eBay GraphQL API.
 * Throws if the HTTP response is not OK or if the response contains GraphQL errors.
 */
export async function ebayGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  options: EbayGraphQLClientOptions,
): Promise<T> {
  const endpoint = options.endpoint ?? "https://graphqlapi.ebay.com/graphql";
  const marketplaceId = options.marketplaceId ?? "EBAY_US";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `eBay GraphQL HTTP ${response.status} ${response.statusText}: ${text}`,
    );
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `eBay GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (json.data === undefined) {
    throw new Error("eBay GraphQL response contained no data");
  }

  return json.data;
}
