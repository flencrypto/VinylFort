// PriceCharting API Service for comprehensive market data
class PriceChartingService {
  constructor() {
    this.baseUrl = 'https://www.pricecharting.com/api';
    // Note: PriceCharting requires an API key for full access
    // Free tier allows limited requests per day
  }

  async searchGame(title, console) {
    try {
      const response = await fetch(`${this.baseUrl}/product?t=${encodeURIComponent(title)}&c=${encodeURIComponent(console)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error('PriceCharting search failed:', e);
      return null;
    }
  }

  // Fallback: Use web scraping approach via CORS proxy for vinyl data
  async searchVinyl(artist, title, catalogNumber) {
    // Build search query
    const query = encodeURIComponent(`${artist} ${title} ${catalogNumber || ''} vinyl`.trim());
    
    try {
      // Try multiple data sources in parallel
      const [discogsData, ebayData, musicBrainzData] = await Promise.allSettled([
        this.fetchDiscogsMarketData(artist, title, catalogNumber),
        this.fetchEbaySoldData(artist, title, catalogNumber),
        this.fetchMusicBrainzData(artist, title, catalogNumber)
      ]);

      return this.aggregateMarketData({
        discogs: discogsData.status === 'fulfilled' ? discogsData.value : null,
        ebay: ebayData.status === 'fulfilled' ? ebayData.value : null,
        musicBrainz: musicBrainzData.status === 'fulfilled' ? musicBrainzData.value : null
      });
    } catch (e) {
      console.error('Market data aggregation failed:', e);
      return null;
    }
  }

  async fetchDiscogsMarketData(artist, title, catalogNumber) {
    if (!window.discogsService?.key) return null;

    try {
      // Search for release
      let query = `${artist} ${title}`;
      if (catalogNumber) query += ` ${catalogNumber}`;
      
      const searchResponse = await fetch(
        `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=10`,
        {
          headers: {
            'Authorization': `Discogs key=${window.discogsService.key}, secret=${window.discogsService.secret}`,
            'User-Agent': 'VinylVaultPro/1.0'
          }
        }
      );

      if (!searchResponse.ok) return null;
      const searchData = await searchResponse.json();

      if (!searchData.results?.length) return null;

      // Get detailed info for top match
      const topMatch = searchData.results[0];
      const detailsResponse = await fetch(
        `https://api.discogs.com/releases/${topMatch.id}`,
        {
          headers: {
            'Authorization': `Discogs key=${window.discogsService.key}, secret=${window.discogsService.secret}`,
            'User-Agent': 'VinylVaultPro/1.0'
          }
        }
      );

      if (!detailsResponse.ok) return null;
      const details = await detailsResponse.json();

      // Fetch marketplace listings for pricing
      const marketplaceResponse = await fetch(
        `https://api.discogs.com/marketplace/listings?release_id=${topMatch.id}&per_page=20&sort=price&sort_order=asc`,
        {
          headers: {
            'Authorization': `Discogs key=${window.discogsService.key}, secret=${window.discogsService.secret}`,
            'User-Agent': 'VinylVaultPro/1.0'
          }
        }
      );

      let marketplaceData = null;
      if (marketplaceResponse.ok) {
        marketplaceData = await marketplaceResponse.json();
      }

      // Calculate statistics from listings
      const prices = marketplaceData?.listings
        ?.filter(l => l.original_price?.value)
        ?.map(l => parseFloat(l.original_price.value)) || [];

      return {
        source: 'discogs',
        releaseId: topMatch.id,
        uri: details.uri,
        title: details.title,
        year: details.year,
        country: details.country,
        label: details.labels?.[0]?.name,
        format: details.formats?.[0]?.name,
        genre: details.genres?.[0],
        style: details.styles?.[0],
        tracklist: details.tracklist?.map(t => ({ position: t.position, title: t.title, duration: t.duration })),
        images: details.images?.map(i => ({ uri: i.uri, type: i.type })),
        community: {
          have: details.community?.have,
          want: details.community?.want,
          rating: details.community?.rating?.average,
          votes: details.community?.rating?.count
        },
        marketplace: {
          lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
          highestPrice: prices.length > 0 ? Math.max(...prices) : null,
          medianPrice: prices.length > 0 ? this.calculateMedian(prices) : null,
          averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
          listingCount: prices.length,
          priceDistribution: this.calculateDistribution(prices)
        },
        identifiers: details.identifiers?.map(i => ({ type: i.type, value: i.value })),
        companies: details.companies?.map(c => ({ name: c.name, entity_type: c.entity_type_name }))
      };
    } catch (e) {
      console.error('Discogs market data fetch failed:', e);
      return null;
    }
  }

  async fetchEbaySoldData(artist, title, catalogNumber) {
    // Since we can't directly scrape eBay without CORS issues,
    // we'll use a simulated approach based on Discogs data patterns
    // In production, you'd use eBay's Partner Network API or Terapeak
    
    try {
      // Check if we have cached eBay data in localStorage
      const cacheKey = `ebay_${artist}_${title}_${catalogNumber}`.replace(/[^a-z0-9]/gi, '_');
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache valid for 24 hours
        if (Date.now() - parsed.timestamp < 86400000) {
          return parsed.data;
        }
      }

      // Return placeholder structure - real implementation would need eBay API
      return {
        source: 'ebay_estimated',
        note: 'Connect eBay API for real sold data',
        estimatedSoldRange: { low: null, high: null, median: null }
      };
    } catch (e) {
      return null;
    }
  }

  async fetchMusicBrainzData(artist, title, catalogNumber) {
    try {
      const query = encodeURIComponent(`artist:${artist} AND recording:${title}`);
      const response = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`,
        {
          headers: {
            'User-Agent': 'VinylVaultPro/1.0 (contact@example.com)'
          }
        }
      );

      if (!response.ok) return null;
      const data = await response.json();

      if (!data.releases?.length) return null;

      const release = data.releases[0];
      
      // Fetch detailed release info
      const detailResponse = await fetch(
        `https://musicbrainz.org/ws/2/release/${release.id}?inc=artists+labels+recordings&fmt=json`,
        {
          headers: {
            'User-Agent': 'VinylVaultPro/1.0 (contact@example.com)'
          }
        }
      );

      let details = null;
      if (detailResponse.ok) {
        details = await detailResponse.json();
      }

      return {
        source: 'musicbrainz',
        id: release.id,
        title: release.title,
        date: release.date,
        country: release.country,
        barcode: release.barcode,
        status: release.status,
        quality: release.quality,
        packaging: release.packaging,
        label: release['label-info']?.[0]?.label?.name,
        catalogNumber: release['label-info']?.[0]?.['catalog-number'],
        trackCount: details?.media?.[0]?.tracks?.length,
        formats: details?.media?.map(m => m.format)
      };
    } catch (e) {
      console.error('MusicBrainz fetch failed:', e);
      return null;
    }
  }

  aggregateMarketData(sources) {
    const result = {
      sources: [],
      confidence: 'low',
      unified: {}
    };

    // Aggregate basic info with priority: Discogs > MusicBrainz > eBay
    if (sources.discogs) {
      result.sources.push('discogs');
      result.unified = {
        ...result.unified,
        artist: sources.discogs.title?.split(' - ')[0],
        title: sources.discogs.title?.split(' - ')[1] || sources.discogs.title,
        year: sources.discogs.year,
        country: sources.discogs.country,
        label: sources.discogs.label,
        format: sources.discogs.format,
        genre: sources.discogs.genre,
        style: sources.discogs.style,
        tracklist: sources.discogs.tracklist,
        images: sources.discogs.images,
        communityData: sources.discogs.community,
        identifiers: sources.discogs.identifiers
      };

      // Pricing from Discogs marketplace
      if (sources.discogs.marketplace?.listingCount > 0) {
        result.pricing = {
          source: 'discogs_marketplace',
          currency: 'USD', // Discogs uses USD by default
          currentListings: {
            lowest: sources.discogs.marketplace.lowestPrice,
            highest: sources.discogs.marketplace.highestPrice,
            median: sources.discogs.marketplace.medianPrice,
            average: sources.discogs.marketplace.averagePrice,
            count: sources.discogs.marketplace.listingCount
          },
          distribution: sources.discogs.marketplace.priceDistribution
        };

        // Estimate sold prices (typically 15-25% below asking)
        const discountFactor = 0.8; // Assume 20% negotiation
        result.pricing.estimatedSold = {
          low: result.pricing.currentListings.lowest * discountFactor,
          median: result.pricing.currentListings.median * discountFactor,
          high: result.pricing.currentListings.highest * discountFactor
        };
      }
    }

    if (sources.musicBrainz) {
      result.sources.push('musicbrainz');
      // Fill gaps with MusicBrainz data
      if (!result.unified.barcode && sources.musicBrainz.barcode) {
        result.unified.barcode = sources.musicBrainz.barcode;
      }
      if (!result.unified.catalogNumber && sources.musicBrainz.catalogNumber) {
        result.unified.catalogNumber = sources.musicBrainz.catalogNumber;
      }
    }

    if (sources.ebay) {
      result.sources.push('ebay');
    }

    // Calculate confidence based on data richness
    if (result.sources.includes('discogs') && result.pricing?.currentListings?.count > 5) {
      result.confidence = 'high';
    } else if (result.sources.includes('discogs')) {
      result.confidence = 'medium';
    }

    return result;
  }

  calculateMedian(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateDistribution(prices) {
    if (!prices.length) return null;
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    if (range === 0) return { singlePrice: min };
    
    // Create 5 buckets
    const buckets = [];
    for (let i = 0; i < 5; i++) {
      const bucketMin = min + (range * i / 5);
      const bucketMax = min + (range * (i + 1) / 5);
      const count = prices.filter(p => p >= bucketMin && p < bucketMax).length;
      buckets.push({
        range: `£${bucketMin.toFixed(2)} - £${bucketMax.toFixed(2)}`,
        count,
        percentage: (count / prices.length * 100).toFixed(1)
      });
    }
    
    return { min, max, range, buckets };
  }

  // Advanced valuation algorithm
  calculateValuation(recordData, marketData, userCondition) {
    if (!marketData?.pricing?.estimatedSold) {
      return null;
    }

    const baseValue = marketData.pricing.estimatedSold.median;
    
    // Condition multipliers (industry standard approximations)
    const conditionMultipliers = {
      'M': 1.5,    // Mint - sealed or perfect
      'NM': 1.3,   // Near Mint - played once or twice
      'VG+': 1.0,  // Very Good Plus - our baseline
      'VG': 0.7,   // Very Good - visible wear, plays well
      'G+': 0.5,   // Good Plus - significant wear
      'G': 0.35,   // Good - major defects
      'F': 0.2,    // Fair - barely playable
      'P': 0.1     // Poor - mostly for rare items only
    };

    const vinylMult = conditionMultipliers[userCondition.vinyl] || 0.7;
    const sleeveMult = conditionMultipliers[userCondition.sleeve] || 0.7;
    
    // Weighted condition adjustment (vinyl matters more than sleeve)
    const conditionAdjust = (vinylMult * 0.65) + (sleeveMult * 0.35);
    
    // Demand factor from community data
    let demandFactor = 1.0;
    if (marketData.unified.communityData) {
      const have = marketData.unified.communityData.have || 1;
      const want = marketData.unified.communityData.want || 0;
      const ratio = want / have;
      
      if (ratio > 2) demandFactor = 1.3;      // High demand
      else if (ratio > 1) demandFactor = 1.15; // Above average
      else if (ratio < 0.3) demandFactor = 0.85; // Low demand
    }

    // Rarity estimation based on listing count
    let rarityFactor = 1.0;
    const listingCount = marketData.pricing?.currentListings?.count;
    if (listingCount !== undefined) {
      if (listingCount < 3) rarityFactor = 1.4;      // Very rare
      else if (listingCount < 10) rarityFactor = 1.2; // Uncommon
      else if (listingCount > 50) rarityFactor = 0.9; // Common
    }

    // Year premium for vintage
    let vintageFactor = 1.0;
    const year = marketData.unified.year;
    if (year && year < 1980) vintageFactor = 1.2;
    else if (year && year < 1990) vintageFactor = 1.1;

    // Calculate final valuation
    const adjustedValue = baseValue * conditionAdjust * demandFactor * rarityFactor * vintageFactor;
    
    // Calculate confidence interval
    const volatility = marketData.pricing.currentListings 
      ? (marketData.pricing.currentListings.highest - marketData.pricing.currentListings.lowest) 
        / marketData.pricing.currentListings.median 
      : 0.5;
    
    const confidenceInterval = {
      low: adjustedValue * (1 - volatility * 0.5),
      high: adjustedValue * (1 + volatility * 0.5)
    };

    return {
      estimatedValue: Math.round(adjustedValue),
      confidenceInterval: {
        low: Math.round(confidenceInterval.low),
        high: Math.round(confidenceInterval.high)
      },
      factors: {
        condition: conditionAdjust,
        demand: demandFactor,
        rarity: rarityFactor,
        vintage: vintageFactor
      },
      methodology: {
        baseSource: marketData.pricing.source,
        baseValue: Math.round(baseValue),
        confidence: marketData.confidence
      }
    };
  }
}

window.priceChartingService = new PriceChartingService();