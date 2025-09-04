// Clipp Background Service Worker
let stores = [];
let languageData = {};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Clipp extension installed');
  
  // Load configuration files
  await loadStoresConfig();
  await loadLanguageConfig();
  
  // Initialize statistics
  const stats = await chrome.storage.local.get(['clippStats']);
  if (!stats.clippStats) {
    await chrome.storage.local.set({
      clippStats: {
        totalPurchases: 0,
        totalSaved: 0,
        currency: 'SEK'
      }
    });
  }
});

// Load stores configuration
async function loadStoresConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('config/stores.json'));
    const data = await response.json();
    stores = data.stores;
  } catch (error) {
    console.error('Failed to load stores config:', error);
  }
}

// Load language configuration
async function loadLanguageConfig() {
  try {
    const svResponse = await fetch(chrome.runtime.getURL('locales/sv.json'));
    const enResponse = await fetch(chrome.runtime.getURL('locales/en.json'));
    
    languageData = {
      sv: await svResponse.json(),
      en: await enResponse.json()
    };
  } catch (error) {
    console.error('Failed to load language config:', error);
  }
}

// Check if current tab is a supported store
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedStore = stores.find(store => 
      tab.url.includes(store.domain)
    );
    
    if (supportedStore) {
      // Inject Clipp interface
      await chrome.tabs.sendMessage(tabId, {
        action: 'initializeClipp',
        store: supportedStore
      });
    }
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.action) {
    case 'findCoupons':
      const coupons = await findCouponsForStore(request.store);
      sendResponse({ coupons });
      break;
      
    case 'applyCoupon':
      const result = await applyCouponCode(request.code, request.store, sender.tab.id);
      sendResponse(result);
      break;
      
    case 'updateStats':
      await updateUserStats(request.savings, request.currency);
      sendResponse({ success: true });
      break;
      
    case 'getStats':
      const stats = await chrome.storage.local.get(['clippStats']);
      sendResponse(stats.clippStats);
      break;
      
    case 'getStores':
      sendResponse({ stores });
      break;
      
    case 'getLanguageData':
      sendResponse({ languageData });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Find coupon codes for a specific store
async function findCouponsForStore(store) {
  const coupons = [];
  
  // Simulate coupon discovery (in real implementation, this would fetch from coupon APIs)
  const mockCoupons = [
    { code: 'SAVE20', description: 'Spara 20%', discount: 20, type: 'percentage' },
    { code: 'SAVE10', description: 'Spara 10%', discount: 10, type: 'percentage' },
    { code: 'FREE50', description: 'Fri frakt över 500 kr', discount: 50, type: 'shipping' },
    { code: 'NEW15', description: '15% för nya kunder', discount: 15, type: 'percentage' }
  ];
  
  // Return 1-3 random coupons for demo
  const numCoupons = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < numCoupons; i++) {
    coupons.push(mockCoupons[Math.floor(Math.random() * mockCoupons.length)]);
  }
  
  return coupons;
}

// Apply coupon code on the store page
async function applyCouponCode(code, store, tabId) {
  try {
    // Send message to content script to apply the coupon
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'applyCouponToPage',
      code: code,
      store: store
    });
    
    return result;
  } catch (error) {
    console.error('Failed to apply coupon:', error);
    return { success: false, error: 'Failed to apply coupon' };
  }
}

// Update user statistics
async function updateUserStats(savings, currency = 'SEK') {
  const currentStats = await chrome.storage.local.get(['clippStats']);
  const stats = currentStats.clippStats || { totalPurchases: 0, totalSaved: 0, currency: 'SEK' };
  
  stats.totalPurchases += 1;
  stats.totalSaved += parseFloat(savings) || 0;
  stats.currency = currency;
  
  await chrome.storage.local.set({ clippStats: stats });
}