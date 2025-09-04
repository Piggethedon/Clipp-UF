// Clipp Popup Script
class ClippPopup {
  constructor() {
    this.currentLanguage = 'sv';
    this.languageData = {};
    this.stores = [];
    this.currentTab = null;
    
    this.init();
  }

  async init() {
    await this.loadLanguageData();
    await this.loadStores();
    await this.getCurrentTab();
    await this.loadUserStats();
    
    this.setupEventListeners();
    this.checkCurrentStore();
    this.renderStores();
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

    // Update text elements
    const elements = {
      'tagline-text': 'Spara pengar smartare – automatiskt',
      'status-title': 'Inget stöd för denna sida',
      'status-desc': 'Besök en av våra stödda butiker för att börja spara',
      'active-store-desc': 'Clipp är redo att hjälpa dig spara pengar',
      'stats-title': 'Din Clipp-statistik',
      'purchases-label': 'Köp via Clipp',
      'savings-label': 'Totalt sparat',
      'stores-title': 'Stödda butiker',
      'privacy-link': 'Integritet',
      'support-link': 'Support'
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) {
        if (this.currentLanguage === 'en') {
          // English translations
          const translations = {
            'tagline-text': 'Save money smarter – automatically',
            'status-title': 'No support for this site',
            'status-desc': 'Visit one of our supported stores to start saving',
            'active-store-desc': 'Clipp is ready to help you save money',
            'stats-title': 'Your Clipp statistics',
            'purchases-label': 'Purchases via Clipp',
            'savings-label': 'Total saved',
            'stores-title': 'Supported stores',
            'privacy-link': 'Privacy',
            'support-link': 'Support'
          };
          element.textContent = translations[id] || text;
        } else {
          element.textContent = text;
        }
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
    if (!this.currentTab?.url) return;

    const currentStore = this.stores.find(store => 
      this.currentTab.url.includes(store.domain)
    );

    if (currentStore) {
      // Show active store status
      document.getElementById('status-inactive').style.display = 'none';
      document.getElementById('status-active').style.display = 'flex';
      document.getElementById('active-store-name').textContent = currentStore.name;
    } else {
      // Show inactive status
      document.getElementById('status-inactive').style.display = 'flex';
      document.getElementById('status-active').style.display = 'none';
    }
  }

  renderStores() {
    const storesGrid = document.getElementById('stores-grid');
    if (!storesGrid) return;

    storesGrid.innerHTML = this.stores.map(store => `
      <div class="clipp-store-item" onclick="chrome.tabs.create({url: 'https://${store.domain}'})">
        <img src="${store.logo}" alt="${store.name}" class="clipp-store-logo" onerror="this.src='icons/icon32.png'">
        <div class="clipp-store-name">${store.name}</div>
        <div class="clipp-store-category">${store.category}</div>
      </div>
    `).join('');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClippPopup();
});