# eBay Deal Finder API Integration — VinylFort

This document describes how VinylFort's Deal Finder connects to the eBay REST APIs
to search for live listings and (optionally) place Buy-It-Now orders automatically.

---

## APIs Used

### 1. Browse API — search listings (read-only)

| | |
|---|---|
| **Endpoint** | `https://api.ebay.com/buy/browse/v1/item_summary/search` |
| **Auth** | App Token (Client Credentials grant — no user login needed) |
| **Scope** | `https://api.ebay.com/oauth/api_scope` |
| **Marketplace header** | `X-EBAY-C-MARKETPLACE-ID: EBAY_GB` (or EBAY_US, etc.) |

Used to search for vinyl records by artist + title and retrieve current Buy-It-Now prices.
The Deal Finder calls this to cross-check a buy price against live market prices.

### 2. Buy Order API — place purchase orders

| | |
|---|---|
| **Endpoint** | `https://api.ebay.com/buy/order/v2/purchase_order` |
| **Auth** | User Access Token (Authorization Code grant) |
| **Scope** | `https://api.ebay.com/oauth/api_scope/buy.order` |

Used by the **Auto-Buy** feature to place a Buy-It-Now purchase when a deal meets the
configured ROI/profit thresholds.

---

## Python SDK equivalent (reference)

The Python SDK samples at <https://github.com/timotheus/ebaysdk-python/tree/master/samples>
show patterns used by the older XML-based Finding/Trading APIs.
VinylFort uses the modern REST equivalents:

| Python SDK API | VinylFort REST equivalent |
|---|---|
| `finding.py` → `findItemsByKeywords` | Browse API → `item_summary/search` |
| `trading.py` → `PlaceOffer` / BIN | Buy Order API → `purchase_order` |
| `shopping.py` → `GetSingleItem` | Browse API → `item/{itemId}` |

---

## Browser Integration (Deal Finder page)

`components/ebay-service.js` is a singleton (`window.ebayService`) loaded on
`deals.html` that mirrors the `discogs-service.js` pattern.

### Key methods

```js
// Search live eBay listings for a record
const items = await window.ebayService.searchRecord("Black Sabbath", "Paranoid", {
  limit: 10,
  sort: "price",           // cheapest first
});

// Get a single item's full details
const item = await window.ebayService.getItem("v1|123456789|0");

// Place a Buy-It-Now order (requires User Access Token)
const order = await window.ebayService.placeOrder("v1|123456789|0", 1);

// Send a Best Offer
const offer = await window.ebayService.placeBestOffer("v1|123456789|0", 9.99);
```

### Auto-Buy flow

1. `analyzeBulkDeals()` calculates ROI for each line item using Discogs price data.
2. `evaluateAutoBuyCandidates()` checks each result against the auto-buy config
   (min ROI, min profit, max price, min condition).
3. If a candidate qualifies and the user confirms in the modal, `confirmAutoBuy()`:
   a. Calls `window.ebayService.getCheapestListing(artist, title)` to find the
      best current BIN listing.
   b. Prompts the user to confirm the specific eBay listing price.
   c. Calls `window.ebayService.placeOrder(itemId)` to purchase.
   d. Saves the record to the collection via `addDealToCollection()`.

If no User Access Token is configured the step (c) is skipped and only (d) runs,
so the user can manually purchase from eBay.

---

## Node.js / CLI Integration

`src/ebay/browseService.ts` provides the same Browse API functionality for use
in server-side scripts and the existing `scripts/ebayCreateListingPreviews.ts` CLI.

```ts
import { getEbayAppToken, searchVinylRecord } from "./browseService";

const token = await getEbayAppToken({
  clientId: process.env.EBAY_CLIENT_ID!,
  clientSecret: process.env.EBAY_CLIENT_SECRET!,
});

const listings = await searchVinylRecord("Black Sabbath", "Paranoid", token, {
  limit: 5,
  marketplaceId: "EBAY_GB",
});

console.log(listings.map(l => `${l.title} — £${l.price.value}`));
```

---

## Configuration

### Settings page (browser)

Open **Settings** → **eBay API** and fill in:

| Field | Where to get it |
|---|---|
| **Client ID (App ID)** | [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys) |
| **Client Secret (Cert ID)** | Same page, Production key set |
| **User Access Token** | OAuth authorization-code flow; scope `buy.order` |
| **Marketplace** | Select your eBay site (default: eBay UK) |

### Environment variables (CLI / Node.js scripts)

Copy `.env.example` to `.env` and fill in:

```env
EBAY_CLIENT_ID=YourApp-SomeName-PRD-...
EBAY_CLIENT_SECRET=PRD-...
EBAY_USER_TOKEN=v^1.1#i^1#r^...   # optional, for order placement
EBAY_ACCESS_TOKEN=...              # Inventory Mapping API only
```

---

## eBay Developer Console quick-start

1. Sign in at <https://developer.ebay.com>.
2. Create a **Production** key set (Application → Keys).
3. Copy **App ID** → `EBAY_CLIENT_ID` and **Cert ID** → `EBAY_CLIENT_SECRET`.
4. To enable order placement, complete the OAuth consent flow and obtain a
   User Refresh Token; exchange it for a User Access Token with scope
   `https://api.ebay.com/oauth/api_scope/buy.order`.

---

## Constraints

- **Browse API**: production and sandbox both supported; rate limit ~5 000 calls/day
  on basic keys.
- **Buy Order API**: production only; sandbox available with test credentials.
- **Auto-buy**: requires a pre-configured shipping address
  (`ebay_shipping_address` in localStorage) and a valid User Access Token.
  Without these, confirmed deals are saved to the collection but not purchased.
