// Clipp Popup Script
class ClippPopup {
  constructor() {
    this.currentLanguage = 'sv';
    this.languageData = {};
    this.stores = [];
    this.currentTab = null;
    this.currentStore = null;
    this.couponsFound = false;
    
    this.init();
  }

  async init() {
    await this.loadLanguageData();
    await this.loadStores();
    await this.getCurrentTab();
    await this.loadUserStats();
    
    this.setupEventListeners();
    this.checkCurrentStore();
    this.startCouponScan();
    this.updateLanguage();
  }

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
      console.error('Failed to load language data:', error);
    }
  }

  async loadStores() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStores' });
      this.stores = response.stores || [];
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  async loadUserStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (stats) {
        document.getElementById('purchases-value').textContent = stats.totalPurchases;
        document.getElementById('savings-value').textContent = `${Math.round(stats.totalSaved)} ${stats.currency}`;
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }

  setupEventListeners() {
    // Language switcher
    document.querySelectorAll('.clipp-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        this.changeLanguage(lang);
      });
    });

    // Store button
    const storeButton = document.getElementById('store-button');
    if (storeButton) {
      storeButton.addEventListener('click', () => {
        this.goToStore();
      });
    }
  }

  async changeLanguage(lang) {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      
      // Save language preference
      await chrome.storage.local.set({ clippLanguage: lang });
      
      // Update UI
      this.updateLanguage();
      this.updateLanguageButtons();
    }
  }

  updateLanguage() {
    const lang = this.languageData[this.currentLanguage];
    if (!lang) return;

    // Update text elements using language data
    const elements = {
      'tagline-text': lang.tagline || 'Spara pengar smartare – automatiskt',
      'testing-title': this.currentLanguage === 'sv' ? 'Pågående kodtestning' : 'Ongoing code testing',
      'testing-idle-text': this.currentLanguage === 'sv' ? 'Väntar på att du ska handla...' : 'Waiting for you to shop...',
      'deals-title': this.currentLanguage === 'sv' ? 'Aktiva deals' : 'Active deals',
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
  }

  updateLanguageButtons() {
    document.querySelectorAll('.clipp-lang-btn').forEach(btn => {
      const lang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', lang === this.currentLanguage);
    });
  }

  checkCurrentStore() {
    if (!this.currentTab || !this.currentTab.url) {
      this.hideStoreButton();
      return;
    }

    const currentDomain = new URL(this.currentTab.url).hostname;
    const matchingStore = this.stores.find(store => 
      store.active && currentDomain.includes(store.domain)
    );

    if (matchingStore) {
      this.currentStore = matchingStore;
      this.showStoreButton();
    } else {
      this.currentStore = null;
      this.hideStoreButton();
    }
  }

  showStoreButton() {
    const storeSection = document.getElementById('store-section');
    const storeButtonText = document.getElementById('store-button-text');
    
    if (storeSection && storeButtonText && this.currentStore) {
      const buttonText = this.currentLanguage === 'sv' 
        ? `Gå till ${this.currentStore.name}`
        : `Go to ${this.currentStore.name}`;
      storeButtonText.textContent = buttonText;
      storeSection.style.display = 'block';
    }
  }

  hideStoreButton() {
    const storeSection = document.getElementById('store-section');
    if (storeSection) {
      storeSection.style.display = 'none';
    }
  }

  goToStore() {
    if (this.currentStore && this.currentStore.affiliateUrl) {
      chrome.tabs.create({ url: this.currentStore.affiliateUrl });
    }
  }

  async startCouponScan() {
    if (!this.currentStore) {
      this.showNoCouponsState();
      return;
    }

    this.showLoadingState();
    
    try {
      // Simulate coupon scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Send message to background script to find coupons
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'findCoupons',
          store: this.currentStore
        }, resolve);
      });

      if (response && response.coupons && response.coupons.length > 0) {
        this.showCouponsFound(response.coupons);
        this.couponsFound = true;
      } else {
        this.showNoCouponsState();
        this.couponsFound = false;
      }
    } catch (error) {
      console.error('Error scanning for coupons:', error);
      this.showNoCouponsState();
      this.couponsFound = false;
    }
  }

  showLoadingState() {
    document.getElementById('deals-loading').style.display = 'flex';
    document.getElementById('deals-list').style.display = 'none';
    document.getElementById('deals-empty').style.display = 'none';
  }

  showCouponsFound(coupons) {
    document.getElementById('deals-loading').style.display = 'none';
    document.getElementById('deals-list').style.display = 'block';
    document.getElementById('deals-empty').style.display = 'none';
    
    this.renderCoupons(coupons);
  }

  showNoCouponsState() {
    document.getElementById('deals-loading').style.display = 'none';
    document.getElementById('deals-list').style.display = 'none';
    document.getElementById('deals-empty').style.display = 'block';
    
    const emptyText = document.getElementById('deals-empty-text');
    if (emptyText) {
      const message = this.currentLanguage === 'sv' 
        ? 'Inga kuponger hittades för denna butik, men du kan ändå handla via Clipp.'
        : 'No coupons found for this store, but you can still shop via Clipp.';
      emptyText.textContent = message;
    }
  }

  renderCoupons(coupons) {
    const dealsList = document.getElementById('deals-list');
    if (!dealsList) return;

    dealsList.innerHTML = '';
    
    coupons.forEach(coupon => {
      const dealItem = document.createElement('div');
      dealItem.className = 'clipp-deal-item';
      
      const applyText = this.currentLanguage === 'sv' ? 'Använd' : 'Apply';
      
      dealItem.innerHTML = `
        <div class="clipp-deal-info">
          <h4>${coupon.code}</h4>
          <p>${coupon.description}</p>
        </div>
        <button class="clipp-deal-apply" data-code="${coupon.code}">
          ${applyText}
        </button>
      `;
      
      // Add click handler for apply button
      const applyBtn = dealItem.querySelector('.clipp-deal-apply');
      applyBtn.addEventListener('click', () => {
        this.applyCoupon(coupon);
      });
      
      dealsList.appendChild(dealItem);
    });
  }

  async applyCoupon(coupon) {
    if (!this.currentTab) return;
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'applyCoupon',
          code: coupon.code,
          store: this.currentStore,
          tabId: this.currentTab.id
        }, resolve);
      });
      
      if (response && response.success) {
        // Update UI to show success
        this.showCouponApplied(coupon, response.savings);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
    }
  }

  showCouponApplied(coupon, savings) {
    // You can add success feedback here
    console.log(`Coupon ${coupon.code} applied with savings: ${savings}`);
  }

  t(path) {
    const keys = path.split('.');
    let value = this.languageData[this.currentLanguage];
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value || path;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClippPopup();
});