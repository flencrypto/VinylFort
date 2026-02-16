class DiscogsService {
  constructor() {
    this.key = localStorage.getItem('discogs_key');
    this.secret = localStorage.getItem('discogs_secret');
    this.baseUrl = 'https://api.discogs.com';
    this.userAgent = 'VinylVaultPro/1.0';
  }

  updateCredentials(key, secret) {
    this.key = key;
    this.secret = secret;
  }

  async testConnection() {
    if (!this.key || !this.secret) {
      throw new Error('Discogs API credentials not configured');
    }

    const response = await fetch(`${this.baseUrl}/database/search?q=test&per_page=1&key=${this.key}&secret=${this.secret}`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Discogs API connection failed');
    }

    return true;
  }

  async searchRelease(artist, title, catNo) {
    if (!this.key || !this.secret) return null;

    let query = '';
    if (artist) query += artist;
    if (title) query += (query ? ' ' : '') + title;
    if (catNo) query += (query ? ' ' : '') + catNo;

    const response = await fetch(
      `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=5&key=${this.key}&secret=${this.secret}`, 
      {
        headers: {
          'User-Agent': this.userAgent
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.results?.[0] || null;
  }

  async searchReleaseCandidates(artist, title, catNo, limit = 5) {
    if (!this.key || !this.secret) return [];

    let query = '';
    if (artist) query += artist;
    if (title) query += (query ? ' ' : '') + title;
    if (catNo) query += (query ? ' ' : '') + catNo;

    const response = await fetch(
      `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=${limit}&key=${this.key}&secret=${this.secret}`,
      {
        headers: {
          'User-Agent': this.userAgent
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.results || [];
  }
  async getReleaseDetails(releaseId) {
    if (!this.key || !this.secret) return null;

    const response = await fetch(`${this.baseUrl}/releases/${releaseId}?key=${this.key}&secret=${this.secret}`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) return null;

    return await response.json();
  }

  async fetchTracklist(releaseId) {
    if (!this.key || !this.secret || !releaseId) return null;
    
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
        num_for_sale: details.num_for_sale
      };
    } catch (e) {
      console.error('Failed to fetch tracklist:', e);
      return null;
    }
  }

  async fetchMasterReleaseDetails(masterId) {
    if (!this.key || !this.secret || !masterId) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/masters/${masterId}?key=${this.key}&secret=${this.secret}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch master details:', e);
      return null;
    }
  }

  async searchByBarcode(barcode) {
    if (!this.key || !this.secret || !barcode) return null;
    
    try {
      const response = await fetch(
        `${this.baseUrl}/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=5&key=${this.key}&secret=${this.secret}`,
        {
          headers: {
            'User-Agent': this.userAgent
          }
        }
      );
      
      if (!response.ok) return null;
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error('Barcode search failed:', e);
      return null;
    }
  }

  normalizeText(value) {
    if (!value) return '';
    return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  normalizeDigits(value) {
    if (!value) return '';
    return String(value).replace(/[^0-9]/g, '');
  }

  extractIdentifierValues(identifiers, typeMatchers) {
    if (!Array.isArray(identifiers)) return [];
    const matchers = typeMatchers.map(t => t.toLowerCase());
    return identifiers
      .filter(i => i?.type && matchers.some(m => i.type.toLowerCase().includes(m)))
      .map(i => i.value)
      .filter(Boolean);
  }

  findBestMatchToken(haystackList, needle) {
    if (!needle || !Array.isArray(haystackList)) return null;
    const normNeedle = this.normalizeText(needle);
    if (!normNeedle) return null;
    return haystackList.find(value => this.normalizeText(value).includes(normNeedle) || normNeedle.includes(this.normalizeText(value)));
  }

  matchBarcode(ocrBarcode, identifiers) {
    if (!ocrBarcode) return null;
    const ocrDigits = this.normalizeDigits(ocrBarcode);
    if (!ocrDigits) return null;
    const barcodeValues = this.extractIdentifierValues(identifiers, ['barcode']);
    for (const value of barcodeValues) {
      const candidateDigits = this.normalizeDigits(value);
      if (candidateDigits && (candidateDigits === ocrDigits || candidateDigits.includes(ocrDigits) || ocrDigits.includes(candidateDigits))) {
        return value;
      }
    }
    return null;
  }

  matchCatalogNumber(ocrCat, details) {
    if (!ocrCat || !details) return null;
    const ocrNorm = this.normalizeText(ocrCat);
    const labelCatNos = details.labels?.map(l => l.catno).filter(Boolean) || [];
    const idCatNos = this.extractIdentifierValues(details.identifiers, ['catalog', 'cat no', 'catno']);
    const candidates = [...labelCatNos, ...idCatNos];
    return candidates.find(cat => this.normalizeText(cat) === ocrNorm) || this.findBestMatchToken(candidates, ocrCat);
  }

  matchMatrix(ocrMatrices, identifiers) {
    const matrixValues = this.extractIdentifierValues(identifiers, ['matrix', 'runout']);
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
    return ocrTokens.find(token => {
      const norm = this.normalizeText(token);
      return norm.length >= 4 && normalizedNotes.includes(norm);
    }) || null;
  }

  matchLabel(ocrLabel, details) {
    if (!ocrLabel || !details) return null;
    const labels = details.labels?.map(l => l.name).filter(Boolean) || [];
    return this.findBestMatchToken(labels, ocrLabel);
  }

  matchRightsSociety(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, ['rights society', 'rights']);
    return this.findBestMatchToken(values, ocrValue);
  }

  matchLabelCode(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, ['label code', 'label']);
    return this.findBestMatchToken(values, ocrValue);
  }

  matchPressingPlant(ocrValue, identifiers) {
    if (!ocrValue) return null;
    const values = this.extractIdentifierValues(identifiers, ['pressing plant', 'pressing']);
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

    const catalogMatch = this.matchCatalogNumber(ocrData.catalogueNumber, details);
    if (catalogMatch) {
      score += 25;
      evidence.push(`Catalog # match (${catalogMatch})`);
    }

    const matrixCandidates = [
      ocrData.matrixRunoutA,
      ocrData.matrixRunoutB,
      ocrData.pressingInfo,
      ...(ocrData.identifierStrings || [])
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

    const rightsMatch = this.matchRightsSociety(ocrData.rightsSociety, identifiers);
    if (rightsMatch) {
      score += 8;
      evidence.push(`Rights society match (${rightsMatch})`);
    }

    const pressingPlantMatch = this.matchPressingPlant(ocrData.pressingPlant, identifiers);
    if (pressingPlantMatch) {
      score += 8;
      evidence.push(`Pressing plant match (${pressingPlantMatch})`);
    }

    const labelMatch = this.matchLabel(ocrData.label, details);
    if (labelMatch) {
      score += 10;
      evidence.push(`Label match (${labelMatch})`);
    }

    if (ocrData.country && details?.country && this.normalizeText(ocrData.country) === this.normalizeText(details.country)) {
      score += 5;
      evidence.push(`Country match (${details.country})`);
    }

    if (ocrData.year && details?.year && String(ocrData.year) === String(details.year)) {
      score += 5;
      evidence.push(`Year match (${details.year})`);
    }

    if (ocrData.format && details?.formats?.length) {
      const formats = details.formats.map(f => f.name || f.text).filter(Boolean);
      const formatMatch = this.findBestMatchToken(formats, ocrData.format);
      if (formatMatch) {
        score += 5;
        evidence.push(`Format match (${formatMatch})`);
      }
    }

    const notesMatch = this.matchNotes(matrixCandidates, details?.notes || '');
    if (notesMatch) {
      score += 6;
      evidence.push(`Notes mention (${notesMatch})`);
    }

    let confidence = 'low';
    if (score >= 60 || (barcodeMatch && (catalogMatch || matrixMatch))) {
      confidence = 'high';
    } else if (score >= 35) {
      confidence = 'medium';
    }

    return { score, evidence, confidence };
  }

  async matchReleaseFromOcr(ocrData, limit = 5) {
    if (!this.key || !this.secret || !ocrData?.artist || !ocrData?.title) return null;

    const candidates = await this.searchReleaseCandidates(ocrData.artist, ocrData.title, ocrData.catalogueNumber, limit);
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
        confidence: scored.confidence
      };

      if (!bestMatch || matchInfo.score > bestMatch.score) {
        bestMatch = matchInfo;
      }
    }

    return bestMatch;
  }
}

window.discogsService = new DiscogsService();
