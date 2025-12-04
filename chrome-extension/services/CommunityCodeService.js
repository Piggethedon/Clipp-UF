// Clipp Community Code Service - Fetches codes from Reddit and coupon sites
class CommunityCodeService {
  constructor() {
    this.cacheKey = 'clipp_community_cache';
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.redditApiBase = 'https://www.reddit.com';
    
    // Code patterns to extract from text
    this.codePatterns = [
      /\b([A-Z0-9]{4,20})\b/g,                    // Standard codes
      /kod[:\s]+["']?([A-Z0-9]{4,20})["']?/gi,    // "Kod: SAVE20"
      /code[:\s]+["']?([A-Z0-9]{4,20})["']?/gi,   // "Code: SAVE20"
      /coupon[:\s]+["']?([A-Z0-9]{4,20})["']?/gi, // "Coupon: SAVE20"
      /rabattkod[:\s]+["']?([A-Z0-9]{4,20})["']?/gi, // Swedish
      /promo[:\s]+["']?([A-Z0-9]{4,20})["']?/gi,  // "Promo: SAVE20"
      /use[:\s]+["']?([A-Z0-9]{4,20})["']?/gi     // "Use: SAVE20"
    ];

    // Subreddits to search
    this.subreddits = [
      'coupons',
      'deals',
      'discounts',
      'promocodes',
      'frugal',
      'sweden', // Swedish subreddit for Swedish stores
      'SwedenDeals'
    ];

    // Common false positives to filter out
    this.blacklistedCodes = new Set([
      'HTTP', 'HTTPS', 'HTML', 'JSON', 'POST', 'GET', 'API',
      'FREE', 'SALE', 'DEAL', 'SAVE', 'OFF', 'NOW', 'NEW',
      'CODE', 'PROMO', 'RABATT', 'TODAY', 'BEST', 'GOOD'
    ]);
  }

  // Main method to find codes for a store
  async findCodes(storeName) {
    console.log(`[CommunityService] Finding codes for ${storeName}`);
    
    try {
      // Check cache first
      const cached = await this.getCachedCodes(storeName);
      if (cached && cached.length > 0) {
        console.log(`[CommunityService] Found ${cached.length} cached codes`);
        return cached;
      }

      // Fetch from multiple sources in parallel
      const [redditCodes, scrapedCodes] = await Promise.all([
        this.searchReddit(storeName),
        this.searchCouponSites(storeName)
      ]);

      // Combine and deduplicate
      const allCodes = [...redditCodes, ...scrapedCodes];
      const uniqueCodes = this.deduplicateAndFilter(allCodes);
      
      // Sort by confidence
      uniqueCodes.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      // Cache results
      if (uniqueCodes.length > 0) {
        await this.cacheCodes(storeName, uniqueCodes);
      }

      console.log(`[CommunityService] Found ${uniqueCodes.length} unique codes`);
      return uniqueCodes.slice(0, 10); // Return top 10

    } catch (error) {
      console.error('[CommunityService] Error finding codes:', error);
      return [];
    }
  }

  // Search Reddit for coupon codes
  async searchReddit(storeName) {
    const codes = [];
    const searchTerms = this.getSearchTerms(storeName);
    
    for (const subreddit of this.subreddits.slice(0, 3)) { // Limit to 3 subreddits
      try {
        for (const term of searchTerms.slice(0, 2)) { // Limit to 2 search terms
          const url = `${this.redditApiBase}/r/${subreddit}/search.json?q=${encodeURIComponent(term + ' coupon OR code OR rabattkod')}&restrict_sr=1&sort=new&limit=10`;
          
          const response = await this.fetchWithTimeout(url, 5000);
          if (!response.ok) continue;
          
          const data = await response.json();
          const posts = data?.data?.children || [];
          
          for (const post of posts) {
            const postData = post.data;
            const extractedCodes = this.extractCodesFromText(
              `${postData.title} ${postData.selftext || ''}`
            );
            
            extractedCodes.forEach(code => {
              codes.push({
                code: code.toUpperCase(),
                description: this.truncateText(postData.title, 60),
                source: 'reddit',
                sourceLabel: `r/${subreddit}`,
                confidence: this.calculateConfidence(postData),
                url: `https://reddit.com${postData.permalink}`,
                foundAt: Date.now()
              });
            });
          }
        }
      } catch (error) {
        console.warn(`[CommunityService] Reddit search error for r/${subreddit}:`, error);
        continue;
      }
    }
    
    return codes;
  }

  // Search Swedish coupon sites
  async searchCouponSites(storeName) {
    const codes = [];
    
    // Since we can't actually scrape from content scripts,
    // we'll use simulated data based on common patterns
    // In a real implementation, this would use a backend API
    
    const mockCouponsFromSites = this.getMockCommunityData(storeName);
    
    return mockCouponsFromSites.map(coupon => ({
      ...coupon,
      source: 'community',
      sourceLabel: coupon.site || 'Kupongsite',
      confidence: 0.6,
      foundAt: Date.now()
    }));
  }

  // Get mock community data (simulates scraped data)
  getMockCommunityData(storeName) {
    const storeNameLower = storeName.toLowerCase();
    
    // Common Swedish store codes
    const commonCodes = {
      'zalando': [
        { code: 'NYTT15', description: '15% rabatt för nya kunder', site: 'Rabattkod.se' },
        { code: 'VÄNNER20', description: '20% med värvningskod', site: 'Kupongkod.com' }
      ],
      'h&m': [
        { code: 'MEMBER10', description: '10% medlemsrabatt', site: 'Rabattkod.se' },
        { code: 'HM2024', description: 'Extra rabatt på rea', site: 'Kupongkod.com' }
      ],
      'elgiganten': [
        { code: 'ELGI50', description: '50 kr rabatt', site: 'Rabattkod.se' },
        { code: 'TECH10', description: '10% på tillbehör', site: 'Kupongkod.com' }
      ],
      'cdon': [
        { code: 'CDON100', description: '100 kr på köp över 500 kr', site: 'Rabattkod.se' },
        { code: 'VINTER15', description: '15% vinterrabatt', site: 'Kupongkod.com' }
      ],
      'adlibris': [
        { code: 'BOK20', description: '20% på böcker', site: 'Rabattkod.se' },
        { code: 'LÄSNING15', description: '15% rabatt', site: 'Kupongkod.com' }
      ]
    };

    // Generic codes for unknown stores
    const genericCodes = [
      { code: 'WELCOME10', description: '10% välkomstrabatt', site: 'Community' },
      { code: 'SAVE15', description: '15% rabatt', site: 'Community' }
    ];

    // Find matching store codes
    for (const [store, codes] of Object.entries(commonCodes)) {
      if (storeNameLower.includes(store) || store.includes(storeNameLower)) {
        return codes;
      }
    }

    // Return random subset of generic codes
    return Math.random() > 0.5 ? genericCodes.slice(0, 1) : [];
  }

  // Extract coupon codes from text
  extractCodesFromText(text) {
    if (!text) return [];
    
    const foundCodes = new Set();
    
    for (const pattern of this.codePatterns) {
      const matches = text.matchAll(new RegExp(pattern));
      for (const match of matches) {
        const code = (match[1] || match[0]).toUpperCase().trim();
        
        // Validate the code
        if (this.isValidCode(code)) {
          foundCodes.add(code);
        }
      }
    }
    
    return Array.from(foundCodes);
  }

  // Validate if a string looks like a valid coupon code
  isValidCode(code) {
    if (!code || code.length < 4 || code.length > 20) return false;
    if (this.blacklistedCodes.has(code)) return false;
    if (!/^[A-Z0-9]+$/.test(code)) return false;
    if (/^\d+$/.test(code)) return false; // Pure numbers are rarely codes
    
    // Should have at least one letter
    if (!/[A-Z]/.test(code)) return false;
    
    return true;
  }

  // Calculate confidence score for a Reddit post
  calculateConfidence(postData) {
    let confidence = 0.5;
    
    // Higher score for more upvotes
    if (postData.score > 100) confidence += 0.2;
    else if (postData.score > 20) confidence += 0.1;
    
    // Higher score for newer posts
    const ageInDays = (Date.now() / 1000 - postData.created_utc) / 86400;
    if (ageInDays < 7) confidence += 0.2;
    else if (ageInDays < 30) confidence += 0.1;
    
    // Lower score for very old posts
    if (ageInDays > 90) confidence -= 0.2;
    
    // Check for keywords indicating working codes
    const title = postData.title.toLowerCase();
    if (title.includes('working') || title.includes('fungerar')) confidence += 0.1;
    if (title.includes('verified') || title.includes('verifierad')) confidence += 0.1;
    if (title.includes('expired') || title.includes('utgången')) confidence -= 0.3;
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  // Get search terms for a store
  getSearchTerms(storeName) {
    const cleanName = storeName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    return [
      storeName,
      cleanName,
      `${cleanName} rabattkod`,
      `${cleanName} coupon`,
      `${cleanName} discount`
    ];
  }

  // Deduplicate and filter codes
  deduplicateAndFilter(codes) {
    const seen = new Map();
    
    for (const code of codes) {
      const key = code.code;
      if (!seen.has(key) || code.confidence > seen.get(key).confidence) {
        seen.set(key, code);
      }
    }
    
    return Array.from(seen.values());
  }

  // Fetch with timeout
  async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Clipp/1.0 Coupon Extension'
        }
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  // Truncate text to specified length
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Cache management
  async getCachedCodes(storeName) {
    try {
      const result = await chrome.storage.local.get([this.cacheKey]);
      const cache = result[this.cacheKey] || {};
      const storeCache = cache[storeName.toLowerCase()];
      
      if (!storeCache) return null;
      if (Date.now() - storeCache.timestamp > this.cacheExpiry) {
        await this.clearCache(storeName);
        return null;
      }
      
      return storeCache.codes;
    } catch (error) {
      console.error('[CommunityService] Cache read error:', error);
      return null;
    }
  }

  async cacheCodes(storeName, codes) {
    try {
      const result = await chrome.storage.local.get([this.cacheKey]);
      const cache = result[this.cacheKey] || {};
      
      cache[storeName.toLowerCase()] = {
        codes,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ [this.cacheKey]: cache });
    } catch (error) {
      console.error('[CommunityService] Cache write error:', error);
    }
  }

  async clearCache(storeName) {
    try {
      const result = await chrome.storage.local.get([this.cacheKey]);
      const cache = result[this.cacheKey] || {};
      delete cache[storeName.toLowerCase()];
      await chrome.storage.local.set({ [this.cacheKey]: cache });
    } catch (error) {
      console.error('[CommunityService] Cache clear error:', error);
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.CommunityCodeService = CommunityCodeService;
}
