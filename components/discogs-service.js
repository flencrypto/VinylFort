class DiscogsService {
  constructor() {
    this.token = localStorage.getItem("discogs_token");
    this.key = localStorage.getItem("discogs_key");
    this.secret = localStorage.getItem("discogs_secret");
    this.baseUrl = "https://api.discogs.com";
    this.userAgent =
      "VinylVaultPro/1.0 +https://github.com/flencrypto/VinylFort";
    this.rateLimit = {
      limit: 60,
      remaining: 60,
      used: 0,
    };
  }

  updateCredentials(key, secret, token) {
    this.key = key;
    this.secret = secret;
    this.token = token;
  }

  getHeaders() {
    const headers = {
      "User-Agent": this.userAgent,
      Accept: "application/vnd.discogs.v2.plaintext+json",
    };

    // Prefer token-based authentication if available
    if (this.token) {
      headers["Authorization"] = `Discogs token=${this.token}`;
    } else if (this.key && this.secret) {
      headers["Authorization"] =
        `Discogs key=${this.key}, secret=${this.secret}`;
    }

    return headers;
  }

  updateRateLimitFromHeaders(headers) {
    if (headers.has("X-Discogs-Ratelimit")) {
      this.rateLimit.limit = parseInt(headers.get("X-Discogs-Ratelimit"), 10);
    }
    if (headers.has("X-Discogs-Ratelimit-Used")) {
      this.rateLimit.used = parseInt(
        headers.get("X-Discogs-Ratelimit-Used"),
        10,
      );
    }
    if (headers.has("X-Discogs-Ratelimit-Remaining")) {
      this.rateLimit.remaining = parseInt(
        headers.get("X-Discogs-Ratelimit-Remaining"),
        10,
      );
    }
  }

  async handleResponse(response) {
    this.updateRateLimitFromHeaders(response.headers);

    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait before making more requests.",
      );
    }

    if (response.status === 401) {
      throw new Error(
        "Unauthorized. Please check your Discogs API credentials.",
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Forbidden. You do not have permission to access this resource.",
      );
    }

    if (response.status === 404) {
      throw new Error("Resource not found.");
    }

    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Invalid request parameters.");
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return response;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.pow(2, attempt) * 1000;

          console.warn(
            `Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`,
          );
          await this.sleep(waitTime);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(
            `Request failed. Retrying in ${waitTime}ms... (${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(waitTime);
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  async fetchPaginatedResults(baseUrl, params = {}, maxPages = 5) {
    const allResults = [];
    let currentPage = params.page || 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= maxPages) {
      const queryParams = new URLSearchParams({
        ...params,
        page: currentPage,
        per_page: params.per_page || 50,
      });

      try {
        const response = await this.fetchWithRetry(
          `${baseUrl}?${queryParams}`,
          { headers: this.getHeaders() },
        );

        await this.handleResponse(response);
        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
          allResults.push(...data.results);
        } else {
          // No valid results structure, stop pagination
          console.warn("Invalid or missing results structure in response");
          break;
        }

        if (data.pagination) {
          hasMorePages = currentPage < data.pagination.pages;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      } catch (error) {
        console.error(`Pagination failed at page ${currentPage}:`, error);
        break;
      }
    }

    return allResults;
  }

  async testConnection() {
    if (!this.token && (!this.key || !this.secret)) {
      throw new Error("Discogs API credentials not configured");
    }

    const response = await fetch(
      `${this.baseUrl}/database/search?q=test&per_page=1`,
      {
        headers: this.getHeaders(),
      },
    );

    await this.handleResponse(response);
    return true;
  }

  async searchRelease(artist, title, catNo) {
    if (!this.token && (!this.key || !this.secret)) return null;

    let query = "";
    if (artist) query += artist;
    if (title) query += (query ? " " : "") + title;
    if (catNo) query += (query ? " " : "") + catNo;

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=5`,
        {
          headers: this.getHeaders(),
        },
      );

      await this.handleResponse(response);
      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error("Search release failed:", error);
      return null;
    }
  }

  async searchReleaseCandidates(artist, title, catNo, limit = 5) {
    if (!this.token && (!this.key || !this.secret)) return [];

    let query = "";
    if (artist) query += artist;
    if (title) query += (query ? " " : "") + title;
    if (catNo) query += (query ? " " : "") + catNo;

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=${limit}`,
        {
          headers: this.getHeaders(),
        },
      );

      await this.handleResponse(response);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Search release candidates failed:", error);
      return [];
    }
  }
  async getReleaseDetails(releaseId) {
    if (!this.token && (!this.key || !this.secret)) return null;

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/releases/${releaseId}`,
        {
          headers: this.getHeaders(),
        },
      );

      await this.handleResponse(response);
      return await response.json();
    } catch (error) {
      console.error("Get release details failed:", error);
      return null;
    }
  }

  async fetchTracklist(releaseId) {
    if ((!this.token && (!this.key || !this.secret)) || !releaseId) return null;

    try {
      const details = await this.getReleaseDetails(releaseId);
      if (!details || !details.tracklist) return null;

      return {
        tracklist: details.tracklist,
        notes: details.notes,
        styles: details.styles,
        genres: details.genres,
        identifiers: details.identifiers,
        companies: details.companies,
        barcode: details.barcode,
        uri: details.uri,
        master_id: details.master_id,
        lowest_price: details.lowest_price,
        num_for_sale: details.num_for_sale,
      };
    } catch (e) {
      console.error("Failed to fetch tracklist:", e);
      return null;
    }
  }

  async fetchMasterReleaseDetails(masterId) {
    if ((!this.token && (!this.key || !this.secret)) || !masterId) return null;

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/masters/${masterId}`,
        {
          headers: this.getHeaders(),
        },
      );

      await this.handleResponse(response);
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch master details:", e);
      return null;
    }
  }

  async searchByBarcode(barcode) {
    if ((!this.token && (!this.key || !this.secret)) || !barcode) return null;

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=5`,
        {
          headers: this.getHeaders(),
        },
      );

      await this.handleResponse(response);
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error("Barcode search failed:", e);
      return null;
    }
  }

  extractReleaseIdFromUrl(value) {
    if (!value) return null;

    const raw = String(value).trim();
    const directIdMatch = raw.match(/^\d+$/);
    if (directIdMatch) return Number.parseInt(directIdMatch[0], 10);

    try {
      const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
      const parsed = new URL(normalized);
      if (!parsed.hostname.toLowerCase().includes("discogs.com")) {
        return null;
      }

      const pathMatch = parsed.pathname.match(/\/release\/(\d+)/i);
      if (pathMatch) {
        return Number.parseInt(pathMatch[1], 10);
      }
    } catch (_error) {
      return null;
    }

    return null;
  }

  getReleasePhotoSignals(release) {
    if (!release) return [];

    const signals = new Set();
    const pushSignal = (value) => {
      if (!value) return;
      const token = this.normalizeText(value);
      if (token) signals.add(token);
    };

    pushSignal(release.title);
    (release.artists || []).forEach((artist) => pushSignal(artist?.name));
    (release.labels || []).forEach((label) => pushSignal(label?.name));
    (release.images || []).forEach((image) => {
      pushSignal(image?.type);
    });

    return Array.from(signals);
  }

  scoreUploadedPhotoHints(uploadedPhotoHints, release) {
    if (!Array.isArray(uploadedPhotoHints) || !uploadedPhotoHints.length) {
      return { score: 0, evidence: [] };
    }

    const releaseSignals = this.getReleasePhotoSignals(release);
    if (!releaseSignals.length) return { score: 0, evidence: [] };

    const evidence = [];
    let score = 0;
    uploadedPhotoHints.forEach((hint) => {
      const normalizedHint = this.normalizeText(hint);
      if (!normalizedHint || normalizedHint.length < 3) return;
      const matchedSignal = releaseSignals.find(
        (signal) =>
          signal.includes(normalizedHint) || normalizedHint.includes(signal),
      );
      if (matchedSignal) {
        score += 5;
        evidence.push(`Photo hint matched release metadata (${hint})`);
      }
    });

    return { score, evidence };
  }

  normalizeText(value) {
    if (!value) return "";
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  normalizeDigits(value) {
    if (!value) return "";
    return String(value).replace(/[^0-9]/g, "");
  }

  extractIdentifierValues(identifiers, typeMatchers) {
    if (!Array.isArray(identifiers)) return [];
    const matchers = typeMatchers.map((t) => t.toLowerCase());
    return identifiers
      .filter(
        (i) =>
          i?.type && matchers.some((m) => i.type.toLowerCase().includes(m)),
      )
      .map((i) => i.value)
      .filter(Boolean);
  }

  findBestMatchToken(haystackList, needle) {
    if (!needle || !Array.isArray(haystackList)) return null;
    const normNeedle = this.normalizeText(needle);
    if (!normNeedle) return null;
    return haystackList.find(
      (value) =>
        this.normalizeText(value).includes(normNeedle) ||
        normNeedle.includes(this.normalizeText(value)),
    );
  }

  matchBarcode(ocrBarcode, identifiers) {
    if (!ocrBarcode) return null;
    const ocrDigits = this.normalizeDigits(ocrBarcode);
    if (!ocrDigits) return null;
    const barcodeValues = this.extractIdentifierValues(identifiers, [
      "barcode",
    ]);
    for (const value of barcodeValues) {
      const candidateDigits = this.normalizeDigits(value);
      if (
        candidateDigits &&
        (candidateDigits === ocrDigits ||
          candidateDigits.includes(ocrDigits) ||
          ocrDigits.includes(candidateDigits))
      ) {
        return value;
      }
    }
    return null;
  }

  matchCatalogNumber(ocrCat, details) {
    if (!ocrCat || !details) return null;
    const ocrNorm = this.normalizeText(ocrCat);
    const labelCatNos =
      details.labels?.map((l) => l.catno).filter(Boolean) || [];
    const idCatNos = this.extractIdentifierValues(details.identifiers, [
      "catalog",
      "cat no",
      "catno",
    ]);
    const candidates = [...labelCatNos, ...idCatNos];
    return (
      candidates.find((cat) => this.normalizeText(cat) === ocrNorm) ||
      this.findBestMatchToken(candidates, ocrCat)
    );
  }

  matchMatrix(ocrMatrices, identifiers) {
    const matrixValues = this.extractIdentifierValues(identifiers, [
      "matrix",
      "runout",
    ]);
    if (!matrixValues.length) return null;
    const ocrList = (ocrMatrices || []).filter(Boolean);
    for (const ocrVal of ocrList) {
      const match = this.findBestMatchToken(matrixValues, ocrVal);
      if (match) return match;
    }
    return null;
  }

  matchNotes(ocrTokens, notes) {
    if (!notes || !ocrTokens?.length) return null;
    const normalizedNotes = this.normalizeText(notes);
    return (
      ocrTokens.find((token) => {
        const norm = this.normalizeText(token);
        return norm.length >= 4 && normalizedNotes.includes(norm);
      }) || null
    );
  }

  matchLabel(ocrLabel, details) {
    if (!ocrLabel || !details) return null;
    const labels = details.labels?.map((l) => l.name).filter(Boolean) || [];
    return this.findBestMatchToken(labels, ocrLabel);
  }

  matchRightsSociety(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, [
      "rights society",
      "rights",
    ]);
    return this.findBestMatchToken(values, ocrValue);
  }

  matchLabelCode(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, [
      "label code",
      "label",
    ]);
    return this.findBestMatchToken(values, ocrValue);
  }

  matchPressingPlant(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, [
      "pressing plant",
      "pressing",
    ]);
    return this.findBestMatchToken(values, ocrValue);
  }

  scoreReleaseMatch(ocrData, details) {
    let score = 0;
    const evidence = [];

    const identifiers = details?.identifiers || [];
    const barcodeMatch = this.matchBarcode(ocrData.barcode, identifiers);
    if (barcodeMatch) {
      score += 40;
      evidence.push(`Barcode match (${barcodeMatch})`);
    }

    const catalogMatch = this.matchCatalogNumber(
      ocrData.catalogueNumber,
      details,
    );
    if (catalogMatch) {
      score += 25;
      evidence.push(`Catalog # match (${catalogMatch})`);
    }

    const matrixCandidates = [
      ocrData.matrixRunoutA,
      ocrData.matrixRunoutB,
      ocrData.pressingInfo,
      ...(ocrData.identifierStrings || []),
    ];
    const matrixMatch = this.matchMatrix(matrixCandidates, identifiers);
    if (matrixMatch) {
      score += 20;
      evidence.push(`Matrix/Runout match (${matrixMatch})`);
    }

    const labelCodeMatch = this.matchLabelCode(ocrData.labelCode, identifiers);
    if (labelCodeMatch) {
      score += 10;
      evidence.push(`Label code match (${labelCodeMatch})`);
    }

    const rightsMatch = this.matchRightsSociety(
      ocrData.rightsSociety,
      identifiers,
    );
    if (rightsMatch) {
      score += 8;
      evidence.push(`Rights society match (${rightsMatch})`);
    }

    const pressingPlantMatch = this.matchPressingPlant(
      ocrData.pressingPlant,
      identifiers,
    );
    if (pressingPlantMatch) {
      score += 8;
      evidence.push(`Pressing plant match (${pressingPlantMatch})`);
    }

    const labelMatch = this.matchLabel(ocrData.label, details);
    if (labelMatch) {
      score += 10;
      evidence.push(`Label match (${labelMatch})`);
    }

    if (
      ocrData.country &&
      details?.country &&
      this.normalizeText(ocrData.country) ===
        this.normalizeText(details.country)
    ) {
      score += 5;
      evidence.push(`Country match (${details.country})`);
    }

    if (
      ocrData.year &&
      details?.year &&
      String(ocrData.year) === String(details.year)
    ) {
      score += 5;
      evidence.push(`Year match (${details.year})`);
    }

    if (ocrData.format && details?.formats?.length) {
      const formats = details.formats
        .map((f) => f.name || f.text)
        .filter(Boolean);
      const formatMatch = this.findBestMatchToken(formats, ocrData.format);
      if (formatMatch) {
        score += 5;
        evidence.push(`Format match (${formatMatch})`);
      }
    }

    const notesMatch = this.matchNotes(matrixCandidates, details?.notes || "");
    if (notesMatch) {
      score += 6;
      evidence.push(`Notes mention (${notesMatch})`);
    }

    let confidence = "low";
    if (score >= 60 || (barcodeMatch && (catalogMatch || matrixMatch))) {
      confidence = "high";
    } else if (score >= 35) {
      confidence = "medium";
    }

    return { score, evidence, confidence };
  }

  async matchReleaseFromOcr(ocrData, limit = 5) {
    if (
      (!this.token && (!this.key || !this.secret)) ||
      !ocrData?.artist ||
      !ocrData?.title
    )
      return null;

    const candidates = await this.searchReleaseCandidates(
      ocrData.artist,
      ocrData.title,
      ocrData.catalogueNumber,
      limit,
    );
    if (!candidates.length) return null;

    let bestMatch = null;

    for (const candidate of candidates) {
      const details = await this.getReleaseDetails(candidate.id);
      if (!details) continue;

      const scored = this.scoreReleaseMatch(ocrData, details);
      const matchInfo = {
        release: details,
        score: scored.score,
        evidence: scored.evidence,
        confidence: scored.confidence,
      };

      if (!bestMatch || matchInfo.score > bestMatch.score) {
        bestMatch = matchInfo;
      }
    }

    return bestMatch;
  }

  async resolveReleaseCorrection(reference, ocrData = {}, uploadedPhotoHints = []) {
    const releaseId = this.extractReleaseIdFromUrl(reference);
    if (!releaseId) return null;

    const release = await this.getReleaseDetails(releaseId);
    if (!release) return null;

    const scored = this.scoreReleaseMatch(ocrData || {}, release);
    const photoScored = this.scoreUploadedPhotoHints(uploadedPhotoHints, release);
    const totalScore = scored.score + photoScored.score;
    const combinedEvidence = [...scored.evidence, ...photoScored.evidence];

    // Start from the confidence determined by scoreReleaseMatch (which includes
    // special handling such as barcode + catalog/matrix combinations), and only
    // upgrade it based on the combined totalScore.
    let confidence = scored.confidence || "low";
    if (confidence !== "high") {
      if (totalScore >= 60) {
        confidence = "high";
      } else if (totalScore >= 35 && confidence !== "medium") {
        confidence = "medium";
      }
    }

    return {
      release,
      score: totalScore,
      confidence,
      evidence: combinedEvidence,
      source: "manual_discogs_url",
    };
  }
}

window.discogsService = new DiscogsService();
