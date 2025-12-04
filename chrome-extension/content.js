// Clipp Enhanced Content Script v1.1 - With Automatic Coupon Testing
class ClippContentScript {
  constructor() {
    this.currentStore = null;
    this.clippInterface = null;
    this.isProcessing = false;
    this.isVisible = false;
    this.couponsCache = [];
    this.couponTester = null;
    this.isOnCheckout = false;
    this.autoTestEnabled = true;
    
    this.init();
  }

  async init() {
    console.log('[ClippContent] Initializing content script v1.1');
    
    // Initialize coupon tester
    if (typeof CouponTester !== 'undefined') {
      this.couponTester = new CouponTester();
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Check if page is already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageReady());
    } else {
      this.onPageReady();
    }
  }

  onPageReady() {
    console.log('[ClippContent] Page ready');
    
    // Check if we're on a checkout page
    this.isOnCheckout = this.checkIfCheckoutPage();
    
    if (this.isOnCheckout) {
      console.log('[ClippContent] Checkout page detected');
    }
  }

  checkIfCheckoutPage() {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    const checkoutTerms = [
      'checkout', 'cart', 'varukorg', 'kassa', 'payment', 
      'betalning', 'order', 'bestall', 'confirm', 'bekrafta'
    ];
    
    return checkoutTerms.some(term => 
      url.includes(term) || pathname.includes(term)
    );
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'initializeClipp':
          await this.initializeForStore(request.store, request.isCheckout);
          sendResponse({ success: true });
          break;
          
        case 'couponsFound':
          this.handleCouponsFound(request.coupons, request.count);
          sendResponse({ success: true });
          break;
          
        case 'applyCouponToPage':
          const applyResult = await this.applyCouponToPage(request.code, request.store);
          sendResponse(applyResult);
          break;
          
        case 'testCouponOnPage':
          const testResult = await this.testCouponOnPage(request.code, request.store);
          sendResponse(testResult);
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

  // Handle coupons found from background
  handleCouponsFound(coupons, count) {
    this.couponsCache = coupons || [];
    
    if (count > 0) {
      this.showNotificationBadge();
      
      // If on checkout and auto-test enabled, start testing
      if (this.isOnCheckout && this.autoTestEnabled && this.couponTester) {
        setTimeout(() => {
          this.startAutomaticCouponTesting();
        }, 2000);
      }
    }
  }

  // Initialize for detected store
  async initializeForStore(store, isCheckout = false) {
    if (this.clippInterface || !store) return;
    
    console.log(`[ClippContent] Initializing for ${store.storeName}`);
    this.currentStore = store;
    this.isOnCheckout = isCheckout || this.checkIfCheckoutPage();
    
    try {
      await this.createClippInterface();
      await this.loadAndDisplayStats();
      
      // Auto-scan for coupons
      setTimeout(() => {
        this.startAutomaticCouponScan();
      }, 2000);
      
    } catch (error) {
      console.error('[ClippContent] Error initializing:', error);
    }
  }

  // Create floating interface
  async createClippInterface() {
    this.removeInterface();
    
    this.clippInterface = document.createElement('div');
    this.clippInterface.id = 'clipp-interface';
    this.clippInterface.innerHTML = this.getInterfaceHTML();
    
    document.body.appendChild(this.clippInterface);
    this.injectStyles();
    this.setupEventListeners();
    
    console.log('[ClippContent] Interface created');
  }

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
            <!-- Auto-Test Banner (shown on checkout) -->
            <div class="clipp-auto-test-banner" id="clipp-auto-test-banner" style="display: none;">
              <div class="clipp-auto-test-icon">🔄</div>
              <div class="clipp-auto-test-info">
                <h4 id="clipp-test-title">Automatisk kodtestning</h4>
                <p id="clipp-test-status">Testar rabattkoder...</p>
              </div>
              <div class="clipp-auto-test-progress">
                <div class="clipp-progress-bar" id="clipp-progress-bar"></div>
              </div>
            </div>
            
            <!-- Best Code Found -->
            <div class="clipp-best-code-section" id="clipp-best-code-section" style="display: none;">
              <div class="clipp-best-code-badge">⭐ Bästa koden</div>
              <div class="clipp-best-code-content">
                <span class="clipp-best-code" id="clipp-best-code">SAVE20</span>
                <span class="clipp-best-savings" id="clipp-best-savings">Sparar 150 kr</span>
              </div>
              <button class="clipp-apply-best-btn" id="clipp-apply-best-btn">Använd</button>
            </div>
            
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
              
              <div class="clipp-action-buttons">
                <button class="clipp-scan-btn" id="clipp-scan-btn">
                  <span id="clipp-scan-text">Sök rabattkoder</span>
                </button>
                ${this.isOnCheckout ? `
                <button class="clipp-test-btn" id="clipp-test-all-btn" style="display: none;">
                  <span>🧪 Testa alla koder</span>
                </button>
                ` : ''}
              </div>
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

  injectStyles() {
    if (document.getElementById('clipp-content-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'clipp-content-styles';
    styleSheet.textContent = this.getInterfaceCSS();
    document.head.appendChild(styleSheet);
  }

  getInterfaceCSS() {
    return `
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
        min-width: 20px;
        height: 20px;
        background: #22c55e;
        color: white;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        padding: 0 5px;
        animation: clipp-pulse 2s infinite;
      }
      
      @keyframes clipp-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
      
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
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      
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
      
      .clipp-close-btn:hover { background: rgba(255, 255, 255, 0.3); }
      
      .clipp-popup-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      /* Auto-Test Banner */
      .clipp-auto-test-banner {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 1px solid #f59e0b;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .clipp-auto-test-banner > div:first-child {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .clipp-auto-test-icon {
        font-size: 24px;
        animation: clipp-spin 1s linear infinite;
      }
      
      @keyframes clipp-spin {
        to { transform: rotate(360deg); }
      }
      
      .clipp-auto-test-info h4 {
        font-size: 14px;
        font-weight: 600;
        color: #92400e;
        margin: 0 0 2px 0;
      }
      
      .clipp-auto-test-info p {
        font-size: 12px;
        color: #b45309;
        margin: 0;
      }
      
      .clipp-auto-test-progress {
        height: 6px;
        background: rgba(0,0,0,0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .clipp-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #f59e0b, #d97706);
        border-radius: 3px;
        width: 0%;
        transition: width 0.3s ease;
      }
      
      /* Best Code Section */
      .clipp-best-code-section {
        background: linear-gradient(135deg, #dcfce7, #bbf7d0);
        border: 2px solid #22c55e;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .clipp-best-code-badge {
        font-size: 11px;
        font-weight: 700;
        color: #166534;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .clipp-best-code-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .clipp-best-code {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 20px;
        font-weight: 700;
        color: #166534;
      }
      
      .clipp-best-savings {
        font-size: 14px;
        color: #15803d;
        font-weight: 500;
      }
      
      .clipp-apply-best-btn {
        width: 100%;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
        border: none;
        padding: 14px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      }
      
      .clipp-apply-best-btn:hover {
        background: linear-gradient(135deg, #16a34a, #15803d);
        transform: translateY(-2px);
      }
      
      /* Status Section */
      .clipp-status-section { margin-bottom: 20px; }
      
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
      
      .clipp-action-buttons {
        display: flex;
        gap: 8px;
      }
      
      .clipp-scan-btn, .clipp-test-btn {
        flex: 1;
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
      
      .clipp-test-btn {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      
      .clipp-scan-btn:hover:not(:disabled),
      .clipp-test-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      
      .clipp-scan-btn:disabled, .clipp-test-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      /* Coupons Section */
      .clipp-coupons-section { margin-bottom: 20px; }
      
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
      
      .clipp-coupon-item.tested-success {
        border-color: #22c55e;
        background: linear-gradient(135deg, #dcfce7, #bbf7d0);
      }
      
      .clipp-coupon-item.tested-failed {
        border-color: #ef4444;
        background: linear-gradient(135deg, #fef2f2, #fee2e2);
        opacity: 0.7;
      }
      
      .clipp-coupon-info { flex: 1; }
      
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
      
      .clipp-coupon-test-result {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
      }
      
      .clipp-coupon-test-result.success {
        background: #22c55e;
        color: white;
      }
      
      .clipp-coupon-test-result.failed {
        background: #ef4444;
        color: white;
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
      
      .clipp-coupon-apply:disabled { opacity: 0.7; cursor: not-allowed; }
      .clipp-coupon-apply.clipp-applying { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .clipp-coupon-apply.clipp-success { background: linear-gradient(135deg, #10b981, #059669); }
      .clipp-coupon-apply.clipp-failed { background: linear-gradient(135deg, #ef4444, #dc2626); }
      
      /* Store Section */
      .clipp-store-section { margin-bottom: 20px; }
      
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
      }
      
      .clipp-store-icon { font-size: 16px; }
      
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
      
      .clipp-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: clipp-spin 1s linear infinite;
      }
      
      @media (max-width: 480px) {
        .clipp-floating-button {
          right: 16px;
          width: 48px;
          height: 48px;
        }
        .clipp-button-icon { width: 24px; height: 24px; }
        .clipp-popup-content { width: 95vw; margin: 20px; }
        .clipp-popup-header, .clipp-popup-body { padding: 16px; }
      }
    `;
  }

  setupEventListeners() {
    document.getElementById('clipp-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePopup();
    });

    document.getElementById('clipp-close')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hidePopup();
    });

    document.getElementById('clipp-popup')?.addEventListener('click', (e) => {
      if (e.target.id === 'clipp-popup') this.hidePopup();
    });

    document.getElementById('clipp-scan-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.startManualCouponScan();
    });

    document.getElementById('clipp-test-all-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.startAutomaticCouponTesting();
    });

    document.getElementById('clipp-store-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.visitStore();
    });

    document.getElementById('clipp-apply-best-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.applyBestCode();
    });
  }

  togglePopup() {
    if (this.isVisible) this.hidePopup();
    else this.showPopup();
  }

  showPopup() {
    const popup = document.getElementById('clipp-popup');
    const notification = document.getElementById('clipp-notification');
    
    if (popup) {
      popup.style.display = 'flex';
      this.isVisible = true;
      if (notification) notification.style.display = 'none';
    }
  }

  hidePopup() {
    const popup = document.getElementById('clipp-popup');
    if (popup) {
      popup.style.display = 'none';
      this.isVisible = false;
    }
  }

  showNotificationBadge() {
    const notification = document.getElementById('clipp-notification');
    if (notification && this.couponsCache.length > 0) {
      notification.textContent = this.couponsCache.length;
      notification.style.display = 'flex';
    }
  }

  // ==================== AUTOMATIC COUPON TESTING ====================

  async startAutomaticCouponTesting() {
    if (!this.couponTester || this.couponsCache.length === 0) {
      console.log('[ClippContent] No coupons to test or tester not available');
      return;
    }

    console.log('[ClippContent] Starting automatic coupon testing');
    
    // Show testing banner
    const banner = document.getElementById('clipp-auto-test-banner');
    const testAllBtn = document.getElementById('clipp-test-all-btn');
    if (banner) banner.style.display = 'block';
    if (testAllBtn) testAllBtn.style.display = 'none';

    try {
      const result = await this.couponTester.testMultipleCoupons(
        this.couponsCache,
        this.currentStore,
        (progress) => this.updateTestProgress(progress)
      );

      if (result.bestResult) {
        this.showBestCodeFound(result.bestResult);
      }

      // Update coupon list with test results
      this.updateCouponsWithTestResults(result.results);

    } catch (error) {
      console.error('[ClippContent] Error during automatic testing:', error);
    } finally {
      if (banner) banner.style.display = 'none';
    }
  }

  updateTestProgress(progress) {
    const statusEl = document.getElementById('clipp-test-status');
    const progressBar = document.getElementById('clipp-progress-bar');
    
    if (statusEl) {
      statusEl.textContent = `Testar ${progress.code}... (${progress.current}/${progress.total})`;
    }
    
    if (progressBar) {
      const percent = (progress.current / progress.total) * 100;
      progressBar.style.width = `${percent}%`;
    }
  }

  showBestCodeFound(bestResult) {
    const section = document.getElementById('clipp-best-code-section');
    const codeEl = document.getElementById('clipp-best-code');
    const savingsEl = document.getElementById('clipp-best-savings');
    
    if (section && codeEl && savingsEl) {
      codeEl.textContent = bestResult.code;
      savingsEl.textContent = bestResult.savings > 0 
        ? `Sparar ${Math.round(bestResult.savings)} kr`
        : 'Rabattkod fungerar!';
      section.style.display = 'block';
      
      // Store best code for apply button
      section.dataset.code = bestResult.code;
    }
  }

  applyBestCode() {
    const section = document.getElementById('clipp-best-code-section');
    const code = section?.dataset.code;
    
    if (code) {
      const coupon = this.couponsCache.find(c => c.code === code) || { code };
      this.applyCouponToPage(code, this.currentStore);
    }
  }

  updateCouponsWithTestResults(results) {
    const couponsList = document.getElementById('clipp-coupons-list');
    if (!couponsList) return;

    results.forEach(result => {
      const item = couponsList.querySelector(`[data-code="${result.code}"]`);
      if (item) {
        item.classList.remove('tested-success', 'tested-failed');
        item.classList.add(result.success ? 'tested-success' : 'tested-failed');
        
        // Add result badge
        let badge = item.querySelector('.clipp-coupon-test-result');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'clipp-coupon-test-result';
          item.querySelector('.clipp-coupon-info')?.appendChild(badge);
        }
        
        badge.className = `clipp-coupon-test-result ${result.success ? 'success' : 'failed'}`;
        badge.textContent = result.success 
          ? (result.savings > 0 ? `✓ -${Math.round(result.savings)} kr` : '✓ Fungerar')
          : '✗ Fungerar inte';
      }
    });
  }

  // Test a single coupon on page
  async testCouponOnPage(code, store) {
    if (!this.couponTester) {
      return { success: false, error: 'Coupon tester not available' };
    }
    
    return await this.couponTester.testCoupon(code, store);
  }

  // ==================== EXISTING METHODS ====================

  async startAutomaticCouponScan() {
    console.log('[ClippContent] Starting automatic coupon scan');
    await this.performCouponScan(true);
  }

  async startManualCouponScan() {
    console.log('[ClippContent] Starting manual coupon scan');
    await this.performCouponScan(false);
  }

  async performCouponScan(isAutomatic = false) {
    if (this.isProcessing || !this.currentStore) return;

    this.isProcessing = true;
    this.showScanningState();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'findCoupons',
        store: this.currentStore
      });

      if (response?.success && response?.coupons?.length > 0) {
        this.couponsCache = response.coupons;
        this.showCouponsFoundState(response.coupons);
        
        if (isAutomatic) {
          this.showNotificationBadge();
        }
        
        // Show test button if on checkout
        if (this.isOnCheckout) {
          const testBtn = document.getElementById('clipp-test-all-btn');
          if (testBtn) testBtn.style.display = 'block';
        }
        
      } else {
        this.showNoCouponsState();
      }
    } catch (error) {
      console.error('[ClippContent] Error scanning:', error);
      this.showErrorState();
    } finally {
      this.isProcessing = false;
    }
  }

  showScanningState() {
    this.hideAllStatusStates();
    const el = document.getElementById('clipp-status-scanning');
    const btn = document.getElementById('clipp-scan-btn');
    if (el) el.style.display = 'flex';
    if (btn) {
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Söker...';
    }
  }

  showCouponsFoundState(coupons) {
    this.hideAllStatusStates();
    const el = document.getElementById('clipp-status-found');
    const countEl = document.getElementById('clipp-found-count');
    const btn = document.getElementById('clipp-scan-btn');
    const section = document.getElementById('clipp-coupons-section');
    
    if (el) el.style.display = 'flex';
    if (countEl) countEl.textContent = `${coupons.length} kod${coupons.length > 1 ? 'er' : ''} tillgänglig${coupons.length > 1 ? 'a' : ''}`;
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Sök igen';
    }
    if (section) section.style.display = 'block';
    
    this.renderCoupons(coupons);
  }

  showNoCouponsState() {
    this.hideAllStatusStates();
    const el = document.getElementById('clipp-status-empty');
    const btn = document.getElementById('clipp-scan-btn');
    if (el) el.style.display = 'flex';
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Sök igen';
    }
  }

  showErrorState() {
    this.hideAllStatusStates();
    const el = document.getElementById('clipp-status-empty');
    const btn = document.getElementById('clipp-scan-btn');
    if (el) el.style.display = 'flex';
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Försök igen';
    }
  }

  hideAllStatusStates() {
    ['idle', 'scanning', 'found', 'empty'].forEach(state => {
      const el = document.getElementById(`clipp-status-${state}`);
      if (el) el.style.display = 'none';
    });
  }

  renderCoupons(coupons) {
    const list = document.getElementById('clipp-coupons-list');
    if (!list) return;

    list.innerHTML = '';
    
    coupons.forEach((coupon, index) => {
      const item = document.createElement('div');
      item.className = 'clipp-coupon-item';
      item.setAttribute('data-code', coupon.code);
      
      item.innerHTML = `
        <div class="clipp-coupon-info">
          <span class="clipp-coupon-code">${coupon.code}</span>
          <span class="clipp-coupon-desc">${coupon.description || ''}</span>
        </div>
        <button class="clipp-coupon-apply" data-code="${coupon.code}">Använd</button>
      `;
      
      item.querySelector('.clipp-coupon-apply')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyCouponToPage(coupon.code, this.currentStore, e.target);
      });
      
      list.appendChild(item);
    });
  }

  async applyCouponToPage(code, store, buttonEl = null) {
    console.log(`[ClippContent] Applying coupon: ${code}`);
    
    if (buttonEl) {
      buttonEl.classList.add('clipp-applying');
      buttonEl.disabled = true;
      buttonEl.textContent = 'Applicerar...';
    }

    try {
      // Try to use coupon tester to apply
      if (this.couponTester) {
        const result = await this.couponTester.testCoupon(code, store);
        
        if (buttonEl) {
          buttonEl.classList.remove('clipp-applying');
          if (result.success) {
            buttonEl.classList.add('clipp-success');
            buttonEl.textContent = 'Tillagd!';
          } else {
            buttonEl.classList.add('clipp-failed');
            buttonEl.textContent = 'Misslyckades';
            setTimeout(() => {
              buttonEl.classList.remove('clipp-failed');
              buttonEl.disabled = false;
              buttonEl.textContent = 'Använd';
            }, 2000);
          }
        }
        
        return result;
      }
      
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(code);
      
      if (buttonEl) {
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-success');
        buttonEl.textContent = 'Kopierad!';
      }
      
      return { success: true, copied: true };
      
    } catch (error) {
      console.error('[ClippContent] Error applying coupon:', error);
      
      if (buttonEl) {
        buttonEl.classList.remove('clipp-applying');
        buttonEl.classList.add('clipp-failed');
        buttonEl.textContent = 'Fel';
        setTimeout(() => {
          buttonEl.classList.remove('clipp-failed');
          buttonEl.disabled = false;
          buttonEl.textContent = 'Använd';
        }, 2000);
      }
      
      return { success: false, error: error.message };
    }
  }

  async loadAndDisplayStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      const purchasesEl = document.getElementById('clipp-stat-purchases');
      const savingsEl = document.getElementById('clipp-stat-savings');
      
      if (purchasesEl) purchasesEl.textContent = stats?.totalPurchases || 0;
      if (savingsEl) savingsEl.textContent = `${Math.round(stats?.totalSaved || 0)} SEK`;
    } catch (error) {
      console.error('[ClippContent] Error loading stats:', error);
    }
  }

  async visitStore() {
    if (!this.currentStore?.affiliateUrl) return;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'visitStore',
        storeId: this.currentStore.storeId,
        storeName: this.currentStore.storeName,
        affiliateUrl: this.currentStore.affiliateUrl
      });
    } catch (error) {
      console.error('[ClippContent] Error visiting store:', error);
    }
  }

  removeInterface() {
    const existing = document.getElementById('clipp-interface');
    if (existing) existing.remove();
  }

  hideInterface() {
    this.hidePopup();
  }

  showCouponsNotification(coupons) {
    this.couponsCache = coupons || [];
    if (coupons?.length > 0) {
      this.showNotificationBadge();
    }
  }
}

// Initialize
const clippContent = new ClippContentScript();
console.log('[ClippContent] Content script loaded v1.1');
