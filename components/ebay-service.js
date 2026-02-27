/**
 * EbayService — browser-compatible wrapper for eBay REST APIs.
 *
 * APIs used:
 *   Browse API  – search listings (App Token / Client Credentials)
 *   Buy Order API – place purchase orders (User Access Token)
 *
 * Credentials are read from / persisted to localStorage so the user
 * configures them once in Settings and they apply everywhere.
 *
 * Marketplace defaults to EBAY_GB (UK).  Change `marketplaceId` in
 * localStorage key "ebay_marketplace_id" to switch (e.g. EBAY_US).
 */

class EbayService {
  constructor() {
    this.clientId = localStorage.getItem("ebay_client_id") || "";
    this.clientSecret = localStorage.getItem("ebay_client_secret") || "";
    this.userAccessToken = localStorage.getItem("ebay_user_token") || "";
    this.marketplaceId =
      localStorage.getItem("ebay_marketplace_id") || "EBAY_GB";

    // Cached App Token (client-credentials grant, expires in 2 hours)
    this._appToken = null;
    this._appTokenExpiry = 0;

    this.browseBase = "https://api.ebay.com/buy/browse/v1";
    this.orderBase = "https://api.ebay.com/buy/order/v2";
    this.oauthBase = "https://api.ebay.com/identity/v1/oauth2/token";

    // eBay category IDs
    this.VINYL_CATEGORY_ID = "176985"; // Music > Records > Vinyl
  }

  // ---------------------------------------------------------------------------
  // Credential management
  // ---------------------------------------------------------------------------

  updateCredentials({ clientId, clientSecret, userAccessToken, marketplaceId } = {}) {
    if (clientId !== undefined) {
      this.clientId = clientId;
      localStorage.setItem("ebay_client_id", clientId);
    }
    if (clientSecret !== undefined) {
      this.clientSecret = clientSecret;
      localStorage.setItem("ebay_client_secret", clientSecret);
    }
    if (userAccessToken !== undefined) {
      this.userAccessToken = userAccessToken;
      localStorage.setItem("ebay_user_token", userAccessToken);
    }
    if (marketplaceId !== undefined) {
      this.marketplaceId = marketplaceId;
      localStorage.setItem("ebay_marketplace_id", marketplaceId);
    }
    // Invalidate cached app token when credentials change
    this._appToken = null;
    this._appTokenExpiry = 0;
  }

  get hasSearchCredentials() {
    return !!(this.clientId && this.clientSecret);
  }

  get hasBuyCredentials() {
    return !!(this.userAccessToken);
  }

  // ---------------------------------------------------------------------------
  // OAuth – Client Credentials (App Token) for Browse API
  // ---------------------------------------------------------------------------

  async getAppToken() {
    if (this._appToken && Date.now() < this._appTokenExpiry) {
      return this._appToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "eBay Client ID and Client Secret are required. Configure them in Settings.",
      );
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await fetch(this.oauthBase, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `eBay OAuth error ${response.status}: ${text}`,
      );
    }

    const data = await response.json();
    this._appToken = data.access_token;
    // Expire 5 minutes early to avoid edge cases
    this._appTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return this._appToken;
  }

  // ---------------------------------------------------------------------------
  // Browse API – search listings
  // ---------------------------------------------------------------------------

  /**
   * Search eBay listings for a vinyl record.
   *
   * @param {string} query  - e.g. "Black Sabbath Paranoid"
   * @param {object} [opts]
   * @param {number} [opts.limit=20]         – max results (1–200)
   * @param {string} [opts.filter]           – raw eBay filter string
   * @param {string} [opts.sort]             – e.g. "price", "-price", "newlyListed"
   * @param {boolean} [opts.completedOnly=false] – search completed/sold listings
   * @returns {Promise<EbayItemSummary[]>}
   */
  async searchListings(query, opts = {}) {
    const token = await this.getAppToken();
    const {
      limit = 20,
      filter = "",
      sort = "",
      completedOnly = false,
    } = opts;

    const params = new URLSearchParams({
      q: query,
      category_ids: this.VINYL_CATEGORY_ID,
      limit: String(limit),
    });

    if (filter) params.set("filter", filter);
    if (sort) params.set("sort", sort);

    // fieldgroups=EXTENDED adds condition details
    params.set("fieldgroups", "EXTENDED");

    // completedOnly: Browse API does not support completed-listing search directly.
    // For sold-item price research, pass filter="buyingOptions:{FIXED_PRICE}" or
    // use the Marketplace Insights API separately.
    const endpoint = `${this.browseBase}/item_summary/search?${params}`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`eBay Browse API ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.itemSummaries || [];
  }

  /**
   * Search for a specific vinyl record by artist + title.
   * Returns up to `limit` active listings sorted by lowest price.
   *
   * @param {string} artist
   * @param {string} title
   * @param {object} [opts]
   * @returns {Promise<EbayItemSummary[]>}
   */
  async searchRecord(artist, title, opts = {}) {
    const query = [artist, title].filter(Boolean).join(" ").trim();
    return this.searchListings(query, {
      limit: opts.limit || 20,
      sort: opts.sort || "price",
      filter: opts.filter || "",
    });
  }

  /**
   * Get the single cheapest Buy-It-Now listing for a record.
   * Returns null if none found or credentials missing.
   *
   * @param {string} artist
   * @param {string} title
   * @returns {Promise<EbayItemSummary|null>}
   */
  async getCheapestListing(artist, title) {
    try {
      const results = await this.searchRecord(artist, title, { limit: 5, sort: "price" });
      // Prefer BIN (Buy It Now) over auctions
      const bin = results.find(
        (item) => item.buyingOptions && item.buyingOptions.includes("FIXED_PRICE"),
      );
      return bin || results[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get a single item's full details.
   *
   * @param {string} itemId  – eBay item ID (e.g. "v1|123456789|0")
   * @returns {Promise<object>}
   */
  async getItem(itemId) {
    const token = await this.getAppToken();
    const response = await fetch(
      `${this.browseBase}/item/${encodeURIComponent(itemId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`eBay Browse API ${response.status}: ${text}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Buy Order API – place purchase
  // ---------------------------------------------------------------------------

  /**
   * Place a Buy-It-Now (fixed-price) purchase order.
   *
   * eBay's Buy Order API requires a fully-specified shipping address
   * and a payment method.  VinylFort stores these in localStorage
   * under "ebay_shipping_address" and "ebay_payment_method_id".
   *
   * @param {string} itemId        – eBay item ID
   * @param {number} [quantity=1]  – quantity to purchase
   * @param {object} [overrides]   – optional shipping/payment overrides
   * @returns {Promise<object>}    – purchase order response
   */
  async placeOrder(itemId, quantity = 1, overrides = {}) {
    if (!this.userAccessToken) {
      throw new Error(
        "A User Access Token is required to place orders. Configure it in Settings.",
      );
    }

    const shippingAddress =
      overrides.shippingAddress ||
      JSON.parse(localStorage.getItem("ebay_shipping_address") || "null");

    const paymentMethodId =
      overrides.paymentMethodId ||
      localStorage.getItem("ebay_payment_method_id") ||
      "";

    if (!shippingAddress) {
      throw new Error(
        "Shipping address not set. Add your address in Settings before placing orders.",
      );
    }

    const body = {
      lineItemInputs: [
        {
          itemId,
          quantity,
        },
      ],
      shippingAddress,
      ...(paymentMethodId ? { paymentMethodId } : {}),
    };

    const response = await fetch(`${this.orderBase}/purchase_order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.userAccessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        "Content-Type": "application/json",
        "X-EBAY-C-ENDUSERCTX": "contextualLocation=country%3DGB",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`eBay Buy Order API ${response.status}: ${text}`);
    }

    return response.json();
  }

  /**
   * Send a Best Offer for a listing that accepts offers.
   *
   * @param {string} itemId
   * @param {number} offerAmount  – offer price in marketplace currency
   * @returns {Promise<object>}
   */
  async placeBestOffer(itemId, offerAmount) {
    if (!this.userAccessToken) {
      throw new Error(
        "A User Access Token is required to place offers. Configure it in Settings.",
      );
    }

    const response = await fetch(`${this.orderBase}/best_offer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.userAccessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId,
        bestOfferAmount: {
          currency: EbayService.currencyForMarketplace(this.marketplaceId),
          value: String(offerAmount),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`eBay Best Offer API ${response.status}: ${text}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Map an eBay marketplace ID to its ISO 4217 currency code.
   *
   * @param {string} marketplaceId  – e.g. "EBAY_GB"
   * @returns {string}              – e.g. "GBP"
   */
  static currencyForMarketplace(marketplaceId) {
    const map = {
      EBAY_GB: "GBP",
      EBAY_US: "USD",
      EBAY_DE: "EUR",
      EBAY_FR: "EUR",
      EBAY_IT: "EUR",
      EBAY_ES: "EUR",
      EBAY_AU: "AUD",
      EBAY_CA: "CAD",
    };
    return map[marketplaceId] || "USD";
  }

  /**
   * Extract an item ID from an eBay listing URL.
   * Works for both old (/itm/NNNNN) and new (/itm/Title/NNNNN) URL shapes.
   *
   * @param {string} url
   * @returns {string|null}
   */
  static itemIdFromUrl(url) {
    const m =
      url.match(/ebay\.[a-z.]+\/itm\/(\d+)/) ||
      url.match(/ebay\.[a-z.]+\/itm\/[^/]+\/(\d+)/);
    return m ? m[1] : null;
  }

  /**
   * Format an eBay price object to a display string.
   *
   * @param {{currency:string, value:string}|undefined} priceObj
   * @returns {string}
   */
  static formatPrice(priceObj) {
    if (!priceObj) return "N/A";
    const symbols = { GBP: "£", USD: "$", EUR: "€" };
    const sym = symbols[priceObj.currency] || priceObj.currency + " ";
    return `${sym}${parseFloat(priceObj.value).toFixed(2)}`;
  }
}

// Singleton available globally (matches discogs-service.js pattern)
window.ebayService = new EbayService();

/**
 * @typedef {object} EbayItemSummary
 * @property {string}   itemId
 * @property {string}   title
 * @property {string}   itemWebUrl
 * @property {object}   price            – {currency, value}
 * @property {string[]} buyingOptions     – ["FIXED_PRICE"] | ["AUCTION"] | ["BEST_OFFER"]
 * @property {object}   [condition]       – {conditionId, conditionDisplayName}
 * @property {object}   [seller]          – {username, feedbackScore, feedbackPercentage}
 * @property {object}   [image]           – {imageUrl}
 * @property {string}   [itemLocation]    – location string
 * @property {object}   [shippingOptions] – array of shipping cost objects
 */
