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
    Array.isArray(record.marketData?.lastSold) && record.marketData.lastSold.length > 0 ? "complete" : "partial";
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
  if (window.discogsService?.key || window.discogsService?.token) {
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

  if (hasAI && (!Array.isArray(marketData?.lastSold) || marketData.lastSold.length < 3)) {
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

  // Try to fetch price suggestions for this release (requires token auth)
  let priceSuggestions = null;
  let lastSold = [];
  try {
    if (releaseDetails.id && window.discogsService?.token) {
      priceSuggestions = await window.discogsService.getPriceSuggestions(releaseDetails.id);
    }
  } catch (e) {
    console.log("Price suggestions fetch failed:", e);
  }

  // Build lastSold array from price suggestions if available
  if (priceSuggestions) {
    const conditionMap = {
      "Mint (M)": "M",
      "Near Mint (NM or M-)": "NM",
      "Very Good Plus (VG+)": "VG+",
      "Very Good (VG)": "VG",
      "Good Plus (G+)": "G+",
      "Good (G)": "G",
      "Fair (F)": "F",
      "Poor (P)": "P",
    };
    for (const [condLabel, suggestion] of Object.entries(priceSuggestions)) {
      const cond = conditionMap[condLabel] || condLabel;
      if (suggestion?.price) {
        lastSold.push({
          condition: cond,
          price: parseFloat(suggestion.price.value || suggestion.price).toFixed(2),
          date: new Date().toISOString().split("T")[0],
          notes: "Discogs price guide",
        });
      }
    }
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
    lastSold: lastSold, // Populated from price_suggestions or AI
    priceSuggestions: priceSuggestions || null,
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

  if (Array.isArray(marketData.lastSold) && marketData.lastSold.length > 0) {
    // Calculate median from actual sold prices, adjusted for condition
    const sortedPrices = marketData.lastSold
      .map(
        (s) =>
          parseFloat(s.price) * (marketData.gradeAdjustment?.[record.conditionVinyl] || 1),
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
  const skeleton = document.getElementById("collectionSkeleton");
  const emptyState = document.getElementById("collectionEmptyState");

  if (!grid) {
    console.error("Collection grid element not found");
    return;
  }

  // Hide skeleton once data is ready
  if (skeleton) skeleton.style.display = "none";

  if (collection.length === 0) {
    // Show dedicated empty state
    if (emptyState) emptyState.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  // Hide empty state when collection has items
  if (emptyState) emptyState.classList.add("hidden");

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
        record.needsEnrichment || !Array.isArray(record.marketData?.lastSold) || !record.marketData.lastSold.length;
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
                            <button onclick="updateRecordPrices(${originalIdx})" class="p-2 ${needsUpdate ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-gray-700 text-gray-400 hover:bg-gray-600"} rounded-lg transition-all" title="Refresh Record Details">
                                <i data-feather="refresh-cw" class="w-4 h-4"></i>
                            </button>
                            <button onclick="changeRecordImages(${originalIdx})" class="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all" title="Change Images">
                                <i data-feather="image" class="w-4 h-4"></i>
                            </button>
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
    record.needsEnrichment || !Array.isArray(record.marketData?.lastSold) || !record.marketData.lastSold.length;
  // Build market data display
  let marketDataHtml = "";
  if (Array.isArray(record.marketData?.lastSold) && record.marketData.lastSold.length > 0) {
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
                            <span class="text-gray-200">£${parseFloat(sale.price).toFixed(2)}${sale.notes ? ` (${sale.notes})` : ""}</span>
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
                        <span class="font-medium text-primary">£${parseFloat(record.marketData.medianSold).toFixed(2)}</span>
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
                ${(() => { const ls = parseFloat(record.csvMarketData.lastSold); return !isNaN(ls) ? `
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Last Sold:</span>
                    <span class="text-gray-200">£${ls.toFixed(2)}</span>
                </div>` : ""; })()}
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

                    <!-- Cost Breakdown -->
                    <div class="bg-surface/60 border border-gray-700 rounded-lg p-3">
                        <h4 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Total Cost Breakdown</h4>
                        <div class="space-y-1 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Purchase Price</span>
                                <span>£${(parseFloat(record.purchasePrice) || 0).toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-500">P&amp;P / Postage Cost</span>
                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                    value="${(parseFloat(record.ppCost) || 0) > 0 ? parseFloat(record.ppCost).toFixed(2) : ""}"
                                    class="w-20 px-2 py-0.5 bg-surface border border-gray-700 rounded text-right text-sm"
                                    oninput="updateRecordCost(${index},'ppCost',this.value)">
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-500">Misc (cleaning/extras)</span>
                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                    value="${(parseFloat(record.miscCost) || 0) > 0 ? parseFloat(record.miscCost).toFixed(2) : ""}"
                                    class="w-20 px-2 py-0.5 bg-surface border border-gray-700 rounded text-right text-sm"
                                    oninput="updateRecordCost(${index},'miscCost',this.value)">
                            </div>
                            <div class="flex justify-between font-semibold border-t border-gray-700 pt-1 mt-1">
                                <span>Total Cost</span>
                                <span id="totalCostDisplay_${index}">£${((parseFloat(record.purchasePrice) || 0) + (parseFloat(record.ppCost) || 0) + (parseFloat(record.miscCost) || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- External Valuation Links -->
                    <div class="bg-surface/60 border border-gray-700 rounded-lg p-3">
                        <h4 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Check Valuations</h4>
                        <div class="flex flex-wrap gap-2 text-xs">
                            <a href="https://www.valueyourmusic.com/search?q=${encodeURIComponent((record.artist || "") + " " + (record.title || ""))}" target="_blank" rel="noopener noreferrer"
                                class="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full hover:bg-purple-500/20 transition-colors">
                                ValueYourMusic
                            </a>
                            <a href="https://www.popsike.com/php/quicksearch.php?searchtext=${encodeURIComponent((record.artist || "") + " " + (record.title || ""))}" target="_blank" rel="noopener noreferrer"
                                class="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full hover:bg-blue-500/20 transition-colors">
                                Popsike
                            </a>
                            <a href="https://www.discogs.com/search/?q=${encodeURIComponent((record.artist || "") + " " + (record.title || ""))}&type=release" target="_blank" rel="noopener noreferrer"
                                class="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-full hover:bg-yellow-500/20 transition-colors">
                                Discogs
                            </a>
                            <a href="https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent((record.artist || "") + " " + (record.title || "") + " vinyl")}&LH_Sold=1&LH_Complete=1" target="_blank" rel="noopener noreferrer"
                                class="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full hover:bg-red-500/20 transition-colors">
                                eBay Sold
                            </a>
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

                    ${
                      record.ebayListingHtml
                        ? `
                        <details class="bg-surface/60 border border-gray-700 rounded-lg overflow-hidden">
                            <summary class="px-4 py-2 cursor-pointer text-sm text-gray-400 hover:text-white select-none">eBay Listing HTML</summary>
                            <div class="p-4 border-t border-gray-700 max-h-64 overflow-y-auto">
                                <iframe srcdoc="${record.ebayListingHtml.replace(/"/g, "&quot;")}" sandbox="" class="w-full" style="min-height:200px;border:none;background:white;border-radius:4px"></iframe>
                            </div>
                        </details>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <div class="flex gap-3 mt-6 pt-4 border-t border-gray-800 flex-wrap">
                <button onclick="editRecord(${index})" class="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg font-medium hover:bg-gray-600 transition-all flex items-center gap-2">
                    <i data-feather="edit-2" class="w-4 h-4"></i>
                    Edit Details
                </button>
                <button onclick="changeRecordImages(${index})" class="px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg font-medium hover:bg-blue-600/30 transition-all flex items-center gap-2">
                    <i data-feather="image" class="w-4 h-4"></i>
                    Change Images
                </button>
                <button onclick="updateRecordPrices(${index})" class="flex-1 px-4 py-2 bg-gradient-to-r ${needsUpdate ? "from-green-600 to-emerald-600 hover:shadow-green-500/25" : "from-gray-600 to-gray-700 hover:shadow-gray-500/25"} rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <i data-feather="refresh-cw" class="w-4 h-4"></i>
                    Refresh Record Details
                </button>
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
                        🎉 Mark as Sold
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

function editRecord(index) {
  const record = collection[index];
  const modal = document.getElementById("recordModal");
  const content = document.getElementById("recordModalContent");

  const CONDITIONS = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"];
  const SOURCES = [
    { value: "discogs", label: "Discogs" },
    { value: "ebay", label: "eBay" },
    { value: "record_store", label: "Record Store" },
    { value: "charity_shop", label: "Charity Shop" },
    { value: "car_boot", label: "Car Boot / Flea Market" },
    { value: "gift", label: "Gift" },
    { value: "other", label: "Other" },
  ];

  const conditionOptions = (selected) =>
    CONDITIONS.map(
      (c) => `<option value="${c}" ${selected === c ? "selected" : ""}>${c}</option>`
    ).join("");

  const sourceOptions = SOURCES.map(
    (s) => `<option value="${s.value}" ${record.purchaseSource === s.value ? "selected" : ""}>${s.label}</option>`
  ).join("");

  content.innerHTML = `
    <div class="p-6 border-b border-gray-800 flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm mb-1">Edit Record</p>
        <h2 class="text-xl font-bold text-white">${record.artist} — ${record.title}</h2>
      </div>
      <button onclick="closeRecordModal()" class="text-gray-400 hover:text-white">
        <i data-feather="x" class="w-6 h-6"></i>
      </button>
    </div>
    <div class="p-6 overflow-y-auto max-h-[70vh]">
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Artist</label>
          <input id="edit_artist" type="text" value="${record.artist || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Title</label>
          <input id="edit_title" type="text" value="${record.title || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Year</label>
          <input id="edit_year" type="text" value="${record.year || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Label</label>
          <input id="edit_label" type="text" value="${record.label || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Catalogue Number</label>
          <input id="edit_catalogueNumber" type="text" value="${record.catalogueNumber || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Country</label>
          <input id="edit_country" type="text" value="${record.country || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Vinyl Condition</label>
          <select id="edit_conditionVinyl"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm">
            ${conditionOptions(record.conditionVinyl)}
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Sleeve Condition</label>
          <select id="edit_conditionSleeve"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm">
            ${conditionOptions(record.conditionSleeve)}
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Purchase Price (£)</label>
          <input id="edit_purchasePrice" type="number" step="0.01" min="0" value="${record.purchasePrice || 0}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Purchase Date</label>
          <input id="edit_purchaseDate" type="date" value="${record.purchaseDate ? record.purchaseDate.split("T")[0] : ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Purchase Source</label>
          <select id="edit_purchaseSource"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm">
            ${sourceOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Format</label>
          <input id="edit_format" type="text" value="${record.format || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs text-gray-400 mb-1">Matrix / Runout Notes</label>
          <input id="edit_matrixNotes" type="text" value="${record.matrixNotes || ""}"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea id="edit_notes" rows="3"
            class="w-full px-3 py-2 bg-surface border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm resize-none">${record.notes || ""}</textarea>
        </div>
      </div>
      <div class="flex gap-3 mt-6 pt-4 border-t border-gray-800">
        <button onclick="saveRecordEdit(${index})" class="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary rounded-lg font-medium hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2">
          <i data-feather="save" class="w-4 h-4"></i>
          Save Changes
        </button>
        <button onclick="viewRecordDetail(${index})" class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all">
          Cancel
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  feather.replace();
}

function saveRecordEdit(index) {
  const record = collection[index];
  const fields = [
    "artist", "title", "year", "label", "catalogueNumber", "country",
    "conditionVinyl", "conditionSleeve", "purchaseDate", "purchaseSource",
    "format", "matrixNotes", "notes",
  ];

  fields.forEach((field) => {
    const el = document.getElementById(`edit_${field}`);
    if (el) record[field] = el.value.trim();
  });

  const priceEl = document.getElementById("edit_purchasePrice");
  if (priceEl) record.purchasePrice = parseFloat(priceEl.value) || 0;

  saveCollection();
  renderCollection();
  updatePortfolioStats();
  viewRecordDetail(index);
  showToast("Record details saved!", "success");
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
  // Replace the bare prompt() with a proper modal
  const existing = document.getElementById("soldModal");
  if (existing) existing.remove();

  const record = collection[index];
  const suggested = record.suggestedListingPrice || record.estimatedValue || "";

  const modal = document.createElement("div");
  modal.id = "soldModal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;max-width:480px;width:100%;padding:24px">
      <h3 style="margin:0 0 16px;font-size:1.1em;color:#e2e8f0">🎉 Record Sold — Enter Details</h3>
      <div style="display:grid;gap:12px">
        <label style="font-size:0.8em;color:#94a3b8">
          Sale Price (£) <span style="color:#ef4444">*</span>
          <input id="soldPriceInput" type="number" step="0.01" min="0" value="${suggested}" style="display:block;width:100%;margin-top:4px;padding:8px;background:#0f172a;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:1em">
        </label>
        <label style="font-size:0.8em;color:#94a3b8">
          P&amp;P Cost (£)
          <input id="soldPPInput" type="number" step="0.01" min="0" placeholder="0.00" style="display:block;width:100%;margin-top:4px;padding:8px;background:#0f172a;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:1em">
        </label>
        <label style="font-size:0.8em;color:#94a3b8">
          eBay Final Value Fee (£)
          <input id="soldEbayFeeInput" type="number" step="0.01" min="0" placeholder="0.00" style="display:block;width:100%;margin-top:4px;padding:8px;background:#0f172a;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:1em">
        </label>
        <label style="font-size:0.8em;color:#94a3b8">
          eBay Promoted Ad Charge (£)
          <input id="soldAdChargeInput" type="number" step="0.01" min="0" placeholder="0.00" style="display:block;width:100%;margin-top:4px;padding:8px;background:#0f172a;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:1em">
        </label>
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px">
        <button id="soldCancel" style="padding:8px 20px;background:transparent;border:1px solid #475569;border-radius:8px;color:#94a3b8;cursor:pointer">Cancel</button>
        <button id="soldConfirm" style="padding:8px 20px;background:#22c55e;border:none;border-radius:8px;color:white;cursor:pointer;font-weight:600">Confirm Sale</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById("soldCancel").addEventListener("click", () => modal.remove());
  document.getElementById("soldConfirm").addEventListener("click", () => {
    const soldPrice = parseFloat(document.getElementById("soldPriceInput").value);
    if (!soldPrice || isNaN(soldPrice)) {
      alert("Please enter a valid sale price.");
      return;
    }
    const ppCost = parseFloat(document.getElementById("soldPPInput").value) || 0;
    const ebayFee = parseFloat(document.getElementById("soldEbayFeeInput").value) || 0;
    const adCharge = parseFloat(document.getElementById("soldAdChargeInput").value) || 0;
    const totalFees = ppCost + ebayFee + adCharge;

    collection[index].status = "sold";
    collection[index].soldPrice = soldPrice;
    collection[index].soldDate = new Date().toISOString();
    collection[index].soldPPCost = ppCost;
    collection[index].soldEbayFee = ebayFee;
    collection[index].soldAdCharge = adCharge;
    collection[index].fees = totalFees;
    collection[index].actualProfit =
      soldPrice - (collection[index].totalCost ?? collection[index].purchasePrice ?? 0) - totalFees;

    // Record time-of-sale analytics
    const soldAt = new Date();
    collection[index].soldAnalytics = {
      hourOfDay: soldAt.getHours(),
      dayOfWeek: soldAt.getDay(),
      monthOfYear: soldAt.getMonth() + 1,
      daysListed: collection[index].listedDate
        ? Math.floor(
            (soldAt - new Date(collection[index].listedDate)) / 86400000,
          )
        : null,
    };

    modal.remove();
    saveCollection();
    renderCollection();
    updatePortfolioStats();
    closeRecordModal();
    showToast("Congratulations on the sale! 🎉", "success");
  });
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

// Update a cost field on a record in-place and refresh the total display
function updateRecordCost(index, field, value) {
  const numVal = parseFloat(value) || 0;
  collection[index][field] = numVal;
  collection[index].totalCost =
    (parseFloat(collection[index].purchasePrice) || 0) +
    (parseFloat(collection[index].ppCost) || 0) +
    (parseFloat(collection[index].miscCost) || 0);
  saveCollection();
  const display = document.getElementById(`totalCostDisplay_${index}`);
  if (display) display.textContent = `£${collection[index].totalCost.toFixed(2)}`;
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

// Change Images functionality
function changeRecordImages(index) {
  const existing = document.getElementById("changeImagesModal");
  if (existing) existing.remove();

  window._changeImagesIndex = index;
  window._changeImagesFiles = [];

  const modal = document.createElement("div");
  modal.id = "changeImagesModal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;max-width:560px;width:100%;padding:24px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:1.1em;color:#e2e8f0">📸 Change Images</h3>
        <button onclick="document.getElementById('changeImagesModal').remove()" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1.4em;line-height:1">✕</button>
      </div>
      <div id="changeImagesDropZone" onclick="document.getElementById('changeImagesFileInput').click()"
        style="border:2px dashed #475569;border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color 0.2s;margin-bottom:16px"
        onmouseover="this.style.borderColor='#c8973f'" onmouseout="this.style.borderColor='#475569'">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 8px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p style="color:#94a3b8;margin:0 0 4px">Drop photos here or click to browse</p>
        <p style="color:#64748b;font-size:0.8em;margin:0">Front, back, labels, deadwax recommended</p>
        <input type="file" id="changeImagesFileInput" multiple accept="image/*" style="display:none" onchange="handleChangeImagesFiles(event)">
      </div>
      <div id="changeImagesPreview" style="display:none;margin-bottom:16px">
        <p style="color:#94a3b8;font-size:0.85em;margin:0 0 8px">Selected photos:</p>
        <div id="changeImagesGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>
      </div>
      <div style="display:grid;gap:10px">
        <button id="justUpdateImagesBtn" onclick="saveJustImages()" disabled
          style="padding:12px;background:#1e40af;border:none;border-radius:8px;color:white;cursor:not-allowed;opacity:0.5;font-weight:600;font-size:0.9em">
          📷 Just Update Images
        </button>
        <button id="aiLookupImagesBtn" onclick="runAILookupOnImages()" disabled
          style="padding:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;border-radius:8px;color:white;cursor:not-allowed;opacity:0.5;font-weight:600;font-size:0.9em">
          🤖 Update Details with AI Lookup
        </button>
      </div>
      <p style="color:#475569;font-size:0.75em;margin:12px 0 0;text-align:center;line-height:1.5">
        <strong style="color:#64748b">Just Update Images</strong> saves the photos without changing any details.<br>
        <strong style="color:#64748b">AI Lookup</strong> analyses photos, finds the Discogs release, and updates all details.
      </p>
    </div>`;
  document.body.appendChild(modal);
}

function handleChangeImagesFiles(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  window._changeImagesFiles = files;

  const grid = document.getElementById("changeImagesGrid");
  const preview = document.getElementById("changeImagesPreview");
  grid.innerHTML = files.map((file) => {
    const url = URL.createObjectURL(file);
    return `<div style="aspect-ratio:1;border-radius:8px;overflow:hidden;border:1px solid #334155"><img src="${url}" style="width:100%;height:100%;object-fit:cover"></div>`;
  }).join("");
  preview.style.display = "block";

  const justBtn = document.getElementById("justUpdateImagesBtn");
  const aiBtn = document.getElementById("aiLookupImagesBtn");
  if (justBtn) { justBtn.disabled = false; justBtn.style.cursor = "pointer"; justBtn.style.opacity = "1"; }
  if (aiBtn) { aiBtn.disabled = false; aiBtn.style.cursor = "pointer"; aiBtn.style.opacity = "1"; }
}

async function saveJustImages() {
  const index = window._changeImagesIndex;
  const files = window._changeImagesFiles || [];
  if (!files.length) { showToast("No images selected", "error"); return; }

  const justBtn = document.getElementById("justUpdateImagesBtn");
  if (justBtn) { justBtn.textContent = "💾 Saving..."; justBtn.disabled = true; }

  try {
    if (localStorage.getItem("imgbb_api_key")) {
      collection[index].photos = await uploadPhotosToImgBB(files);
    } else {
      collection[index].photos = await Promise.all(files.map((f) => fileToBase64(f)));
    }
    saveCollection();
    renderCollection();
    const modal = document.getElementById("changeImagesModal");
    if (modal) modal.remove();
    closeRecordModal();
    viewRecordDetail(index);
    showToast("Images updated successfully!", "success");
  } catch (e) {
    console.error("Image save failed:", e);
    showToast("Failed to save images", "error");
    if (justBtn) { justBtn.textContent = "📷 Just Update Images"; justBtn.disabled = false; }
  }
}

async function runAILookupOnImages() {
  const index = window._changeImagesIndex;
  const files = window._changeImagesFiles || [];
  if (!files.length) { showToast("No images selected", "error"); return; }

  const aiBtn = document.getElementById("aiLookupImagesBtn");
  if (aiBtn) { aiBtn.textContent = "🔍 Analysing..."; aiBtn.disabled = true; aiBtn.style.opacity = "0.7"; }

  try {
    const record = collection[index];
    let detection = { artist: record.artist, title: record.title, catalogueNumber: record.catalogueNumber, year: record.year, label: record.label, confidence: "low" };

    // Try AI OCR if configured
    const apiKey = localStorage.getItem("openai_api_key") || localStorage.getItem("deepseek_api_key");
    if (apiKey && typeof EnhancedOCRService !== "undefined") {
      try {
        const ocrService = new EnhancedOCRService();
        detection = await ocrService.analyzeRecordImages(files);
      } catch (e) {
        console.log("OCR failed, using record data:", e.message);
      }
    }

    // Search Discogs
    let discogsMatch = null;
    if (window.discogsService) {
      try {
        const results = await window.discogsService.searchReleaseCandidates(
          detection.artist || record.artist,
          detection.title || record.title,
          detection.catalogueNumber || record.catalogueNumber,
          3
        );
        if (results && results.length > 0) {
          discogsMatch = await window.discogsService.getReleaseDetails(results[0].id);
        }
      } catch (e) {
        console.log("Discogs search failed:", e.message);
      }
    }

    // Store for confirmation step
    window._aiLookupDetection = detection;
    window._aiLookupDiscogsMatch = discogsMatch;
    window._aiLookupFiles = files;

    showAILookupConfirmation(index, detection, discogsMatch);
  } catch (e) {
    console.error("AI lookup failed:", e);
    showToast("AI lookup failed: " + e.message, "error");
    if (aiBtn) { aiBtn.textContent = "🤖 Update Details with AI Lookup"; aiBtn.disabled = false; aiBtn.style.opacity = "1"; }
  }
}

function showAILookupConfirmation(index, detection, discogsMatch) {
  const modal = document.getElementById("changeImagesModal");
  if (!modal) return;
  const inner = modal.querySelector("div");

  const discogsInfo = discogsMatch
    ? `<div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px;margin:12px 0">
        <p style="font-weight:600;color:#e2e8f0;margin:0 0 8px">${(discogsMatch.artists || []).map((a) => a.name).join(", ") || detection.artist || "Unknown"} — ${discogsMatch.title || detection.title || "Unknown"}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8em;color:#94a3b8">
          <span>Year: ${discogsMatch.year || "-"}</span>
          <span>Country: ${discogsMatch.country || "-"}</span>
          <span>Label: ${discogsMatch.labels?.[0]?.name || "-"}</span>
          <span>Cat#: ${discogsMatch.labels?.[0]?.catno || "-"}</span>
        </div>
        ${discogsMatch.uri ? `<a href="${discogsMatch.uri}" target="_blank" rel="noopener" style="color:#7c3aed;font-size:0.8em;margin-top:8px;display:inline-block">View on Discogs →</a>` : ""}
      </div>`
    : `<p style="color:#f59e0b;font-size:0.85em;padding:8px 0">No Discogs match found automatically. Please enter the URL below.</p>`;

  inner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:1.1em;color:#e2e8f0">🔍 Release Found</h3>
      <button onclick="document.getElementById('changeImagesModal').remove()" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1.4em;line-height:1">✕</button>
    </div>
    <p style="color:#94a3b8;font-size:0.85em;margin-bottom:4px">Is this the correct release?</p>
    ${discogsInfo}
    <div style="margin-bottom:16px">
      <label style="color:#94a3b8;font-size:0.8em;display:block;margin-bottom:4px">Or enter the correct Discogs URL / release ID:</label>
      <input id="manualDiscogsUrlInput" type="text" placeholder="https://www.discogs.com/release/..."
        style="width:100%;padding:8px 12px;background:#0f172a;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:0.85em;box-sizing:border-box">
    </div>
    <div style="display:grid;gap:10px">
      <button onclick="confirmAILookupUpdate(${index})"
        style="padding:12px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:8px;color:white;cursor:pointer;font-weight:600;font-size:0.9em">
        ✓ Yes, Update Details with This Release
      </button>
      <button onclick="document.getElementById('changeImagesModal').remove()"
        style="padding:12px;background:transparent;border:1px solid #475569;border-radius:8px;color:#94a3b8;cursor:pointer;font-size:0.9em">
        ✕ Cancel
      </button>
    </div>`;
}

async function confirmAILookupUpdate(index) {
  const record = collection[index];
  const detection = window._aiLookupDetection || {};
  const files = window._aiLookupFiles || [];
  let discogsData = null;

  // Check for manually entered URL
  const manualUrl = document.getElementById("manualDiscogsUrlInput")?.value.trim();
  if (manualUrl && window.discogsService) {
    try {
      const releaseId = window.discogsService.extractReleaseIdFromUrl(manualUrl) ||
        (parseInt(manualUrl) || null);
      if (releaseId) {
        const details = await window.discogsService.getReleaseDetails(releaseId);
        if (details) discogsData = details;
      }
    } catch (e) {
      console.log("Manual Discogs lookup failed:", e.message);
    }
  }

  // Use auto-found match if no manual URL
  if (!discogsData) discogsData = window._aiLookupDiscogsMatch;

  const confirmBtn = document.querySelector("#changeImagesModal button[onclick^='confirmAILookupUpdate']");
  if (confirmBtn) { confirmBtn.textContent = "⏳ Updating..."; confirmBtn.disabled = true; }

  try {
    // Upload images
    if (files.length > 0) {
      if (localStorage.getItem("imgbb_api_key")) {
        record.photos = await uploadPhotosToImgBB(files);
      } else {
        record.photos = await Promise.all(files.map((f) => fileToBase64(f)));
      }
    }

    // Update record fields from detection + Discogs
    if (detection.artist && detection.confidence !== "low") record.artist = detection.artist;
    if (detection.title && detection.confidence !== "low") record.title = detection.title;
    if (detection.catalogueNumber) record.catalogueNumber = detection.catalogueNumber;
    if (detection.year) record.year = parseInt(detection.year) || record.year;
    if (detection.label) record.label = detection.label;
    if (detection.matrixRunoutA || detection.matrixRunoutB) {
      const parts = [];
      if (detection.matrixRunoutA) parts.push("A: " + detection.matrixRunoutA);
      if (detection.matrixRunoutB) parts.push("B: " + detection.matrixRunoutB);
      record.matrixNotes = parts.join(" | ");
    }

    if (discogsData) {
      if (discogsData.artists?.[0]?.name) record.artist = discogsData.artists[0].name;
      if (discogsData.title) record.title = discogsData.title;
      if (discogsData.year) record.year = discogsData.year;
      if (discogsData.country) record.country = discogsData.country;
      if (discogsData.labels?.[0]?.name) record.label = discogsData.labels[0].name;
      if (discogsData.labels?.[0]?.catno) record.catalogueNumber = discogsData.labels[0].catno;
      if (discogsData.genres?.[0]) record.genre = discogsData.genres[0];

      // Fetch full tracklist/identifiers for HTML generation
      let fullDiscogsData = discogsData;
      if (window.discogsService && discogsData.id) {
        try {
          const tracklist = await window.discogsService.fetchTracklist(discogsData.id);
          if (tracklist) fullDiscogsData = { ...discogsData, ...tracklist };
        } catch (e) {
          console.log("Tracklist fetch failed:", e.message);
        }
      }
      record.ebayListingHtml = generateEnhancedListingHtmlForRecord(record, fullDiscogsData, detection);
      record.discogsData = { id: discogsData.id, uri: discogsData.uri };
    }

    record.needsEnrichment = false;
    record.enrichmentStatus = "complete";
    record.lastUpdated = new Date().toISOString();

    saveCollection();
    renderCollection();
    updatePortfolioStats();

    const modal = document.getElementById("changeImagesModal");
    if (modal) modal.remove();
    closeRecordModal();
    viewRecordDetail(index);
    showToast("Images and details updated successfully!", "success");
  } catch (e) {
    console.error("AI lookup update failed:", e);
    showToast("Update failed: " + e.message, "error");
  }
}

function generateEnhancedListingHtmlForRecord(record, discogsData, detection) {
  const artist = record.artist || "";
  const title = record.title || "";
  const catNo = record.catalogueNumber || "";
  const year = record.year || "";
  const label = record.label || "";
  const country = record.country || "";
  const condition = `Vinyl: ${record.conditionVinyl || "VG"} / Sleeve: ${record.conditionSleeve || "VG"}`;

  // Build tracklist HTML
  let tracklistSection = "<p style=\"color:#64748b;font-style:italic\">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>";
  const tracklist = discogsData?.tracklist || [];
  if (tracklist.length > 0) {
    const hasSides = tracklist.some((t) => t.position && /^[AB]/i.test(t.position));
    if (hasSides) {
      const sides = {};
      tracklist.forEach((t) => {
        const side = t.position ? t.position.charAt(0).toUpperCase() : "?";
        if (!sides[side]) sides[side] = [];
        sides[side].push(t);
      });
      tracklistSection = Object.entries(sides).map(([side, tracks]) =>
        `<div style="margin-bottom:12px"><h4 style="color:#7c3aed;font-size:13px;font-weight:600;margin:0 0 6px;text-transform:uppercase">Side ${side}</h4>` +
        tracks.map((t) => `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:4px;border:1px solid #e2e8f0;margin-bottom:4px;font-size:13px"><span><strong>${t.position}</strong> ${t.title}</span>${t.duration ? `<span style="color:#64748b;font-family:monospace">${t.duration}</span>` : ""}</div>`).join("") +
        "</div>"
      ).join("");
    } else {
      tracklistSection = tracklist.map((t) =>
        `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:4px;border:1px solid #e2e8f0;margin-bottom:4px;font-size:13px"><span>${t.position ? `<strong>${t.position}</strong> ` : ""}${t.title}</span>${t.duration ? `<span style="color:#64748b;font-family:monospace">${t.duration}</span>` : ""}</div>`
      ).join("");
    }
  }

  // Build identifiers section
  const identifiers = discogsData?.identifiers || [];
  const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
  const matrixIds = identifiers.filter((i) => i.type === "Matrix / Runout" || i.type === "Runout");
  const pressingIds = identifiers.filter((i) => i.type === "Pressing Plant" || i.type === "Mastering");

  let identifiersHtml = "";
  if (barcodeInfo || matrixIds.length > 0 || pressingIds.length > 0) {
    identifiersHtml = `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
      <h3 style="margin:0 0 10px;color:#166534;font-size:15px;font-weight:600">Barcode/Other Identifiers &amp; Matrix</h3>
      <div style="font-family:monospace;font-size:13px;line-height:1.7;color:#15803d">
        ${barcodeInfo ? `<p style="margin:3px 0"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
        ${matrixIds.map((m) => `<p style="margin:3px 0"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
        ${pressingIds.map((p) => `<p style="margin:3px 0"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
      </div>
      ${discogsData?.notes ? `<p style="margin-top:10px;padding-top:10px;border-top:1px solid #bbf7d0;font-size:12px;color:#166534;font-style:italic"><strong>Notes:</strong> ${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
    </div>`;
  }

  // Generate about description
  const notes = discogsData?.notes || "";
  const notesLower = notes.toLowerCase();
  const features = [];
  if (notesLower.includes("gatefold")) features.push("Gatefold sleeve");
  if (notesLower.includes("insert")) features.push("Original insert");
  if (notesLower.includes("poster")) features.push("Poster included");
  if (notesLower.includes("hype sticker") || notesLower.includes("hype-sticker")) features.push("Hype sticker present");
  if (notesLower.includes("inner sleeve")) features.push("Original inner sleeve");
  if (notesLower.includes("obi")) features.push("OBI strip");

  const genreStr = record.genre || (discogsData?.genres?.[0]) || "Vinyl";
  const genreCapital = genreStr.charAt(0).toUpperCase() + genreStr.slice(1);
  const isFirstPress = detection?.isFirstPress || detection?.pressingType === "first_press";
  let aboutText = `${genreCapital} release${year ? ", " + year : ""}${country ? " " + country : ""} ${isFirstPress ? "original first pressing" : "original pressing"}.`;
  if (features.length > 0) aboutText += ` Features: ${features.join(", ")}.`;
  if (notes.trim()) {
    const cleanNotes = notes.replace(/\[.*?\]/g, "").trim();
    if (cleanNotes) aboutText += " " + cleanNotes.substring(0, 200) + (cleanNotes.length > 200 ? "..." : "");
  }
  if (matrixIds.length > 0) aboutText += ` Matrix/runout: ${matrixIds.map((m) => m.value).join(" | ")}.`;
  if (tracklist.length > 0) aboutText += ` Tracklist confirmed (${tracklist.length} tracks verified against Discogs).`;

  // Hero image
  const heroImg = (record.photos?.[0]?.url || record.photos?.[0] || "");
  const galleryImgs = (record.photos || []).slice(1).map((p) => p.url || p).filter(Boolean);
  const galleryHtml = galleryImgs.length > 0
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:20px">${galleryImgs.map((u) => `<img src="${u}" style="width:100%;height:150px;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.1)" alt="Record photo">`).join("")}</div>`
    : "";

  return `<div style="max-width:800px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;line-height:1.6">
  ${heroImg ? `<div style="margin-bottom:20px"><img src="${heroImg}" alt="${artist} - ${title}" style="width:100%;max-width:600px;display:block;margin:0 auto;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15)"></div>` : ""}
  ${galleryHtml}
  <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px">
    <span style="background:#7c3aed;color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase">Original ${country || "UK"} Pressing</span>
    <span style="background:#059669;color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase">${year || "Vintage"}</span>
    <span style="background:#d97706;color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase">${condition}</span>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
    <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;width:130px">Artist</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${artist}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Title</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${title}</td></tr>
    <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Label</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${label}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Catalogue</td><td style="padding:10px 14px;border:1px solid #e2e8f0"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px">${catNo || "[See photos]"}</code></td></tr>
    <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Country</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${country}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Year</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${year}</td></tr>
    <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600">Condition</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${condition}</td></tr>
  </table>
  <h3 style="color:#1e293b;font-size:18px;font-weight:600;margin-bottom:10px">About This Release</h3>
  <p style="margin-bottom:16px;color:#475569">${aboutText}</p>
  <h3 style="color:#1e293b;font-size:18px;font-weight:600;margin-bottom:10px">Tracklist</h3>
  <div style="background:#f8fafc;padding:16px 20px;border-radius:8px;margin-bottom:20px">${tracklistSection}</div>
  ${identifiersHtml}
  <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px 20px;margin-bottom:20px;border-radius:0 8px 8px 0">
    <h3 style="margin:0 0 10px;color:#1e40af;font-size:16px;font-weight:600">Packing &amp; Postage</h3>
    <p style="margin:0 0 10px;color:#1e3a8a">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin:0;color:#1e3a8a;font-size:14px"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>
  <div style="text-align:center;padding:24px;background:#f1f5f9;border-radius:12px">
    <p style="margin:0 0 8px;color:#475569;font-weight:500">Questions? Need more photos?</p>
    <p style="margin:0;color:#64748b;font-size:14px">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>
</div>`;
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
