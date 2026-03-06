/**
 * DealScanner — background service that periodically scans for undervalued
 * vinyl listings and fires Telegram / in-app notifications.
 *
 * Usage:
 *   window.dealScanner.start()    – start periodic scanning
 *   window.dealScanner.stop()     – stop periodic scanning
 *   window.dealScanner.scanNow()  – trigger an immediate scan
 *
 * Depends on:
 *   window.telegramService  (telegram-service.js)
 *   window.discogsService   (discogs-service.js)
 *   window.ebayService      (ebay-service.js)
 *
 * Configuration is read from localStorage key `auto_buy_config` and
 * `telegram_alerts_config`.  Scan state is stored in localStorage keys
 * `deal_scanner_last_run` and `deal_scanner_notified_ids`.
 */

const DEAL_SCANNER_DEFAULTS = {
  enabled: false,
  intervalMinutes: 5,
  minRoi: 40,
  minProfit: 8,
  maxPrice: 100,
  minCondition: "VG+",
};

const CONDITION_ORDER = ["P", "F", "G", "G+", "VG", "VG+", "NM", "M"];

class DealScanner {
  constructor() {
    this._timer = null;
    this._running = false;
    this._scanning = false;
  }

  // ---------------------------------------------------------------------------
  // Configuration helpers
  // ---------------------------------------------------------------------------

  _getConfig() {
    const autoBuy = JSON.parse(
      localStorage.getItem("auto_buy_config") || "{}",
    );
    const telegram = JSON.parse(
      localStorage.getItem("telegram_alerts_config") || "{}",
    );
    return { ...DEAL_SCANNER_DEFAULTS, ...autoBuy, ...telegram };
  }

  _getCollection() {
    try {
      return JSON.parse(localStorage.getItem("vinyl_collection") || "[]");
    } catch {
      return [];
    }
  }

  _getConditionRank(condition) {
    const idx = CONDITION_ORDER.indexOf((condition || "").toUpperCase());
    return idx === -1 ? 0 : idx;
  }

  _estimateFees(price) {
    return price * 0.1275 + 0.3;
  }

  _meetsThreshold(deal, config) {
    const roi = parseFloat(deal.roi || 0);
    const profit = parseFloat(deal.netProfit || 0);
    const price = parseFloat(deal.price || deal.buyPrice || 0);
    const conditionOk =
      this._getConditionRank(deal.condition) >=
      this._getConditionRank(config.minCondition);
    return (
      conditionOk &&
      price <= config.maxPrice &&
      roi >= config.minRoi &&
      profit >= config.minProfit
    );
  }

  // ---------------------------------------------------------------------------
  // Scan logic
  // ---------------------------------------------------------------------------

  async _scanRecord(record, config) {
    const artist = record.artist || record.Artist || "";
    const title = record.title || record.Title || record.album || record.Album || "";
    if (!artist || !title) return [];

    const found = [];

    // --- Discogs marketplace listings ---
    if (
      window.discogsService &&
      typeof window.discogsService.getMarketplaceListings === "function" &&
      (record.discogsReleaseId || record.release_id)
    ) {
      try {
        const releaseId = record.discogsReleaseId || record.release_id;
        const listings = await window.discogsService.getMarketplaceListings(releaseId, { limit: 5 });
        for (const listing of listings || []) {
          const price = parseFloat(listing.price?.value || listing.price || 0);
          const marketValue = parseFloat(
            record.marketValue || record.estimated_value || 0,
          );
          if (!marketValue || price <= 0) continue;

          const ebayFee = this._estimateFees(price);
          const netProfit = marketValue - price - ebayFee;
          const roi = price > 0 ? ((netProfit / price) * 100).toFixed(1) : 0;

          const deal = {
            artist,
            title,
            condition: listing.condition || "VG+",
            price,
            buyPrice: price,
            adjustedValue: marketValue,
            marketValue,
            netProfit: Math.round(netProfit * 100) / 100,
            roi: parseFloat(roi),
            fees: Math.round(ebayFee * 100) / 100,
            source: "Discogs",
            discogsListingId: listing.id,
            discogsReleaseId: releaseId,
            releaseId,
            url: listing.uri
              ? `https://www.discogs.com${listing.uri}`
              : listing.url || "",
            isHot: netProfit >= 8 && roi >= 40,
            isViable: netProfit >= 3,
          };

          if (this._meetsThreshold(deal, config)) {
            found.push(deal);
          }
        }
      } catch (_err) {
        // Rate limit or network error — skip silently
      }
    }

    // --- eBay BIN listings ---
    if (
      window.ebayService &&
      typeof window.ebayService.searchRecord === "function"
    ) {
      try {
        const items = await window.ebayService.searchRecord(artist, title, {
          limit: 5,
          buyingOptions: ["FIXED_PRICE"],
        });
        for (const item of items || []) {
          const price = parseFloat(item.price?.value || 0);
          const marketValue = parseFloat(
            record.marketValue || record.estimated_value || 0,
          );
          if (!marketValue || price <= 0) continue;

          const ebayFee = this._estimateFees(price);
          const netProfit = marketValue - price - ebayFee;
          const roi = price > 0 ? ((netProfit / price) * 100).toFixed(1) : 0;

          const deal = {
            artist,
            title,
            condition: item.condition || "VG+",
            price,
            buyPrice: price,
            adjustedValue: marketValue,
            marketValue,
            netProfit: Math.round(netProfit * 100) / 100,
            roi: parseFloat(roi),
            fees: Math.round(ebayFee * 100) / 100,
            source: "eBay",
            ebayItemId: item.itemId,
            releaseId: record.discogsReleaseId || record.release_id,
            url: item.itemWebUrl || "",
            isHot: netProfit >= 8 && roi >= 40,
            isViable: netProfit >= 3,
          };

          if (this._meetsThreshold(deal, config)) {
            found.push(deal);
          }
        }
      } catch (_err) {
        // Skip silently
      }
    }

    return found;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Trigger an immediate scan across the collection.
   *
   * @returns {Promise<number>}  – number of deals notified
   */
  async scanNow() {
    if (this._scanning) return 0;
    this._scanning = true;
    localStorage.setItem("deal_scanner_last_run", new Date().toISOString());

    let notified = 0;

    try {
      const config = this._getConfig();
      if (!config.enabled) return 0;

      const collection = this._getCollection();
      if (!collection.length) return 0;

      for (const record of collection) {
        const deals = await this._scanRecord(record, config);

        for (const deal of deals) {
          // In-app toast (use whichever page's showToast is available)
          if (typeof showToast === "function") {
            showToast(
              `🔥 Deal: ${deal.artist} — ${deal.title} (${deal.roi}% ROI)`,
              "success",
            );
          }

          // Telegram notification
          if (
            window.telegramService &&
            window.telegramService.isConfigured
          ) {
            const sent = await window.telegramService.sendDealAlert(deal);
            if (sent) notified++;
          }
        }

        // Respect Discogs rate limit (~60/min) — small pause between records
        await new Promise((r) => setTimeout(r, 1000));
      }
    } finally {
      this._scanning = false;
    }

    return notified;
  }

  /**
   * Start periodic background scanning.
   *
   * @param {number} [intervalMinutes]  – override interval (default from config)
   */
  start(intervalMinutes) {
    if (this._running) return;
    this._running = true;

    const config = this._getConfig();
    if (!config.enabled) {
      this._running = false;
      return;
    }

    const ms = (intervalMinutes || config.intervalMinutes || 5) * 60 * 1000;

    // Run once immediately, then on interval
    this.scanNow();
    this._timer = setInterval(() => this.scanNow(), ms);
  }

  /** Stop periodic scanning. */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
  }

  get isRunning() {
    return this._running;
  }
}

// Singleton
window.dealScanner = new DealScanner();

// Auto-start if Telegram is configured and alerts are enabled
document.addEventListener("DOMContentLoaded", () => {
  const config = JSON.parse(
    localStorage.getItem("telegram_alerts_config") || "{}",
  );
  if (
    config.enabled &&
    window.telegramService &&
    window.telegramService.isConfigured
  ) {
    window.dealScanner.start();
  }
});
