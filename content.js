// Clipp Content Script - Injected into store pages
class ClippContentScript {
  constructor() {
    this.currentStore = null;
    this.clippInterface = null;
    this.isProcessing = false;
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'initializeClipp':
        this.currentStore = request.store;
        await this.createClippInterface();
        sendResponse({ success: true });
        break;
        
      case 'applyCouponToPage':
        const result = await this.applyCouponToPage(request.code, request.store);
        sendResponse(result);
        break;
    }
  }

  async createClippInterface() {
    if (this.clippInterface || !this.currentStore) return;
    
    // Create floating Clipp button
    this.clippInterface = document.createElement('div');
    this.clippInterface.id = 'clipp-interface';
    this.clippInterface.innerHTML = `
      <div class="clipp-floating-button" id="clipp-toggle">
        <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Clipp" />
        <span class="clipp-notification" id="clipp-notification">!</span>
      </div>
      
      <div class="clipp-popup" id="clipp-popup" style="display: none;">
        <div class="clipp-header">
          <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Clipp" class="clipp-logo" />
          <h3>Clipp</h3>
          <button class="clipp-close" id="clipp-close">×</button>
        </div>
        
        <div class="clipp-content">
          <div class="clipp-status" id="clipp-status">
            <div class="clipp-scanning">
              <div class="clipp-spinner"></div>
              <span>Söker efter rabattkoder...</span>
            </div>
          </div>
          
          <div class="clipp-coupons" id="clipp-coupons" style="display: none;"></div>
          
          <div class="clipp-stats" id="clipp-stats">
            <h4>Din Clipp-statistik</h4>
            <div class="clipp-stat-item">
              <span class="clipp-stat-label">Köp via Clipp:</span>
              <span class="clipp-stat-value" id="clipp-purchases">0</span>
            </div>
            <div class="clipp-stat-item">
              <span class="clipp-stat-label">Totalt sparat:</span>
              <span class="clipp-stat-value" id="clipp-savings">0 SEK</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.clippInterface);
    
    // Add event listeners
    document.getElementById('clipp-toggle').addEventListener('click', () => {
      this.togglePopup();
    });
    
    document.getElementById('clipp-close').addEventListener('click', () => {
      this.hidePopup();
    });
    
    // Load and display user stats
    await this.loadUserStats();
    
    // Auto-scan for coupons
    setTimeout(() => {
      this.scanForCoupons();
    }, 2000);
  }

  togglePopup() {
    const popup = document.getElementById('clipp-popup');
    const isVisible = popup.style.display !== 'none';
    
    if (isVisible) {
      this.hidePopup();
    } else {
      this.showPopup();
    }
  }

  showPopup() {
    const popup = document.getElementById('clipp-popup');
    popup.style.display = 'block';
    
    // Remove notification indicator
    const notification = document.getElementById('clipp-notification');
    if (notification) {
      notification.style.display = 'none';
    }
  }

  hidePopup() {
    const popup = document.getElementById('clipp-popup');
    popup.style.display = 'none';
  }

  async scanForCoupons() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const statusEl = document.getElementById('clipp-status');
    const couponsEl = document.getElementById('clipp-coupons');
    
    try {
      // Show scanning state
      statusEl.innerHTML = `
        <div class="clipp-scanning">
          <div class="clipp-spinner"></div>
          <span>Söker efter rabattkoder...</span>
        </div>
      `;
      
      // Request coupons from background script
      const response = await chrome.runtime.sendMessage({
        action: 'findCoupons',
        store: this.currentStore
      });
      
      const coupons = response.coupons || [];
      
      if (coupons.length > 0) {
        // Show found coupons
        statusEl.style.display = 'none';
        couponsEl.style.display = 'block';
        
        couponsEl.innerHTML = `
          <h4>🎉 Rabattkoder hittade!</h4>
          <div class="clipp-coupon-list">
            ${coupons.map(coupon => `
              <div class="clipp-coupon-item" data-code="${coupon.code}">
                <div class="clipp-coupon-info">
                  <span class="clipp-coupon-code">${coupon.code}</span>
                  <span class="clipp-coupon-desc">${coupon.description}</span>
                </div>
                <button class="clipp-apply-btn" onclick="window.clippContentScript.applyCoupon('${coupon.code}', ${JSON.stringify(coupon).replace(/"/g, '&quot;')})">
                  Använd
                </button>
              </div>
            `).join('')}
          </div>
        `;
        
        // Show notification indicator
        const notification = document.getElementById('clipp-notification');
        if (notification) {
          notification.style.display = 'block';
        }
      } else {
        // No coupons found
        statusEl.innerHTML = `
          <div class="clipp-no-coupons">
            <span>Inga rabattkoder hittades för denna butik</span>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error scanning for coupons:', error);
      statusEl.innerHTML = `
        <div class="clipp-error">
          <span>Fel vid sökning efter rabattkoder</span>
        </div>
      `;
    } finally {
      this.isProcessing = false;
    }
  }

  async applyCoupon(code, couponData) {
    const couponItem = document.querySelector(`[data-code="${code}"]`);
    const applyBtn = couponItem.querySelector('.clipp-apply-btn');
    
    // Show applying state
    applyBtn.textContent = 'Applicerar...';
    applyBtn.disabled = true;
    
    try {
      const result = await this.applyCouponToPage(code, this.currentStore);
      
      if (result.success) {
        applyBtn.textContent = '✅ Tillagd!';
        applyBtn.classList.add('clipp-success');
        
        // Update statistics
        if (result.savings) {
          await chrome.runtime.sendMessage({
            action: 'updateStats',
            savings: result.savings,
            currency: 'SEK'
          });
          
          await this.loadUserStats();
        }
      } else {
        applyBtn.textContent = '❌ Fungerar inte';
        applyBtn.classList.add('clipp-failed');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      applyBtn.textContent = '❌ Fel';
      applyBtn.classList.add('clipp-failed');
    }
  }

  async applyCouponToPage(code, store) {
    try {
      // Find coupon input field using store selectors
      const couponInput = document.querySelector(
        store.selectors?.coupon_input || 
        'input[name*="coupon"], input[name*="promo"], input[id*="coupon"], input[id*="promo"], input[class*="coupon"], input[class*="promo"]'
      );
      
      if (!couponInput) {
        return { success: false, error: 'Coupon input not found' };
      }
      
      // Fill and apply coupon
      couponInput.value = code;
      couponInput.dispatchEvent(new Event('input', { bubbles: true }));
      couponInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Try to find and click apply button
      const applyButton = document.querySelector(
        'button[type="submit"]:not([disabled]), button:contains("Använd"), button:contains("Apply"), button:contains("Tillämpa")'
      );
      
      if (applyButton) {
        applyButton.click();
      }
      
      // Simulate successful application (in real implementation, check for success indicators)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock success with savings
      return { 
        success: Math.random() > 0.3, // 70% success rate for demo
        savings: Math.floor(Math.random() * 200) + 50 // Random savings 50-250 SEK
      };
      
    } catch (error) {
      console.error('Error applying coupon to page:', error);
      return { success: false, error: error.message };
    }
  }

  async loadUserStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (stats) {
        document.getElementById('clipp-purchases').textContent = stats.totalPurchases;
        document.getElementById('clipp-savings').textContent = `${stats.totalSaved} ${stats.currency}`;
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }
}

// Initialize content script
window.clippContentScript = new ClippContentScript();