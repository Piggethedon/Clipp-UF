// Clipp Enhanced Popup Script
class ClippPopup {
  constructor() {
    this.currentLanguage = 'sv';
    this.languageData = {};
    this.stores = [];
    this.currentTab = null;
    this.currentStore = null;
    this.couponsFound = false;
    this.isScanning = false;
    this.userStats = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('[ClippPopup] Initializing popup');
      
      // Load all required data
      await Promise.all([
        this.loadLanguageData(),
        this.loadStores(),
        this.getCurrentTab(),
        this.loadUserStats()
      ]);
      
      // Set up UI
      this.setupEventListeners();
      this.checkCurrentStore();
      this.updateLanguage();
      
      // Start coupon scanning if on supported store
      if (this.currentStore) {
        await this.startCouponScan();
      } else {
        this.showUnsupportedState();
      }
      
      console.log('[ClippPopup] Popup initialized successfully');
    } catch (error) {
      console.error('[ClippPopup] Error initializing popup:', error);
      this.showErrorState();
    }
  }

  // Load language data and user preference
  async loadLanguageData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getLanguageData' });
      this.languageData = response.languageData || {};
      
      // Load saved language preference
      const result = await chrome.storage.local.get(['clippLanguage']);
      if (result.clippLanguage) {
        this.currentLanguage = result.clippLanguage;
      }
    } catch (error) {
      console.error('[ClippPopup] Failed to load language data:', error);
    }
  }

  // Load stores configuration
  async loadStores() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStores' });
      this.stores = response.stores || [];
    } catch (error) {
      console.error('[ClippPopup] Failed to load stores:', error);
    }
  }

  // Get current active tab
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('[ClippPopup] Failed to get current tab:', error);
    }
  }

  // Load user statistics
  async loadUserStats() {
    try {
      this.userStats = await chrome.runtime.sendMessage({ action: 'getStats' });
      this.updateStatsDisplay();
    } catch (error) {
      console.error('[ClippPopup] Failed to load user stats:', error);
    }
  }

  // Update statistics display
  updateStatsDisplay() {
    if (!this.userStats) return;

    const purchasesEl = document.getElementById('purchases-value');
    const savingsEl = document.getElementById('savings-value');
    
    if (purchasesEl) {
      purchasesEl.textContent = this.userStats.totalPurchases || 0;
    }
    
    if (savingsEl) {
      const savings = Math.round(this.userStats.totalSaved || 0);
      savingsEl.textContent = `${savings} ${this.userStats.currency || 'SEK'}`;
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Language switcher
    document.querySelectorAll('.clipp-lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang');
        this.changeLanguage(lang);
      });
    });

    // Store button
    const storeButton = document.getElementById('store-button');
    if (storeButton) {
      storeButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.visitStore();
      });
    }

    // Manual purchase tracking button (if implemented)
    const manualBtn = document.getElementById('manual-purchase-btn');
    if (manualBtn) {
      manualBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showManualPurchaseDialog();
      });
    }

    // Footer links
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPrivacyInfo();
      });
    }

    const supportLink = document.getElementById('support-link');
    if (supportLink) {
      supportLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSupportInfo();
      });
    }
  }

  // Change language
  async changeLanguage(lang) {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      
      // Save language preference
      await chrome.storage.local.set({ clippLanguage: lang });
      
      // Update UI
      this.updateLanguage();
      this.updateLanguageButtons();
      
      // Update coupon display if needed
      if (this.couponsFound) {
        this.updateCouponDisplay();
      }
    }
  }

  // Update all UI text based on current language
  updateLanguage() {
    const lang = this.languageData[this.currentLanguage];
    if (!lang) return;

    // Update text elements
    const elements = {
      'tagline-text': lang.tagline || 'Spara pengar smartare – automatiskt',
      'testing-title': this.t('popup.testing.title') || (this.currentLanguage === 'sv' ? 'Pågående kodtestning' : 'Ongoing code testing'),
      'testing-idle-text': this.t('popup.testing.idle') || (this.currentLanguage === 'sv' ? 'Väntar på att du ska handla...' : 'Waiting for you to shop...'),
      'deals-title': this.t('popup.deals.title') || (this.currentLanguage === 'sv' ? 'Aktiva deals' : 'Active deals'),
      'deals-loading-text': lang.popup?.store_status?.scanning || 'Söker rabattkoder...',
      'stats-title': lang.popup?.statistics?.title || 'Din Clipp-statistik',
      'purchases-label': lang.popup?.statistics?.purchases || 'Köp via Clipp',
      'savings-label': lang.popup?.statistics?.total_saved || 'Totalt sparat',
      'privacy-link': lang.popup?.footer?.privacy || 'Integritet',
      'support-link': lang.popup?.footer?.support || 'Support'
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });

    // Update store button if store is detected
    if (this.currentStore) {
      this.updateStoreButton();
    }
  }

  // Update language button states
  updateLanguageButtons() {
    document.querySelectorAll('.clipp-lang-btn').forEach(btn => {
      const lang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', lang === this.currentLanguage);
    });
  }

  // Check if current tab is a supported store
  checkCurrentStore() {
    if (!this.currentTab || !this.currentTab.url) {
      this.currentStore = null;
      this.hideStoreButton();
      return;
    }

    try {
      const urlObj = new URL(this.currentTab.url);
      const hostname = urlObj.hostname.toLowerCase();
      
      const matchingStore = this.stores.find(store => 
        store.active && store.domainPatterns.some(pattern => 
          hostname.includes(pattern.toLowerCase())
        )
      );

      if (matchingStore) {
        this.currentStore = matchingStore;
        this.showStoreButton();
        console.log(`[ClippPopup] Detected store: ${matchingStore.storeName}`);
      } else {
        this.currentStore = null;
        this.hideStoreButton();
      }
    } catch (error) {
      console.error('[ClippPopup] Error checking current store:', error);
      this.currentStore = null;
      this.hideStoreButton();
    }
  }

  // Show store button
  showStoreButton() {
    const storeSection = document.getElementById('store-section');
    if (storeSection && this.currentStore) {
      this.updateStoreButton();
      storeSection.style.display = 'block';
    }
  }

  // Update store button text
  updateStoreButton() {
    const storeButtonText = document.getElementById('store-button-text');
    if (storeButtonText && this.currentStore) {
      const buttonText = this.currentLanguage === 'sv' 
        ? `Gå till ${this.currentStore.storeName}`
        : `Go to ${this.currentStore.storeName}`;
      storeButtonText.textContent = buttonText;
    }
  }

  // Hide store button
  hideStoreButton() {
    const storeSection = document.getElementById('store-section');
    if (storeSection) {
      storeSection.style.display = 'none';
    }
  }

  // Visit store via affiliate link
  async visitStore() {
    if (!this.currentStore || !this.currentStore.affiliateUrl) return;

    try {
      // Record store visit
      await chrome.runtime.sendMessage({
        action: 'visitStore',
        storeId: this.currentStore.storeId,
        storeName: this.currentStore.storeName,
        affiliateUrl: this.currentStore.affiliateUrl
      });

      // Close popup (browser will handle the tab opening)
      window.close();
    } catch (error) {
      console.error('[ClippPopup] Error visiting store:', error);
      // Fallback - still close popup
      window.close();
    }
  }

  // Start coupon scanning process
  async startCouponScan() {
    if (this.isScanning || !this.currentStore) return;

    this.isScanning = true;
    this.showLoadingState();
    
    try {
      console.log(`[ClippPopup] Starting coupon scan for ${this.currentStore.storeName}`);
      
      // Add realistic scanning delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Request coupons from background script
      const response = await chrome.runtime.sendMessage({
        action: 'findCoupons',
        store: this.currentStore
      });

      if (response && response.success && response.coupons && response.coupons.length > 0) {
        this.showCouponsFound(response.coupons);
        this.couponsFound = true;
        console.log(`[ClippPopup] Found ${response.coupons.length} coupons`);
      } else {
        this.showNoCouponsState();
        this.couponsFound = false;
        console.log('[ClippPopup] No coupons found');
      }
    } catch (error) {
      console.error('[ClippPopup] Error scanning for coupons:', error);
      this.showErrorState();
      this.couponsFound = false;
    } finally {
      this.isScanning = false;
    }
  }

  // Show loading state during coupon scan
  showLoadingState() {
    this.setDealsState('loading');
  }

  // Show coupons found state
  showCouponsFound(coupons) {
    this.setDealsState('found');
    this.renderCoupons(coupons);
  }

  // Show no coupons found state
  showNoCouponsState() {
    this.setDealsState('empty');
    
    const emptyText = document.getElementById('deals-empty-text');
    if (emptyText) {
      const message = this.currentLanguage === 'sv' 
        ? 'Inga kuponger hittades för denna butik, men du kan ändå handla via Clipp.'
        : 'No coupons found for this store, but you can still shop via Clipp.';
      emptyText.textContent = message;
    }
  }

  // Show unsupported store state
  showUnsupportedState() {
    this.setDealsState('empty');
    
    const emptyText = document.getElementById('deals-empty-text');
    if (emptyText) {
      const message = this.currentLanguage === 'sv' 
        ? 'Denna butik stöds inte ännu. Besök en av våra stödda butiker för att börja spara!'
        : 'This store is not supported yet. Visit one of our supported stores to start saving!';
      emptyText.textContent = message;
    }
  }

  // Show error state
  showErrorState() {
    this.setDealsState('empty');
    
    const emptyText = document.getElementById('deals-empty-text');
    if (emptyText) {
      const message = this.currentLanguage === 'sv' 
        ? 'Ett fel inträffade när rabattkoder söktes. Försök igen senare.'
        : 'An error occurred while searching for discount codes. Please try again later.';
      emptyText.textContent = message;
    }
  }

  // Set deals section state
  setDealsState(state) {
    const loadingEl = document.getElementById('deals-loading');
    const listEl = document.getElementById('deals-list');
    const emptyEl = document.getElementById('deals-empty');

    // Hide all states first
    if (loadingEl) loadingEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Show appropriate state
    switch (state) {
      case 'loading':
        if (loadingEl) loadingEl.style.display = 'flex';
        break;
      case 'found':
        if (listEl) listEl.style.display = 'block';
        break;
      case 'empty':
        if (emptyEl) emptyEl.style.display = 'block';
        break;
    }
  }

  // Render coupon list
  renderCoupons(coupons) {
    const dealsList = document.getElementById('deals-list');
    if (!dealsList || !coupons) return;

    dealsList.innerHTML = '';
    
    coupons.forEach((coupon, index) => {
      const dealItem = document.createElement('div');
      dealItem.className = 'clipp-deal-item';
      dealItem.setAttribute('data-coupon-index', index);
      
      const applyText = this.t('popup.coupons.apply') || (this.currentLanguage === 'sv' ? 'Använd' : 'Apply');
      const verifiedBadge = coupon.verified ? 
        '<span class="clipp-verified-badge">✓</span>' : '';
      
      dealItem.innerHTML = `
        <div class="clipp-deal-info">
          <div class="clipp-deal-header">
            <h4>${coupon.code}</h4>
            ${verifiedBadge}
          </div>
          <p>${coupon.description}</p>
          ${coupon.source ? `<small class="clipp-coupon-source">Från: ${coupon.source}</small>` : ''}
        </div>
        <button class="clipp-deal-apply" data-code="${coupon.code}">
          ${applyText}
        </button>
      `;
      
      // Add click handler for apply button
      const applyBtn = dealItem.querySelector('.clipp-deal-apply');
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyCoupon(coupon, applyBtn);
      });
      
      dealsList.appendChild(dealItem);
    });
  }

  // Update coupon display when language changes
  updateCouponDisplay() {
    const applyButtons = document.querySelectorAll('.clipp-deal-apply');
    const applyText = this.t('popup.coupons.apply') || (this.currentLanguage === 'sv' ? 'Använd' : 'Apply');
    
    applyButtons.forEach(btn => {
      if (!btn.classList.contains('clipp-applying') && !btn.classList.contains('clipp-applied')) {
        btn.textContent = applyText;
      }
    });
  }

  // Apply coupon code
  async applyCoupon(coupon, buttonEl) {
    if (!this.currentTab || !this.currentStore) return;
    
    try {
      // Update button state
      buttonEl.classList.add('clipp-applying');
      buttonEl.disabled = true;
      buttonEl.textContent = this.currentLanguage === 'sv' ? 'Applicerar...' : 'Applying...';
      
      // Send apply request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'applyCoupon',
        code: coupon.code,
        store: this.currentStore,
        tabId: this.currentTab.id
      });
      
      if (response && response.success) {
        // Success state
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-applied');
        buttonEl.textContent = this.t('popup.coupons.applied') || (this.currentLanguage === 'sv' ? 'Tillagd!' : 'Applied!');
        
        // Update statistics if savings were reported
        if (response.savings) {
          await this.recordCouponSuccess(coupon, response.savings);
        }
        
        // Auto-refresh stats
        setTimeout(() => this.loadUserStats(), 1000);
        
      } else {
        // Failure state
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-failed');
        buttonEl.textContent = this.t('popup.coupons.failed') || (this.currentLanguage === 'sv' ? 'Fungerar inte' : 'Failed');
      }
      
    } catch (error) {
      console.error('[ClippPopup] Error applying coupon:', error);
      
      // Error state
      buttonEl.classList.remove('clipp-applying');
      buttonEl.classList.add('clipp-failed');
      buttonEl.textContent = this.currentLanguage === 'sv' ? 'Fel' : 'Error';
    }
  }

  // Record successful coupon usage
  async recordCouponSuccess(coupon, savings) {
    try {
      await chrome.runtime.sendMessage({
        action: 'recordPurchase',
        storeId: this.currentStore.storeId,
        storeName: this.currentStore.storeName,
        category: this.currentStore.category,
        savings: savings,
        currency: 'SEK',
        couponCode: coupon.code
      });
    } catch (error) {
      console.error('[ClippPopup] Error recording coupon success:', error);
    }
  }

  // Translation helper
  t(path) {
    const keys = path.split('.');
    let value = this.languageData[this.currentLanguage];
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value || path;
  }

  // Show manual purchase dialog (placeholder)
  showManualPurchaseDialog() {
    // This could open a dialog for manually tracking purchases
    console.log('[ClippPopup] Manual purchase dialog (not implemented)');
  }

  // Show privacy information
  showPrivacyInfo() {
    chrome.tabs.create({ 
      url: 'https://clipp.se/privacy' // Replace with actual privacy policy URL
    });
  }

  // Show support information
  showSupportInfo() {
    chrome.tabs.create({ 
      url: 'https://clipp.se/support' // Replace with actual support URL
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClippPopup();
});