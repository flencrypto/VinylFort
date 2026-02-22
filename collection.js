// Collection Management System
let collection = [];
let pendingImports = [];
let currentVerifyIndex = 0;
let verifyPhotos = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadCollection();

  // Force render after a short delay to ensure DOM is ready
  setTimeout(() => {
    renderCollection();
    updatePortfolioStats();
    feather.replace();
  }, 100);
});
function loadCollection() {
  const saved = localStorage.getItem("vinyl_collection");
  if (saved) {
    collection = JSON.parse(saved);
  }
}

function saveCollection() {
  localStorage.setItem("vinyl_collection", JSON.stringify(collection));
}

// Import Modal
function showImportModal() {
  document.getElementById("importModal").classList.remove("hidden");
  document.getElementById("importModal").classList.add("flex");
  feather.replace();
}
function hideImportModal() {
  document.getElementById("importModal").classList.add("hidden");
  document.getElementById("importModal").classList.remove("flex");
  document.getElementById("csvPreview").classList.add("hidden");
  const csvInput = document.getElementById("csvInput");
  if (csvInput) csvInput.value = "";
  // Don't clear pendingImports here - we need them for processCSVImport
}
function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: function (header) {
      // Normalize headers - remove quotes, trim whitespace
      return header.replace(/^["']|["']$/g, "").trim();
    },
    complete: function (results) {
      console.log("CSV parsed:", results.data.length, "rows");
      console.log("Headers found:", Object.keys(results.data[0] || {}));

      if (results.data.length === 0) {
        showToast("No records found in CSV file", "error");
        return;
      }

      pendingImports = results.data
        .map((row, index) => {
          // Try multiple possible column names for each field
          const getValue = (...keys) => {
            for (const key of keys) {
              // Try exact match first
              if (row[key] !== undefined && row[key] !== "") {
                return row[key];
              }
              // Try case-insensitive match
              const lowerKey = key.toLowerCase();
              for (const [k, v] of Object.entries(row)) {
                if (k.toLowerCase() === lowerKey && v !== "") {
                  return v;
                }
              }
            }
            return "";
          };

          const artist = getValue("Artist", "artist", "ARTIST");
          const title = getValue("Title", "title", "TITLE");

          // Skip rows without basic info
          if (!artist && !title) {
            console.log("Skipping row", index, "- no artist/title");
            return null;
          }

          // Extract market data from CSV
          const csvMarketData = {};

          // Try to find various market data columns
          const medianVal = getValue(
            "Median",
            "median",
            "Median Price",
            "median_price",
          );
          const lowVal = getValue(
            "Low",
            "low",
            "Min",
            "min",
            "Lowest",
            "lowest",
          );
          const highVal = getValue(
            "High",
            "high",
            "Max",
            "max",
            "Highest",
            "highest",
          );
          const lastSoldVal = getValue(
            "Last Sold",
            "last_sold",
            "Sold",
            "sold_price",
          );

          // Extract numeric values
          if (medianVal) csvMarketData.median = extractPrice(medianVal);
          if (lowVal) csvMarketData.low = extractPrice(lowVal);
          if (highVal) csvMarketData.high = extractPrice(highVal);
          if (lastSoldVal) csvMarketData.lastSold = extractPrice(lastSoldVal);

          // Purchase price from CSV
          const purchasePriceVal = getValue(
            "Purchase Price",
            "purchase_price",
            "Price",
            "price",
            "Paid",
            "paid",
          );
          const purchasePrice = extractPrice(purchasePriceVal) || 0;

          return {
            discogsId: getValue(
              "Catalog#",
              "Catalog #",
              "catalog",
              "Catalog Number",
              "Cat No",
              "catno",
            ),
            artist: artist || "Unknown Artist",
            title: title || "Unknown Title",
            label: getValue("Label", "label", "LABEL"),
            catalogueNumber: getValue(
              "Catalog#",
              "Catalog #",
              "catalog",
              "Catalog Number",
              "Cat No",
              "catno",
            ),
            year: parseInt(getValue("Year", "year", "YEAR")) || null,
            format: getValue("Format", "format", "FORMAT") || "LP",
            genre: getValue("Genre", "genre", "GENRE"),
            style: getValue("Style", "style", "STYLE"),
            releaseId: getValue("Release ID", "release_id", "release id", "id"),
            addedToDiscogs: getValue("Date Added", "date_added", "added"),
            // User will fill these in:
            purchasePrice: purchasePrice,
            purchaseDate: null,
            purchaseSource: "discogs",
            conditionVinyl: "VG",
            conditionSleeve: "VG",
            photos: [],
            status: "owned",
            dateAdded: new Date().toISOString(),
            listedPrice: null,
            soldPrice: null,
            soldDate: null,
            fees: 0,
            notes: "",
            // Store CSV market data for later use
            csvMarketData:
              Object.keys(csvMarketData).length > 0 ? csvMarketData : null,
          };
        })
        .filter((r) => r !== null); // Remove null entries

      if (pendingImports.length === 0) {
        showToast("Could not parse any valid records from CSV", "error");
        return;
      }

      console.log("Parsed imports:", pendingImports);
      showCSVPreview();
    },
    error: function (err) {
      showToast("Error parsing CSV: " + err.message, "error");
    },
  });
}
function showCSVPreview() {
  const preview = document.getElementById("csvPreview");
  const count = document.getElementById("previewCount");
  const countConfirm = document.getElementById("previewCountConfirm");
  const tbody = document.getElementById("previewTableBody");

  count.textContent = pendingImports.length;
  if (countConfirm) countConfirm.textContent = pendingImports.length;

  // Show more detailed preview with market data
  tbody.innerHTML = pendingImports
    .slice(0, 10)
    .map((r) => {
      const hasMarketData = r.csvMarketData?.median || r.purchasePrice;
      const marketIndicator = hasMarketData
        ? `<span class="text-green-400 text-xs">✓ Data</span>`
        : `<span class="text-yellow-400 text-xs">Needs Update</span>`;

      return `
        <tr class="border-b border-gray-800 last:border-0">
            <td class="py-2">
                <div class="flex items-center gap-2">
                    ${r.artist}
                    ${marketIndicator}
                </div>
            </td>
            <td class="py-2">${r.title}</td>
            <td class="py-2 text-right">
                ${r.year || "-"}
                ${r.csvMarketData?.median ? `<br><span class="text-xs text-gray-500">Est: £${r.csvMarketData.median}</span>` : ""}
            </td>
        </tr>
    `;
    })
    .join("");

  if (pendingImports.length > 10) {
    tbody.innerHTML += `<tr><td colspan="3" class="py-2 text-center text-gray-500">...and ${pendingImports.length - 10} more</td></tr>`;
  }

  preview.classList.remove("hidden");
  feather.replace();
}
function cancelImport() {
  pendingImports = [];
  document.getElementById("csvPreview").classList.add("hidden");
  const csvInput = document.getElementById("csvInput");
  if (csvInput) csvInput.value = "";
}
function processCSVImport() {
  if (!pendingImports || pendingImports.length === 0) {
    showToast("No records to import", "error");
    return;
  }
  hideImportModal();
  currentVerifyIndex = 0;
  startPhotoVerification();
}
// Photo Verification Flow
function startPhotoVerification() {
  if (currentVerifyIndex >= pendingImports.length) {
    // All done - refresh final state
    renderCollection();
    updatePortfolioStats();
    const importedCount = collection.filter((r) => {
      // Count recently added records (within last minute)
      const added = new Date(r.dateAdded);
      const now = new Date();
      return now - added < 60000;
    }).length;
    showToast(
      `Import complete! ${importedCount} records added to your collection.`,
      "success",
    );
    return;
  }

  const record = pendingImports[currentVerifyIndex];
  showPhotoVerifyModal(record);
}
function showPhotoVerifyModal(record) {
  const modal = document.getElementById("photoVerifyModal");
  document.getElementById("verifyRecordName").textContent =
    `${record.artist} - ${record.title}`;

  // Pre-fill with Discogs data where available
  document.getElementById("verifyPurchasePrice").value = "";
  document.getElementById("verifyPurchaseDate").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("verifySource").value = "discogs";
  document.getElementById("verifyNotes").value =
    `Imported from Discogs. Format: ${record.format}${record.label ? ", Label: " + record.label : ""}`;

  verifyPhotos = [];
  renderVerifyPhotos();

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  feather.replace();
}

function hidePhotoVerifyModal() {
  document.getElementById("photoVerifyModal").classList.add("hidden");
  document.getElementById("photoVerifyModal").classList.remove("flex");
}

function handleVerifyPhotos(event) {
  const files = Array.from(event.target.files);
  verifyPhotos.push(...files);
  renderVerifyPhotos();
}

function renderVerifyPhotos() {
  const grid = document.getElementById("verifyPhotoGrid");
  if (verifyPhotos.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = verifyPhotos
    .map(
      (file, idx) => `
        <div class="relative aspect-square rounded-lg overflow-hidden border border-gray-700">
            <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover">
            <button onclick="removeVerifyPhoto(${idx})" class="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                <i data-feather="x" class="w-3 h-3"></i>
            </button>
        </div>
    `,
    )
    .join("");
  feather.replace();
}

function removeVerifyPhoto(idx) {
  verifyPhotos.splice(idx, 1);
  renderVerifyPhotos();
}
async function saveVerifiedRecord() {
  const record = pendingImports[currentVerifyIndex];

  // Get user inputs (or use CSV defaults)
  const userPrice = parseFloat(
    document.getElementById("verifyPurchasePrice").value,
  );
  record.purchasePrice = userPrice || record.purchasePrice || 0;
  record.purchaseDate =
    document.getElementById("verifyPurchaseDate").value || record.purchaseDate;
  record.purchaseSource =
    document.getElementById("verifySource").value || record.purchaseSource;
  record.conditionVinyl = document.getElementById("verifyVinylCondition").value;
  record.conditionSleeve = document.getElementById(
    "verifySleeveCondition",
  ).value;

  // Append user notes to existing notes
  const userNotes = document.getElementById("verifyNotes").value;
  if (userNotes) {
    record.notes =
      userNotes +
      (record.matrixNotes ? "\n\nMatrix/Notes: " + record.matrixNotes : "");
  }

  // Upload photos if imgBB configured
  if (localStorage.getItem("imgbb_api_key") && verifyPhotos.length > 0) {
    showToast("Uploading photos...", "success");
    record.photos = await uploadPhotosToImgBB(verifyPhotos);
  } else if (verifyPhotos.length > 0) {
    // Store as base64 for local persistence
    record.photos = await Promise.all(
      verifyPhotos.map(async (file) => {
        return await fileToBase64(file);
      }),
    );
  } else {
    record.photos = [];
  }

  // Calculate ownership duration
  const purchaseDate = record.purchaseDate
    ? new Date(record.purchaseDate)
    : new Date();
  record.daysOwned = Math.floor(
    (new Date() - purchaseDate) / (1000 * 60 * 60 * 24),
  );

  // Use CSV market data as fallback if available
  if (record.csvMarketData?.median) {
    record.estimatedValue = record.csvMarketData.median;
    record.marketData = {
      ...record.csvMarketData,
      source: "csv_import",
    };
  }

  // Fetch enhanced market data and generate pricing strategy
  try {
    await analyzeRecordForResale(record);
  } catch (e) {
    console.error("Market analysis failed:", e);
    // Use CSV data or set defaults
    const baseValue =
      record.csvMarketData?.median || record.purchasePrice || 10;
    record.estimatedValue = baseValue;
    record.suggestedListingPrice = Math.round(baseValue * 1.1);
    record.profitPotential =
      record.suggestedListingPrice - record.purchasePrice;
    record.roi =
      record.purchasePrice > 0
        ? ((record.profitPotential / record.purchasePrice) * 100).toFixed(1)
        : "0";
    record.ebayStrategy = generateEbayStrategy(record);
  }

  // Mark as enriched if we have good data
  record.enrichmentStatus =
    record.marketData?.lastSold?.length > 0 ? "complete" : "partial";
  record.needsEnrichment = record.enrichmentStatus !== "complete";

  // Add to collection immediately
  collection.push(record);
  saveCollection();

  hidePhotoVerifyModal();
  currentVerifyIndex++;

  // Update UI before continuing
  renderCollection();
  updatePortfolioStats();

  startPhotoVerification();
}
function skipPhotoVerification() {
  hidePhotoVerifyModal();
  currentVerifyIndex++;
  startPhotoVerification();
}
// Market Analysis & Pricing with multi-source enrichment
async function analyzeRecordForResale(record) {
  let marketData = null;
  let discogsData = null;
  let aiAnalysis = null;

  // Step 1: Try Discogs API for release identification and marketplace data
  if (window.discogsService?.key) {
    try {
      const search = await window.discogsService.searchRelease(
        record.artist,
        record.title,
        record.catalogueNumber,
      );
      if (search) {
        discogsData = await window.discogsService.getReleaseDetails(search.id);
        marketData = await extractMarketData(discogsData, record);
      }
    } catch (e) {
      console.log("Discogs lookup failed:", e);
    }
  }

  // Step 2: Use GPT/AI for market analysis if we have API access
  const aiProvider = localStorage.getItem("ai_provider") || "openai";
  const hasAI =
    aiProvider === "deepseek"
      ? localStorage.getItem("deepseek_api_key")
      : localStorage.getItem("openai_api_key");

  if (hasAI && (!marketData?.lastSold || marketData.lastSold.length < 3)) {
    try {
      aiAnalysis = await fetchAIMarketAnalysis(record, marketData);
      if (aiAnalysis) {
        marketData = { ...marketData, ...aiAnalysis };
      }
    } catch (e) {
      console.log("AI market analysis failed:", e);
    }
  }

  // Step 3: Fall back to CSV data or estimates
  if (!marketData) {
    marketData = record.csvMarketData
      ? { ...record.csvMarketData, source: "csv_import" }
      : generateEstimatedMarketData(record);
  }

  // Merge CSV data as backup if AI/Discogs data is sparse
  if (
    record.csvMarketData?.median &&
    (!marketData.medianPrice || marketData.source === "estimated")
  ) {
    marketData = {
      ...marketData,
      medianPrice: marketData.medianPrice || record.csvMarketData.median,
      lowPrice: marketData.lowPrice || record.csvMarketData.low,
      highPrice: marketData.highPrice || record.csvMarketData.high,
      source: marketData.source + "+csv",
    };
  }

  record.marketData = marketData;
  record.estimatedValue = calculateEstimatedValue(record, marketData);
  record.suggestedListingPrice = calculateListingPrice(record);
  record.profitPotential = record.suggestedListingPrice - record.purchasePrice;
  record.roi =
    record.purchasePrice > 0
      ? ((record.profitPotential / record.purchasePrice) * 100).toFixed(1)
      : "0";

  // Generate eBay strategy
  record.ebayStrategy = generateEbayStrategy(record);
}

// Fetch AI-powered market analysis
async function fetchAIMarketAnalysis(record, existingData) {
  const provider = localStorage.getItem("ai_provider") || "openai";
  const apiKey =
    provider === "deepseek"
      ? localStorage.getItem("deepseek_api_key")
      : localStorage.getItem("openai_api_key");

  if (!apiKey) return null;

  const prompt = `Analyze the vinyl record market for this specific release and provide pricing intelligence.

Record: ${record.artist} - ${record.title}
Format: ${record.format || "LP"}
Year: ${record.year || "unknown"}
Label: ${record.label || "unknown"}
Catalogue: ${record.catalogueNumber || "unknown"}
Condition: Vinyl ${record.conditionVinyl}, Sleeve ${record.conditionSleeve}
User's purchase price: £${record.purchasePrice || "unknown"}

${existingData?.discogsUrl ? `Discogs release: ${existingData.discogsUrl}` : ""}

Research current market conditions and return JSON:
{
    "last5Sold": [
        {"condition": "NM", "price": 45.00, "date": "2024-01-15", "notes": "sealed"},
        {"condition": "VG+", "price": 32.50, "date": "2024-01-10", "notes": ""}
    ],
    "medianSold": 38.00,
    "currentListings": {
        "lowest": 35.00,
        "median": 55.00,
        "highest": 120.00
    },
    "gradeAdjustment": {
        "NM": 1.3,
        "VG+": 1.0,
        "VG": 0.7,
        "G+": 0.5
    },
    "demandTrend": "stable|rising|falling",
    "rarityScore": "common|uncommon|rare|very rare",
    "recommendedAction": "hold|list quickly|price aggressively",
    "confidence": "high|medium|low"
}

Focus on actual sold prices, not asking prices. Consider condition carefully.`;

  try {
    const response = await fetch(
      provider === "deepseek"
        ? "https://api.deepseek.com/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a vinyl record market expert with access to sales data. Be precise with pricing.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      },
    );

    if (!response.ok) throw new Error("AI request failed");

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[2] : content;

    const analysis = JSON.parse(jsonStr.trim());

    return {
      lastSold: analysis.last5Sold || [],
      medianSold: analysis.medianSold,
      currentListings: analysis.currentListings,
      gradeAdjustment: analysis.gradeAdjustment,
      demandTrend: analysis.demandTrend,
      rarityScore: analysis.rarityScore,
      recommendedAction: analysis.recommendedAction,
      confidence: analysis.confidence,
      source: "ai_analysis",
      analyzedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("AI analysis error:", e);
    return null;
  }
}
async function extractMarketData(releaseDetails, record) {
  // Extract actual marketplace data from Discogs
  const lowestPrice = releaseDetails.lowest_price || null;
  const medianPrice = releaseDetails.median || lowestPrice;
  const highPrice =
    releaseDetails.highest_price || (lowestPrice ? lowestPrice * 1.5 : null);
  const communityHave = releaseDetails.community?.have || 0;
  const communityWant = releaseDetails.community?.want || 0;

  // Estimate demand score
  const demandScore = communityWant / Math.max(communityHave, 1);

  // Try to fetch marketplace listings for this release
  let lastSold = [];
  try {
    const marketplaceResponse = await fetch(
      `https://api.discogs.com/marketplace/listings?release_id=${releaseDetails.id}&per_page=10&key=${window.discogsService.key}&secret=${window.discogsService.secret}`,
      {
        headers: {
          "User-Agent": "VinylVaultPro/1.0",
        },
      },
    );

    if (marketplaceResponse.ok) {
      const listings = await marketplaceResponse.json();
      // Note: Discogs doesn't expose sold history directly via API
      // We'd need to scrape or use third-party services for actual sold data
    }
  } catch (e) {
    console.log("Marketplace fetch failed:", e);
  }

  return {
    source: "discogs",
    discogsId: releaseDetails.id,
    discogsUrl: releaseDetails.uri,
    lowestPrice: lowestPrice,
    medianPrice: medianPrice,
    highPrice: highPrice,
    have: communityHave,
    want: communityWant,
    demandScore: demandScore.toFixed(2),
    lastSold: lastSold, // Will be populated by AI or remain empty
    fetchedAt: new Date().toISOString(),
  };
}
function generateEstimatedMarketData(record) {
  // Rough estimation based on genre, year, format
  const baseValues = {
    Rock: { low: 8, mid: 15, high: 30 },
    Jazz: { low: 10, mid: 20, high: 40 },
    Electronic: { low: 12, mid: 25, high: 50 },
    "Hip Hop": { low: 15, mid: 30, high: 60 },
    Classical: { low: 5, mid: 10, high: 20 },
    default: { low: 8, mid: 15, high: 30 },
  };

  const genreBase = baseValues[record.genre] || baseValues.default;

  // Adjust for year (older = potentially more valuable)
  const yearMultiplier =
    record.year && record.year < 1980
      ? 1.5
      : record.year && record.year < 1990
        ? 1.2
        : 1;

  // Adjust for format
  const formatMultiplier = record.format?.includes('7"')
    ? 0.6
    : record.format?.includes('12"')
      ? 0.8
      : 1;

  return {
    source: "estimated",
    lowPrice: Math.round(genreBase.low * yearMultiplier * formatMultiplier),
    medianPrice: Math.round(genreBase.mid * yearMultiplier * formatMultiplier),
    highPrice: Math.round(genreBase.high * yearMultiplier * formatMultiplier),
    have: "unknown",
    want: "unknown",
    demandScore: "unknown",
  };
}
function calculateEstimatedValue(record, marketData) {
  // Use AI-analyzed sold data if available
  let baseValue;

  if (marketData.lastSold?.length > 0) {
    // Calculate median from actual sold prices, adjusted for condition
    const sortedPrices = marketData.lastSold
      .map(
        (s) =>
          s.price * (marketData.gradeAdjustment?.[record.conditionVinyl] || 1),
      )
      .sort((a, b) => a - b);
    baseValue = sortedPrices[Math.floor(sortedPrices.length / 2)];
  } else if (marketData.medianSold) {
    // Use AI-provided median sold
    baseValue =
      marketData.medianSold *
      (marketData.gradeAdjustment?.[record.conditionVinyl] || 1);
  } else {
    // Fall back to Discogs/CSV data
    baseValue = marketData.medianPrice || marketData.lowPrice || 15;
  }

  // Apply condition adjustments if not already applied
  const conditionMultipliers = {
    M: 1.5,
    NM: 1.3,
    "VG+": 1.0,
    VG: 0.7,
    "G+": 0.5,
    G: 0.35,
    F: 0.2,
    P: 0.1,
  };

  // Only apply if we haven't used gradeAdjustment from AI
  if (!marketData.gradeAdjustment) {
    const vinylMult = conditionMultipliers[record.conditionVinyl] || 0.7;
    const sleeveMult = conditionMultipliers[record.conditionSleeve] || 0.7;
    const conditionAdjust = vinylMult * 0.7 + sleeveMult * 0.3;
    baseValue = baseValue * conditionAdjust;
  }

  // Apply sleeve condition adjustment
  const sleeveMult = conditionMultipliers[record.conditionSleeve] || 0.7;
  baseValue = baseValue * (0.8 + sleeveMult * 0.2); // Sleeve affects value 20%

  return Math.round(baseValue);
}
function calculateListingPrice(record) {
  const marketValue = record.estimatedValue;
  const purchasePrice = record.purchasePrice;
  const daysOwned = record.daysOwned || 0;

  // Check AI recommendation
  const aiRec = record.marketData?.recommendedAction;

  // Minimum desired profit margin (30% or £3, whichever is higher)
  const minProfit = Math.max(purchasePrice * 0.3, 3);
  const breakEven = purchasePrice * 1.16; // Including ~16% fees

  // Base price ensures we make minimum profit after fees
  let floorPrice = Math.max(breakEven + minProfit, marketValue * 0.85);

  // Apply AI strategy
  if (aiRec === "price aggressively") {
    floorPrice = floorPrice * 0.92; // 8% discount to move fast
  } else if (aiRec === "hold") {
    floorPrice = Math.max(floorPrice, marketValue * 1.15); // Premium for rare items
  }

  // If we've owned it a long time, be more aggressive
  const urgencyDiscount = daysOwned > 365 ? 0.9 : daysOwned > 180 ? 0.95 : 1;

  // Cap at market value unless it's rare/high demand
  const demandBoost =
    record.marketData?.demandScore > 2 ||
    record.marketData?.rarityScore?.includes("rare")
      ? 1.2
      : 1;

  // Trend adjustment
  const trendMult =
    record.marketData?.demandTrend === "rising"
      ? 1.1
      : record.marketData?.demandTrend === "falling"
        ? 0.9
        : 1;

  return Math.round(
    Math.min(
      floorPrice * urgencyDiscount * demandBoost * trendMult,
      marketValue * 1.25,
    ),
  );
}
function generateEbayStrategy(record) {
  const profit = record.suggestedListingPrice - record.purchasePrice;
  const roi = record.roi;
  const daysOwned = record.daysOwned || 0;

  let strategy = {
    format: "Buy It Now",
    bestOffer: true,
    autoAccept: Math.round(record.suggestedListingPrice * 0.88),
    autoDecline: Math.round(record.purchasePrice * 1.05),
    duration: "GTC",
    promoted: false,
    listingType: "standard",
  };

  // High ROI items - hold for full price
  if (roi > 100) {
    strategy.bestOffer = false;
    strategy.listingType = "premium";
  }

  // Long-held inventory - move it
  if (daysOwned > 365) {
    strategy.bestOffer = true;
    strategy.autoAccept = Math.round(record.suggestedListingPrice * 0.82);
    strategy.promoted = true;
  }

  // Low margin items - quick flip
  if (profit < 5) {
    strategy.format = "Auction";
    strategy.startPrice = Math.round(record.purchasePrice * 1.2);
    strategy.duration = "7 days";
  }

  return strategy;
}
// Collection Display
function renderCollection() {
  const grid = document.getElementById("collectionGrid");

  if (!grid) {
    console.error("Collection grid element not found");
    return;
  }

  if (collection.length === 0) {
    // Show empty state
    grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-surface-light border border-gray-700 flex items-center justify-center">
                    <i data-feather="disc" class="w-12 h-12 text-gray-600"></i>
                </div>
                <h3 class="text-xl font-medium text-gray-300 mb-2">Your collection is empty</h3>
                <p class="text-gray-500 max-w-md mx-auto mb-6">
                    Import your Discogs collection or add records manually to start tracking profits and resale opportunities.
                </p>
                <div class="flex justify-center gap-3">
                    <button onclick="showImportModal()" class="px-6 py-3 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all flex items-center gap-2">
                        <i data-feather="upload" class="w-4 h-4"></i>
                        Import from Discogs
                    </button>
                    <button onclick="addRecordManually()" class="px-6 py-3 border border-gray-600 rounded-lg hover:border-primary hover:text-primary transition-all flex items-center gap-2">
                        <i data-feather="plus" class="w-4 h-4"></i>
                        Add First Record
                    </button>
                </div>
            </div>
        `;
    feather.replace();
    return;
  }

  const filtered = getFilteredCollection();

  if (filtered.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-surface-light border border-gray-700 flex items-center justify-center">
                    <i data-feather="search" class="w-12 h-12 text-gray-600"></i>
                </div>
                <h3 class="text-xl font-medium text-gray-300 mb-2">No records match your filters</h3>
                <p class="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
        `;
    feather.replace();
    return;
  }

  grid.innerHTML = filtered
    .map((record, idx) => {
      const originalIdx = collection.indexOf(record);
      const profitClass =
        (record.profitPotential || 0) >= 0 ? "text-profit" : "text-loss";
      const profitIcon =
        (record.profitPotential || 0) >= 0 ? "trending-up" : "trending-down";
      const statusColors = {
        owned: "bg-gray-500",
        listed: "bg-blue-500",
        sold: "bg-green-500",
      };

      // Check if needs update
      const needsUpdate =
        record.needsEnrichment || !record.marketData?.lastSold?.length;
      const hasCsvData = record.csvMarketData?.median;

      // Determine value display
      let valueDisplay, profitDisplay;
      if (needsUpdate && !hasCsvData) {
        valueDisplay =
          '<span class="text-yellow-400 text-xs">Please Update</span>';
        profitDisplay =
          '<span class="text-yellow-400 text-xs">Please Update</span>';
      } else {
        const estValue =
          record.estimatedValue || record.csvMarketData?.median || 0;
        valueDisplay = `£${estValue.toFixed(2)}`;
        const profit =
          record.profitPotential || estValue - (record.purchasePrice || 0);
        const roi =
          record.roi ||
          (record.purchasePrice > 0
            ? ((profit / record.purchasePrice) * 100).toFixed(1)
            : 0);
        profitDisplay = `
                <i data-feather="${profit >= 0 ? "trending-up" : "trending-down"}" class="w-4 h-4"></i>
                <span class="font-medium">£${profit.toFixed(2)}</span>
                <span class="text-xs opacity-70">(${roi}%)</span>
            `;
      }

      return `
            <div class="bg-surface-light rounded-xl border border-gray-800 overflow-hidden hover:border-primary/50 transition-all group ${needsUpdate ? "ring-1 ring-yellow-500/30" : ""}">
                <div class="aspect-square bg-surface relative overflow-hidden">
                    ${
                      record.photos && record.photos[0]
                        ? `<img src="${record.photos[0].url || record.photos[0]}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.parentElement.innerHTML='<div class=\'w-full h-full flex items-center justify-center text-gray-600\'><i data-feather=\'disc\' class=\'w-16 h-16\'></i></div>';feather.replace();">`
                        : `<div class="w-full h-full flex items-center justify-center text-gray-600">
                            <i data-feather="disc" class="w-16 h-16"></i>
                        </div>`
                    }
                    <div class="absolute top-3 left-3">
                        <span class="px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[record.status] || "bg-gray-500"} uppercase">
                            ${record.status}
                        </span>
                    </div>
                    ${
                      needsUpdate
                        ? `
                        <div class="absolute top-3 right-3">
                            <span class="px-2 py-1 rounded-full text-xs font-medium text-yellow-400 bg-yellow-500/20 border border-yellow-500/30">
                                Needs Update
                            </span>
                        </div>
                    `
                        : record.daysOwned > 365
                          ? `
                        <div class="absolute top-3 right-3">
                            <span class="px-2 py-1 rounded-full text-xs font-medium text-yellow-400 bg-yellow-500/20 border border-yellow-500/30">
                                ${Math.floor(record.daysOwned / 365)}y held
                            </span>
                        </div>
                    `
                          : ""
                    }
                </div>
                <div class="p-4">
                    <p class="text-xs text-gray-500 truncate mb-1" title="${record.artist || ""}">${record.artist || "Unknown Artist"}</p>
                    <h3 class="font-bold text-gray-100 truncate mb-3" title="${record.title || ""}">${record.title || "Unknown Title"}</h3>
                    <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                            <p class="text-gray-500 text-xs">Invested</p>
                            <p class="text-gray-300">£${(parseFloat(record.purchasePrice) || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 text-xs">Est. Value</p>
                            <p class="text-gray-300">${valueDisplay}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-gray-800">
                        <div class="flex items-center gap-1 ${needsUpdate && !hasCsvData ? "text-yellow-400" : profitClass}">
                            ${needsUpdate && !hasCsvData ? '<span class="text-xs">Update for profit calc</span>' : profitDisplay}
                        </div>
                        <div class="flex gap-2">
                            ${
                              needsUpdate
                                ? `
                                <button onclick="updateRecordPrices(${originalIdx})" class="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all" title="Update Prices">
                                    <i data-feather="refresh-cw" class="w-4 h-4"></i>
                                </button>
                            `
                                : ""
                            }
                            ${
                              record.status === "owned"
                                ? `
                                <button onclick="generateListingFromCollection(${originalIdx})" class="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all" title="Generate eBay Listing">
                                    <i data-feather="zap" class="w-4 h-4"></i>
                                </button>
                            `
                                : ""
                            }
                            <button onclick="viewRecordDetail(${originalIdx})" class="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all" title="View Details">
                                <i data-feather="eye" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  feather.replace();
}
function getFilteredCollection() {
  const search = document
    .getElementById("collectionSearch")
    .value.toLowerCase();
  const status = document.getElementById("statusFilter").value;

  let filtered = collection.filter((r) => {
    const matchesSearch =
      !search ||
      r.artist.toLowerCase().includes(search) ||
      r.title.toLowerCase().includes(search) ||
      (r.catalogueNumber && r.catalogueNumber.toLowerCase().includes(search));
    const matchesStatus = status === "all" || r.status === status;
    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortBy = document.getElementById("sortBy").value;
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "artist":
        return a.artist.localeCompare(b.artist);
      case "purchasePrice":
        return (b.purchasePrice || 0) - (a.purchasePrice || 0);
      case "estValue":
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      case "profit":
        return (b.profitPotential || 0) - (a.profitPotential || 0);
      case "dateAdded":
      default:
        return new Date(b.dateAdded) - new Date(a.dateAdded);
    }
  });

  return filtered;
}

function filterCollection() {
  renderCollection();
}

function sortCollection() {
  renderCollection();
}
function updatePortfolioStats() {
  // Calculate stats from collection
  const totalRecords = collection.length;
  const totalInvested = collection.reduce(
    (sum, r) => sum + (parseFloat(r.purchasePrice) || 0),
    0,
  );
  const totalValue = collection.reduce(
    (sum, r) =>
      sum +
      (parseFloat(r.estimatedValue) ||
        parseFloat(r.csvMarketData?.median) ||
        0),
    0,
  );
  const totalProfit = totalValue - totalInvested;
  const roi =
    totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

  // Find and update stat cards
  const statCards = document.querySelectorAll("stat-card");

  statCards.forEach((card) => {
    const label = card.getAttribute("label");

    if (label === "Total Records") {
      card.setAttribute("value", totalRecords.toLocaleString());
    } else if (label === "Total Invested") {
      card.setAttribute("value", "£" + totalInvested.toFixed(2));
    } else if (label === "Est. Value") {
      card.setAttribute("value", "£" + totalValue.toFixed(2));
    } else if (label === "Portfolio Return") {
      card.setAttribute("value", (roi >= 0 ? "+" : "") + roi + "%");
      card.setAttribute(
        "trend",
        roi >= 0 ? "unrealized gain" : "unrealized loss",
      );
    }
  });

  // Fallback for direct ID access
  const totalRecordsEl = document.getElementById("totalRecords");
  const totalInvestedEl = document.getElementById("totalInvested");
  const totalValueEl = document.getElementById("totalValue");
  const returnEl = document.getElementById("portfolioReturn");

  if (
    totalRecordsEl &&
    totalRecordsEl.hasAttribute &&
    totalRecordsEl.setAttribute
  ) {
    totalRecordsEl.setAttribute("value", totalRecords.toLocaleString());
  }
  if (
    totalInvestedEl &&
    totalInvestedEl.hasAttribute &&
    totalInvestedEl.setAttribute
  ) {
    totalInvestedEl.setAttribute("value", "£" + totalInvested.toFixed(2));
  }
  if (totalValueEl && totalValueEl.hasAttribute && totalValueEl.setAttribute) {
    totalValueEl.setAttribute("value", "£" + totalValue.toFixed(2));
  }
  if (returnEl && returnEl.hasAttribute && returnEl.setAttribute) {
    returnEl.setAttribute("value", (roi >= 0 ? "+" : "") + roi + "%");
    returnEl.setAttribute(
      "trend",
      roi >= 0 ? "unrealized gain" : "unrealized loss",
    );
  }
}
// Record Actions
function viewRecordDetail(index) {
  const record = collection[index];
  const modal = document.getElementById("recordModal");
  const content = document.getElementById("recordModalContent");

  const profitClass =
    (record.profitPotential || 0) >= 0 ? "text-profit" : "text-loss";
  const needsUpdate =
    record.needsEnrichment || !record.marketData?.lastSold?.length;
  // Build market data display
  let marketDataHtml = "";
  if (record.marketData?.lastSold?.length > 0) {
    marketDataHtml = `
            <div class="bg-surface p-3 rounded-lg mb-3">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-xs text-gray-500">Last 5 Sold (Similar Condition)</p>
                    <span class="text-xs ${record.marketData.confidence === "high" ? "text-green-400" : "text-yellow-400"}">
                        ${record.marketData.confidence || "medium"} confidence
                    </span>
                </div>
                <div class="space-y-1">
                    ${record.marketData.lastSold
                      .map(
                        (sale) => `
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-400">${sale.condition} • ${sale.date}</span>
                            <span class="text-gray-200">£${sale.price.toFixed(2)}${sale.notes ? ` (${sale.notes})` : ""}</span>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                ${
                  record.marketData.medianSold
                    ? `
                    <div class="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                        <span class="text-xs text-gray-500">Median Sold</span>
                        <span class="font-medium text-primary">£${record.marketData.medianSold.toFixed(2)}</span>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  } else if (record.csvMarketData?.median) {
    marketDataHtml = `
            <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg mb-3">
                <p class="text-xs text-yellow-400 mb-1">Imported Market Data</p>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Range:</span>
                    <span class="text-gray-200">£${record.csvMarketData.low || "?"} - £${record.csvMarketData.high || "?"}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Median:</span>
                    <span class="text-gray-200">£${record.csvMarketData.median}</span>
                </div>
            </div>
        `;
  }

  // Current listings if available
  if (record.marketData?.currentListings) {
    marketDataHtml += `
            <div class="bg-surface p-3 rounded-lg mb-3">
                <p class="text-xs text-gray-500 mb-2">Current Listings</p>
                <div class="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                        <p class="text-xs text-gray-600">Lowest</p>
                        <p class="text-green-400">£${record.marketData.currentListings.lowest}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600">Median</p>
                        <p class="text-gray-200">£${record.marketData.currentListings.median}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600">Highest</p>
                        <p class="text-orange-400">£${record.marketData.currentListings.highest}</p>
                    </div>
                </div>
            </div>
        `;
  }
  content.innerHTML = `
        <div class="p-6 border-b border-gray-800 flex items-center justify-between">
            <div>
                <p class="text-gray-400 text-sm mb-1">${record.artist}</p>
                <h2 class="text-xl font-bold text-white">${record.title}</h2>
${
  record.marketData?.rarityScore
    ? `
                    <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs ${record.marketData.rarityScore.includes("rare") ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-400"}">
                        ${record.marketData.rarityScore}
                    </span>
                `
    : ""
}
            </div>
            <button onclick="closeRecordModal()" class="text-gray-400 hover:text-white">
                <i data-feather="x" class="w-6 h-6"></i>
            </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[70vh]">
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Left: Photos -->
                <div>
                    ${
                      record.photos[0]
                        ? `
                        <img src="${record.photos[0].url || record.photos[0]}" class="w-full rounded-xl mb-3">
                        <div class="grid grid-cols-4 gap-2">
                            ${record.photos
                              .slice(1)
                              .map(
                                (p) => `
                                <img src="${p.url || p}" class="aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80">
                            `,
                              )
                              .join("")}
                        </div>
                    `
                        : '<div class="aspect-square bg-surface rounded-xl flex items-center justify-center text-gray-600"><i data-feather="disc" class="w-16 h-16"></i></div>'
                    }
                    
                    ${marketDataHtml}
                </div>
                
                <!-- Right: Details -->
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500">Purchase Price</p>
                            <p class="text-lg font-semibold">£${(parseFloat(record.purchasePrice) || 0).toFixed(2)}</p>
                        </div>
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500">Current Est. Value</p>
                            <p class="text-lg font-semibold">£${record.estimatedValue || record.csvMarketData?.median || "Please Update"}</p>
                        </div>
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500">Suggested List Price</p>
                            <p class="text-lg font-semibold text-primary">£${record.suggestedListingPrice || "Please Update"}</p>
                        </div>
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500">Profit Potential</p>
                            <p class="text-lg font-semibold ${profitClass}">
                                ${record.profitPotential !== undefined ? `£${record.profitPotential.toFixed(2)} (${record.roi}%)` : "Please Update"}
                            </p>
                        </div>
                    </div>
<div class="space-y-2 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Owned For</span>
                            <span>${record.daysOwned || 0} days (${((record.daysOwned || 0) / 365).toFixed(1)} years)</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Condition</span>
                            <span>Vinyl: ${record.conditionVinyl} / Sleeve: ${record.conditionSleeve}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Catalogue #</span>
                            <span>${record.catalogueNumber || record.matrixNotes || "-"}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Year</span>
                            <span>${record.year || "-"}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Format</span>
                            <span>${record.format}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-800">
                            <span class="text-gray-500">Label</span>
                            <span>${record.label || "-"}</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-500">Purchased From</span>
                            <span class="capitalize">${(record.purchaseSource || "unknown").replace("_", " ")}</span>
                        </div>
                    </div>
                    
                    ${
                      record.ebayStrategy
                        ? `
                        <div class="bg-primary/10 border border-primary/30 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-medium text-primary">Recommended eBay Strategy</h4>
                                ${
                                  record.marketData?.recommendedAction
                                    ? `
                                    <span class="text-xs px-2 py-1 rounded ${record.marketData.recommendedAction === "hold" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}">
                                        ${record.marketData.recommendedAction}
                                    </span>
                                `
                                    : ""
                                }
                            </div>
                            <ul class="text-sm space-y-1 text-gray-300">
                                <li>• Format: ${record.ebayStrategy.format}</li>
                                <li>• Best Offer: ${record.ebayStrategy.bestOffer ? "Yes (Auto-accept £" + record.ebayStrategy.autoAccept + ")" : "No"}</li>
                                <li>• Auto-decline: £${record.ebayStrategy.autoDecline}</li>
                                <li>• Duration: ${record.ebayStrategy.duration}</li>
                                ${record.ebayStrategy.promoted ? "<li>• Use Promoted Listings</li>" : ""}
                            </ul>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      record.notes
                        ? `
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500 mb-1">Notes</p>
                            <p class="text-sm text-gray-300">${record.notes}</p>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      record.matrixNotes
                        ? `
                        <div class="bg-surface p-3 rounded-lg">
                            <p class="text-xs text-gray-500 mb-1">Matrix / Runout</p>
                            <p class="text-sm text-gray-300 font-mono">${record.matrixNotes}</p>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <div class="flex gap-3 mt-6 pt-4 border-t border-gray-800">
                ${
                  needsUpdate
                    ? `
                    <button onclick="updateRecordPrices(${index})" class="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2">
                        <i data-feather="refresh-cw" class="w-4 h-4"></i>
                        Update Prices
                    </button>
                `
                    : ""
                }
                ${
                  record.status === "owned"
                    ? `
                    <button onclick="markAsListed(${index})" class="flex-1 px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-500 transition-all">
                        Mark as Listed
                    </button>
                    <button onclick="generateListingFromCollection(${index})" class="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2">
                        <i data-feather="zap" class="w-4 h-4"></i>
                        Generate eBay Listing
                    </button>
                `
                    : record.status === "listed"
                      ? `
                    <button onclick="markAsSold(${index})" class="flex-1 px-4 py-2 bg-green-600 rounded-lg font-medium hover:bg-green-500 transition-all">
                        Mark as Sold
                    </button>
                `
                      : ""
                }
                <button onclick="deleteRecord(${index})" class="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                    Delete
                </button>
            </div>
        </div>
    `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  feather.replace();
}
function closeRecordModal() {
  document.getElementById("recordModal").classList.add("hidden");
  document.getElementById("recordModal").classList.remove("flex");
}

function markAsListed(index) {
  collection[index].status = "listed";
  collection[index].listedDate = new Date().toISOString();
  saveCollection();
  renderCollection();
  closeRecordModal();
  showToast("Marked as listed!", "success");
}

function markAsSold(index) {
  const soldPrice = prompt(
    "Enter final sold price (£):",
    collection[index].suggestedListingPrice,
  );
  if (soldPrice) {
    collection[index].status = "sold";
    collection[index].soldPrice = parseFloat(soldPrice);
    collection[index].soldDate = new Date().toISOString();
    collection[index].fees = collection[index].soldPrice * 0.16; // Approximate fees
    collection[index].actualProfit =
      collection[index].soldPrice -
      collection[index].purchasePrice -
      collection[index].fees;
    saveCollection();
    renderCollection();
    updatePortfolioStats();
    closeRecordModal();
    showToast("Congratulations on the sale!", "success");
  }
}

function deleteRecord(index) {
  if (confirm("Delete this record from your collection?")) {
    collection.splice(index, 1);
    saveCollection();
    renderCollection();
    updatePortfolioStats();
    closeRecordModal();
    showToast("Record deleted", "success");
  }
}
function generateListingFromCollection(index) {
  const record = collection[index];
  // Store in session for listing generator
  sessionStorage.setItem("collectionListingRecord", JSON.stringify(record));
  window.location.href = "index.html?fromCollection=true";
}
// Helper function to extract numeric price from various formats
function extractPrice(priceValue) {
  if (!priceValue) return null;

  // Convert to string and handle various formats:
  // £10.42, $15.99, €12.50, 10.42, "10.42 GBP", etc.
  const priceStr = String(priceValue).trim();

  // Remove currency symbols and common prefixes
  const cleaned = priceStr
    .replace(/^£/, "") // Remove leading £
    .replace(/^\$/, "") // Remove leading $
    .replace(/^€/, "") // Remove leading €
    .replace(/\s*GBP$/i, "") // Remove trailing GBP
    .replace(/\s*USD$/i, "") // Remove trailing USD
    .replace(/\s*EUR$/i, "") // Remove trailing EUR
    .trim();

  // Parse as float
  const parsed = parseFloat(cleaned);

  // Return if valid number, otherwise null
  return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
}

// Force refresh stats when tab becomes visible
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updatePortfolioStats();
  }
});
// Helper function to extract numeric price from various formats
function extractPrice(priceValue) {
  if (!priceValue) return null;

  // Convert to string and handle various formats:
  // £10.42, $15.99, €12.50, 10.42, "10.42 GBP", etc.
  const priceStr = String(priceValue).trim();

  // Remove currency symbols and common prefixes
  const cleaned = priceStr
    .replace(/^£/, "") // Remove leading £
    .replace(/^\$/, "") // Remove leading $
    .replace(/^€/, "") // Remove leading €
    .replace(/\s*GBP$/i, "") // Remove trailing GBP
    .replace(/\s*USD$/i, "") // Remove trailing USD
    .replace(/\s*EUR$/i, "") // Remove trailing EUR
    .trim();

  // Parse as float
  const parsed = parseFloat(cleaned);

  // Return if valid number, otherwise null
  return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
}
function addRecordManually() {
  // Create empty record template with placeholder values
  const newRecord = {
    artist: "Unknown Artist",
    title: "Unknown Title",
    label: "",
    catalogueNumber: "",
    year: null,
    format: "LP",
    genre: "",
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseSource: "other",
    conditionVinyl: "VG",
    conditionSleeve: "VG",
    photos: [],
    status: "owned",
    dateAdded: new Date().toISOString(),
    notes: "",
    needsEnrichment: true,
    enrichmentStatus: "pending",
  };

  // Add directly to collection
  collection.push(newRecord);
  saveCollection();
  renderCollection();
  updatePortfolioStats();

  // Show edit modal for the new record
  const newIndex = collection.length - 1;
  viewRecordDetail(newIndex);

  showToast("New record added. Fill in the details!", "success");
}
// Update record prices using available services
async function updateRecordPrices(index) {
  const record = collection[index];

  showToast(`Updating market data for ${record.artist}...`, "success");

  try {
    await analyzeRecordForResale(record);

    record.lastUpdated = new Date().toISOString();
    record.needsEnrichment = false;
    record.enrichmentStatus = "complete";

    saveCollection();
    renderCollection();
    updatePortfolioStats();

    // Refresh modal
    viewRecordDetail(index);

    showToast("Prices updated successfully!", "success");
  } catch (e) {
    console.error("Price update failed:", e);
    showToast("Price update failed. Check API settings.", "error");
  }
}
// Helper: Upload to imgBB
async function uploadPhotosToImgBB(files) {
  const apiKey = localStorage.getItem("imgbb_api_key");
  if (!apiKey) {
    // Fall back to base64 storage
    return await Promise.all(
      files.map(async (file) => await fileToBase64(file)),
    );
  }

  const uploaded = [];
  for (const file of files) {
    const base64 = await fileToBase64(file);
    const formData = new FormData();
    formData.append("image", base64.split(",")[1]);
    formData.append("key", apiKey);

    try {
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        uploaded.push({
          url: data.data.url,
          thumb: data.data.thumb?.url,
          deleteUrl: data.data.delete_url,
        });
      }
    } catch (e) {
      console.error("Upload failed:", e);
    }
  }
  return uploaded.length > 0
    ? uploaded
    : await Promise.all(files.map(async (file) => await fileToBase64(file)));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Export collection to JSON file
function exportCollection() {
  const dataStr = JSON.stringify(collection, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vinyl-collection-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("Collection exported!", "success");
}

// Import collection from JSON file
function importCollectionFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        collection = [...collection, ...imported];
        saveCollection();
        renderCollection();
        updatePortfolioStats();
        showToast(`Imported ${imported.length} records!`, "success");
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      showToast("Failed to import: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// Ensure showToast is available in collection.js context
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
