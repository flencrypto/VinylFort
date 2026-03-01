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
    </div>`;
}

// showToast helper if not already defined
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
