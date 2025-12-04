// Clipp Enhanced Popup Script v1.1
class ClippPopup {
  constructor() {
    this.currentLanguage = 'sv';
    this.languageData = {};
    this.stores = [];
    this.currentTab = null;
    this.currentStore = null;
    this.userCodes = [];
    this.foundCoupons = [];
    this.isScanning = false;
    this.userStats = null;
    this.communityService = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('[ClippPopup] Initializing popup v1.1');
      
      // Initialize community service
      if (typeof CommunityCodeService !== 'undefined') {
        this.communityService = new CommunityCodeService();
      }
      
      // Load all required data
      await Promise.all([
        this.loadLanguageData(),
        this.loadStores(),
        this.getCurrentTab(),
        this.loadUserStats(),
        this.loadUserCodes()
      ]);
      
      // Set up UI
      this.setupEventListeners();
      this.checkCurrentStore();
      this.updateLanguage();
      
      // Start coupon scanning
      await this.startCouponScan();
      
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

  // Load user-added codes
  async loadUserCodes() {
    try {
      const result = await chrome.storage.local.get(['clippUserCodes']);
      this.userCodes = result.clippUserCodes || [];
    } catch (error) {
      console.error('[ClippPopup] Failed to load user codes:', error);
      this.userCodes = [];
    }
  }

  // Save user codes to storage
  async saveUserCodes() {
    try {
      await chrome.storage.local.set({ clippUserCodes: this.userCodes });
    } catch (error) {
      console.error('[ClippPopup] Failed to save user codes:', error);
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

    // Add code button
    const addCodeBtn = document.getElementById('add-code-btn');
    if (addCodeBtn) {
      addCodeBtn.addEventListener('click', () => this.addUserCode());
    }

    // Code input - enter key
    const codeInput = document.getElementById('code-input');
    if (codeInput) {
      codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addUserCode();
      });
    }

    // Store button
    const storeButton = document.getElementById('store-button');
    if (storeButton) {
      storeButton.addEventListener('click', () => this.visitStore());
    }

    // Footer links
    document.getElementById('privacy-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://clipp.se/privacy' });
    });

    document.getElementById('support-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://clipp.se/support' });
    });
  }

  // Add user code
  async addUserCode() {
    const codeInput = document.getElementById('code-input');
    const descInput = document.getElementById('code-desc-input');
    
    const code = codeInput?.value.trim().toUpperCase();
    const description = descInput?.value.trim() || '';
    
    if (!code) {
      this.showToast(this.t('errors.empty_code') || 'Ange en rabattkod', 'error');
      return;
    }

    // Check for duplicates
    const exists = this.userCodes.some(c => c.code === code) || 
                   this.foundCoupons.some(c => c.code === code);
    if (exists) {
      this.showToast(this.t('errors.code_exists') || 'Denna kod finns redan', 'error');
      return;
    }

    // Add the code
    const newCode = {
      code,
      description: description || this.t('popup.add_code.user_added') || 'Tillagd av dig',
      source: 'user',
      addedAt: Date.now(),
      storeId: this.currentStore?.storeId || 'general'
    };

    this.userCodes.unshift(newCode);
    await this.saveUserCodes();

    // Clear inputs
    if (codeInput) codeInput.value = '';
    if (descInput) descInput.value = '';

    // Update display
    this.renderAllCoupons();
    this.showToast(this.t('popup.add_code.success') || 'Kod tillagd!', 'success');
  }

  // Delete user code
  async deleteUserCode(code) {
    this.userCodes = this.userCodes.filter(c => c.code !== code);
    await this.saveUserCodes();
    this.renderAllCoupons();
    this.showToast(this.t('popup.add_code.deleted') || 'Kod borttagen', 'success');
  }

  // Change language
  async changeLanguage(lang) {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      await chrome.storage.local.set({ clippLanguage: lang });
      this.updateLanguage();
      this.updateLanguageButtons();
      this.renderAllCoupons();
    }
  }

  // Update all UI text based on current language
  updateLanguage() {
    const lang = this.languageData[this.currentLanguage];
    if (!lang) return;

    const elements = {
      'tagline-text': lang.tagline,
      'add-code-title': this.t('popup.add_code.title') || '➕ Lägg till egen kod',
      'coupons-title': this.t('popup.coupons.title') || '🏷️ Rabattkoder',
      'loading-text': lang.popup?.store_status?.scanning,
      'stats-title': this.t('popup.statistics.title') || '📊 Din statistik',
      'purchases-label': lang.popup?.statistics?.purchases,
      'savings-label': lang.popup?.statistics?.total_saved,
      'privacy-link': lang.popup?.footer?.privacy,
      'support-link': lang.popup?.footer?.support
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element && text) element.textContent = text;
    });

    // Update button texts
    const addBtn = document.getElementById('add-code-btn');
    if (addBtn) addBtn.textContent = this.t('popup.add_code.button') || 'Lägg till';

    const codeInput = document.getElementById('code-input');
    if (codeInput) codeInput.placeholder = this.t('popup.add_code.placeholder_code') || 'RABATTKOD';

    const descInput = document.getElementById('code-desc-input');
    if (descInput) descInput.placeholder = this.t('popup.add_code.placeholder_desc') || 'Beskrivning (valfritt)';

    if (this.currentStore) {
      this.updateStoreStatus();
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
      this.updateStoreStatus();
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

      this.currentStore = matchingStore || null;
      this.updateStoreStatus();
      
      if (matchingStore) {
        console.log(`[ClippPopup] Detected store: ${matchingStore.storeName}`);
        this.showStoreButton();
      }
    } catch (error) {
      console.error('[ClippPopup] Error checking current store:', error);
      this.currentStore = null;
    }
  }

  // Update store status badge
  updateStoreStatus() {
    const badge = document.getElementById('store-badge');
    const nameEl = document.getElementById('store-name');
    const statusEl = document.getElementById('store-status-text');

    if (this.currentStore) {
      badge?.classList.add('active');
      if (nameEl) nameEl.textContent = this.currentStore.storeName;
      if (statusEl) statusEl.textContent = this.t('popup.store_status.supported') || 'Redo att hjälpa dig spara!';
    } else {
      badge?.classList.remove('active');
      if (nameEl) nameEl.textContent = this.t('popup.store_status.not_supported') || 'Ingen stödd butik';
      if (statusEl) statusEl.textContent = this.t('popup.store_status.not_supported_desc') || 'Besök en stödd butik för att spara';
    }
  }

  // Show store button
  showStoreButton() {
    const storeSection = document.getElementById('store-section');
    const storeButtonText = document.getElementById('store-button-text');
    
    if (storeSection && this.currentStore) {
      storeSection.style.display = 'block';
      if (storeButtonText) {
        const text = this.currentLanguage === 'sv' 
          ? `Gå till ${this.currentStore.storeName}`
          : `Go to ${this.currentStore.storeName}`;
        storeButtonText.textContent = text;
      }
    }
  }

  // Visit store via affiliate link
  async visitStore() {
    if (!this.currentStore?.affiliateUrl) return;

    try {
      await chrome.runtime.sendMessage({
        action: 'visitStore',
        storeId: this.currentStore.storeId,
        storeName: this.currentStore.storeName,
        affiliateUrl: this.currentStore.affiliateUrl
      });
      window.close();
    } catch (error) {
      console.error('[ClippPopup] Error visiting store:', error);
    }
  }

  // Start coupon scanning process
  async startCouponScan() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.showLoadingState();
    
    try {
      console.log('[ClippPopup] Starting coupon scan');
      
      // Get coupons from multiple sources in parallel
      const [apiCoupons, communityCoupons] = await Promise.all([
        this.fetchAPICoupons(),
        this.fetchCommunityCoupons()
      ]);

      // Merge all coupons
      this.foundCoupons = [...apiCoupons, ...communityCoupons];
      
      // Remove duplicates
      this.foundCoupons = this.deduplicateCoupons(this.foundCoupons);
      
      console.log(`[ClippPopup] Found ${this.foundCoupons.length} coupons total`);
      
      this.renderAllCoupons();
      
    } catch (error) {
      console.error('[ClippPopup] Error scanning for coupons:', error);
      this.renderAllCoupons(); // Still show user codes if any
    } finally {
      this.isScanning = false;
    }
  }

  // Fetch coupons from API sources
  async fetchAPICoupons() {
    if (!this.currentStore) return [];
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'findCoupons',
        store: this.currentStore
      });

      if (response?.success && response?.coupons) {
        return response.coupons.map(c => ({
          ...c,
          source: c.source || 'api'
        }));
      }
    } catch (error) {
      console.error('[ClippPopup] API coupon fetch error:', error);
    }
    return [];
  }

  // Fetch coupons from community sources (Reddit, etc.)
  async fetchCommunityCoupons() {
    if (!this.communityService || !this.currentStore) return [];
    
    try {
      const coupons = await this.communityService.findCodes(this.currentStore.storeName);
      return coupons.map(c => ({
        ...c,
        source: c.source || 'community'
      }));
    } catch (error) {
      console.error('[ClippPopup] Community coupon fetch error:', error);
    }
    return [];
  }

  // Remove duplicate coupons
  deduplicateCoupons(coupons) {
    const seen = new Set();
    return coupons.filter(c => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      return true;
    });
  }

  // Show loading state
  showLoadingState() {
    document.getElementById('coupons-loading').style.display = 'flex';
    document.getElementById('coupons-list').style.display = 'none';
    document.getElementById('coupons-empty').style.display = 'none';
    document.getElementById('coupons-count').style.display = 'none';
  }

  // Render all coupons (user + found)
  renderAllCoupons() {
    const loadingEl = document.getElementById('coupons-loading');
    const listEl = document.getElementById('coupons-list');
    const emptyEl = document.getElementById('coupons-empty');
    const countEl = document.getElementById('coupons-count');

    // Hide loading
    if (loadingEl) loadingEl.style.display = 'none';

    // Combine user codes (filtered by store if applicable) and found coupons
    const relevantUserCodes = this.userCodes.filter(c => 
      c.storeId === 'general' || c.storeId === this.currentStore?.storeId
    );
    
    const allCoupons = [...relevantUserCodes, ...this.foundCoupons];

    if (allCoupons.length === 0) {
      if (listEl) listEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      if (countEl) countEl.style.display = 'none';
      return;
    }

    // Update count badge
    if (countEl) {
      countEl.textContent = allCoupons.length;
      countEl.style.display = 'inline-block';
    }

    // Show list
    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) {
      listEl.style.display = 'flex';
      listEl.innerHTML = '';

      allCoupons.forEach((coupon, index) => {
        const item = this.createCouponElement(coupon, index);
        listEl.appendChild(item);
      });
    }
  }

  // Create coupon element
  createCouponElement(coupon, index) {
    const item = document.createElement('div');
    item.className = `clipp-coupon-item ${this.getCouponTypeClass(coupon.source)}`;
    item.style.animationDelay = `${index * 0.05}s`;

    const badge = this.getCouponBadge(coupon);
    const applyText = this.t('popup.coupons.apply') || 'Använd';
    const copyText = this.t('popup.coupons.copy') || 'Kopiera';
    
    const isUserCode = coupon.source === 'user';
    const deleteBtn = isUserCode ? `
      <button class="clipp-delete-btn" data-code="${coupon.code}" title="Ta bort">
        ✕
      </button>
    ` : '';

    item.innerHTML = `
      <div class="clipp-coupon-info">
        <div class="clipp-coupon-header">
          <span class="clipp-coupon-code">${coupon.code}</span>
          ${badge}
        </div>
        <p class="clipp-coupon-desc">${coupon.description || ''}</p>
        ${coupon.sourceLabel ? `<span class="clipp-coupon-source">📍 ${coupon.sourceLabel}</span>` : ''}
      </div>
      <div class="clipp-coupon-actions">
        <button class="clipp-copy-btn" data-code="${coupon.code}">${copyText}</button>
        ${this.currentStore ? `<button class="clipp-apply-btn" data-code="${coupon.code}">${applyText}</button>` : ''}
        ${deleteBtn}
      </div>
    `;

    // Event listeners
    item.querySelector('.clipp-copy-btn')?.addEventListener('click', () => this.copyCode(coupon.code));
    item.querySelector('.clipp-apply-btn')?.addEventListener('click', (e) => this.applyCoupon(coupon, e.target));
    item.querySelector('.clipp-delete-btn')?.addEventListener('click', () => this.deleteUserCode(coupon.code));

    return item;
  }

  // Get CSS class for coupon type
  getCouponTypeClass(source) {
    switch (source) {
      case 'user': return 'user-added';
      case 'reddit': return 'reddit';
      case 'verified':
      case 'api': return 'verified';
      default: return '';
    }
  }

  // Get badge HTML for coupon
  getCouponBadge(coupon) {
    if (coupon.source === 'user') {
      return `<span class="clipp-coupon-badge user">${this.t('popup.sources.user') || 'Din kod'}</span>`;
    }
    if (coupon.source === 'reddit') {
      return `<span class="clipp-coupon-badge reddit">Reddit</span>`;
    }
    if (coupon.verified) {
      return `<span class="clipp-coupon-badge verified">✓ ${this.t('popup.sources.verified') || 'Verifierad'}</span>`;
    }
    if (coupon.source === 'community') {
      return `<span class="clipp-coupon-badge community">${this.t('popup.sources.community') || 'Community'}</span>`;
    }
    return '';
  }

  // Copy code to clipboard
  async copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      this.showToast(this.t('popup.coupons.copied') || 'Kod kopierad!', 'success');
    } catch (error) {
      console.error('[ClippPopup] Copy failed:', error);
      this.showToast(this.t('errors.copy_failed') || 'Kunde inte kopiera', 'error');
    }
  }

  // Apply coupon code
  async applyCoupon(coupon, buttonEl) {
    if (!this.currentTab || !this.currentStore) return;
    
    try {
      buttonEl.classList.add('applying');
      buttonEl.disabled = true;
      buttonEl.textContent = this.currentLanguage === 'sv' ? 'Applicerar...' : 'Applying...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'applyCoupon',
        code: coupon.code,
        store: this.currentStore,
        tabId: this.currentTab.id
      });
      
      if (response?.success) {
        buttonEl.classList.remove('applying');
        buttonEl.classList.add('applied');
        buttonEl.textContent = this.t('popup.coupons.applied') || 'Tillagd!';
        
        if (response.savings) {
          await this.recordCouponSuccess(coupon, response.savings);
        }
        
        setTimeout(() => this.loadUserStats(), 1000);
      } else {
        buttonEl.classList.remove('applying');
        buttonEl.classList.add('failed');
        buttonEl.textContent = this.t('popup.coupons.failed') || 'Fungerade inte';
        
        setTimeout(() => {
          buttonEl.classList.remove('failed');
          buttonEl.disabled = false;
          buttonEl.textContent = this.t('popup.coupons.apply') || 'Använd';
        }, 2000);
      }
    } catch (error) {
      console.error('[ClippPopup] Apply coupon error:', error);
      buttonEl.classList.remove('applying');
      buttonEl.classList.add('failed');
      buttonEl.textContent = this.t('popup.coupons.failed') || 'Fel';
      
      setTimeout(() => {
        buttonEl.classList.remove('failed');
        buttonEl.disabled = false;
        buttonEl.textContent = this.t('popup.coupons.apply') || 'Använd';
      }, 2000);
    }
  }

  // Record successful coupon application
  async recordCouponSuccess(coupon, savings) {
    try {
      await chrome.runtime.sendMessage({
        action: 'recordSuccess',
        couponCode: coupon.code,
        savings: savings,
        store: this.currentStore
      });
    } catch (error) {
      console.error('[ClippPopup] Failed to record success:', error);
    }
  }

  // Show error state
  showErrorState() {
    const emptyEl = document.getElementById('coupons-empty');
    const titleEl = document.getElementById('empty-title');
    const descEl = document.getElementById('empty-desc');
    
    document.getElementById('coupons-loading').style.display = 'none';
    document.getElementById('coupons-list').style.display = 'none';
    
    if (emptyEl) emptyEl.style.display = 'block';
    if (titleEl) titleEl.textContent = this.t('errors.unknown_error') || 'Något gick fel';
    if (descEl) descEl.textContent = this.t('errors.try_again') || 'Försök igen senare';
  }

  // Show toast notification
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `clipp-toast ${type}`;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after 2.5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Translation helper
  t(path) {
    const keys = path.split('.');
    let value = this.languageData[this.currentLanguage];
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ClippPopup();
});
