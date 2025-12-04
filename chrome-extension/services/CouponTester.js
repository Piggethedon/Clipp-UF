// Clipp Coupon Tester - Automatically tests coupon codes on checkout pages
class CouponTester {
  constructor() {
    this.isTestingInProgress = false;
    this.testResults = new Map();
    this.testDelay = 2000; // Delay between tests in ms
    
    // Selectors for different stores' coupon input fields
    this.couponInputSelectors = [
      // Generic selectors
      'input[name*="coupon"]',
      'input[name*="voucher"]',
      'input[name*="promo"]',
      'input[name*="discount"]',
      'input[name*="rabatt"]',
      'input[name*="kod"]',
      'input[id*="coupon"]',
      'input[id*="voucher"]',
      'input[id*="promo"]',
      'input[id*="discount"]',
      'input[placeholder*="rabattkod"]',
      'input[placeholder*="coupon"]',
      'input[placeholder*="promo"]',
      'input[placeholder*="voucher"]',
      'input[placeholder*="discount"]',
      'input[aria-label*="coupon"]',
      'input[aria-label*="rabatt"]',
      // Specific stores
      '[data-testid="coupon-input"]',
      '[data-testid="promo-code-input"]',
      '.coupon-input input',
      '.promo-code input',
      '.discount-code input',
      '#coupon-code',
      '#promo-code',
      '#discount-code',
      '#rabattkod',
      '.checkout-coupon input',
      '.cart-coupon input'
    ];
    
    // Selectors for apply buttons
    this.applyButtonSelectors = [
      'button[type="submit"]',
      'button:contains("Applicera")',
      'button:contains("Använd")',
      'button:contains("Apply")',
      'button:contains("Lägg till")',
      '[data-testid="apply-coupon"]',
      '[data-testid="apply-promo"]',
      '.coupon-apply',
      '.promo-apply',
      '.apply-coupon',
      '.apply-promo',
      '#apply-coupon',
      '#apply-promo'
    ];
    
    // Selectors for success/error messages
    this.successIndicators = [
      '.coupon-success',
      '.promo-success',
      '.discount-applied',
      '[class*="success"]',
      '[class*="applied"]',
      '.alert-success',
      '.message-success'
    ];
    
    this.errorIndicators = [
      '.coupon-error',
      '.promo-error',
      '.discount-error',
      '[class*="error"]',
      '[class*="invalid"]',
      '.alert-error',
      '.alert-danger',
      '.message-error'
    ];
    
    // Selectors for price/total elements
    this.priceSelectors = [
      '.order-total',
      '.cart-total',
      '.checkout-total',
      '[data-testid="total"]',
      '[data-testid="order-total"]',
      '.total-price',
      '.grand-total',
      '#order-total',
      '.summary-total'
    ];
  }

  // Find coupon input field on the page
  findCouponInput() {
    for (const selector of this.couponInputSelectors) {
      try {
        const input = document.querySelector(selector);
        if (input && this.isElementVisible(input)) {
          console.log(`[CouponTester] Found coupon input: ${selector}`);
          return input;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  // Find apply button near the coupon input
  findApplyButton(couponInput) {
    if (!couponInput) return null;

    // First, try to find button in the same container
    const container = couponInput.closest('form') || 
                      couponInput.closest('div') || 
                      couponInput.parentElement;

    if (container) {
      // Look for button with submit type
      let button = container.querySelector('button[type="submit"]');
      if (button && this.isElementVisible(button)) return button;

      // Look for any button in container
      button = container.querySelector('button');
      if (button && this.isElementVisible(button)) return button;

      // Look for input type submit
      const submitInput = container.querySelector('input[type="submit"]');
      if (submitInput && this.isElementVisible(submitInput)) return submitInput;
    }

    // Try other selectors
    for (const selector of this.applyButtonSelectors) {
      try {
        if (selector.includes(':contains')) continue; // Skip jQuery-style selectors
        const button = document.querySelector(selector);
        if (button && this.isElementVisible(button)) {
          console.log(`[CouponTester] Found apply button: ${selector}`);
          return button;
        }
      } catch (e) {
        continue;
      }
    }

    // Find button by text content
    const allButtons = document.querySelectorAll('button, input[type="submit"]');
    const buttonTexts = ['applicera', 'använd', 'apply', 'lägg till', 'add', 'ok', '→'];
    
    for (const btn of allButtons) {
      const text = (btn.textContent || btn.value || '').toLowerCase();
      if (buttonTexts.some(t => text.includes(t)) && this.isElementVisible(btn)) {
        return btn;
      }
    }

    return null;
  }

  // Check if element is visible
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  // Get current order total
  getCurrentTotal() {
    for (const selector of this.priceSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent;
          // Extract number from text
          const match = text.match(/[\d\s,.]+/);
          if (match) {
            const value = parseFloat(match[0].replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(value)) {
              return value;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  // Check for success message
  checkForSuccess() {
    for (const selector of this.successIndicators) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  // Check for error message
  checkForError() {
    for (const selector of this.errorIndicators) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  // Simulate typing in input field
  async typeInInput(input, text) {
    // Clear the input first
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Type character by character for more realistic simulation
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await this.delay(30 + Math.random() * 20); // Random delay for realistic typing
    }
    
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Click a button
  async clickButton(button) {
    button.focus();
    
    // Dispatch mouse events
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    
    // Also try direct click
    if (typeof button.click === 'function') {
      button.click();
    }
  }

  // Wait for page to update
  async waitForPageUpdate(timeout = 3000) {
    return new Promise((resolve) => {
      let resolved = false;
      
      // Create mutation observer
      const observer = new MutationObserver(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          setTimeout(resolve, 500); // Wait a bit more after mutation
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve();
        }
      }, timeout);
    });
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test a single coupon code
  async testCoupon(code, store) {
    console.log(`[CouponTester] Testing coupon: ${code}`);
    
    const couponInput = this.findCouponInput();
    if (!couponInput) {
      console.log('[CouponTester] No coupon input found');
      return { success: false, error: 'no_input_found', code };
    }
    
    const applyButton = this.findApplyButton(couponInput);
    if (!applyButton) {
      console.log('[CouponTester] No apply button found');
      return { success: false, error: 'no_button_found', code };
    }
    
    // Get initial total
    const initialTotal = this.getCurrentTotal();
    
    try {
      // Type the coupon code
      await this.typeInInput(couponInput, code);
      await this.delay(500);
      
      // Click apply button
      await this.clickButton(applyButton);
      
      // Wait for page to update
      await this.waitForPageUpdate();
      
      // Check results
      const hasSuccess = this.checkForSuccess();
      const hasError = this.checkForError();
      const newTotal = this.getCurrentTotal();
      
      let savings = 0;
      if (initialTotal && newTotal && newTotal < initialTotal) {
        savings = initialTotal - newTotal;
      }
      
      const result = {
        code,
        success: hasSuccess || (savings > 0),
        error: hasError ? 'invalid_code' : null,
        savings,
        initialTotal,
        newTotal
      };
      
      console.log(`[CouponTester] Test result for ${code}:`, result);
      
      // Store result
      this.testResults.set(code, result);
      
      // Clear the input for next test if failed
      if (!result.success) {
        couponInput.value = '';
        couponInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      return result;
      
    } catch (error) {
      console.error(`[CouponTester] Error testing ${code}:`, error);
      return { success: false, error: error.message, code };
    }
  }

  // Test multiple coupons and find the best one
  async testMultipleCoupons(coupons, store, onProgress) {
    if (this.isTestingInProgress) {
      return { error: 'test_in_progress' };
    }
    
    this.isTestingInProgress = true;
    this.testResults.clear();
    
    const results = [];
    let bestResult = null;
    
    try {
      for (let i = 0; i < coupons.length; i++) {
        const coupon = coupons[i];
        
        // Notify progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: coupons.length,
            code: coupon.code,
            status: 'testing'
          });
        }
        
        // Test the coupon
        const result = await this.testCoupon(coupon.code, store);
        results.push(result);
        
        // Update best result
        if (result.success) {
          if (!bestResult || result.savings > bestResult.savings) {
            bestResult = result;
          }
        }
        
        // Delay between tests
        if (i < coupons.length - 1) {
          await this.delay(this.testDelay);
        }
      }
      
      // Notify completion
      if (onProgress) {
        onProgress({
          current: coupons.length,
          total: coupons.length,
          status: 'complete',
          bestResult
        });
      }
      
      return {
        results,
        bestResult,
        testedCount: coupons.length,
        successCount: results.filter(r => r.success).length
      };
      
    } finally {
      this.isTestingInProgress = false;
    }
  }

  // Check if we're on a checkout page
  isCheckoutPage() {
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

  // Detect if coupon form is visible
  hasCouponForm() {
    return this.findCouponInput() !== null;
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.CouponTester = CouponTester;
}
