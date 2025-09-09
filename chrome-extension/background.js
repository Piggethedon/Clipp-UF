// Clipp Enhanced Background Service Worker
// Load services
importScripts('services/CouponService.js', 'services/StatisticsService.js');

class ClippBackground {
  constructor() {
    this.stores = [];
    this.languageData = {};
    this.couponService = new CouponService();
    this.statisticsService = new StatisticsService();
    this.scheduledTasks = new Map();
    
    this.init();
  }

  async init() {
    console.log('[ClippBackground] Initializing Clipp extension');
    
    // Initialize services
    await this.loadConfiguration();
    await this.statisticsService.initializeStats();
    
    // Set up scheduled tasks
    this.setupScheduledTasks();
    
    console.log('[ClippBackground] Clipp extension initialized successfully');
  }

  // Load stores and language configuration
  async loadConfiguration() {
    try {
      // Load stores configuration
      const storesResponse = await fetch(chrome.runtime.getURL('config/stores.json'));
      const storesData = await storesResponse.json();
      this.stores = storesData.stores || [];
      console.log(`[ClippBackground] Loaded ${this.stores.length} stores`);

      // Load language configuration
      const svResponse = await fetch(chrome.runtime.getURL('locales/sv.json'));
      const enResponse = await fetch(chrome.runtime.getURL('locales/en.json'));
      
      this.languageData = {
        sv: await svResponse.json(),
        en: await enResponse.json()
      };
      console.log('[ClippBackground] Loaded language data');

    } catch (error) {
      console.error('[ClippBackground] Failed to load configuration:', error);
    }
  }

  // Set up scheduled background tasks
  setupScheduledTasks() {
    // Schedule coupon cache refresh every hour
    chrome.alarms.create('refreshCouponCache', { 
      delayInMinutes: 1, 
      periodInMinutes: 60 
    });

    // Schedule weekly cleanup of old data
    chrome.alarms.create('weeklyCleanup', { 
      delayInMinutes: 60, 
      periodInMinutes: 60 * 24 * 7 // Weekly
    });

    console.log('[ClippBackground] Scheduled tasks set up');
  }

  // Handle tab updates to inject Clipp
  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
      const supportedStore = this.findSupportedStore(tab.url);
      
      if (supportedStore) {
        console.log(`[ClippBackground] Supported store detected: ${supportedStore.storeName}`);
        
        // Inject content script with store information
        await chrome.tabs.sendMessage(tabId, {
          action: 'initializeClipp',
          store: supportedStore
        });

        // Record store visit for analytics
        await this.statisticsService.recordStoreVisit(
          supportedStore.storeId, 
          supportedStore.storeName, 
          supportedStore.affiliateUrl
        );

        // Pre-fetch coupons in background
        this.prefetchCouponsForStore(supportedStore);
      }
    } catch (error) {
      // Silently handle errors - content script might not be ready
      console.debug('[ClippBackground] Tab message failed (normal if content script not loaded):', error.message);
    }
  }

  // Find supported store from URL
  findSupportedStore(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return this.stores.find(store => 
        store.active && store.domainPatterns.some(pattern => 
          hostname.includes(pattern.toLowerCase())
        )
      );
    } catch (error) {
      console.error('[ClippBackground] Error parsing URL:', error);
      return null;
    }
  }

  // Pre-fetch coupons for faster user experience
  async prefetchCouponsForStore(store) {
    try {
      console.log(`[ClippBackground] Pre-fetching coupons for ${store.storeName}`);
      const coupons = await this.couponService.findCouponsForStore(store);
      
      if (coupons && coupons.length > 0) {
        // Record coupon discovery
        await this.statisticsService.recordCouponFound(
          store.storeId, 
          store.storeName, 
          coupons.length,
          'background_prefetch'
        );
        
        console.log(`[ClippBackground] Pre-fetched ${coupons.length} coupons for ${store.storeName}`);
      }
    } catch (error) {
      console.error(`[ClippBackground] Error pre-fetching coupons for ${store.storeName}:`, error);
    }
  }

  // Handle messages from content scripts and popup
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log(`[ClippBackground] Received message: ${request.action}`);
      
      switch (request.action) {
        case 'findCoupons':
          return await this.handleFindCoupons(request, sender);
          
        case 'applyCoupon':
          return await this.handleApplyCoupon(request, sender);
          
        case 'updateStats':
          return await this.handleUpdateStats(request);
          
        case 'recordPurchase':
          return await this.handleRecordPurchase(request);
          
        case 'getStats':
          return await this.handleGetStats(request);
          
        case 'getStatsSummary':
          return await this.handleGetStatsSummary(request);
          
        case 'getStores':
          return { stores: this.stores };
          
        case 'getLanguageData':
          return { languageData: this.languageData };
          
        case 'visitStore':
          return await this.handleVisitStore(request);
          
        case 'exportUserData':
          return await this.handleExportUserData();
          
        case 'clearUserData':
          return await this.handleClearUserData();
          
        default:
          console.warn(`[ClippBackground] Unknown action: ${request.action}`);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error(`[ClippBackground] Error handling message ${request.action}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Handle coupon finding requests
  async handleFindCoupons(request, sender) {
    if (!request.store) {
      return { success: false, error: 'Store information required' };
    }

    try {
      const coupons = await this.couponService.findCouponsForStore(request.store);
      
      // Record coupon discovery
      if (coupons && coupons.length > 0) {
        await this.statisticsService.recordCouponFound(
          request.store.storeId,
          request.store.storeName,
          coupons.length,
          'user_request'
        );
      }

      return { 
        success: true, 
        coupons: coupons || [],
        count: coupons ? coupons.length : 0
      };
    } catch (error) {
      console.error('[ClippBackground] Error finding coupons:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle coupon application requests
  async handleApplyCoupon(request, sender) {
    if (!request.code || !request.store) {
      return { success: false, error: 'Coupon code and store information required' };
    }

    try {
      // Send message to content script to apply the coupon
      const result = await chrome.tabs.sendMessage(sender.tab.id, {
        action: 'applyCouponToPage',
        code: request.code,
        store: request.store
      });

      // Record coupon application attempt
      await this.statisticsService.recordCouponApplication(
        request.store.storeId,
        request.store.storeName,
        request.code,
        result.success,
        result.savings || 0
      );

      return result;
    } catch (error) {
      console.error('[ClippBackground] Error applying coupon:', error);
      
      // Record failed application
      await this.statisticsService.recordCouponApplication(
        request.store.storeId,
        request.store.storeName,
        request.code,
        false,
        0
      );
      
      return { success: false, error: 'Failed to apply coupon' };
    }
  }

  // Handle statistics updates (legacy - prefer recordPurchase)
  async handleUpdateStats(request) {
    try {
      const stats = await this.statisticsService.recordPurchase(
        'unknown',
        'Unknown Store',
        'Unknown',
        parseFloat(request.savings) || 0,
        request.currency || 'SEK'
      );
      
      return { success: true, stats };
    } catch (error) {
      console.error('[ClippBackground] Error updating stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle purchase recording
  async handleRecordPurchase(request) {
    try {
      const stats = await this.statisticsService.recordPurchase(
        request.storeId,
        request.storeName,
        request.category,
        parseFloat(request.savings) || 0,
        request.currency || 'SEK',
        request.couponCode
      );
      
      return { success: true, stats };
    } catch (error) {
      console.error('[ClippBackground] Error recording purchase:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle statistics retrieval
  async handleGetStats(request) {
    try {
      const stats = await this.statisticsService.getStats();
      return stats;
    } catch (error) {
      console.error('[ClippBackground] Error getting stats:', error);
      return null;
    }
  }

  // Handle statistics summary retrieval
  async handleGetStatsSummary(request) {
    try {
      const summary = await this.statisticsService.getStatsSummary(request.period);
      return { success: true, summary };
    } catch (error) {
      console.error('[ClippBackground] Error getting stats summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle store visits via affiliate links
  async handleVisitStore(request) {
    try {
      if (request.storeId && request.storeName && request.affiliateUrl) {
        await this.statisticsService.recordStoreVisit(
          request.storeId,
          request.storeName,
          request.affiliateUrl
        );
      }
      
      // Open the store in a new tab
      await chrome.tabs.create({ url: request.affiliateUrl });
      
      return { success: true };
    } catch (error) {
      console.error('[ClippBackground] Error handling store visit:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle user data export (GDPR)
  async handleExportUserData() {
    try {
      const userData = await this.statisticsService.exportUserData();
      return { success: true, data: userData };
    } catch (error) {
      console.error('[ClippBackground] Error exporting user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle user data clearing (GDPR)
  async handleClearUserData() {
    try {
      const success = await this.statisticsService.clearUserData();
      return { success };
    } catch (error) {
      console.error('[ClippBackground] Error clearing user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle alarm events (scheduled tasks)
  async handleAlarm(alarm) {
    console.log(`[ClippBackground] Handling alarm: ${alarm.name}`);
    
    switch (alarm.name) {
      case 'refreshCouponCache':
        await this.refreshCouponCache();
        break;
        
      case 'weeklyCleanup':
        await this.performWeeklyCleanup();
        break;
        
      default:
        console.warn(`[ClippBackground] Unknown alarm: ${alarm.name}`);
    }
  }

  // Refresh coupon cache for active stores
  async refreshCouponCache() {
    console.log('[ClippBackground] Starting scheduled coupon cache refresh');
    
    const activeStores = this.stores.filter(store => store.active);
    let refreshCount = 0;
    
    for (const store of activeStores.slice(0, 10)) { // Limit to 10 stores per refresh to avoid rate limits
      try {
        const coupons = await this.couponService.findCouponsForStore(store);
        if (coupons && coupons.length > 0) {
          refreshCount++;
        }
        
        // Add delay between requests to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[ClippBackground] Error refreshing cache for ${store.storeName}:`, error);
      }
    }
    
    console.log(`[ClippBackground] Completed coupon cache refresh for ${refreshCount} stores`);
  }

  // Perform weekly cleanup of old data
  async performWeeklyCleanup() {
    console.log('[ClippBackground] Starting weekly cleanup');
    
    try {
      // This could include cleanup tasks like:
      // - Removing old transaction logs
      // - Clearing expired coupon cache
      // - Optimizing storage usage
      
      console.log('[ClippBackground] Weekly cleanup completed');
    } catch (error) {
      console.error('[ClippBackground] Error during weekly cleanup:', error);
    }
  }
}

// Initialize the background service
const clippBackground = new ClippBackground();

// Set up event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ClippBackground] Extension installed/updated');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  clippBackground.handleTabUpdate(tabId, changeInfo, tab);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  clippBackground.handleMessage(request, sender, sendResponse)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('[ClippBackground] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Keep message channel open for async response
});

chrome.alarms.onAlarm.addListener((alarm) => {
  clippBackground.handleAlarm(alarm);
});

console.log('[ClippBackground] Background script loaded successfully');