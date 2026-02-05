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

    const response = await fetch(`${this.baseUrl}/database/search?q=test&per_page=1`, {
      headers: {
        'Authorization': `Discogs key=${this.key}, secret=${this.secret}`,
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
      `${this.baseUrl}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=5`, 
      {
        headers: {
          'Authorization': `Discogs key=${this.key}, secret=${this.secret}`,
          'User-Agent': this.userAgent
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.results?.[0] || null;
  }
  async getReleaseDetails(releaseId) {
    if (!this.key || !this.secret) return null;

    const response = await fetch(`${this.baseUrl}/releases/${releaseId}`, {
      headers: {
        'Authorization': `Discogs key=${this.key}, secret=${this.secret}`,
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
      const response = await fetch(`${this.baseUrl}/masters/${masterId}`, {
        headers: {
          'Authorization': `Discogs key=${this.key}, secret=${this.secret}`,
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
        `${this.baseUrl}/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=5`,
        {
          headers: {
            'Authorization': `Discogs key=${this.key}, secret=${this.secret}`,
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
}

window.discogsService = new DiscogsService();