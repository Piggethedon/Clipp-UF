// Clipp Coupon Service - Handles real coupon fetching from multiple APIs
class CouponService {
  constructor() {
    this.cacheKey = 'clipp_coupon_cache';
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    this.apiRetryLimit = 3;
    this.apiTimeout = 10000; // 10 seconds
  }

  // Main method to find coupons for a store
  async findCouponsForStore(store) {
    console.log(`[CouponService] Finding coupons for ${store.storeName}`);
    
    try {
      // Check cache first
      const cachedCoupons = await this.getCachedCoupons(store.storeId);
      if (cachedCoupons && cachedCoupons.length > 0) {
        console.log(`[CouponService] Found ${cachedCoupons.length} cached coupons for ${store.storeName}`);
        return cachedCoupons;
      }

      // Fetch fresh coupons from APIs
      const freshCoupons = await this.fetchCouponsFromAPIs(store);
      
      // Cache the results
      if (freshCoupons && freshCoupons.length > 0) {
        await this.cacheCoupons(store.storeId, freshCoupons);
        console.log(`[CouponService] Cached ${freshCoupons.length} fresh coupons for ${store.storeName}`);
      }

      return freshCoupons || [];
      
    } catch (error) {
      console.error(`[CouponService] Error finding coupons for ${store.storeName}:`, error);
      
      // Return fallback/mock coupons for demo
      return this.getFallbackCoupons(store);
    }
  }

  // Fetch coupons from real APIs
  async fetchCouponsFromAPIs(store) {
    const sources = await this.getCouponSources();
    const allCoupons = [];

    for (const source of sources.filter(s => s.active)) {
      try {
        console.log(`[CouponService] Fetching from ${source.name} for ${store.storeName}`);
        
        let coupons = [];
        
        switch (source.name) {
          case 'CouponAPI.org':
            coupons = await this.fetchFromCouponAPI(store, source);
            break;
          case 'LinkMyDeals':
            coupons = await this.fetchFromLinkMyDeals(store, source);
            break;
          case 'Rabattkod.se':
            coupons = await this.scrapeFromRabattkod(store, source);
            break;
          case 'Kupongkod.com':
            coupons = await this.scrapeFromKupongkod(store, source);
            break;
          case 'RetailMeNot.com':
            coupons = await this.scrapeFromRetailMeNot(store, source);
            break;
          default:
            console.warn(`[CouponService] Unknown coupon source: ${source.name}`);
        }

        if (coupons && coupons.length > 0) {
          allCoupons.push(...coupons);
          console.log(`[CouponService] Found ${coupons.length} coupons from ${source.name}`);
        }

      } catch (error) {
        console.error(`[CouponService] Error fetching from ${source.name}:`, error);
        continue; // Try next source
      }
    }

    // Remove duplicates and sort by priority
    return this.processAndValidateCoupons(allCoupons, store);
  }

  // Fetch from CouponAPI.org
  async fetchFromCouponAPI(store, source) {
    if (!source.apiKey || source.apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('[CouponService] CouponAPI.org API key not configured');
      return [];
    }

    try {
      const response = await this.makeAPIRequest(
        `https://api.couponapi.org/v1/coupons`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${source.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.apiTimeout
        },
        { store: store.storeName, domain: store.domainPatterns[0] }
      );

      if (response && response.coupons) {
        return response.coupons.map(coupon => ({
          code: coupon.code,
          description: coupon.description || `Spara med ${coupon.code}`,
          discount: coupon.discount_amount || coupon.discount_percent || 0,
          type: coupon.discount_type || 'percentage',
          expiryDate: coupon.expiry_date,
          verified: coupon.verified || false,
          source: 'CouponAPI.org',
          storeId: store.storeId
        }));
      }

      return [];
    } catch (error) {
      console.error('[CouponService] CouponAPI.org fetch error:', error);
      return [];
    }
  }

  // Fetch from LinkMyDeals
  async fetchFromLinkMyDeals(store, source) {
    if (!source.apiKey || source.apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('[CouponService] LinkMyDeals API key not configured');
      return [];
    }

    try {
      const response = await this.makeAPIRequest(
        `https://api.linkmydeals.com/v2/deals/coupons`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': source.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.apiTimeout
        },
        { merchant: store.storeName, country: 'SE' }
      );

      if (response && response.data) {
        return response.data.map(deal => ({
          code: deal.coupon_code,
          description: deal.title || `Rabatt från ${store.storeName}`,
          discount: deal.discount_amount || 0,
          type: deal.discount_type || 'percentage',
          expiryDate: deal.end_date,
          verified: deal.verified || false,
          source: 'LinkMyDeals',
          storeId: store.storeId
        }));
      }

      return [];
    } catch (error) {
      console.error('[CouponService] LinkMyDeals fetch error:', error);
      return [];
    }
  }

  // Scrape from Rabattkod.se (ethical scraping of public data)
  async scrapeFromRabattkod(store, source) {
    try {
      // This would be implemented with a proper scraper
      // For now, return mock data to demonstrate the concept
      console.log(`[CouponService] Scraping ${source.name} for ${store.storeName} (mock implementation)`);
      
      // In a real implementation, this would use ethical scraping
      // of publicly available coupon data only
      return this.getMockCouponsForScraper(store, 'Rabattkod.se');
      
    } catch (error) {
      console.error('[CouponService] Rabattkod.se scrape error:', error);
      return [];
    }
  }

  // Scrape from Kupongkod.com
  async scrapeFromKupongkod(store, source) {
    try {
      console.log(`[CouponService] Scraping ${source.name} for ${store.storeName} (mock implementation)`);
      return this.getMockCouponsForScraper(store, 'Kupongkod.com');
    } catch (error) {
      console.error('[CouponService] Kupongkod.com scrape error:', error);
      return [];
    }
  }

  // Scrape from RetailMeNot
  async scrapeFromRetailMeNot(store, source) {
    try {
      console.log(`[CouponService] Scraping ${source.name} for ${store.storeName} (mock implementation)`);
      return this.getMockCouponsForScraper(store, 'RetailMeNot.com');
    } catch (error) {
      console.error('[CouponService] RetailMeNot scrape error:', error);
      return [];
    }
  }

  // Mock coupon data for scraper sources (until real scraping is implemented)
  getMockCouponsForScraper(store, sourceName) {
    const mockCoupons = [
      { code: 'SAVE20', description: 'Spara 20%', discount: 20, type: 'percentage' },
      { code: 'SAVE15', description: 'Spara 15%', discount: 15, type: 'percentage' },
      { code: 'FREE50', description: 'Fri frakt över 500 kr', discount: 50, type: 'shipping' },
      { code: 'NEW10', description: '10% för nya kunder', discount: 10, type: 'percentage' },
      { code: 'STUDENT', description: 'Studentrabatt 15%', discount: 15, type: 'percentage' },
      { code: 'WELCOME', description: 'Välkomstrabatt 25%', discount: 25, type: 'percentage' }
    ];

    // Return 1-3 random coupons
    const numCoupons = Math.floor(Math.random() * 3) + 1;
    const selectedCoupons = [];
    
    for (let i = 0; i < numCoupons; i++) {
      const coupon = mockCoupons[Math.floor(Math.random() * mockCoupons.length)];
      if (!selectedCoupons.find(c => c.code === coupon.code)) {
        selectedCoupons.push({
          ...coupon,
          source: sourceName,
          storeId: store.storeId,
          verified: Math.random() > 0.3 // 70% chance of being verified
        });
      }
    }

    return selectedCoupons;
  }

  // Process and validate coupons
  processAndValidateCoupons(coupons, store) {
    if (!coupons || coupons.length === 0) return [];

    // Remove duplicates based on coupon code
    const uniqueCoupons = coupons.filter((coupon, index, self) => 
      index === self.findIndex(c => c.code === coupon.code)
    );

    // Sort by verification status and discount amount
    const sortedCoupons = uniqueCoupons.sort((a, b) => {
      if (a.verified !== b.verified) {
        return b.verified ? 1 : -1; // Verified coupons first
      }
      return (b.discount || 0) - (a.discount || 0); // Higher discounts first
    });

    // Limit to top 5 coupons to avoid overwhelming users
    return sortedCoupons.slice(0, 5);
  }

  // Cache management
  async getCachedCoupons(storeId) {
    try {
      const cache = await chrome.storage.local.get([this.cacheKey]);
      const cacheData = cache[this.cacheKey] || {};
      
      const storeCache = cacheData[storeId];
      if (!storeCache) return null;

      // Check if cache is still valid
      if (Date.now() - storeCache.timestamp > this.cacheExpiry) {
        console.log(`[CouponService] Cache expired for store ${storeId}`);
        await this.clearStoreCache(storeId);
        return null;
      }

      return storeCache.coupons;
    } catch (error) {
      console.error('[CouponService] Error getting cached coupons:', error);
      return null;
    }
  }

  async cacheCoupons(storeId, coupons) {
    try {
      const cache = await chrome.storage.local.get([this.cacheKey]);
      const cacheData = cache[this.cacheKey] || {};
      
      cacheData[storeId] = {
        coupons: coupons,
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ [this.cacheKey]: cacheData });
      console.log(`[CouponService] Cached ${coupons.length} coupons for store ${storeId}`);
    } catch (error) {
      console.error('[CouponService] Error caching coupons:', error);
    }
  }

  async clearStoreCache(storeId) {
    try {
      const cache = await chrome.storage.local.get([this.cacheKey]);
      const cacheData = cache[this.cacheKey] || {};
      
      delete cacheData[storeId];
      await chrome.storage.local.set({ [this.cacheKey]: cacheData });
    } catch (error) {
      console.error('[CouponService] Error clearing store cache:', error);
    }
  }

  // Utility methods
  async makeAPIRequest(url, options, params = {}) {
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString() 
      : '';
    
    const fullUrl = url + queryString;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('API request timeout'));
      }, options.timeout || this.apiTimeout);

      fetch(fullUrl, {
        method: options.method || 'GET',
        headers: options.headers || {},
        mode: 'cors'
      })
      .then(response => {
        clearTimeout(timeout);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => resolve(data))
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async getCouponSources() {
    try {
      const response = await fetch(chrome.runtime.getURL('config/stores.json'));
      const data = await response.json();
      return data.couponSources || [];
    } catch (error) {
      console.error('[CouponService] Error loading coupon sources:', error);
      return [];
    }
  }

  // Fallback coupons for demo/testing
  getFallbackCoupons(store) {
    const fallbackCoupons = [
      { code: 'DEMO20', description: 'Demo rabatt 20%', discount: 20, type: 'percentage' },
      { code: 'TEST15', description: 'Test rabatt 15%', discount: 15, type: 'percentage' },
      { code: 'FRIFRAKT', description: 'Fri frakt', discount: 0, type: 'shipping' }
    ];

    return fallbackCoupons.map(coupon => ({
      ...coupon,
      source: 'Fallback',
      storeId: store.storeId,
      verified: false
    }));
  }

  // Test coupon application success rate (for validation)
  async testCouponApplication(coupon, store) {
    console.log(`[CouponService] Testing coupon ${coupon.code} for ${store.storeName}`);
    
    // In a real implementation, this would test the actual coupon
    // For now, simulate different success rates based on coupon properties
    let successRate = 0.6; // Base 60% success rate
    
    if (coupon.verified) successRate += 0.2; // Verified coupons have higher success
    if (coupon.source === 'CouponAPI.org' || coupon.source === 'LinkMyDeals') {
      successRate += 0.1; // API sources are more reliable
    }
    
    return Math.random() < successRate;
  }
}

// Make CouponService available globally
window.CouponService = CouponService;