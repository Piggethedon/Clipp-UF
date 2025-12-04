// Clipp Enhanced Background Service Worker v1.1
// Load services
importScripts('services/CouponService.js', 'services/StatisticsService.js');

class ClippBackground {
  constructor() {
    this.stores = [];
    this.languageData = {};
    this.couponService = new CouponService();
    this.statisticsService = new StatisticsService();
    this.scheduledTasks = new Map();
    this.notifiedTabs = new Set(); // Track tabs we've shown notifications for
    this.couponCountPerTab = new Map(); // Track coupon counts per tab
    
    this.init();
  }

  async init() {
    console.log('[ClippBackground] Initializing Clipp extension v1.1');
    
    // Initialize services
    await this.loadConfiguration();
    await this.statisticsService.initializeStats();
    
    // Set up scheduled tasks
    this.setupScheduledTasks();
    
    // Clear badge on startup
    await this.clearBadge();
    
    console.log('[ClippBackground] Clipp extension initialized successfully');
  }

  // Load stores and language configuration
  async loadConfiguration() {
    try {
      const storesResponse = await fetch(chrome.runtime.getURL('config/stores.json'));
      const storesData = await storesResponse.json();
      this.stores = storesData.stores || [];
      console.log(`[ClippBackground] Loaded ${this.stores.length} stores`);

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
    chrome.alarms.create('refreshCouponCache', { 
      delayInMinutes: 1, 
      periodInMinutes: 60 
    });

    chrome.alarms.create('weeklyCleanup', { 
      delayInMinutes: 60, 
      periodInMinutes: 60 * 24 * 7
    });

    console.log('[ClippBackground] Scheduled tasks set up');
  }

  // ==================== BADGE NOTIFICATION SYSTEM ====================

  // Update badge with coupon count
  async updateBadge(tabId, count) {
    try {
      if (count > 0) {
        await chrome.action.setBadgeText({ 
          text: count.toString(), 
          tabId: tabId 
        });
        await chrome.action.setBadgeBackgroundColor({ 
          color: '#22c55e', // Green
          tabId: tabId 
        });
        
        // Store the count
        this.couponCountPerTab.set(tabId, count);
        
        console.log(`[ClippBackground] Badge updated for tab ${tabId}: ${count} coupons`);
      } else {
        await this.clearBadge(tabId);
      }
    } catch (error) {
      console.error('[ClippBackground] Error updating badge:', error);
    }
  }

  // Clear badge
  async clearBadge(tabId = null) {
    try {
      if (tabId) {
        await chrome.action.setBadgeText({ text: '', tabId: tabId });
        this.couponCountPerTab.delete(tabId);
      } else {
        await chrome.action.setBadgeText({ text: '' });
        this.couponCountPerTab.clear();
      }
    } catch (error) {
      console.error('[ClippBackground] Error clearing badge:', error);
    }
  }

  // Show notification badge for new coupons
  async showNewCouponsNotification(tabId, store, count) {
    const tabKey = `${tabId}-${store.storeId}`;
    
    // Don't notify twice for the same tab/store combination
    if (this.notifiedTabs.has(tabKey)) {
      return;
    }
    
    this.notifiedTabs.add(tabKey);
    
    // Update badge
    await this.updateBadge(tabId, count);
    
    // Get user's language preference
    const result = await chrome.storage.local.get(['clippLanguage']);
    const lang = result.clippLanguage || 'sv';
    const langData = this.languageData[lang];
    
    // Create notification
    const notificationId = `clipp-coupons-${tabId}-${Date.now()}`;
    
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: langData?.popup?.store_status?.found_coupons || 'Rabattkoder hittade!',
        message: lang === 'sv' 
          ? `${count} rabattkod${count > 1 ? 'er' : ''} hittad${count > 1 ? 'e' : ''} för ${store.storeName}!`
          : `${count} coupon${count > 1 ? 's' : ''} found for ${store.storeName}!`,
        priority: 2
      });
      
      // Auto-close notification after 5 seconds
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 5000);
      
    } catch (error) {
      // Notifications might not be available
      console.log('[ClippBackground] Notifications not available:', error.message);
    }
  }

  // Handle tab updates to inject Clipp
  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    // Clear notification tracking for this tab on navigation
    const keysToRemove = [...this.notifiedTabs].filter(key => key.startsWith(`${tabId}-`));
    keysToRemove.forEach(key => this.notifiedTabs.delete(key));

    try {
      const supportedStore = this.findSupportedStore(tab.url);
      
      if (supportedStore) {
        console.log(`[ClippBackground] Supported store detected: ${supportedStore.storeName}`);
        
        // Check if on checkout page
        const isCheckout = this.isCheckoutPage(tab.url);
        
        // Inject content script with store information
        await chrome.tabs.sendMessage(tabId, {
          action: 'initializeClipp',
          store: supportedStore,
          isCheckout: isCheckout
        });

        // Record store visit
        await this.statisticsService.recordStoreVisit(
          supportedStore.storeId, 
          supportedStore.storeName, 
          supportedStore.affiliateUrl
        );

        // Pre-fetch coupons and update badge
        this.prefetchCouponsForStore(supportedStore, tabId);
      } else {
        // Clear badge for non-supported sites
        await this.clearBadge(tabId);
      }
    } catch (error) {
      console.debug('[ClippBackground] Tab message failed:', error.message);
    }
  }

  // Check if URL is a checkout page
  isCheckoutPage(url) {
    const checkoutPatterns = [
      /checkout/i,
      /cart/i,
      /varukorg/i,
      /kassa/i,
      /payment/i,
      /betalning/i,
      /order/i,
      /bestall/i,
      /confirm/i,
      /bekrafta/i
    ];
    
    return checkoutPatterns.some(pattern => pattern.test(url));
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

  // Pre-fetch coupons and show badge
  async prefetchCouponsForStore(store, tabId) {
    try {
      console.log(`[ClippBackground] Pre-fetching coupons for ${store.storeName}`);
      const coupons = await this.couponService.findCouponsForStore(store);
      
      if (coupons && coupons.length > 0) {
        // Update badge with coupon count
        await this.updateBadge(tabId, coupons.length);
        
        // Show notification
        await this.showNewCouponsNotification(tabId, store, coupons.length);
        
        // Notify content script
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'couponsFound',
            coupons: coupons,
            count: coupons.length
          });
        } catch (e) {
          // Content script might not be ready
        }
        
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
          
        case 'testCoupon':
          return await this.handleTestCoupon(request, sender);
          
        case 'updateStats':
          return await this.handleUpdateStats(request);
          
        case 'recordPurchase':
          return await this.handleRecordPurchase(request);
          
        case 'recordSuccess':
          return await this.handleRecordSuccess(request);
          
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
          
        case 'clearBadge':
          if (sender.tab) {
            await this.clearBadge(sender.tab.id);
          }
          return { success: true };
          
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
      
      // Update badge if we have a tab
      if (sender?.tab?.id && coupons && coupons.length > 0) {
        await this.updateBadge(sender.tab.id, coupons.length);
        
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
      const tabId = request.tabId || sender?.tab?.id;
      if (!tabId) {
        return { success: false, error: 'No tab ID available' };
      }

      // Send message to content script to apply the coupon
      const result = await chrome.tabs.sendMessage(tabId, {
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

  // Handle automatic coupon testing
  async handleTestCoupon(request, sender) {
    if (!request.code || !request.store) {
      return { success: false, error: 'Coupon code and store information required' };
    }

    try {
      const tabId = sender?.tab?.id;
      if (!tabId) {
        return { success: false, error: 'No tab ID available' };
      }

      // Send test request to content script
      const result = await chrome.tabs.sendMessage(tabId, {
        action: 'testCouponOnPage',
        code: request.code,
        store: request.store
      });

      return result;
    } catch (error) {
      console.error('[ClippBackground] Error testing coupon:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle recording success
  async handleRecordSuccess(request) {
    try {
      await this.statisticsService.recordCouponApplication(
        request.store?.storeId || 'unknown',
        request.store?.storeName || 'Unknown',
        request.couponCode,
        true,
        request.savings || 0
      );
      return { success: true };
    } catch (error) {
      console.error('[ClippBackground] Error recording success:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle statistics updates
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

  // Handle alarm events
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

  // Refresh coupon cache
  async refreshCouponCache() {
    console.log('[ClippBackground] Starting scheduled coupon cache refresh');
    
    const activeStores = this.stores.filter(store => store.active);
    let refreshCount = 0;
    
    for (const store of activeStores.slice(0, 10)) {
      try {
        const coupons = await this.couponService.findCouponsForStore(store);
        if (coupons && coupons.length > 0) {
          refreshCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[ClippBackground] Error refreshing cache for ${store.storeName}:`, error);
      }
    }
    
    console.log(`[ClippBackground] Completed coupon cache refresh for ${refreshCount} stores`);
  }

  // Perform weekly cleanup
  async performWeeklyCleanup() {
    console.log('[ClippBackground] Starting weekly cleanup');
    
    try {
      this.notifiedTabs.clear();
      this.couponCountPerTab.clear();
      console.log('[ClippBackground] Weekly cleanup completed');
    } catch (error) {
      console.error('[ClippBackground] Error during weekly cleanup:', error);
    }
  }

  // Handle tab removal
  handleTabRemoved(tabId) {
    // Clean up tracking for removed tabs
    const keysToRemove = [...this.notifiedTabs].filter(key => key.startsWith(`${tabId}-`));
    keysToRemove.forEach(key => this.notifiedTabs.delete(key));
    this.couponCountPerTab.delete(tabId);
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

chrome.tabs.onRemoved.addListener((tabId) => {
  clippBackground.handleTabRemoved(tabId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  clippBackground.handleMessage(request, sender, sendResponse)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('[ClippBackground] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  clippBackground.handleAlarm(alarm);
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('clipp-coupons-')) {
    const tabIdMatch = notificationId.match(/clipp-coupons-(\d+)/);
    if (tabIdMatch) {
      const tabId = parseInt(tabIdMatch[1]);
      chrome.tabs.update(tabId, { active: true });
    }
  }
});

console.log('[ClippBackground] Background script loaded successfully v1.1');
