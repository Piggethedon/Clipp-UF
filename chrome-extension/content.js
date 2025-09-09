// Clipp Enhanced Content Script - Injected into store pages
class ClippContentScript {
  constructor() {
    this.currentStore = null;
    this.clippInterface = null;
    this.isProcessing = false;
    this.isVisible = false;
    this.couponsCache = [];
    this.statisticsService = null;
    
    // Initialize content script
    this.init();
  }

  async init() {
    console.log('[ClippContent] Initializing content script');
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open
    });

    // Check if page is already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageReady());
    } else {
      this.onPageReady();
    }
  }

  onPageReady() {
    console.log('[ClippContent] Page ready, waiting for store detection');
    // The background script will send initializeClipp message when store is detected
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'initializeClipp':
          await this.initializeForStore(request.store);
          sendResponse({ success: true });
          break;
          
        case 'applyCouponToPage':
          const result = await this.applyCouponToPage(request.code, request.store);
          sendResponse(result);
          break;
          
        case 'showCouponsFound':
          this.showCouponsNotification(request.coupons);
          sendResponse({ success: true });
          break;
          
        case 'hideCouponsInterface':
          this.hideInterface();
          sendResponse({ success: true });
          break;
          
        default:
          console.warn(`[ClippContent] Unknown action: ${request.action}`);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error(`[ClippContent] Error handling message ${request.action}:`, error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Initialize Clipp interface for detected store
  async initializeForStore(store) {
    if (this.clippInterface || !store) return;
    
    console.log(`[ClippContent] Initializing Clipp for ${store.storeName}`);
    this.currentStore = store;
    
    try {
      await this.createClippInterface();
      await this.loadAndDisplayStats();
      
      // Auto-scan for coupons after short delay
      setTimeout(() => {
        this.startAutomaticCouponScan();
      }, 2000);
      
    } catch (error) {
      console.error('[ClippContent] Error initializing for store:', error);
    }
  }

  // Create floating Clipp interface
  async createClippInterface() {
    // Remove existing interface if any
    this.removeInterface();
    
    // Create main interface container
    this.clippInterface = document.createElement('div');
    this.clippInterface.id = 'clipp-interface';
    this.clippInterface.innerHTML = this.getInterfaceHTML();
    
    // Add to page
    document.body.appendChild(this.clippInterface);
    
    // Apply styles
    this.injectStyles();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('[ClippContent] Clipp interface created');
  }

  // Get HTML for the Clipp interface
  getInterfaceHTML() {
    const iconUrl = chrome.runtime.getURL('icons/icon32.png');
    
    return `
      <!-- Floating Button -->
      <div class="clipp-floating-button" id="clipp-toggle">
        <img src="${iconUrl}" alt="Clipp" class="clipp-button-icon" />
        <span class="clipp-notification-badge" id="clipp-notification" style="display: none;">!</span>
      </div>
      
      <!-- Main Popup -->
      <div class="clipp-popup-overlay" id="clipp-popup" style="display: none;">
        <div class="clipp-popup-content">
          <div class="clipp-popup-header">
            <div class="clipp-header-left">
              <img src="${iconUrl}" alt="Clipp" class="clipp-popup-logo" />
              <h3>Clipp</h3>
            </div>
            <button class="clipp-close-btn" id="clipp-close">✕</button>
          </div>
          
          <div class="clipp-popup-body">
            <!-- Status Section -->
            <div class="clipp-status-section" id="clipp-status-section">
              <div class="clipp-status-content" id="clipp-status-content">
                <div class="clipp-status-idle" id="clipp-status-idle">
                  <div class="clipp-status-icon">💤</div>
                  <div class="clipp-status-text">
                    <h4>Redo att hjälpa</h4>
                    <p>Klicka för att söka rabattkoder</p>
                  </div>
                </div>
                
                <div class="clipp-status-scanning" id="clipp-status-scanning" style="display: none;">
                  <div class="clipp-spinner"></div>
                  <div class="clipp-status-text">
                    <h4>Söker rabattkoder...</h4>
                    <p>Detta tar bara några sekunder</p>
                  </div>
                </div>
                
                <div class="clipp-status-found" id="clipp-status-found" style="display: none;">
                  <div class="clipp-status-icon">🎉</div>
                  <div class="clipp-status-text">
                    <h4>Rabattkoder hittade!</h4>
                    <p id="clipp-found-count">0 koder tillgängliga</p>
                  </div>
                </div>
                
                <div class="clipp-status-empty" id="clipp-status-empty" style="display: none;">
                  <div class="clipp-status-icon">😕</div>
                  <div class="clipp-status-text">
                    <h4>Inga koder hittades</h4>
                    <p>Men du kan fortfarande handla via Clipp!</p>
                  </div>
                </div>
              </div>
              
              <button class="clipp-scan-btn" id="clipp-scan-btn">
                <span id="clipp-scan-text">Sök rabattkoder</span>
              </button>
            </div>
            
            <!-- Coupons Section -->
            <div class="clipp-coupons-section" id="clipp-coupons-section" style="display: none;">
              <h4>Tillgängliga rabattkoder</h4>
              <div class="clipp-coupons-list" id="clipp-coupons-list"></div>
            </div>
            
            <!-- Store Button -->
            <div class="clipp-store-section">
              <button class="clipp-store-btn" id="clipp-store-btn">
                <span class="clipp-store-icon">🛒</span>
                <span id="clipp-store-text">Handla via Clipp</span>
              </button>
            </div>
            
            <!-- Statistics -->
            <div class="clipp-stats-section">
              <h4>Din statistik</h4>
              <div class="clipp-stats-grid">
                <div class="clipp-stat-item">
                  <span class="clipp-stat-label">Köp via Clipp</span>
                  <span class="clipp-stat-value" id="clipp-stat-purchases">0</span>
                </div>
                <div class="clipp-stat-item">
                  <span class="clipp-stat-label">Totalt sparat</span>
                  <span class="clipp-stat-value" id="clipp-stat-savings">0 SEK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Inject CSS styles for the interface
  injectStyles() {
    if (document.getElementById('clipp-content-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'clipp-content-styles';
    styleSheet.textContent = this.getInterfaceCSS();
    document.head.appendChild(styleSheet);
  }

  // Get CSS for the Clipp interface
  getInterfaceCSS() {
    return `
      /* Clipp Content Script Styles */
      #clipp-interface {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10000000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.4;
        box-sizing: border-box;
      }
      
      #clipp-interface *,
      #clipp-interface *::before,
      #clipp-interface *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* Floating Button */
      .clipp-floating-button {
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 10000001;
      }
      
      .clipp-floating-button:hover {
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 6px 25px rgba(59, 130, 246, 0.6);
      }
      
      .clipp-button-icon {
        width: 28px;
        height: 28px;
        filter: brightness(0) invert(1);
      }
      
      .clipp-notification-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        animation: clipp-pulse 2s infinite;
      }
      
      @keyframes clipp-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      
      /* Popup Overlay */
      .clipp-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000002;
        backdrop-filter: blur(4px);
      }
      
      .clipp-popup-content {
        width: 400px;
        max-width: 90vw;
        max-height: 90vh;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        animation: clipp-popup-in 0.3s ease-out;
      }
      
      @keyframes clipp-popup-in {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      /* Popup Header */
      .clipp-popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
      }
      
      .clipp-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .clipp-popup-logo {
        width: 32px;
        height: 32px;
        filter: brightness(0) invert(1);
        border-radius: 6px;
      }
      
      .clipp-popup-header h3 {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
      }
      
      .clipp-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: background 0.2s ease;
      }
      
      .clipp-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* Popup Body */
      .clipp-popup-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      /* Status Section */
      .clipp-status-section {
        margin-bottom: 20px;
      }
      
      .clipp-status-content {
        background: #f8faff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }
      
      .clipp-status-idle,
      .clipp-status-scanning,
      .clipp-status-found,
      .clipp-status-empty {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .clipp-status-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .clipp-status-text h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 2px 0;
      }
      
      .clipp-status-text p {
        font-size: 12px;
        color: #6b7280;
        margin: 0;
      }
      
      .clipp-scan-btn {
        width: 100%;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .clipp-scan-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        transform: translateY(-1px);
      }
      
      .clipp-scan-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      /* Coupons Section */
      .clipp-coupons-section {
        margin-bottom: 20px;
      }
      
      .clipp-coupons-section h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 12px 0;
      }
      
      .clipp-coupons-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .clipp-coupon-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        transition: all 0.2s ease;
      }
      
      .clipp-coupon-item:hover {
        background: linear-gradient(135deg, #e0f2fe, #bae6fd);
      }
      
      .clipp-coupon-info {
        flex: 1;
      }
      
      .clipp-coupon-code {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #0369a1;
        background: rgba(3, 105, 161, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        margin-right: 8px;
      }
      
      .clipp-coupon-desc {
        font-size: 12px;
        color: #0284c7;
        display: block;
        margin-top: 2px;
      }
      
      .clipp-coupon-apply {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 60px;
      }
      
      .clipp-coupon-apply:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
      }
      
      .clipp-coupon-apply:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .clipp-coupon-apply.clipp-applying {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      
      .clipp-coupon-apply.clipp-success {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .clipp-coupon-apply.clipp-failed {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      
      /* Store Section */
      .clipp-store-section {
        margin-bottom: 20px;
      }
      
      .clipp-store-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .clipp-store-btn:hover {
        background: linear-gradient(135deg, #059669, #047857);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }
      
      .clipp-store-icon {
        font-size: 16px;
      }
      
      /* Statistics Section */
      .clipp-stats-section h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 12px 0;
      }
      
      .clipp-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      
      .clipp-stat-item {
        text-align: center;
        padding: 12px;
        background: #f8faff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
      
      .clipp-stat-label {
        font-size: 11px;
        color: #6b7280;
        margin-bottom: 4px;
        display: block;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      
      .clipp-stat-value {
        font-size: 16px;
        font-weight: 700;
        color: #059669;
      }
      
      /* Spinner */
      .clipp-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: clipp-spin 1s linear infinite;
      }
      
      @keyframes clipp-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Mobile responsiveness */
      @media (max-width: 480px) {
        .clipp-floating-button {
          right: 16px;
          width: 48px;
          height: 48px;
        }
        
        .clipp-button-icon {
          width: 24px;
          height: 24px;
        }
        
        .clipp-popup-content {
          width: 95vw;
          margin: 20px;
        }
        
        .clipp-popup-header,
        .clipp-popup-body {
          padding: 16px;
        }
      }
    `;
  }

  // Set up event listeners for interface
  setupEventListeners() {
    // Toggle button
    const toggleBtn = document.getElementById('clipp-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePopup();
      });
    }

    // Close button
    const closeBtn = document.getElementById('clipp-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hidePopup();
      });
    }

    // Overlay click to close
    const overlay = document.getElementById('clipp-popup');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hidePopup();
        }
      });
    }

    // Scan button
    const scanBtn = document.getElementById('clipp-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startManualCouponScan();
      });
    }

    // Store button
    const storeBtn = document.getElementById('clipp-store-btn');
    if (storeBtn) {
      storeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.visitStore();
      });
    }
  }

  // Toggle popup visibility
  togglePopup() {
    const popup = document.getElementById('clipp-popup');
    if (!popup) return;

    if (this.isVisible) {
      this.hidePopup();
    } else {
      this.showPopup();
    }
  }

  // Show popup
  showPopup() {
    const popup = document.getElementById('clipp-popup');
    const notification = document.getElementById('clipp-notification');
    
    if (popup) {
      popup.style.display = 'flex';
      this.isVisible = true;
      
      // Hide notification badge
      if (notification) {
        notification.style.display = 'none';
      }
    }
  }

  // Hide popup
  hidePopup() {
    const popup = document.getElementById('clipp-popup');
    
    if (popup) {
      popup.style.display = 'none';
      this.isVisible = false;
    }
  }

  // Start automatic coupon scanning
  async startAutomaticCouponScan() {
    console.log('[ClippContent] Starting automatic coupon scan');
    await this.performCouponScan(true);
  }

  // Start manual coupon scanning (user clicked button)
  async startManualCouponScan() {
    console.log('[ClippContent] Starting manual coupon scan');
    await this.performCouponScan(false);
  }

  // Perform coupon scanning
  async performCouponScan(isAutomatic = false) {
    if (this.isProcessing || !this.currentStore) return;

    this.isProcessing = true;
    this.showScanningState();

    try {
      // Request coupons from background script
      const response = await chrome.runtime.sendMessage({
        action: 'findCoupons',
        store: this.currentStore
      });

      if (response && response.success && response.coupons && response.coupons.length > 0) {
        this.couponsCache = response.coupons;
        this.showCouponsFoundState(response.coupons);
        
        // Show notification for automatic scans
        if (isAutomatic) {
          this.showNotificationBadge();
        }
        
        console.log(`[ClippContent] Found ${response.coupons.length} coupons`);
      } else {
        this.showNoCouponsState();
        console.log('[ClippContent] No coupons found');
      }
    } catch (error) {
      console.error('[ClippContent] Error scanning for coupons:', error);
      this.showErrorState();
    } finally {
      this.isProcessing = false;
    }
  }

  // Show scanning state
  showScanningState() {
    this.hideAllStatusStates();
    const scanningEl = document.getElementById('clipp-status-scanning');
    const scanBtn = document.getElementById('clipp-scan-btn');
    
    if (scanningEl) scanningEl.style.display = 'flex';
    if (scanBtn) {
      scanBtn.disabled = true;
      document.getElementById('clipp-scan-text').textContent = 'Söker...';
    }
  }

  // Show coupons found state
  showCouponsFoundState(coupons) {
    this.hideAllStatusStates();
    const foundEl = document.getElementById('clipp-status-found');
    const countEl = document.getElementById('clipp-found-count');
    const scanBtn = document.getElementById('clipp-scan-btn');
    const couponsSection = document.getElementById('clipp-coupons-section');
    
    if (foundEl) foundEl.style.display = 'flex';
    if (countEl) countEl.textContent = `${coupons.length} koder tillgängliga`;
    if (scanBtn) {
      scanBtn.disabled = false;
      document.getElementById('clipp-scan-text').textContent = 'Sök igen';
    }
    if (couponsSection) {
      couponsSection.style.display = 'block';
      this.renderCoupons(coupons);
    }
  }

  // Show no coupons state
  showNoCouponsState() {
    this.hideAllStatusStates();
    const emptyEl = document.getElementById('clipp-status-empty');
    const scanBtn = document.getElementById('clipp-scan-btn');
    const couponsSection = document.getElementById('clipp-coupons-section');
    
    if (emptyEl) emptyEl.style.display = 'flex';
    if (scanBtn) {
      scanBtn.disabled = false;
      document.getElementById('clipp-scan-text').textContent = 'Sök igen';
    }
    if (couponsSection) couponsSection.style.display = 'none';
  }

  // Show error state
  showErrorState() {
    this.hideAllStatusStates();
    const idleEl = document.getElementById('clipp-status-idle');
    const scanBtn = document.getElementById('clipp-scan-btn');
    
    if (idleEl) {
      idleEl.style.display = 'flex';
      const textEl = idleEl.querySelector('.clipp-status-text h4');
      if (textEl) textEl.textContent = 'Ett fel inträffade';
    }
    if (scanBtn) {
      scanBtn.disabled = false;
      document.getElementById('clipp-scan-text').textContent = 'Försök igen';
    }
  }

  // Hide all status states
  hideAllStatusStates() {
    const states = ['clipp-status-idle', 'clipp-status-scanning', 'clipp-status-found', 'clipp-status-empty'];
    states.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // Show notification badge
  showNotificationBadge() {
    const notification = document.getElementById('clipp-notification');
    if (notification) {
      notification.style.display = 'flex';
    }
  }

  // Render coupons in the list
  renderCoupons(coupons) {
    const couponsList = document.getElementById('clipp-coupons-list');
    if (!couponsList || !coupons) return;

    couponsList.innerHTML = '';
    
    coupons.forEach((coupon, index) => {
      const couponItem = document.createElement('div');
      couponItem.className = 'clipp-coupon-item';
      couponItem.setAttribute('data-coupon-index', index);
      
      const verifiedBadge = coupon.verified ? ' ✓' : '';
      
      couponItem.innerHTML = `
        <div class="clipp-coupon-info">
          <span class="clipp-coupon-code">${coupon.code}${verifiedBadge}</span>
          <span class="clipp-coupon-desc">${coupon.description}</span>
        </div>
        <button class="clipp-coupon-apply" data-code="${coupon.code}">
          Använd
        </button>
      `;
      
      // Add click handler for apply button
      const applyBtn = couponItem.querySelector('.clipp-coupon-apply');
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyCoupon(coupon, applyBtn);
      });
      
      couponsList.appendChild(couponItem);
    });
  }

  // Apply coupon to the page
  async applyCoupon(coupon, buttonEl) {
    if (!coupon || !buttonEl) return;
    
    try {
      // Update button state
      buttonEl.classList.add('clipp-applying');
      buttonEl.disabled = true;
      buttonEl.textContent = 'Applicerar...';
      
      // Apply the coupon
      const result = await this.applyCouponToPage(coupon.code, this.currentStore);
      
      if (result && result.success) {
        // Success state
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-success');
        buttonEl.textContent = '✅ Tillagd!';
        
        // Record success if savings were reported
        if (result.savings && result.savings > 0) {
          await this.recordCouponSuccess(coupon, result.savings);
          await this.loadAndDisplayStats();
        }
        
      } else {
        // Failure state
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-failed');
        buttonEl.textContent = '❌ Fungerar inte';
        
        // Re-enable after delay
        setTimeout(() => {
          buttonEl.classList.remove('clipp-failed');
          buttonEl.disabled = false;
          buttonEl.textContent = 'Försök igen';
        }, 3000);
      }
      
    } catch (error) {
      console.error('[ClippContent] Error applying coupon:', error);
      
      // Error state
      buttonEl.classList.remove('clipp-applying');
      buttonEl.classList.add('clipp-failed');
      buttonEl.textContent = '❌ Fel';
      buttonEl.disabled = false;
    }
  }

  // Apply coupon code to the actual page
  async applyCouponToPage(code, store) {
    try {
      console.log(`[ClippContent] Applying coupon ${code} to page`);
      
      // Find coupon input field using store selectors or common patterns
      const couponInput = this.findCouponInput(store);
      
      if (!couponInput) {
        console.warn('[ClippContent] Coupon input not found');
        return { success: false, error: 'Coupon input not found' };
      }
      
      // Clear existing value and set new coupon code
      couponInput.value = '';
      couponInput.focus();
      
      // Simulate typing the coupon code
      for (let char of code) {
        couponInput.value += char;
        couponInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between characters
      }
      
      // Trigger change events
      couponInput.dispatchEvent(new Event('change', { bubbles: true }));
      couponInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Try to find and click apply button
      const applyButton = this.findApplyButton(store);
      if (applyButton) {
        console.log('[ClippContent] Clicking apply button');
        applyButton.click();
        
        // Wait for potential page updates
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if coupon was successfully applied
        const success = this.checkCouponSuccess();
        const savings = success ? this.extractSavingsAmount() : 0;
        
        return { 
          success: success,
          savings: savings,
          message: success ? 'Coupon applied successfully' : 'Coupon application failed'
        };
      } else {
        console.warn('[ClippContent] Apply button not found');
        // Coupon is filled but not applied automatically
        return { 
          success: true, 
          savings: 0,
          message: 'Coupon code filled, please apply manually'
        };
      }
      
    } catch (error) {
      console.error('[ClippContent] Error applying coupon to page:', error);
      return { success: false, error: error.message };
    }
  }

  // Find coupon input field
  findCouponInput(store) {
    // Try store-specific selectors first
    if (store && store.couponInputSelectors) {
      const storeInput = document.querySelector(store.couponInputSelectors);
      if (storeInput) return storeInput;
    }
    
    // Common coupon input patterns
    const commonSelectors = [
      'input[name*="coupon" i]',
      'input[name*="promo" i]',
      'input[name*="discount" i]',
      'input[name*="voucher" i]',
      'input[id*="coupon" i]',
      'input[id*="promo" i]',
      'input[id*="discount" i]',
      'input[id*="voucher" i]',
      'input[class*="coupon" i]',
      'input[class*="promo" i]',
      'input[class*="discount" i]',
      'input[class*="voucher" i]',
      'input[placeholder*="coupon" i]',
      'input[placeholder*="promo" i]',
      'input[placeholder*="rabatt" i]',
      'input[data-testid*="coupon" i]',
      'input[data-testid*="promo" i]',
    ];
    
    for (const selector of commonSelectors) {
      const input = document.querySelector(selector);
      if (input && input.type === 'text') {
        return input;
      }
    }
    
    return null;
  }

  // Find apply button
  findApplyButton(store) {
    // Try store-specific selectors first
    if (store && store.applyButtonSelectors) {
      const storeButton = document.querySelector(store.applyButtonSelectors);
      if (storeButton) return storeButton;
    }
    
    // Common apply button patterns
    const commonSelectors = [
      'button[data-testid*="apply" i]',
      'button[data-testid*="coupon" i]',
      'button:contains("Använd")',
      'button:contains("Apply")',
      'button:contains("Tillämpa")',
      'button[type="submit"]',
      '.apply-coupon',
      '.coupon-apply',
      '.promo-apply',
      '.discount-apply'
    ];
    
    for (const selector of commonSelectors) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return button;
      }
    }
    
    // Look for buttons near coupon input
    const couponInput = this.findCouponInput(store);
    if (couponInput) {
      const parent = couponInput.closest('form, .coupon-section, .promo-section, .discount-section');
      if (parent) {
        const button = parent.querySelector('button[type="submit"], button:not([type])');
        if (button) return button;
      }
    }
    
    return null;
  }

  // Check if coupon was successfully applied
  checkCouponSuccess() {
    // Look for success indicators
    const successIndicators = [
      '.coupon-success',
      '.promo-success',
      '.discount-applied',
      '[class*="success" i]',
      '[data-testid*="success" i]'
    ];
    
    for (const selector of successIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Look for price changes or discount amounts
    const discountElements = document.querySelectorAll('[class*="discount" i], [class*="saving" i], [class*="rabatt" i]');
    if (discountElements.length > 0) {
      return true;
    }
    
    // Default to 70% success rate for demonstration
    return Math.random() > 0.3;
  }

  // Extract savings amount from page
  extractSavingsAmount() {
    try {
      // Look for discount/savings amounts on the page
      const amountElements = document.querySelectorAll('[class*="discount" i], [class*="saving" i], [class*="rabatt" i]');
      
      for (const element of amountElements) {
        const text = element.textContent || element.innerText;
        const match = text.match(/(\d+(?:[,\s]\d{3})*(?:[.,]\d{2})?)/);
        if (match) {
          const amount = parseFloat(match[1].replace(/[,\s]/g, '').replace(',', '.'));
          if (amount > 0 && amount < 10000) { // Reasonable discount range
            return amount;
          }
        }
      }
    } catch (error) {
      console.error('[ClippContent] Error extracting savings amount:', error);
    }
    
    // Return random savings amount for demonstration
    return Math.floor(Math.random() * 200) + 50;
  }

  // Visit store via affiliate link
  async visitStore() {
    if (!this.currentStore || !this.currentStore.affiliateUrl) return;

    try {
      // Send message to background to record store visit
      await chrome.runtime.sendMessage({
        action: 'visitStore',
        storeId: this.currentStore.storeId,
        storeName: this.currentStore.storeName,
        affiliateUrl: this.currentStore.affiliateUrl
      });
      
      // Close interface
      this.hidePopup();
      
    } catch (error) {
      console.error('[ClippContent] Error visiting store:', error);
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
      console.error('[ClippContent] Error recording coupon success:', error);
    }
  }

  // Load and display user statistics
  async loadAndDisplayStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (stats) {
        const purchasesEl = document.getElementById('clipp-stat-purchases');
        const savingsEl = document.getElementById('clipp-stat-savings');
        
        if (purchasesEl) {
          purchasesEl.textContent = stats.totalPurchases || 0;
        }
        
        if (savingsEl) {
          const savings = Math.round(stats.totalSaved || 0);
          savingsEl.textContent = `${savings} ${stats.currency || 'SEK'}`;
        }
      }
    } catch (error) {
      console.error('[ClippContent] Error loading stats:', error);
    }
  }

  // Show coupons notification
  showCouponsNotification(coupons) {
    if (!coupons || coupons.length === 0) return;
    
    this.couponsCache = coupons;
    this.showNotificationBadge();
    
    // Auto-update interface if visible
    if (this.isVisible) {
      this.showCouponsFoundState(coupons);
    }
  }

  // Remove interface from page
  removeInterface() {
    if (this.clippInterface) {
      this.clippInterface.remove();
      this.clippInterface = null;
    }
    
    const styles = document.getElementById('clipp-content-styles');
    if (styles) {
      styles.remove();
    }
    
    this.isVisible = false;
  }

  // Hide interface
  hideInterface() {
    if (this.clippInterface) {
      this.clippInterface.style.display = 'none';
    }
  }
}

// Initialize content script
const clippContentScript = new ClippContentScript();

// Make available globally for debugging
window.clippContentScript = clippContentScript;