# eBay Inventory Mapping API (Listing Preview Generator) — VinylFort

This integration uses eBay's **Inventory Mapping API** (GraphQL) to generate **Listing Previews** from your existing product data (title, photos, aspects, identifiers, etc.). The preview returns AI recommendations (category, normalized aspects, description, etc.) which you can then feed into eBay listing creation APIs.

## Key constraints (IMPORTANT)
- **Production only** (Sandbox not supported).
- **US marketplace only** right now:
  - Must send header: `X-EBAY-C-MARKETPLACE-ID: EBAY_US`
  - Results should only be used for listings on the U.S. site.
- Not supported:
  - **eBay Motors** (motor vehicles) and subordinate categories including **Parts & Accessories**
- Max **10 external products** per task.
- Preview creation is **asynchronous**:
  1) Start task: `startListingPreviewsCreation` (mutation)
  2) Poll: `listingPreviewsCreationTaskById` (query)
  3) (Optional) Notification API topic: `LISTING_PREVIEW_CREATION_TASK_STATUS`
- For listings created/revised using these recommendations, include the returned `mappingReferenceId` to help eBay diagnose issues.

## Endpoint
```
POST https://graphqlapi.ebay.com/graphql
```

## Required headers
- `Authorization: Bearer <USER_ACCESS_TOKEN>`
- `X-EBAY-C-MARKETPLACE-ID: EBAY_US`
- `Content-Type: application/json`

## OAuth scope
Use a user access token (authorization code flow) with:
- `https://api.ebay.com/oauth/api_scope/sell.inventory.mapping`

## Data we send (externalProducts)
Each external product can include:
- `sku` (strongly recommended)
- `title`
- `images` (public https URLs)
- `categoryName` (required if you send aspects)
- `aspects` (name + values[])
- `externalProductIdentifierInput` (optional GTIN / identifier)

## Output you should store
From each preview:
- `mappingReferenceId` (store it; attach to later listing calls)
- `category.id` (recommended leaf category)
- `aspects` (recommended item specifics + confidence)
- `title`, `description`, `images`
- `product.epid` if matched (catalog match)

## VinylFort usage pattern
1) Convert your internal inventory record → `ExternalProductDetailsInput` (see `src/ebay/inventoryMapping.ts`)
2) Start preview creation task (max 10 items per call)
3) Poll task until `completionStatus` indicates done
4) Use preview fields to populate eBay Inventory/Offer/List flows
5) Persist `mappingReferenceId` alongside your internal SKU for audit/debug

## Running the preview script
```bash
# Set your eBay user access token
export EBAY_ACCESS_TOKEN=your_token_here

# Provide a JSON array of VinylFort records; output written to previews.json
npx ts-node scripts/ebayCreateListingPreviews.ts records.json --out previews.json
```

### Example `records.json`
```json
[
  {
    "sku": "bs-paranoid-1",
    "artist": "Black Sabbath",
    "title": "Paranoid",
    "year": "1970",
    "label": "Vertigo",
    "catalogueNumber": "6360 011",
    "format": "Vinyl LP",
    "condition": "Very Good Plus",
    "photoUrls": ["https://example.com/photos/bs-paranoid-front.jpg"]
  }
]
```

## Source files
| File | Purpose |
|------|---------|
| `src/ebay/graphqlClient.ts` | Thin fetch wrapper for eBay's GraphQL endpoint |
| `src/ebay/inventoryMapping.ts` | Types, `toExternalProduct()` conversion helper, API functions |
| `scripts/ebayCreateListingPreviews.ts` | CLI: load records → chunk → start tasks → poll → write `previews.json` |
| `.env.example` | Required environment variable template |
