// Deal Finder Logic

// Initialize drag and drop for bulk deals
document.addEventListener("DOMContentLoaded", () => {
  initBulkDropZone();
  initAutoBuyDefaults();
});

const AUTO_BUY_DEFAULTS = {
  enabled: true,
  mode: "confirm",
  minRoi: 40,
  minProfit: 8,
  maxPrice: 100,
  minCondition: "VG+",
};

function getAutoBuyConfig() {
  const stored = JSON.parse(localStorage.getItem("auto_buy_config") || "{}");
  return { ...AUTO_BUY_DEFAULTS, ...stored };
}

function initAutoBuyDefaults() {
  if (!localStorage.getItem("auto_buy_config")) {
    localStorage.setItem("auto_buy_config", JSON.stringify(AUTO_BUY_DEFAULTS));
  }
}

function getConditionRank(condition) {
  const order = ["P", "F", "G", "G+", "VG", "VG+", "NM", "M"];
  const idx = order.indexOf((condition || "").toUpperCase());
  return idx === -1 ? 0 : idx;
}

function shouldTriggerAutoBuy(deal, config) {
  if (!config.enabled) return false;
  const roi = parseFloat(deal.roi);
  const conditionOk =
    getConditionRank(deal.condition) >= getConditionRank(config.minCondition);
  const priceOk = deal.price <= config.maxPrice;
  return (
    conditionOk &&
    priceOk &&
    roi >= config.minRoi &&
    deal.netProfit >= config.minProfit
  );
}

function initBulkDropZone() {
  const dropZone = document.getElementById("bulkDropZone");
  const textarea = document.getElementById("bulkInput");

  if (!dropZone || !textarea) return;

  // Prevent default drag behaviors on document
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone on drag
  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("border-deal", "bg-deal/10");
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("border-deal", "bg-deal/10");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if leaving the dropzone itself
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove("border-deal", "bg-deal/10");
    }
  });

  // Handle drop
  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("border-deal", "bg-deal/10");

    const files = Array.from(e.dataTransfer.files);
    const textItems = [];

    // Try to get text/uri-list first
    if (e.dataTransfer.types.includes("text/uri-list")) {
      const uriList = e.dataTransfer.getData("text/uri-list");
      if (uriList) {
        textItems.push(
          ...uriList.split("\n").filter((u) => u.trim() && !u.startsWith("#")),
        );
      }
    }

    // Also check for plain text
    if (e.dataTransfer.types.includes("text/plain")) {
      const plainText = e.dataTransfer.getData("text/plain");
      if (plainText && !textItems.includes(plainText)) {
        textItems.push(plainText);
      }
    }

    // Process files
    for (const file of files) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        try {
          const text = await file.text();
          const parsed = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
          });
          const lines = parsed.data
            .map((row) => {
              const artist = row.Artist || row.artist || "";
              const title = row.Title || row.title || "";
              const price =
                row.Price || row.price || row["Purchase Price"] || "";
              const condition = row.Condition || row.condition || "VG";
              if (artist && title) {
                return `${artist} - ${title} ${condition} £${price}`;
              }
              return null;
            })
            .filter(Boolean);
          textItems.push(...lines);
        } catch (err) {
          console.error("Failed to parse CSV:", err);
          showToast(`Failed to parse ${file.name}`, "error");
        }
      } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        try {
          const text = await file.text();
          textItems.push(...text.split("\n").filter((l) => l.trim()));
        } catch (err) {
          console.error("Failed to read text file:", err);
        }
      }
    }

    // Process URLs and text items
    const processedItems = [];
    for (const item of textItems) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      // Check if it's a URL
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
          const dealInfo = await parseURLForDeal(trimmed);
          if (dealInfo) {
            processedItems.push(dealInfo);
          }
        } catch (err) {
          console.log("Failed to parse URL:", trimmed, err);
          // Add as plain text if URL parsing fails
          processedItems.push(trimmed);
        }
      } else {
        processedItems.push(trimmed);
      }
    }

    // Combine with existing content
    const existing = textarea.value.trim();
    const newContent = processedItems.join("\n");
    textarea.value = existing ? existing + "\n" + newContent : newContent;

    if (processedItems.length > 0) {
      showToast(`Added ${processedItems.length} items`, "success");
      // Auto-analyze if we have content
      if (processedItems.length > 0 && !existing) {
        analyzeBulkDeals();
      }
    }
  });

  // Also allow clicking to browse
  dropZone.addEventListener("click", (e) => {
    // Don't trigger if clicking on the textarea itself
    if (e.target === textarea || textarea.contains(e.target)) return;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv,.txt,text/*";
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const event = { dataTransfer: { files: [file] } };
        dropZone.dispatchEvent(new DragEvent("drop", event));
      }
    };
    fileInput.click();
  });
}

// Parse URLs to extract deal information
async function parseURLForDeal(url) {
  // Discogs sell item URL
  const discogsSellMatch = url.match(/discogs\.com\/sell\/item\/(\d+)/);
  if (discogsSellMatch) {
    // Try to fetch item details via Discogs API if available
    if (window.discogsService?.key) {
      try {
        // Note: Discogs doesn't have a direct API for sell items
        // We'd need to scrape or use marketplace search
        showToast("Discogs URL detected - manual entry recommended", "warning");
      } catch (e) {
        console.log("Failed to fetch Discogs item:", e);
      }
    }
    return `Discogs Item #${discogsSellMatch[1]} - ${url}`;
  }

  // eBay item URL – return as-is so analyzeBulkDeals can process it
  if (EbayService.itemIdFromUrl(url)) {
    return url;
  }

  // eBay seller store URL – return as-is so analyzeBulkDeals can process it
  if (/ebay\.[a-z.]+\/str\//.test(url)) {
    return url;
  }

  // Generic marketplace URL - return as-is with warning
  return `${url} (URL access restricted - please paste details manually)`;
}

/**
 * Map an eBay condition display name to the shorthand used by the deal calculator.
 *
 * @param {string} conditionName  – e.g. "Very Good Plus (VG+)"
 * @returns {string}              – e.g. "VG+"
 */
function mapEbayCondition(conditionName) {
  const name = (conditionName || "").toLowerCase();
  if (name.includes("mint") && !name.includes("near")) return "M";
  if (name.includes("near mint") || name.includes("nm")) return "NM";
  if (name.includes("very good") && name.includes("+")) return "VG+";
  if (name.includes("very good")) return "VG";
  if (name.includes("good") && name.includes("+")) return "G+";
  if (name.includes("good")) return "G";
  return "VG"; // Default
}

/**
 * Convert a raw eBay listing object (from Browse API) into a deal object
 * ready for renderDealsResults.  Shared by parseEbayItemUrlToDeals and
 * parseEbaySellerUrlToDeals.
 *
 * @param {object} item       – EbayItemSummary (or full item) from the API
 * @param {string} fallbackUrl – URL to use when item.itemWebUrl is absent
 * @param {string} [seller]   – seller username, if coming from a store URL
 * @returns {object}
 */
function ebayItemToDeal(item, fallbackUrl, seller) {
  const price = parseFloat(item.price?.value || 0);
  const rawTitle = item.title || "Unknown";
  const condition = mapEbayCondition(item.condition?.conditionDisplayName || "");
  const parts = rawTitle.split(/[-–—]/);
  const artist = parts.length > 1 ? parts[0].trim() : rawTitle;
  const recordTitle = parts.length > 1 ? parts.slice(1).join(" - ").trim() : "Unknown";
  const estimatedValue = price * 2; // Rough market-value estimate (2× purchase price)
  const analysis = calculateDealMetrics(price, estimatedValue, condition);
  return {
    artist,
    title: recordTitle,
    price,
    condition,
    ebayUrl: item.itemWebUrl || fallbackUrl,
    ebayItemId: item.itemId,
    ...(seller ? { seller } : {}),
    ...analysis,
  };
}

/**
 * Convert an eBay item URL into one deal object for analysis.
 * Uses the eBay Browse API if credentials are configured; falls back to a
 * placeholder entry (with a link) when they are not.
 *
 * @param {string} url
 * @returns {Promise<object[]>}
 */
async function parseEbayItemUrlToDeals(url) {
  const itemId = EbayService.itemIdFromUrl(url);
  if (!itemId) return [];

  if (window.ebayService?.hasSearchCredentials) {
    try {
      // eBay Browse API item IDs use the format "v1|{legacyItemId}|0"
      const item = await window.ebayService.getItem(`v1|${itemId}|0`);
      return [ebayItemToDeal(item, url)];
    } catch (e) {
      console.warn("Failed to fetch eBay item details:", e);
    }
  }

  // Fallback placeholder when credentials are absent or the API call failed
  return [
    {
      artist: `eBay Item #${itemId}`,
      title: "Add eBay credentials in Settings to analyze",
      price: 0,
      condition: "VG",
      ebayUrl: url,
      ebayItemId: itemId,
      adjustedValue: 0,
      netProfit: 0,
      roi: 0,
      totalFees: 0,
      isViable: false,
      isHot: false,
    },
  ];
}

/**
 * Convert an eBay seller store URL into deal objects for analysis.
 * Searches the seller's active vinyl listings via the eBay Browse API when
 * credentials are configured; falls back to a single placeholder entry
 * (with a link to the store) when they are not.
 *
 * @param {string} url
 * @returns {Promise<object[]>}
 */
async function parseEbaySellerUrlToDeals(url) {
  const sellerMatch = url.match(/ebay\.[a-z.]+\/str\/([^/?#]+)/);
  if (!sellerMatch) return [];
  const sellerName = sellerMatch[1];

  if (window.ebayService?.hasSearchCredentials) {
    try {
      const listings = await window.ebayService.searchListings(
        "vinyl record",
        {
          limit: 20,
          filter: `sellers:{${sellerName}}`,
          sort: "price",
        },
      );

      if (listings.length > 0) {
        return listings.map((item) => ebayItemToDeal(item, url, sellerName));
      }
    } catch (e) {
      console.warn("Failed to fetch eBay seller listings:", e);
    }
  }

  // Fallback placeholder when credentials are absent or the API call failed
  return [
    {
      artist: `eBay Store: ${sellerName}`,
      title: "Add eBay credentials in Settings to analyze",
      price: 0,
      condition: "VG",
      ebayUrl: url,
      seller: sellerName,
      adjustedValue: 0,
      netProfit: 0,
      roi: 0,
      totalFees: 0,
      isViable: false,
      isHot: false,
    },
  ];
}

function calculateDeal() {
  const buyPrice =
    parseFloat(document.getElementById("calcBuyPrice").value) || 0;
  const resalePrice =
    parseFloat(document.getElementById("calcResalePrice").value) || 0;
  const condition = document.getElementById("calcCondition").value;
  const goal = document.getElementById("calcGoal").value;

  if (buyPrice <= 0 || resalePrice <= 0) return;

  const container = document.getElementById("dealResult");
  container.classList.remove("hidden");

  // Calculate with condition adjustment
  const conditionMult = {
    M: 1.5,
    NM: 1.3,
    "VG+": 1.0,
    VG: 0.7,
    "G+": 0.5,
  };

  const adjustedResale = resalePrice * (conditionMult[condition] || 0.7);

  // Fees
  const ebayFee = adjustedResale * 0.13;
  const paypalFee = adjustedResale * 0.029 + 0.3;
  const costs = 6; // shipping + packing estimate

  // Strategy pricing
  let listPrice;
  switch (goal) {
    case "quick":
      listPrice = adjustedResale * 0.9;
      break;
    case "max":
      listPrice = adjustedResale * 1.1;
      break;
    default:
      listPrice = adjustedResale;
  }

  const netProfit = listPrice - buyPrice - ebayFee - paypalFee - costs;
  const roi = buyPrice > 0 ? ((netProfit / buyPrice) * 100).toFixed(1) : 0;
  const totalFees = ebayFee + paypalFee + costs;

  // Determine recommendation
  let recommendation, colorClass, icon;
  if (netProfit < 3) {
    recommendation = "PASS - Insufficient margin";
    colorClass = "bg-loss/10 border-loss";
    icon = "x-circle";
  } else if (roi < 30) {
    recommendation = "MARGINAL - Low ROI";
    colorClass = "bg-yellow-500/10 border-yellow-500";
    icon = "alert-triangle";
  } else if (roi >= 50) {
    recommendation = "HOT DEAL - Quick flip potential!";
    colorClass = "bg-profit/10 border-profit";
    icon = "zap";
  } else {
    recommendation = "GOOD DEAL - Worth pursuing";
    colorClass = "bg-primary/10 border-primary";
    icon = "check-circle";
  }

  container.className = `mt-6 p-6 rounded-xl border ${colorClass}`;
  container.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="p-3 rounded-full bg-surface">
                <i data-feather="${icon}" class="w-6 h-6 ${netProfit >= 3 ? "text-profit" : "text-loss"}"></i>
            </div>
            <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">${recommendation}</h3>
                <div class="grid grid-cols-3 gap-4 mt-4">
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Est. Net Profit</p>
                        <p class="text-2xl font-bold ${netProfit >= 0 ? "text-profit" : "text-loss"}">£${netProfit.toFixed(2)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">ROI</p>
                        <p class="text-2xl font-bold ${roi >= 30 ? "text-profit" : "text-gray-400"}">${roi}%</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Suggested List</p>
                        <p class="text-2xl font-bold text-gray-200">£${listPrice.toFixed(0)}</p>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-4 gap-2 text-sm">
                    <div class="text-gray-500">Buy: £${buyPrice.toFixed(2)}</div>
                    <div class="text-gray-500">eBay: £${ebayFee.toFixed(2)}</div>
                    <div class="text-gray-500">PayPal: £${paypalFee.toFixed(2)}</div>
                    <div class="text-gray-500">Ship: £${costs.toFixed(2)}</div>
                </div>
                <div class="mt-4 flex gap-2">
                    ${
                      netProfit >= 3
                        ? `
                        <button onclick="saveDealToCollection()" class="px-4 py-2 bg-primary rounded-lg text-sm hover:bg-primary/80 transition-all">
                            Save to Watchlist
                        </button>
                    `
                        : ""
                    }
                    <button onclick="resetCalculator()" class="px-4 py-2 border border-gray-600 rounded-lg text-sm hover:border-gray-500 transition-all">
                        Reset
                    </button>
                </div>
            </div>
        </div>
    `;
  feather.replace();
}

function resetCalculator() {
  document.getElementById("calcBuyPrice").value = "";
  document.getElementById("calcResalePrice").value = "";
  document.getElementById("calcCondition").value = "VG";
  document.getElementById("calcGoal").value = "balanced";
  document.getElementById("dealResult").classList.add("hidden");
}

async function analyzeBulkDeals() {
  const input = document.getElementById("bulkInput").value.trim();
  if (!input) {
    showToast("Enter some deals to analyze first", "error");
    return;
  }

  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return;

  showToast(`Analyzing ${lines.length} potential deals...`, "success");

  const results = [];

  for (const line of lines) {
    // Parse different formats:
    // "Artist - Title - £15"
    // "Artist - Title VG+ £20"
    // eBay item or seller store URLs

    const trimmedLine = line.trim();

    // eBay item URL (e.g. https://www.ebay.co.uk/itm/306777618478)
    if (EbayService.itemIdFromUrl(trimmedLine)) {
      const ebayDeals = await parseEbayItemUrlToDeals(trimmedLine);
      results.push(...ebayDeals);
      continue;
    }

    // eBay seller store URL (e.g. https://www.ebay.co.uk/str/thedropvinylrecords)
    if (/ebay\.[a-z.]+\/str\//.test(trimmedLine)) {
      const ebayDeals = await parseEbaySellerUrlToDeals(trimmedLine);
      results.push(...ebayDeals);
      continue;
    }

    const priceMatch = line.match(/[£$€](\d+(?:\.\d{2})?)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

    // Extract artist/title (rough parsing)
    const parts = line.replace(/[£$€]\d+(?:\.\d{2})?/, "").split(/[-–—]/);
    const artist = parts[0]?.trim() || "Unknown";
    const title = parts[1]?.trim() || "Unknown";

    const conditionMatch = line.match(/\b(M|NM|VG\+|VG|G\+|G)\b/i);
    const condition = conditionMatch ? conditionMatch[1].toUpperCase() : "VG";

    // Try to get Discogs data for better estimation
    let discogsData = null;
    if (window.discogsService?.key && artist && title) {
      try {
        const search = await window.discogsService.searchRelease(
          artist,
          title,
          null,
        );
        if (search) {
          discogsData = await window.discogsService.getReleaseDetails(
            search.id,
          );
        }
      } catch (e) {
        console.log("Discogs lookup failed for", artist, title);
      }
    }

    // Calculate metrics
    const estimatedValue =
      discogsData?.lowest_price || discogsData?.median || price * 2; // Assume 2x if no data
    const analysis = calculateDealMetrics(price, estimatedValue, condition);

    results.push({
      artist,
      title,
      price,
      condition,
      ...analysis,
      discogsUrl: discogsData?.uri,
      discogsId: discogsData?.id,
      hasDiscogsData: !!discogsData,
    });
  }

  renderDealsResults(results);
}

/**
 * Search eBay for live listings of a vinyl record and return the cheapest ones.
 * Requires eBay Client ID + Client Secret to be configured in Settings.
 *
 * @param {string} artist
 * @param {string} title
 * @param {number} [maxResults=5]
 * @returns {Promise<Array|null>} eBay item summaries or null on error
 */
async function searchEbayDeals(artist, title, maxResults = 5) {
  // eBay API integration is temporarily paused while API credentials are being set up.
  // Use the "Open eBay" button to browse eBay manually.
  return null;
}

function calculateDealMetrics(buyPrice, estimatedValue, condition = "VG") {
  const conditionMult = {
    M: 1.5,
    NM: 1.3,
    "VG+": 1.0,
    VG: 0.7,
    "G+": 0.5,
    G: 0.35,
  };

  const adjustedValue = estimatedValue * (conditionMult[condition] || 0.7);

  // Fees
  const ebayFee = adjustedValue * 0.13;
  const paypalFee = adjustedValue * 0.029 + 0.3;
  const costs = 6;

  const netProfit = adjustedValue - buyPrice - ebayFee - paypalFee - costs;
  const roi = buyPrice > 0 ? ((netProfit / buyPrice) * 100).toFixed(1) : 0;

  return {
    adjustedValue: Math.round(adjustedValue),
    netProfit: Math.round(netProfit),
    roi,
    totalFees: Math.round((ebayFee + paypalFee + costs) * 100) / 100,
    isViable: netProfit >= 3,
    isHot: netProfit >= 8 && roi >= 40,
  };
}

function renderDealsResults(results) {
  const container = document.getElementById("dealsGrid");
  const resultsSection = document.getElementById("dealsResults");
  const emptyState = document.getElementById("dealsEmptyState");

  emptyState.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  // Update counts
  const hotCount = results.filter((r) => r.isHot).length;
  const skipCount = results.filter((r) => !r.isViable).length;
  document.getElementById("hotDealsCount").textContent =
    `${hotCount} Hot Deals`;
  document.getElementById("skipCount").textContent = `${skipCount} Pass`;
  container.innerHTML = results
    .map((deal, index) => {
      const profitClass = deal.netProfit >= 0 ? "text-profit" : "text-loss";
      const cardClass = deal.isHot
        ? "border-profit bg-profit/5"
        : !deal.isViable
          ? "border-gray-700 opacity-75"
          : "border-deal/50";
      const badgeText = deal.isHot ? "🔥 HOT" : deal.isViable ? "GOOD" : "PASS";
      const badgeClass = deal.isHot
        ? "bg-profit text-white"
        : deal.isViable
          ? "bg-deal/20 text-deal"
          : "bg-gray-700 text-gray-400";

      return `
            <div class="deal-card ${cardClass} p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-1" onclick="showDealDetail(${index})">
                <div class="flex justify-between items-start mb-3">
                    <span class="px-2 py-1 rounded text-xs font-bold ${badgeClass}">${badgeText}</span>
                    ${deal.hasDiscogsData ? '<span class="text-xs text-gray-500" title="Discogs data available">🎵</span>' : ""}
                </div>
                <h3 class="font-semibold text-gray-100 truncate mb-1" title="${deal.artist}">${deal.artist}</h3>
                <p class="text-sm text-gray-400 truncate mb-3" title="${deal.title}">${deal.title}</p>
                
                <div class="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                        <span class="text-gray-500 text-xs">Buy</span>
                        <p class="font-medium">£${parseFloat(deal.price).toFixed(2)}</p>
                    </div>
                    <div>
                        <span class="text-gray-500 text-xs">Est. Value</span>
                        <p class="font-medium">£${deal.adjustedValue}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div class="${profitClass} font-bold">
                        £${deal.netProfit} profit
                    </div>
                    <div class="text-sm ${deal.roi >= 30 ? "text-profit" : "text-gray-400"}">
                        ${deal.roi}% ROI
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  // Store for detail view
  window.analyzedDeals = results;

  // Evaluate auto-buy candidates (confirm mode)
  evaluateAutoBuyCandidates(results);
}

function showDealDetail(index) {
  const deal = window.analyzedDeals[index];
  const modal = document.getElementById("dealModal");
  const content = document.getElementById("dealModalContent");

  const profitColor = deal.netProfit >= 3 ? "text-profit" : "text-loss";
  const headerColor = deal.isHot
    ? "bg-profit/10 border-profit"
    : deal.isViable
      ? "bg-deal/10 border-deal"
      : "bg-gray-800 border-gray-700";

  content.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 rounded-xl border ${headerColor}">
                <h3 class="text-lg font-bold mb-1">${deal.artist}</h3>
                <p class="text-gray-400">${deal.title}</p>
                <p class="text-sm text-gray-500 mt-2">Condition: ${deal.condition}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Purchase Price</p>
                    <p class="text-xl font-bold">£${deal.price.toFixed(2)}</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Market Value (adj.)</p>
                    <p class="text-xl font-bold">£${deal.adjustedValue}</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Total Fees (~16%)</p>
                    <p class="text-xl font-bold text-gray-400">£${deal.totalFees}</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Net Profit</p>
                    <p class="text-xl font-bold ${profitColor}">£${deal.netProfit}</p>
                </div>
            </div>
            
            <div class="p-4 bg-surface rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-400">Return on Investment</span>
                    <span class="text-lg font-bold ${deal.roi >= 30 ? "text-profit" : "text-yellow-400"}">${deal.roi}%</span>
                </div>
                <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full ${deal.roi >= 30 ? "bg-profit" : deal.roi > 0 ? "bg-yellow-500" : "bg-loss"}" style="width: ${Math.min(Math.abs(deal.roi), 100)}%"></div>
                </div>
            </div>
            
            ${
              deal.discogsUrl
                ? `
                <a href="${deal.discogsUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-primary hover:underline">
                    View on Discogs
                    <i data-feather="external-link" class="w-4 h-4"></i>
                </a>
            `
                : ""
            }
            ${
              deal.ebayUrl
                ? `
                <a href="${deal.ebayUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-primary hover:underline">
                    View on eBay
                    <i data-feather="external-link" class="w-4 h-4"></i>
                </a>
            `
                : ""
            }
            <div class="flex gap-3 mt-6">
                ${
                  deal.isViable
                    ? `
                    <button onclick="addDealToCollectionFromModal(${index})" class="flex-1 px-4 py-3 bg-gradient-to-r from-deal to-pink-600 rounded-lg font-medium hover:shadow-lg transition-all">
                        Add to Collection
                    </button>
                `
                    : ""
                }
                <button onclick="closeDealModal()" class="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-all">
                    Close
                </button>
            </div>
</div>
    `;
  feather.replace();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDealModal() {
  document.getElementById("dealModal").classList.add("hidden");
  document.getElementById("dealModal").classList.remove("flex");
}

function evaluateAutoBuyCandidates(results) {
  const config = getAutoBuyConfig();
  if (!config.enabled || config.mode !== "confirm") return;

  const candidates = results.filter((deal) =>
    shouldTriggerAutoBuy(deal, config),
  );
  if (!candidates.length) return;

  window.autoBuyCandidates = candidates;
  showToast(`Auto-buy candidates found: ${candidates.length}`, "warning");
  showAutoBuyModal(0);
}

function showAutoBuyModal(index) {
  const candidates = window.autoBuyCandidates || [];
  const deal = candidates[index];
  const modal = document.getElementById("autoBuyModal");
  const content = document.getElementById("autoBuyModalContent");
  if (!deal || !modal || !content) return;

  content.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                <h3 class="text-lg font-bold mb-1">Confirm Auto-Buy</h3>
                <p class="text-gray-400 text-sm">This meets your thresholds. Review before purchase.</p>
            </div>
            <div class="p-4 bg-surface rounded-lg">
                <p class="text-sm text-gray-500 mb-1">Artist / Title</p>
                <p class="text-lg font-semibold">${deal.artist} — ${deal.title}</p>
                <p class="text-sm text-gray-500 mt-2">Condition: ${deal.condition}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Buy Price</p>
                    <p class="text-xl font-bold">£${deal.price.toFixed(2)}</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">ROI</p>
                    <p class="text-xl font-bold text-profit">${deal.roi}%</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Net Profit</p>
                    <p class="text-xl font-bold ${deal.netProfit >= 0 ? "text-profit" : "text-loss"}">£${deal.netProfit}</p>
                </div>
                <div class="p-4 bg-surface rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Est. Value</p>
                    <p class="text-xl font-bold">£${deal.adjustedValue}</p>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="confirmAutoBuy(${index})" class="flex-1 px-4 py-3 bg-gradient-to-r from-deal to-pink-600 rounded-lg font-medium hover:shadow-lg transition-all">
                    Confirm Auto-Buy
                </button>
                <button onclick="closeAutoBuyModal()" class="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-all">
                    Cancel
                </button>
            </div>
            <p class="text-xs text-gray-500">Requires eBay User Access Token in Settings. If not configured, the deal will be saved to your collection instead.</p>
        </div>
    `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAutoBuyModal() {
  const modal = document.getElementById("autoBuyModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function confirmAutoBuy(index) {
  const candidates = window.autoBuyCandidates || [];
  const deal = candidates[index];
  if (!deal) return;

  closeAutoBuyModal();

  // eBay API integration is temporarily paused. Save deal to collection and open eBay manually.
  showToast(
    "eBay API is temporarily unavailable. Deal saved to collection — use the Open eBay button to search manually.",
    "warning",
  );
  addDealToCollection(index);
}
function addDealToCollection(index) {
  const deal = window.analyzedDeals[index];
  // Create collection entry
  const record = {
    artist: deal.artist,
    title: deal.title,
    purchasePrice: deal.price,
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseSource: "prospective_deal",
    conditionVinyl: deal.condition,
    conditionSleeve: deal.condition,
    estimatedValue: deal.adjustedValue,
    status: "prospective",
    dateAdded: new Date().toISOString(),
    notes: `Deal analysis: Potential profit £${deal.netProfit} (${deal.roi}% ROI). ${deal.discogsUrl ? "Discogs: " + deal.discogsUrl : ""}`,
  };

  // Add to local collection storage
  let collection = JSON.parse(localStorage.getItem("vinyl_collection") || "[]");
  collection.push(record);
  localStorage.setItem("vinyl_collection", JSON.stringify(collection));

  showToast("Deal saved to collection!", "success");
  closeDealModal();
}

function addDealToCollectionFromModal(index) {
  // Alias for the same function, called from modal
  addDealToCollection(index);
}
function clearBulkInput() {
  document.getElementById("bulkInput").value = "";
  document.getElementById("dealsResults").classList.add("hidden");
  document.getElementById("dealsEmptyState").classList.remove("hidden");
}

function handleBulkCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      // Convert CSV to text format for analysis
      const lines = results.data
        .map((row) => {
          const artist = row.Artist || row.artist || "";
          const title = row.Title || row.title || "";
          const price = row.Price || row.price || row["Purchase Price"] || "";
          const condition = row.Condition || row.condition || "VG";
          if (artist && title) {
            return `${artist} - ${title} ${condition} £${price}`;
          }
          return null;
        })
        .filter(Boolean);

      document.getElementById("bulkInput").value = lines.join("\n");
      analyzeBulkDeals();
    },
  });
}

function saveDealToCollection() {
  // Quick save from calculator
  const buyPrice = parseFloat(document.getElementById("calcBuyPrice").value);
  const resalePrice = parseFloat(
    document.getElementById("calcResalePrice").value,
  );

  if (!buyPrice || !resalePrice) return;

  const record = {
    artist: "Unknown (from calculator)",
    title: "Deal analysis",
    purchasePrice: buyPrice,
    estimatedValue: resalePrice,
    status: "prospective",
    dateAdded: new Date().toISOString(),
    notes: `Calculated potential deal. Buy: £${buyPrice}, Est. value: £${resalePrice}`,
  };

  let collection = JSON.parse(localStorage.getItem("vinyl_collection") || "[]");
  collection.push(record);
  localStorage.setItem("vinyl_collection", JSON.stringify(collection));

  showToast("Deal saved to watchlist!", "success");
}
function importFromCSV() {
  // Trigger file input
  document.getElementById("bulkCSVInput").click();
}

// ─── Release Price Lookup ──────────────────────────────────────────────────

/**
 * Look up a Discogs release by URL or ID, fetch pricing data + cheap
 * Discogs marketplace listings, and render a comparison panel.
 */
async function lookupReleaseDeals() {
  const rawInput = document.getElementById("releaseLookupInput")?.value.trim();
  const condition = document.getElementById("releaseLookupCondition")?.value || "VG+";
  const resultEl = document.getElementById("releaseLookupResult");
  if (!resultEl) return;

  if (!rawInput) {
    showToast("Enter a Discogs release URL or ID first", "warning");
    document.getElementById("releaseLookupInput")?.focus();
    return;
  }

  // Try to parse release ID from URL or bare number
  let releaseId = null;
  const bareNum = rawInput.match(/^\d+$/);
  if (bareNum) {
    releaseId = parseInt(rawInput, 10);
  } else if (window.discogsService) {
    releaseId = window.discogsService.extractReleaseIdFromUrl(rawInput);
  }

  if (!releaseId) {
    showToast("Could not parse a Discogs release ID from that input", "error");
    return;
  }

  // Show loading state
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = `
    <div class="flex items-center gap-3 p-4 rounded-xl bg-surface border border-gray-700 text-gray-400">
      <svg class="animate-spin w-5 h-5 text-deal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Looking up release #${releaseId}…
    </div>`;

  // Fetch release details
  let release = null;
  let priceSuggestions = null;
  let marketplaceListings = [];

  if (window.discogsService && (window.discogsService.token || window.discogsService.key)) {
    try {
      release = await window.discogsService.getReleaseDetails(releaseId);
    } catch (e) {
      console.warn("Release fetch failed:", e.message);
    }
    try {
      priceSuggestions = await window.discogsService.getPriceSuggestions(releaseId);
    } catch (e) {
      console.warn("Price suggestions failed:", e.message);
    }
  }

  // Derive median / suggested price for the chosen condition
  const conditionLabelMap = {
    M: "Mint (M)",
    NM: "Near Mint (NM or M-)",
    "VG+": "Very Good Plus (VG+)",
    VG: "Very Good (VG)",
    "G+": "Good Plus (G+)",
    G: "Good (G)",
  };
  const condLabel = conditionLabelMap[condition] || condition;
  const suggestedPrice = priceSuggestions
    ? (priceSuggestions[condLabel]?.value || null)
    : null;

  // Use lowest price from release as floor reference
  const lowestPrice = release?.lowest_price || null;

  // Fetch cheap marketplace listings if we have API access
  if (window.discogsService && (window.discogsService.token || window.discogsService.key)) {
    try {
      const medianRef = suggestedPrice || lowestPrice;
      marketplaceListings = await window.discogsService.getMarketplaceListings(
        releaseId,
        10,
        medianRef ? medianRef * 1.1 : null,
      );
    } catch (e) {
      console.warn("Marketplace listings failed:", e.message);
    }
  }

  renderReleaseDealPanel(releaseId, release, suggestedPrice, lowestPrice, marketplaceListings, condition, priceSuggestions);
}

/**
 * Render the Release Price Lookup results panel.
 */
function renderReleaseDealPanel(releaseId, release, suggestedPrice, lowestPrice, marketplaceListings, condition, priceSuggestions) {
  const resultEl = document.getElementById("releaseLookupResult");
  if (!resultEl) return;

  // Store release data for the arbitrage/listing generator to use
  window._lookupRelease = release;

  const artist = release
    ? (release.artists || []).map((a) => a.name.replace(/\s*\(\d+\)\s*$/, "")).join(", ")
    : "Unknown Artist";
  const title = release?.title || "Unknown Title";
  const year = release?.year || "";
  const label = release?.labels?.[0]?.name || "";
  const numForSale = release?.num_for_sale || 0;
  const discogsReleaseUrl = release?.uri || `https://www.discogs.com/release/${releaseId}`;
  const discogsMarketUrl = `https://www.discogs.com/sell/list?release_id=${releaseId}&sort=price%2Casc`;

  // Build eBay/Google search URLs — preserve the artist/title as-is for best search results
  const searchTermEncoded = encodeURIComponent(`${artist} ${title} vinyl record`);
  const ebayUKUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${searchTermEncoded}&_sacat=176985&LH_ItemCondition=3000`;
  const ebayUKSoldUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${searchTermEncoded}&_sacat=176985&LH_Sold=1&LH_Complete=1`;
  const ebayUSUrl = `https://www.ebay.com/sch/i.html?_nkw=${searchTermEncoded}&_sacat=176985&LH_ItemCondition=3000`;
  const googleEbayUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:ebay.co.uk "${artist}" "${title}" vinyl`)}`;

  // Price reference cards
  const priceCards = [];
  if (lowestPrice) {
    priceCards.push(`
      <div class="p-3 bg-surface rounded-lg border border-gray-700">
        <p class="text-xs text-gray-500 mb-1">Discogs Lowest Now</p>
        <p class="text-xl font-bold text-profit">£${parseFloat(lowestPrice).toFixed(2)}</p>
        <p class="text-xs text-gray-600">${numForSale} for sale</p>
      </div>`);
  }
  if (suggestedPrice) {
    priceCards.push(`
      <div class="p-3 bg-surface rounded-lg border border-deal/40">
        <p class="text-xs text-gray-500 mb-1">Discogs Suggested (${condition})</p>
        <p class="text-xl font-bold text-deal">£${parseFloat(suggestedPrice).toFixed(2)}</p>
        <p class="text-xs text-gray-600">Use as target sell price</p>
      </div>`);
  }

  // All condition suggestions
  let suggestionsHtml = "";
  if (priceSuggestions && Object.keys(priceSuggestions).length > 0) {
    const rows = Object.entries(priceSuggestions)
      .filter(([, v]) => v?.value)
      .map(([cond, v]) => `
        <div class="flex justify-between items-center py-1 border-b border-gray-800 text-sm">
          <span class="text-gray-400">${cond}</span>
          <span class="font-medium text-gray-200">£${parseFloat(v.value).toFixed(2)}</span>
        </div>`)
      .join("");
    suggestionsHtml = rows
      ? `<div class="mt-4">
           <p class="text-xs text-gray-500 uppercase mb-2 font-semibold">Discogs Suggested Prices by Condition</p>
           ${rows}
         </div>`
      : "";
  }

  // Cheap Discogs marketplace listings
  let listingsHtml = "";
  if (marketplaceListings.length > 0) {
    const rows = marketplaceListings.slice(0, 8).map((listing) => {
      const price = parseFloat(listing.price?.value || 0);
      const cond = listing.condition || "Unknown";
      const sleeveCondition = listing.sleeve_condition ? ` / Sleeve: ${listing.sleeve_condition}` : "";
      const seller = listing.seller?.username || "";
      const listingUrl = listing.uri ? `https://www.discogs.com${listing.uri}` : discogsMarketUrl;
      const isBelowSuggested = suggestedPrice && suggestedPrice > 0 && price < suggestedPrice;
      const priceDiff = (suggestedPrice && suggestedPrice > 0) ? ((suggestedPrice - price) / suggestedPrice * 100).toFixed(0) : null;
      return `
        <div class="flex items-center justify-between p-3 rounded-lg border ${isBelowSuggested ? "border-profit/40 bg-profit/5" : "border-gray-700 bg-surface"} mb-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-200">${cond}${sleeveCondition}</p>
            ${seller ? `<p class="text-xs text-gray-500">${seller}</p>` : ""}
          </div>
          <div class="text-right ml-4 shrink-0">
            <p class="text-base font-bold ${isBelowSuggested ? "text-profit" : "text-gray-200"}">£${price.toFixed(2)}</p>
            ${priceDiff && isBelowSuggested ? `<p class="text-xs text-profit">${priceDiff}% below target</p>` : ""}
          </div>
          <a href="${listingUrl}" target="_blank" rel="noopener noreferrer"
            class="ml-3 shrink-0 px-2 py-1 border border-gray-600 rounded text-xs text-gray-400 hover:border-deal hover:text-deal transition-all">
            View
          </a>
        </div>`;
    }).join("");
    listingsHtml = `
      <div class="mt-4">
        <p class="text-xs text-gray-500 uppercase mb-2 font-semibold">
          Cheapest Discogs Listings${suggestedPrice ? ` at or near £${parseFloat(suggestedPrice).toFixed(2)} target` : ""}
        </p>
        ${rows}
        <a href="${discogsMarketUrl}" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
          View all on Discogs marketplace →
        </a>
      </div>`;
  } else if (window.discogsService && (window.discogsService.token || window.discogsService.key)) {
    listingsHtml = `<p class="text-sm text-gray-500 mt-4">No Discogs marketplace listings found below the target price.</p>`;
  } else {
    listingsHtml = `
      <p class="text-sm text-yellow-500/80 mt-4">
        ⚠ Add Discogs API credentials in Settings to see live marketplace listings.
      </p>`;
  }

  resultEl.innerHTML = `
    <div class="space-y-4">
      <!-- Release header -->
      <div class="p-4 rounded-xl bg-surface border border-deal/30 flex flex-col sm:flex-row sm:items-start gap-4">
        <div class="flex-1">
          <p class="text-xs text-gray-500 mb-1">Release #${releaseId}</p>
          <h3 class="text-lg font-bold text-gray-100">${artist}</h3>
          <p class="text-gray-400">${title}${year ? ` (${year})` : ""}${label ? ` · ${label}` : ""}</p>
        </div>
        <a href="${discogsReleaseUrl}" target="_blank" rel="noopener noreferrer"
          class="text-xs text-primary hover:underline shrink-0 self-start">
          View on Discogs ↗
        </a>
      </div>

      <!-- Price reference cards -->
      ${priceCards.length > 0 ? `<div class="grid grid-cols-2 gap-3">${priceCards.join("")}</div>` : ""}

      ${suggestionsHtml}
      ${listingsHtml}

      <!-- Buy opportunity links -->
      <div class="mt-4 pt-4 border-t border-gray-800">
        <p class="text-xs text-gray-500 uppercase mb-3 font-semibold">Find Buy Opportunities</p>
        <div class="flex flex-wrap gap-2">
          <a href="${ebayUKUrl}" target="_blank" rel="noopener noreferrer"
            class="px-3 py-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            eBay UK (Live)
          </a>
          <a href="${ebayUKSoldUrl}" target="_blank" rel="noopener noreferrer"
            class="px-3 py-2 bg-surface border border-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:border-deal hover:text-deal transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            eBay UK Sold Prices
          </a>
          <a href="${ebayUSUrl}" target="_blank" rel="noopener noreferrer"
            class="px-3 py-2 bg-surface border border-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:border-deal hover:text-deal transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            eBay US (Live)
          </a>
          <a href="${googleEbayUrl}" target="_blank" rel="noopener noreferrer"
            class="px-3 py-2 bg-surface border border-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:border-blue-400 hover:text-blue-400 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Google → eBay
          </a>
          <a href="${discogsMarketUrl}" target="_blank" rel="noopener noreferrer"
            class="px-3 py-2 bg-surface border border-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:border-primary hover:text-primary transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Discogs Marketplace
          </a>
        </div>
        <p class="text-xs text-gray-600 mt-2">Compare prices found on eBay against the Discogs suggested price to spot undervalued listings.</p>
      </div>

      <!-- Arbitrage Analyser -->
      <div class="mt-4 pt-4 border-t border-gray-800">
        <p class="text-xs text-gray-500 uppercase mb-3 font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Arbitrage Profit Calculator
        </p>
        <p class="text-xs text-gray-500 mb-3">Enter prices to calculate your potential profit buying on Discogs and selling on eBay.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Discogs Buy Price (£)</label>
            <input type="number" id="arbitrageDiscogsBuy" step="0.01" min="0"
              value="${lowestPrice ? parseFloat(lowestPrice).toFixed(2) : ""}"
              placeholder="${lowestPrice ? parseFloat(lowestPrice).toFixed(2) : "e.g. 8.50"}"
              oninput="calculateArbitrageFromPanel()"
              class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg text-sm focus:border-deal focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Discogs Shipping (£)</label>
            <input type="number" id="arbitrageDiscogsShipping" step="0.50" min="0" value="3.00"
              oninput="calculateArbitrageFromPanel()"
              class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg text-sm focus:border-deal focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">eBay Avg Sold Price (£)
              <a href="${`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(`${artist} ${release?.title || ""} vinyl record`)}&_sacat=176985&LH_Sold=1&LH_Complete=1`}"
                target="_blank" rel="noopener noreferrer" class="text-primary hover:underline ml-1">look up ↗</a>
            </label>
            <input type="number" id="arbitrageEbayAvg" step="0.01" min="0"
              value="${suggestedPrice ? parseFloat(suggestedPrice).toFixed(2) : ""}"
              placeholder="${suggestedPrice ? parseFloat(suggestedPrice).toFixed(2) : "e.g. 25.00"}"
              oninput="calculateArbitrageFromPanel()"
              class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg text-sm focus:border-deal focus:outline-none" />
          </div>
        </div>
        <div id="arbitrageResult">
          ${(lowestPrice || suggestedPrice) ? "" : '<p class="text-xs text-gray-600">Fill in the prices above to see your profit analysis.</p>'}
        </div>
      </div>
    </div>`;

  // Auto-run if we have both prices pre-filled
  if (lowestPrice && suggestedPrice) {
    calculateArbitrageFromPanel();
  }
}

// ─── Arbitrage Profit Calculator ─────────────────────────────────────────────

// eBay UK managed payments (replaced PayPal in 2021):
// 13.15% final value fee (incl. Goods & Services portion) + 30p per transaction
const _EBAY_FEE_RATE = 0.1315;
const _EBAY_FIXED_FEE = 0.30;   // per-transaction charge (eBay managed payments)
const _SELL_SHIPPING = 4.50; // Royal Mail 48 tracked LP mailer
const _SELL_PACKING = 1.50;  // LP mailer + stiffeners

/**
 * Calculate net profit and ROI for buying on Discogs and selling on eBay.
 */
function calculateArbitrage(discogsBuyPrice, ebayAvgSold, discogsShipping) {
  const shipping = typeof discogsShipping === "number" ? discogsShipping : 3.00;
  const totalBuyCost = discogsBuyPrice + shipping;
  const ebayFee = ebayAvgSold * _EBAY_FEE_RATE + _EBAY_FIXED_FEE;
  const totalSellFees = ebayFee + _SELL_SHIPPING + _SELL_PACKING;
  const netProfit = ebayAvgSold - totalBuyCost - totalSellFees;
  const roi = totalBuyCost > 0 ? (netProfit / totalBuyCost) * 100 : 0;

  return {
    discogsBuyPrice,
    discogsShipping: shipping,
    totalBuyCost: Math.round(totalBuyCost * 100) / 100,
    ebayAvgSold,
    ebayFee: Math.round(ebayFee * 100) / 100,
    sellShipping: _SELL_SHIPPING,
    packingCost: _SELL_PACKING,
    totalSellFees: Math.round(totalSellFees * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    roi: parseFloat(roi.toFixed(1)),
    isHot: netProfit >= 8 && roi >= 50,
    isViable: netProfit >= 3 && roi >= 20,
  };
}

/**
 * Read arbitrage inputs from the panel and render results inline.
 */
function calculateArbitrageFromPanel() {
  const discogsBuyInput = parseFloat(document.getElementById("arbitrageDiscogsBuy")?.value) || 0;
  const ebayAvgInput = parseFloat(document.getElementById("arbitrageEbayAvg")?.value) || 0;
  const discogsShipping = parseFloat(document.getElementById("arbitrageDiscogsShipping")?.value) || 3.00;
  const resultEl = document.getElementById("arbitrageResult");
  if (!resultEl) return;

  if (discogsBuyInput <= 0 || ebayAvgInput <= 0) {
    resultEl.innerHTML = `<p class="text-xs text-gray-600">Fill in both prices above to see the profit analysis.</p>`;
    return;
  }

  const arb = calculateArbitrage(discogsBuyInput, ebayAvgInput, discogsShipping);

  let badgeHtml, borderClass;
  if (arb.isHot) {
    badgeHtml = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-profit text-white text-sm font-bold">🔥 HIGH RETURN — STRONG BUY</span>`;
    borderClass = "border-profit bg-profit/5";
  } else if (arb.isViable) {
    badgeHtml = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-deal/20 text-deal text-sm font-bold">✓ VIABLE FLIP</span>`;
    borderClass = "border-deal/40 bg-deal/5";
  } else {
    badgeHtml = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-700 text-gray-400 text-sm font-bold">✗ LOW MARGIN — PASS</span>`;
    borderClass = "border-gray-700";
  }

  resultEl.innerHTML = `
    <div class="p-4 rounded-xl border ${borderClass} space-y-3">
      <div class="flex items-center justify-between gap-3">
        ${badgeHtml}
        <div class="text-right shrink-0">
          <p class="text-2xl font-bold ${arb.netProfit >= 0 ? "text-profit" : "text-loss"}">£${arb.netProfit.toFixed(2)}</p>
          <p class="text-xs text-gray-500">net profit</p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div class="p-2 bg-surface rounded-lg">
          <p class="text-xs text-gray-500 mb-0.5">Buy (Discogs)</p>
          <p class="font-bold text-gray-200">£${arb.discogsBuyPrice.toFixed(2)}</p>
        </div>
        <div class="p-2 bg-surface rounded-lg">
          <p class="text-xs text-gray-500 mb-0.5">Total Buy Cost</p>
          <p class="font-bold text-gray-200">£${arb.totalBuyCost.toFixed(2)}</p>
        </div>
        <div class="p-2 bg-surface rounded-lg">
          <p class="text-xs text-gray-500 mb-0.5">eBay Avg Sold</p>
          <p class="font-bold text-gray-200">£${arb.ebayAvgSold.toFixed(2)}</p>
        </div>
        <div class="p-2 bg-surface rounded-lg">
          <p class="text-xs text-gray-500 mb-0.5">ROI</p>
          <p class="font-bold ${arb.roi >= 30 ? "text-profit" : arb.roi >= 0 ? "text-yellow-400" : "text-loss"}">${arb.roi}%</p>
        </div>
      </div>
      <div class="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>eBay fee: £${arb.ebayFee.toFixed(2)}</span>
        <span>Sell shipping: £${arb.sellShipping.toFixed(2)}</span>
        <span>Packing: £${arb.packingCost.toFixed(2)}</span>
      </div>
      ${arb.isViable ? `
      <div class="pt-3 border-t border-gray-800">
        <button onclick="openEbayListingModal()"
          class="px-4 py-2 bg-gradient-to-r from-deal to-primary rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-deal/25 transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Generate eBay Listing
        </button>
        <p class="text-xs text-gray-600 mt-1">Creates a pre-filled eBay description using Discogs release data.</p>
      </div>` : ""}
    </div>`;
}

// ─── eBay Listing Generator ───────────────────────────────────────────────────

/**
 * Build a self-contained HTML description for an eBay listing using
 * Discogs release data. Does not require photos (seller uploads separately).
 */
function buildEbayListingHtmlFromRelease(release, condition) {
  const artist = release
    ? (release.artists || []).map((a) => a.name.replace(/\s*\(\d+\)\s*$/, "")).join(", ")
    : "Unknown Artist";
  const title = release?.title || "Unknown Title";
  const year = release?.year || "";
  const country = release?.country || "UK";
  const labels = (release?.labels || [])
    .map((l) => `${l.name}${l.catno ? ` (${l.catno})` : ""}`)
    .join(", ");
  const formats = (release?.formats || [])
    .map((f) => f.name + (f.descriptions ? ` · ${f.descriptions.join(", ")}` : ""))
    .join("; ");
  const styles = [...(release?.genres || []), ...(release?.styles || [])].join(", ");

  const conditionLabels = {
    M: "Mint (M)", NM: "Near Mint (NM or M-)", "VG+": "Very Good Plus (VG+)",
    VG: "Very Good (VG)", "G+": "Good Plus (G+)", G: "Good (G)",
    F: "Fair (F)", P: "Poor (P)",
  };
  const conditionLabel = conditionLabels[condition] || condition || "Not Specified";

  // Tracklist
  let tracklistHtml = "";
  if (release?.tracklist && release.tracklist.length > 0) {
    const hasSides = release.tracklist.some((t) => t.position && /^[A-Z]/.test(t.position));
    if (hasSides) {
      const sides = {};
      release.tracklist.forEach((t) => {
        const side = t.position ? t.position.charAt(0) : "?";
        if (!sides[side]) sides[side] = [];
        sides[side].push(t);
      });
      tracklistHtml = Object.entries(sides).map(([side, tracks]) => `
        <div style="margin-bottom:12px">
          <h4 style="margin:0 0 8px;color:#7c3aed;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Side ${side}</h4>
          ${tracks.map((t) => `
            <div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:4px;margin-bottom:4px;font-size:13px">
              <span><strong style="color:#4b5563">${t.position}</strong> ${t.title}</span>
              ${t.duration ? `<span style="color:#9ca3af;font-family:monospace">${t.duration}</span>` : ""}
            </div>`).join("")}
        </div>`).join("");
    } else {
      tracklistHtml = release.tracklist.map((t) => `
        <div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:4px;margin-bottom:4px;font-size:13px">
          <span>${t.position ? `<strong style="color:#4b5563">${t.position}</strong> ` : ""}${t.title}</span>
          ${t.duration ? `<span style="color:#9ca3af;font-family:monospace">${t.duration}</span>` : ""}
        </div>`).join("");
    }
  }

  // Pressing / matrix identifiers
  const identifiers = release?.identifiers || [];
  const barcode = identifiers.find((i) => i.type === "Barcode");
  const matrixEntries = identifiers.filter(
    (i) => i.type === "Matrix / Runout" || i.type === "Runout",
  );
  let pressingHtml = "";
  if (barcode || matrixEntries.length > 0) {
    pressingHtml = `
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">
        <h3 style="margin:0 0 10px;color:#166534;font-size:14px;font-weight:700">Pressing &amp; Matrix Information</h3>
        <div style="font-family:monospace;font-size:12px;color:#15803d;line-height:1.7">
          ${barcode ? `<div><strong>Barcode:</strong> ${barcode.value}</div>` : ""}
          ${matrixEntries.map((m) => `<div><strong>${m.type}:</strong> ${m.value}${m.description ? ` (${m.description})` : ""}</div>`).join("")}
        </div>
      </div>`;
  }

  // Provenance — companies (mastering, pressing)
  const companies = release?.companies || [];
  const masteredBy = companies.find((c) =>
    c.entity_type_name === "Mastered At" || c.name?.toLowerCase().includes("mastering"),
  );
  const pressedBy = companies.find((c) =>
    c.entity_type_name === "Pressed By" || c.name?.toLowerCase().includes("pressing"),
  );
  let provenanceHtml = "";
  if (masteredBy || pressedBy) {
    provenanceHtml = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:14px 18px;margin:20px 0;border-radius:8px">
        <h3 style="margin:0 0 10px;color:#1e40af;font-size:14px;font-weight:700">Provenance</h3>
        <div style="font-size:13px;color:#1e3a8a;line-height:1.7">
          ${masteredBy ? `<div>✓ Mastered at <strong>${masteredBy.name}</strong></div>` : ""}
          ${pressedBy ? `<div>✓ Pressed at <strong>${pressedBy.name}</strong></div>` : ""}
        </div>
      </div>`;
  }

  // Release notes (truncated)
  const notesHtml = release?.notes
    ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">
        <h3 style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700">Release Notes</h3>
        <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6">${release.notes.substring(0, 500)}${release.notes.length > 500 ? "…" : ""}</p>
       </div>`
    : "";

  const discogsUrl = release?.uri || "";

  return `<div style="max-width:800px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;line-height:1.6">

<!-- BADGES -->
<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:24px">
  <span style="background:#7c3aed;color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${country} Pressing</span>
  ${year ? `<span style="background:#059669;color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${year}</span>` : ""}
  ${formats ? `<span style="background:#0891b2;color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${formats}</span>` : ""}
  <span style="background:#d97706;color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${conditionLabel}</span>
</div>

<!-- AT A GLANCE TABLE -->
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
  <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700;width:130px">Artist</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${artist}</td></tr>
  <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Title</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${title}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Label</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${labels || "[See record label]"}</td></tr>
  <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Year</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${year || "[Verify]"}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Country</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${country}</td></tr>
  <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Genre / Style</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${styles || "[See Discogs]"}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700">Condition</td><td style="padding:10px 14px;border:1px solid #e2e8f0"><strong>${conditionLabel}</strong></td></tr>
</table>

<!-- CONDITION REPORT -->
<div style="background:#fefce8;border-left:4px solid #eab308;padding:14px 18px;margin-bottom:20px;border-radius:0 8px 8px 0">
  <h3 style="margin:0 0 10px;color:#854d0e;font-size:15px;font-weight:700">Condition Report</h3>
  <p style="margin:0 0 8px;color:#713f12"><strong>Vinyl:</strong> ${conditionLabel} — [Add your notes: surface marks, play quality, quiet pressing, etc.]</p>
  <p style="margin:0 0 8px;color:#713f12"><strong>Sleeve:</strong> [Grade / notes — splits, ring wear, writing, stickers, etc.]</p>
  <p style="margin:0;color:#713f12"><strong>Inner sleeve / extras:</strong> [Note original inner, inserts, lyric sheet, poster, OBI strip, etc.]</p>
</div>

${tracklistHtml ? `<!-- TRACKLIST -->
<h3 style="color:#1e293b;font-size:17px;font-weight:700;margin:0 0 12px">Tracklist</h3>
<div style="background:#f8fafc;padding:14px 18px;border-radius:8px;margin-bottom:20px">${tracklistHtml}</div>` : ""}

${pressingHtml}
${provenanceHtml}
${notesHtml}

<!-- PACKING & POSTAGE -->
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;margin-bottom:20px;border-radius:0 8px 8px 0">
  <h3 style="margin:0 0 10px;color:#1e40af;font-size:15px;font-weight:700">Packing &amp; Postage</h3>
  <p style="margin:0 0 8px;color:#1e3a8a">Records are removed from outer sleeves for transit. Packed with card stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked (or equivalent courier).</p>
  <p style="margin:0;color:#1e3a8a;font-size:13px"><strong>Combined postage:</strong> Discount available for multiple purchases — please request invoice before paying.</p>
</div>

${discogsUrl ? `<p style="font-size:12px;color:#64748b;margin-bottom:20px">Discogs reference: <a href="${discogsUrl}" style="color:#8b5cf6">${discogsUrl}</a></p>` : ""}

<!-- CTA -->
<div style="text-align:center;padding:20px;background:#f1f5f9;border-radius:10px">
  <p style="margin:0 0 6px;color:#475569;font-weight:600">Questions? Need more photos?</p>
  <p style="margin:0;color:#64748b;font-size:13px">Message me anytime — happy to provide additional angles or pressing details.</p>
</div>

</div>`;
}

/**
 * Open the eBay Listing Generator modal for the currently looked-up release.
 */
function openEbayListingModal() {
  const release = window._lookupRelease;
  const condition = document.getElementById("releaseLookupCondition")?.value || "VG+";
  const ebayTargetPrice = parseFloat(document.getElementById("arbitrageEbayAvg")?.value) || 0;

  const artist = release
    ? (release.artists || []).map((a) => a.name.replace(/\s*\(\d+\)\s*$/, "")).join(", ")
    : "Unknown Artist";
  const title = release?.title || "Unknown Title";
  const year = release?.year || "";
  const fmtNames = (release?.formats || []).map((f) => f.name).join(", ") || "LP";
  const rawTitle = `${artist} - ${title}${year ? ` (${year})` : ""} - ${fmtNames} - Vinyl - ${condition}`;
  // Truncate at a word boundary so the title doesn't cut mid-word
  const ebayTitle = rawTitle.length <= 80
    ? rawTitle
    : rawTitle.substring(0, 80).replace(/\s+\S*$/, "");

  const listingHtml = buildEbayListingHtmlFromRelease(release, condition);
  const ebayListUrl = "https://www.ebay.co.uk/sell/create/listing?cat=176985";

  const modal = document.getElementById("ebayListingModal");
  const content = document.getElementById("ebayListingModalContent");
  if (!modal || !content) return;

  const escapedTitle = ebayTitle.replace(/"/g, "&quot;");
  const escapedHtml = listingHtml
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  content.innerHTML = `
    <div class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-xs text-gray-500 uppercase mb-1 font-semibold">eBay Listing Title (max 80 chars)</label>
        <div class="flex gap-2">
          <input type="text" id="ebayListingTitle" value="${escapedTitle}" maxlength="80"
            class="flex-1 px-3 py-2 bg-surface border border-gray-700 rounded-lg text-sm font-mono focus:border-deal focus:outline-none" />
          <button onclick="navigator.clipboard.writeText(document.getElementById('ebayListingTitle').value).then(()=>showToast('Title copied!','success'))"
            class="px-3 py-2 border border-gray-600 rounded-lg text-xs text-gray-400 hover:border-deal hover:text-deal transition-all shrink-0">
            Copy
          </button>
        </div>
        <p class="text-xs text-gray-600 mt-1" id="ebayTitleCharCount">${ebayTitle.length}/80 characters</p>
      </div>

      <!-- Pricing guide -->
      ${ebayTargetPrice > 0 ? `
      <div class="p-3 bg-deal/10 border border-deal/30 rounded-lg text-sm">
        <p class="font-semibold text-deal mb-1">Suggested Listing Price</p>
        <p class="text-gray-300">£${ebayTargetPrice.toFixed(2)} <span class="text-gray-500">(eBay avg sold you entered)</span></p>
        <p class="text-xs text-gray-500 mt-1">Consider listing 5–10% above to allow best-offer negotiation.</p>
      </div>` : ""}

      <!-- HTML description -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 uppercase font-semibold">eBay Description (HTML — paste into eBay HTML editor)</label>
          <button onclick="copyListingHtml()"
            class="px-3 py-1.5 bg-deal/20 border border-deal/40 text-deal rounded text-xs font-medium hover:bg-deal/30 transition-all flex items-center gap-1 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy HTML
          </button>
        </div>
        <textarea id="ebayListingHtmlOutput" rows="10" readonly
          class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg text-xs font-mono text-gray-400 resize-y focus:outline-none"
          >${escapedHtml}</textarea>
        <p class="text-xs text-gray-600 mt-1">
          In eBay listing creation: scroll to Description → switch to HTML view → paste. Upload photos separately.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
        <a href="${ebayListUrl}" target="_blank" rel="noopener noreferrer"
          class="px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open eBay Sell Page
        </a>
        <button onclick="closeEbayListingModal()"
          class="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 text-sm hover:border-gray-500 hover:text-white transition-all">
          Close
        </button>
      </div>
    </div>`;

  // Store raw HTML for clipboard
  window._ebayListingHtml = listingHtml;

  // Live character counter for title
  const titleInput = content.querySelector("#ebayListingTitle");
  const charCount = content.querySelector("#ebayTitleCharCount");
  if (titleInput && charCount) {
    titleInput.addEventListener("input", () => {
      charCount.textContent = `${titleInput.value.length}/80 characters`;
    });
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function copyListingHtml() {
  if (window._ebayListingHtml) {
    navigator.clipboard.writeText(window._ebayListingHtml).then(() => {
      showToast("HTML description copied to clipboard!", "success");
    }).catch(() => {
      // Fallback: select the textarea so the user can manually copy with Ctrl+C
      const ta = document.getElementById("ebayListingHtmlOutput");
      if (ta) {
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
      }
      showToast("Press Ctrl+C (or Cmd+C) to copy the selected HTML", "warning");
    });
  }
}

function closeEbayListingModal() {
  const modal = document.getElementById("ebayListingModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
if (typeof showToast !== "function") {
  function showToast(message, type = "success") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const iconMap = {
      success: "check",
      error: "alert-circle",
      warning: "alert-triangle",
    };

    const colorMap = {
      success: "text-green-400",
      error: "text-red-400",
      warning: "text-yellow-400",
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type} flex items-center gap-3`;
    toast.innerHTML = `
            <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
            <span class="text-sm text-gray-200">${message}</span>
        `;
    document.body.appendChild(toast);
    if (typeof feather !== "undefined") feather.replace();

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// eBay Price Research helpers
function buildEbaySearchQuery() {
  const artist = document.getElementById("ebaySearchArtist")?.value.trim() || "";
  const title = document.getElementById("ebaySearchTitle")?.value.trim() || "";
  return encodeURIComponent([artist, title, "vinyl"].filter(Boolean).join(" "));
}

function openEbaySearch() {
  const q = buildEbaySearchQuery();
  if (!q || q === encodeURIComponent("vinyl")) {
    showToast("Please enter an artist or album title to search.", "warning");
    document.getElementById("ebaySearchArtist")?.focus();
    return;
  }
  const condition = document.getElementById("ebaySearchCondition")?.value || "";
  const extra = condition ? `&${condition}` : "";
  window.open(
    `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&_sacat=176985${extra}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function openEbaySearchUS() {
  const q = buildEbaySearchQuery();
  if (!q || q === encodeURIComponent("vinyl")) {
    showToast("Please enter an artist or album title to search.", "warning");
    document.getElementById("ebaySearchArtist")?.focus();
    return;
  }
  window.open(
    `https://www.ebay.com/sch/i.html?_nkw=${q}&_sacat=176985`,
    "_blank",
    "noopener,noreferrer",
  );
}

function openEbaySoldSearch() {
  const q = buildEbaySearchQuery();
  if (!q || q === encodeURIComponent("vinyl")) {
    showToast("Please enter an artist or album title to search.", "warning");
    document.getElementById("ebaySearchArtist")?.focus();
    return;
  }
  window.open(
    `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&_sacat=176985&LH_Sold=1&LH_Complete=1`,
    "_blank",
    "noopener,noreferrer",
  );
}

// ─── ValueYourMusic Sold Price Research ──────────────────────────────────────

/** Map VinylFort condition codes to ValueYourMusic URL condition slugs. */
const VYM_CONDITION_MAP = {
  M: "mint",
  NM: "near-mint",
  "VG+": "very-good-plus",
  VG: "very-good",
  "G+": "good-plus",
  G: "good",
};

/**
 * Build a ValueYourMusic sold-listings URL from the supplied record details.
 * Mirrors the example: artist + title as the primary term, followed by
 * matrix A and B as comma-separated additions, sorted by most-recent sale.
 *
 * @param {string} artist
 * @param {string} title
 * @param {string} [matrixA]
 * @param {string} [matrixB]
 * @param {string} [condition="VG"]
 * @returns {string}
 */
function buildValueYourMusicUrl(artist, title, matrixA, matrixB, condition = "VG") {
  if (!artist || !title) {
    throw new Error("artist and title are required to build a ValueYourMusic URL");
  }
  const slug = VYM_CONDITION_MAP[condition] || "very-good";
  const parts = [`${artist} ${title}`, matrixA, matrixB].filter(Boolean);
  const q = encodeURIComponent(parts.join(", "));
  return `https://www.valueyourmusic.com/vinyl?condition=${slug}&q=${q}&sort=date_end_desc&utf8=%E2%9C%93`;
}

/**
 * Calculate low, median, and high from an array of numeric prices.
 *
 * @param {number[]} prices
 * @returns {{ low: number, median: number, high: number, count: number } | null}
 */
function calculateSoldPriceStats(prices) {
  if (!prices || prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n % 2 === 1
      ? sorted[Math.floor(n / 2)]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    low: sorted[0],
    median: Math.round(median * 100) / 100,
    high: sorted[n - 1],
    count: n,
  };
}

/**
 * Parse a user-entered string of sold prices (comma or space separated)
 * into an array of numbers. Strips currency symbols.
 *
 * @param {string} raw
 * @returns {number[]}
 */
function parseSoldPricesFromInput(raw) {
  return (raw || "")
    .split(/[,\s]+/)
    .map((s) => parseFloat(s.replace(/[£$€]/g, "").trim()))
    .filter((n) => !isNaN(n) && n > 0);
}

/** Trigger the ValueYourMusic panel search. */
function lookupVymPrices() {
  const artist = document.getElementById("vymArtist")?.value.trim() || "";
  const title = document.getElementById("vymTitle")?.value.trim() || "";
  const matrixA = document.getElementById("vymMatrixA")?.value.trim() || "";
  const matrixB = document.getElementById("vymMatrixB")?.value.trim() || "";
  const condition = document.getElementById("vymCondition")?.value || "VG";

  if (!artist || !title) {
    showToast("Enter at least artist and title to build the search URL", "warning");
    document.getElementById("vymArtist")?.focus();
    return;
  }

  const url = buildValueYourMusicUrl(artist, title, matrixA, matrixB, condition);

  // Display generated URL so the user can see it
  const urlEl = document.getElementById("vymGeneratedUrl");
  if (urlEl) {
    urlEl.value = url;
    urlEl.classList.remove("hidden");
  }
  const urlRow = document.getElementById("vymUrlRow");
  if (urlRow) urlRow.classList.remove("hidden");

  // Open in new tab
  window.open(url, "_blank", "noopener,noreferrer");
  showToast("Opening ValueYourMusic sold listings in a new tab…", "success");
}

/** Recalculate stats whenever the user updates the sold-price input. */
function recalculateVymStats() {
  const raw = document.getElementById("vymPricesInput")?.value || "";
  const resultEl = document.getElementById("vymStatsResult");
  if (!resultEl) return;

  const prices = parseSoldPricesFromInput(raw);
  const stats = calculateSoldPriceStats(prices);

  if (!stats) {
    resultEl.innerHTML = `<p class="text-xs text-gray-600">Enter sold prices (comma-separated) to see low / median / high.</p>`;
    return;
  }

  const currency = "£";
  resultEl.innerHTML = `
    <div class="grid grid-cols-3 gap-3 mt-2">
      <div class="p-3 bg-surface rounded-lg text-center">
        <p class="text-xs text-gray-500 mb-1">Low (${stats.count} sales)</p>
        <p class="text-xl font-bold text-loss">${currency}${stats.low.toFixed(2)}</p>
      </div>
      <div class="p-3 bg-surface rounded-lg text-center border border-deal/40">
        <p class="text-xs text-gray-500 mb-1">Median</p>
        <p class="text-xl font-bold text-deal">${currency}${stats.median.toFixed(2)}</p>
        <p class="text-xs text-gray-600">Use as target price</p>
      </div>
      <div class="p-3 bg-surface rounded-lg text-center">
        <p class="text-xs text-gray-500 mb-1">High</p>
        <p class="text-xl font-bold text-profit">${currency}${stats.high.toFixed(2)}</p>
      </div>
    </div>
    <p class="text-xs text-gray-600 mt-2">
      Tip: Use the <strong>median</strong> as your suggested listing price and the <strong>low</strong> as your floor.
      Feed the median into the Arbitrage Calculator above.
    </p>`;
  if (typeof feather !== "undefined") feather.replace();
}

// ─── eBay Login / Flip Popup ──────────────────────────────────────────────────

/** Copy the generated ValueYourMusic URL to the clipboard. */
function copyVymUrl() {
  const el = document.getElementById("vymGeneratedUrl");
  if (!el || !el.value) return;
  navigator.clipboard.writeText(el.value).then(
    () => showToast("URL copied!", "success"),
    () => {
      el.select();
      showToast("Press Ctrl+C to copy the URL", "warning");
    },
  );
}

/**
 * Open the eBay sign-in page in a popup window so the user can authenticate
 * without leaving the Deal Finder page.
 */
function openEbayLoginPopup() {
  const popup = window.open(
    "https://signin.ebay.co.uk/signin",
    "ebay_login",
    "width=520,height=680,scrollbars=yes,resizable=yes,toolbar=no,menubar=no",
  );
  if (!popup || popup.closed) {
    showToast(
      "Pop-up blocked — please allow pop-ups for this site and try again.",
      "warning",
    );
    return;
  }
  showToast("eBay sign-in opened in popup — log in to browse your flips.", "success");
}

/**
 * Open a targeted eBay search for underpriced vinyl in a popup window so the
 * user can browse potential flips while staying on the Deal Finder page.
 *
 * @param {"sold"|"live"} [mode="live"]
 */
function openEbayFlipBrowser(mode) {
  const artist = document.getElementById("vymArtist")?.value.trim()
    || document.getElementById("ebaySearchArtist")?.value.trim()
    || "";
  const title = document.getElementById("vymTitle")?.value.trim()
    || document.getElementById("ebaySearchTitle")?.value.trim()
    || "";
  const q = encodeURIComponent([artist, title, "vinyl"].filter(Boolean).join(" "));

  let url;
  if (mode === "sold") {
    url = `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&_sacat=176985&LH_Sold=1&LH_Complete=1`;
  } else {
    url = `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&_sacat=176985&LH_ItemCondition=3000&_sop=15`;
  }

  const popup = window.open(
    url,
    "ebay_flip",
    "width=1100,height=800,scrollbars=yes,resizable=yes,toolbar=yes,menubar=no",
  );
  if (!popup || popup.closed) {
    // Fall back to a standard new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ─── Deal Finder AI Assistant ─────────────────────────────────────────────────

/** Conversation state for the Deal Finder AI assistant. */
const _dfState = {
  messages: [],       // { role: "user"|"assistant", content: string }[]
  confirmedRelease: null,  // Discogs release object after user confirms
  pendingCandidates: [],   // Discogs search candidates awaiting selection
};

/**
 * Render a new message bubble into the Deal Finder AI chat.
 *
 * @param {"user"|"assistant"} role
 * @param {string} html  – sanitised HTML string to inject
 */
function _dfAppendMessage(role, html) {
  const area = document.getElementById("dfChatArea");
  if (!area) return;
  const div = document.createElement("div");
  div.className = role === "user"
    ? "df-msg-user flex justify-end mb-3"
    : "df-msg-ai flex justify-start mb-3";
  div.innerHTML = role === "user"
    ? `<div class="max-w-xs px-4 py-2 rounded-2xl rounded-tr-sm bg-deal/20 border border-deal/40 text-sm text-gray-200">${html}</div>`
    : `<div class="max-w-sm px-4 py-2 rounded-2xl rounded-tl-sm bg-surface border border-gray-700 text-sm text-gray-200">${html}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

/** Show a typing indicator in the AI chat. */
function _dfShowTyping() {
  const area = document.getElementById("dfChatArea");
  if (!area || area.querySelector("#dfTyping")) return;
  const el = document.createElement("div");
  el.id = "dfTyping";
  el.className = "flex justify-start mb-3";
  el.innerHTML = `<div class="px-4 py-2 rounded-2xl rounded-tl-sm bg-surface border border-gray-700 text-sm text-gray-500 flex items-center gap-2">
    <span class="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay:0s"></span>
    <span class="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay:.15s"></span>
    <span class="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay:.3s"></span>
  </div>`;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function _dfHideTyping() {
  document.getElementById("dfTyping")?.remove();
}

/**
 * Escape a string for use in HTML content.
 *
 * @param {string} str
 * @returns {string}
 */
function _dfEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Initialise (or reset) the Deal Finder AI assistant, showing the greeting.
 */
function initDealFinderAssistant() {
  _dfState.messages = [];
  _dfState.confirmedRelease = null;
  _dfState.pendingCandidates = [];

  const area = document.getElementById("dfChatArea");
  if (area) {
    area.innerHTML = "";
    _dfAppendMessage("assistant",
      "👋 <strong>Hi! I'm your Deal Finder assistant.</strong><br><br>" +
      "Tell me about a record you're interested in — paste a <strong>Discogs URL</strong>, " +
      "an <strong>eBay listing link</strong>, or just describe it:<br>" +
      "<em>artist, title, edition, matrix numbers, condition…</em><br><br>" +
      "I'll search Discogs to narrow it down and run an arbitrage analysis for you.",
    );
  }
  const input = document.getElementById("dfUserInput");
  if (input) {
    input.value = "";
    input.focus();
  }
}

/**
 * Called when the user submits a message to the Deal Finder AI assistant.
 */
async function sendDealFinderMessage() {
  const input = document.getElementById("dfUserInput");
  const text = input?.value.trim();
  if (!text) return;

  input.value = "";
  _dfAppendMessage("user", _dfEscape(text));
  _dfState.messages.push({ role: "user", content: text });

  // Route the message
  await _dfProcessMessage(text);
}

/** Handle Enter key in the Deal Finder input. */
function dfInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendDealFinderMessage();
  }
}

/**
 * Core routing / processing for incoming user messages.
 */
async function _dfProcessMessage(text) {
  // 1. If user is responding to a candidate list (pick a number)
  if (_dfState.pendingCandidates.length > 0) {
    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= _dfState.pendingCandidates.length) {
      const chosen = _dfState.pendingCandidates[num - 1];
      _dfState.pendingCandidates = [];
      await _dfShowReleaseConfirm(chosen.id);
      return;
    }
    // User typed something other than a number — re-search with new text
    _dfState.pendingCandidates = [];
  }

  // 2. Handle "yes/confirm" response to a release confirmation
  if (/^(yes|confirm|that'?s\s+(it|the\s+one)|correct|right|yep|yeah)\b/i.test(text)) {
    if (_dfState.confirmedRelease) {
      await _dfRunArbitrage(_dfState.confirmedRelease);
      return;
    }
  }

  // 3. Handle "no/wrong/next" — re-search if we had candidates
  if (/^(no|wrong|not\s+this|different|next|skip)\b/i.test(text)) {
    _dfAppendMessage("assistant",
      "OK, let me try a different search. Could you give me more details — " +
      "e.g. label, catalogue number, pressing country, or matrix numbers?",
    );
    return;
  }

  // 4. Check for a Discogs URL
  const discogsUrlMatch = text.match(/discogs\.com\/(?:release\/|.*-release-)(\d+)/i)
    || text.match(/discogs\.com\/[^/]+\/[^/]+-(\d+)$/i);
  if (discogsUrlMatch) {
    const releaseId = parseInt(discogsUrlMatch[1], 10);
    await _dfShowReleaseConfirm(releaseId);
    return;
  }

  // 5. General search: extract as much as we can from the message
  await _dfSearchAndPresent(text);
}

/**
 * Search Discogs for candidates matching the user's message and present them.
 *
 * @param {string} query  – raw user text
 */
async function _dfSearchAndPresent(query) {
  if (!window.discogsService) {
    _dfAppendMessage("assistant",
      "⚠️ <strong>Discogs API not configured.</strong> " +
      "Please add your Discogs credentials in <a href=\"settings.html\" class=\"text-primary underline\">Settings</a> " +
      "to enable release search. You can still paste a direct Discogs release URL.",
    );
    return;
  }

  // Rough parse: try to extract artist and title from free text
  let artist = document.getElementById("dfArtistInput")?.value.trim() || "";
  let title = document.getElementById("dfTitleInput")?.value.trim() || "";
  let catNo = document.getElementById("dfCatNoInput")?.value.trim() || "";
  // Merge in anything typed in the chat
  if (!artist || !title) {
    const dashParts = query.split(/\s*[-–—]\s*/);
    if (dashParts.length >= 2) {
      artist = artist || dashParts[0].trim();
      title = title || dashParts[1].trim();
    } else {
      artist = artist || query;
    }
  }

  _dfShowTyping();
  _dfAppendMessage("assistant",
    `🔍 Searching Discogs for <strong>${_dfEscape(artist)}${title ? " — " + _dfEscape(title) : ""}</strong>…`,
  );

  let candidates = [];
  try {
    candidates = await window.discogsService.searchReleaseCandidates(
      artist, title, catNo || null, 5,
    );
  } catch (e) {
    console.warn("Discogs search failed:", e);
  }

  _dfHideTyping();

  if (!candidates || candidates.length === 0) {
    _dfAppendMessage("assistant",
      "I couldn't find any releases on Discogs for that search. " +
      "Try being more specific — include the label, year, pressing country, or paste a Discogs URL directly.",
    );
    return;
  }

  _dfState.pendingCandidates = candidates;

  const listItems = candidates.map((c, i) => {
    const year = c.year ? ` (${c.year})` : "";
    const country = c.country ? ` · ${c.country}` : "";
    const label = (c.label || []).join(", ");
    const catno = c.catno ? ` [${c.catno}]` : "";
    return `<li class="py-1 border-b border-gray-800 last:border-0">
      <button onclick="_dfPickCandidate(${i})"
        class="w-full text-left px-2 py-1.5 rounded hover:bg-deal/10 transition-all text-sm">
        <strong class="text-gray-100">${i + 1}. ${_dfEscape(c.title)}${year}</strong><br>
        <span class="text-gray-500 text-xs">${_dfEscape(label)}${catno}${country}</span>
      </button>
    </li>`;
  }).join("");

  _dfAppendMessage("assistant",
    `I found <strong>${candidates.length}</strong> possible releases. Click one to confirm, or type its number:<br>
    <ul class="mt-2 bg-surface rounded-lg border border-gray-700 overflow-hidden">${listItems}</ul>`,
  );
}

/**
 * Called when the user clicks a candidate from the list buttons.
 *
 * @param {number} index  – index into _dfState.pendingCandidates
 */
async function _dfPickCandidate(index) {
  const candidate = _dfState.pendingCandidates[index];
  if (!candidate) return;
  _dfState.pendingCandidates = [];
  await _dfShowReleaseConfirm(candidate.id);
}

/**
 * Fetch a release from Discogs and show the "Is this the one?" confirmation popup.
 *
 * @param {number} releaseId
 */
async function _dfShowReleaseConfirm(releaseId) {
  _dfShowTyping();
  let release = null;
  try {
    release = await window.discogsService?.getReleaseDetails(releaseId);
  } catch (e) {
    console.warn("Failed to fetch release:", e);
  }
  _dfHideTyping();

  if (!release) {
    _dfAppendMessage("assistant",
      `Could not fetch release #${releaseId} from Discogs. ` +
      "Please check your API credentials or try a different release.",
    );
    return;
  }

  _dfState.confirmedRelease = release;

  // Build a rich preview card inline in the chat
  const artist = (release.artists || []).map((a) => a.name.replace(/\s*\(\d+\)\s*$/, "")).join(", ") || "Unknown";
  const title = release.title || "Unknown";
  const year = release.year || "";
  const country = release.country || "";
  const label = (release.labels || []).map((l) => l.name).join(", ");
  const catno = (release.labels || []).map((l) => l.catno).filter(Boolean).join(", ");
  const formats = (release.formats || []).map((f) => f.name + (f.descriptions ? ` (${f.descriptions.join(", ")})` : "")).join("; ");
  const imageUrl = release.images?.[0]?.uri150 || release.images?.[0]?.resource_url || "";
  const discogsUrl = release.uri || `https://www.discogs.com/release/${releaseId}`;

  const identifiers = release.identifiers || [];
  const matrixItems = identifiers.filter((i) => i.type === "Matrix / Runout" || i.type === "Runout");
  const matrixHtml = matrixItems.length > 0
    ? `<p class="text-xs mt-1"><strong>Matrix:</strong> ${matrixItems.map((m) => _dfEscape(m.value)).join(" | ")}</p>`
    : "";

  const notesSnippet = release.notes
    ? `<p class="text-xs text-gray-500 mt-1 italic">${_dfEscape(release.notes.substring(0, 120))}${release.notes.length > 120 ? "…" : ""}</p>`
    : "";

  _dfAppendMessage("assistant",
    `Is this the release?<br>
    <div class="mt-2 rounded-xl border border-deal/40 bg-surface overflow-hidden">
      ${imageUrl ? `<img src="${imageUrl}" alt="Release cover" class="w-full h-32 object-cover object-top">` : ""}
      <div class="p-3">
        <p class="font-bold text-gray-100">${_dfEscape(artist)} — ${_dfEscape(title)}${year ? ` (${year})` : ""}</p>
        <p class="text-xs text-gray-400">${_dfEscape(label)}${catno ? ` · ${catno}` : ""}${country ? ` · ${country}` : ""}</p>
        ${formats ? `<p class="text-xs text-gray-500 mt-0.5">${_dfEscape(formats)}</p>` : ""}
        ${matrixHtml}
        ${notesSnippet}
        <a href="${discogsUrl}" target="_blank" rel="noopener noreferrer"
          class="text-xs text-primary hover:underline mt-1 inline-block">
          View full page on Discogs ↗
        </a>
        <div class="flex gap-2 mt-3">
          <button onclick="_dfConfirmRelease()"
            class="flex-1 px-3 py-2 bg-deal/20 border border-deal/50 text-deal rounded-lg text-xs font-semibold hover:bg-deal/30 transition-all">
            ✓ Yes, this is it
          </button>
          <button onclick="_dfRejectRelease()"
            class="flex-1 px-3 py-2 bg-surface border border-gray-600 text-gray-400 rounded-lg text-xs hover:border-gray-500 transition-all">
            ✗ Not this one
          </button>
        </div>
      </div>
    </div>`,
  );
}

/** User confirmed the suggested release — run arbitrage. */
async function _dfConfirmRelease() {
  const release = _dfState.confirmedRelease;
  if (!release) return;
  _dfAppendMessage("user", "✓ Yes, that's the one!");
  _dfState.messages.push({ role: "user", content: "Confirmed release." });
  await _dfRunArbitrage(release);
}

/** User rejected the suggested release. */
function _dfRejectRelease() {
  _dfState.confirmedRelease = null;
  _dfAppendMessage("user", "✗ Not this one.");
  _dfAppendMessage("assistant",
    "No problem! Can you give me more details to narrow it down? " +
    "For example: label, catalogue number, pressing country, year, or matrix numbers. " +
    "Or paste the Discogs URL directly.",
  );
}

/**
 * Run the full arbitrage analysis for a confirmed Discogs release and display
 * the results in the chat.
 *
 * @param {object} release  – full Discogs release object
 */
async function _dfRunArbitrage(release) {
  _dfAppendMessage("assistant",
    `Great! Running arbitrage analysis for <strong>${_dfEscape(release.title)}</strong>…`,
  );
  _dfShowTyping();

  const releaseId = release.id;
  let priceSuggestions = null;
  let marketplaceListings = [];

  if (window.discogsService) {
    try {
      priceSuggestions = await window.discogsService.getPriceSuggestions(releaseId);
    } catch (e) { /* ignore */ }
    try {
      marketplaceListings = await window.discogsService.getMarketplaceListings(releaseId, 5, null);
    } catch (e) { /* ignore */ }
  }

  _dfHideTyping();

  const conditionOrder = ["Near Mint (NM or M-)", "Very Good Plus (VG+)", "Very Good (VG)", "Good Plus (G+)"];
  const suggestedPrices = {};
  if (priceSuggestions) {
    conditionOrder.forEach((c) => {
      if (priceSuggestions[c]?.value) {
        suggestedPrices[c] = priceSuggestions[c].value;
      }
    });
  }

  const lowestMarket = marketplaceListings.length > 0
    ? Math.min(...marketplaceListings.map((l) => parseFloat(l.price?.value || 99999)))
    : null;

  const discogsUrl = release.uri || `https://www.discogs.com/release/${releaseId}`;
  const artist = (release.artists || []).map((a) => a.name.replace(/\s*\(\d+\)\s*$/, "")).join(", ");
  const ebaySearchQ = encodeURIComponent(`${artist} ${release.title} vinyl`);
  const ebaySoldUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${ebaySearchQ}&_sacat=176985&LH_Sold=1&LH_Complete=1`;
  const vymVG = buildValueYourMusicUrl(artist, release.title, "", "", "VG");
  const vymVGPlus = buildValueYourMusicUrl(artist, release.title, "", "", "VG+");

  // Build price table
  const priceRows = Object.entries(suggestedPrices)
    .map(([cond, val]) => `<tr><td class="py-1 pr-3 text-gray-400 text-xs">${_dfEscape(cond)}</td><td class="py-1 font-bold text-gray-100 text-xs">£${parseFloat(val).toFixed(2)}</td></tr>`)
    .join("");

  const lowestNote = lowestMarket
    ? `<p class="text-xs text-gray-400 mt-1">Lowest current Discogs listing: <strong class="text-profit">£${lowestMarket.toFixed(2)}</strong></p>`
    : "";

  // Rough arbitrage hint
  const vgpVal = suggestedPrices["Very Good Plus (VG+)"] || suggestedPrices["Near Mint (NM or M-)"];
  const arbHint = vgpVal && lowestMarket
    ? (() => {
        const arb = calculateArbitrage(lowestMarket, parseFloat(vgpVal), 3.00);
        return `
          <div class="mt-3 p-3 rounded-lg border ${arb.isViable ? "border-deal/40 bg-deal/5" : "border-gray-700 bg-surface"}">
            <p class="text-xs font-semibold text-gray-300 mb-1">Quick Arbitrage Estimate (buy lowest Discogs → sell at VG+ suggested)</p>
            <div class="flex items-center gap-4">
              <div class="text-center">
                <p class="text-xs text-gray-500">Net Profit</p>
                <p class="text-lg font-bold ${arb.netProfit >= 0 ? "text-profit" : "text-loss"}">£${arb.netProfit.toFixed(2)}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-gray-500">ROI</p>
                <p class="text-lg font-bold ${arb.roi >= 30 ? "text-profit" : "text-yellow-400"}">${arb.roi}%</p>
              </div>
              <div class="flex-1 text-right">
                <span class="px-2 py-1 rounded text-xs font-bold ${arb.isHot ? "bg-profit text-white" : arb.isViable ? "bg-deal/20 text-deal" : "bg-gray-700 text-gray-400"}">
                  ${arb.isHot ? "🔥 HOT" : arb.isViable ? "✓ VIABLE" : "✗ PASS"}
                </span>
              </div>
            </div>
          </div>`;
      })()
    : "";

  _dfAppendMessage("assistant",
    `<strong>Arbitrage Analysis Complete</strong> 🎵<br>
    <div class="mt-2 space-y-2 text-xs">
      ${priceRows.length ? `
      <div class="bg-surface rounded-lg p-2 border border-gray-700">
        <p class="font-semibold text-gray-300 mb-1">Discogs Suggested Prices</p>
        <table class="w-full">${priceRows}</table>
      </div>` : ""}
      ${lowestNote}
      ${arbHint}
      <div class="flex flex-wrap gap-2 mt-3">
        <a href="${ebaySoldUrl}" target="_blank" rel="noopener noreferrer"
          class="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-600/30 transition-all">
          eBay Sold Prices ↗
        </a>
        <a href="${vymVGPlus}" target="_blank" rel="noopener noreferrer"
          class="px-3 py-1.5 bg-surface border border-gray-700 text-gray-400 rounded text-xs hover:border-deal hover:text-deal transition-all">
          VYM Sold (VG+) ↗
        </a>
        <a href="${vymVG}" target="_blank" rel="noopener noreferrer"
          class="px-3 py-1.5 bg-surface border border-gray-700 text-gray-400 rounded text-xs hover:border-deal hover:text-deal transition-all">
          VYM Sold (VG) ↗
        </a>
        <a href="${discogsUrl}" target="_blank" rel="noopener noreferrer"
          class="px-3 py-1.5 bg-surface border border-gray-700 text-gray-400 rounded text-xs hover:border-primary hover:text-primary transition-all">
          Discogs Release ↗
        </a>
      </div>
      <p class="text-gray-600 mt-1">
        Check the VYM or eBay sold links for real sold data, paste prices into the
        <strong>Sold Price Research</strong> panel to get a precise median.
      </p>
    </div>`,
  );

  // Auto-populate the Release Price Lookup panel for full analysis
  const lookupInput = document.getElementById("releaseLookupInput");
  if (lookupInput && releaseId) {
    lookupInput.value = String(releaseId);
  }
}

// Initialise assistant when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initDealFinderAssistant();
});
