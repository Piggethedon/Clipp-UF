// Clipp Statistics Service - Handles user statistics and analytics
class StatisticsService {
  constructor() {
    this.statsKey = 'clipp_user_stats';
    this.transactionLogKey = 'clipp_transaction_log';
    this.maxLogEntries = 1000; // Keep last 1000 transactions
  }

  // Initialize user statistics
  async initializeStats() {
    const stats = await chrome.storage.local.get([this.statsKey]);
    
    if (!stats[this.statsKey]) {
      const initialStats = {
        totalPurchases: 0,
        totalSaved: 0,
        currency: 'SEK',
        joinDate: Date.now(),
        lastUpdate: Date.now(),
        byCategory: {},
        byStore: {},
        topCoupons: []
      };

      await chrome.storage.local.set({ [this.statsKey]: initialStats });
      console.log('[StatisticsService] Initialized user statistics');
      return initialStats;
    }

    return stats[this.statsKey];
  }

  // Get current user statistics
  async getStats() {
    try {
      const stats = await chrome.storage.local.get([this.statsKey]);
      return stats[this.statsKey] || await this.initializeStats();
    } catch (error) {
      console.error('[StatisticsService] Error getting stats:', error);
      return await this.initializeStats();
    }
  }

  // Update statistics when a purchase is made via Clipp
  async recordPurchase(storeId, storeName, category, savings = 0, currency = 'SEK', couponCode = null) {
    try {
      const currentStats = await this.getStats();
      
      // Update main statistics
      currentStats.totalPurchases += 1;
      currentStats.totalSaved += parseFloat(savings) || 0;
      currentStats.currency = currency;
      currentStats.lastUpdate = Date.now();

      // Update category statistics
      if (category) {
        if (!currentStats.byCategory[category]) {
          currentStats.byCategory[category] = {
            purchases: 0,
            saved: 0
          };
        }
        currentStats.byCategory[category].purchases += 1;
        currentStats.byCategory[category].saved += parseFloat(savings) || 0;
      }

      // Update store statistics
      if (!currentStats.byStore[storeId]) {
        currentStats.byStore[storeId] = {
          storeName: storeName,
          purchases: 0,
          saved: 0,
          lastPurchase: null
        };
      }
      currentStats.byStore[storeId].purchases += 1;
      currentStats.byStore[storeId].saved += parseFloat(savings) || 0;
      currentStats.byStore[storeId].lastPurchase = Date.now();

      // Update top coupons
      if (couponCode && savings > 0) {
        this.updateTopCoupons(currentStats, couponCode, savings, storeName);
      }

      // Save updated statistics
      await chrome.storage.local.set({ [this.statsKey]: currentStats });

      // Log the transaction
      await this.logTransaction({
        type: 'purchase',
        storeId: storeId,
        storeName: storeName,
        category: category,
        savings: parseFloat(savings) || 0,
        currency: currency,
        couponCode: couponCode,
        timestamp: Date.now()
      });

      console.log(`[StatisticsService] Recorded purchase: ${storeName}, saved: ${savings} ${currency}`);
      
      return currentStats;
    } catch (error) {
      console.error('[StatisticsService] Error recording purchase:', error);
      throw error;
    }
  }

  // Record when a coupon is found (for engagement metrics)
  async recordCouponFound(storeId, storeName, couponCount, source = 'unknown') {
    try {
      await this.logTransaction({
        type: 'coupon_found',
        storeId: storeId,
        storeName: storeName,
        couponCount: couponCount,
        source: source,
        timestamp: Date.now()
      });

      console.log(`[StatisticsService] Recorded coupon found: ${storeName}, count: ${couponCount}`);
    } catch (error) {
      console.error('[StatisticsService] Error recording coupon found:', error);
    }
  }

  // Record when a coupon is applied (success/failure)
  async recordCouponApplication(storeId, storeName, couponCode, success, savings = 0) {
    try {
      await this.logTransaction({
        type: 'coupon_applied',
        storeId: storeId,
        storeName: storeName,
        couponCode: couponCode,
        success: success,
        savings: success ? parseFloat(savings) || 0 : 0,
        timestamp: Date.now()
      });

      console.log(`[StatisticsService] Recorded coupon application: ${couponCode}, success: ${success}`);
    } catch (error) {
      console.error('[StatisticsService] Error recording coupon application:', error);
    }
  }

  // Record when user visits a store via affiliate link
  async recordStoreVisit(storeId, storeName, affiliateUrl) {
    try {
      await this.logTransaction({
        type: 'store_visit',
        storeId: storeId,
        storeName: storeName,
        affiliateUrl: affiliateUrl,
        timestamp: Date.now()
      });

      console.log(`[StatisticsService] Recorded store visit: ${storeName}`);
    } catch (error) {
      console.error('[StatisticsService] Error recording store visit:', error);
    }
  }

  // Update top performing coupons
  updateTopCoupons(stats, couponCode, savings, storeName) {
    if (!stats.topCoupons) {
      stats.topCoupons = [];
    }

    // Find existing entry for this coupon
    let existingCoupon = stats.topCoupons.find(c => c.code === couponCode);
    
    if (existingCoupon) {
      existingCoupon.usageCount += 1;
      existingCoupon.totalSaved += savings;
      existingCoupon.lastUsed = Date.now();
    } else {
      stats.topCoupons.push({
        code: couponCode,
        storeName: storeName,
        usageCount: 1,
        totalSaved: savings,
        firstUsed: Date.now(),
        lastUsed: Date.now()
      });
    }

    // Sort by total saved and keep top 10
    stats.topCoupons.sort((a, b) => b.totalSaved - a.totalSaved);
    stats.topCoupons = stats.topCoupons.slice(0, 10);
  }

  // Log individual transactions for detailed analytics
  async logTransaction(transaction) {
    try {
      const log = await chrome.storage.local.get([this.transactionLogKey]);
      let transactions = log[this.transactionLogKey] || [];

      // Add new transaction
      transactions.push(transaction);

      // Keep only the most recent transactions
      if (transactions.length > this.maxLogEntries) {
        transactions = transactions.slice(-this.maxLogEntries);
      }

      await chrome.storage.local.set({ [this.transactionLogKey]: transactions });
    } catch (error) {
      console.error('[StatisticsService] Error logging transaction:', error);
    }
  }

  // Get transaction log for analytics
  async getTransactionLog(limit = 100, type = null, dateFrom = null, dateTo = null) {
    try {
      const log = await chrome.storage.local.get([this.transactionLogKey]);
      let transactions = log[this.transactionLogKey] || [];

      // Filter by type if specified
      if (type) {
        transactions = transactions.filter(t => t.type === type);
      }

      // Filter by date range if specified
      if (dateFrom) {
        transactions = transactions.filter(t => t.timestamp >= dateFrom);
      }
      if (dateTo) {
        transactions = transactions.filter(t => t.timestamp <= dateTo);
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp);

      // Limit results
      return transactions.slice(0, limit);
    } catch (error) {
      console.error('[StatisticsService] Error getting transaction log:', error);
      return [];
    }
  }

  // Get statistics summary for different time periods
  async getStatsSummary(period = '30d') {
    try {
      const stats = await this.getStats();
      const transactions = await this.getTransactionLog();

      let dateThreshold;
      switch (period) {
        case '7d':
          dateThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateThreshold = Date.now() - (30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateThreshold = Date.now() - (90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = 0; // All time
      }

      const periodTransactions = transactions.filter(t => t.timestamp >= dateThreshold);
      
      const summary = {
        period: period,
        totalStats: stats,
        periodStats: {
          purchases: periodTransactions.filter(t => t.type === 'purchase').length,
          saved: periodTransactions
            .filter(t => t.type === 'purchase')
            .reduce((sum, t) => sum + (t.savings || 0), 0),
          couponsFound: periodTransactions.filter(t => t.type === 'coupon_found').length,
          couponsApplied: periodTransactions.filter(t => t.type === 'coupon_applied' && t.success).length,
          storeVisits: periodTransactions.filter(t => t.type === 'store_visit').length
        },
        topStores: this.getTopStoresByPeriod(periodTransactions),
        topCategories: this.getTopCategoriesByPeriod(periodTransactions),
        conversionRate: this.calculateConversionRate(periodTransactions)
      };

      return summary;
    } catch (error) {
      console.error('[StatisticsService] Error getting stats summary:', error);
      return null;
    }
  }

  // Calculate conversion rate (purchases / store visits)
  calculateConversionRate(transactions) {
    const purchases = transactions.filter(t => t.type === 'purchase').length;
    const visits = transactions.filter(t => t.type === 'store_visit').length;
    
    return visits > 0 ? (purchases / visits * 100).toFixed(1) : 0;
  }

  // Get top stores by activity in a period
  getTopStoresByPeriod(transactions) {
    const storeActivity = {};
    
    transactions.forEach(t => {
      if (t.storeId && t.storeName) {
        if (!storeActivity[t.storeId]) {
          storeActivity[t.storeId] = {
            storeName: t.storeName,
            purchases: 0,
            saved: 0,
            visits: 0
          };
        }
        
        if (t.type === 'purchase') {
          storeActivity[t.storeId].purchases += 1;
          storeActivity[t.storeId].saved += t.savings || 0;
        } else if (t.type === 'store_visit') {
          storeActivity[t.storeId].visits += 1;
        }
      }
    });

    return Object.values(storeActivity)
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 5);
  }

  // Get top categories by activity in a period
  getTopCategoriesByPeriod(transactions) {
    const categoryActivity = {};
    
    transactions.forEach(t => {
      if (t.category && t.type === 'purchase') {
        if (!categoryActivity[t.category]) {
          categoryActivity[t.category] = {
            purchases: 0,
            saved: 0
          };
        }
        
        categoryActivity[t.category].purchases += 1;
        categoryActivity[t.category].saved += t.savings || 0;
      }
    });

    return Object.entries(categoryActivity)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 5);
  }

  // Export user data (for GDPR compliance)
  async exportUserData() {
    try {
      const stats = await chrome.storage.local.get([this.statsKey]);
      const log = await chrome.storage.local.get([this.transactionLogKey]);
      
      return {
        statistics: stats[this.statsKey] || {},
        transactions: log[this.transactionLogKey] || [],
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('[StatisticsService] Error exporting user data:', error);
      return null;
    }
  }

  // Clear user data (for GDPR compliance)
  async clearUserData() {
    try {
      await chrome.storage.local.remove([this.statsKey, this.transactionLogKey]);
      console.log('[StatisticsService] User data cleared');
      return true;
    } catch (error) {
      console.error('[StatisticsService] Error clearing user data:', error);
      return false;
    }
  }
}

// Make StatisticsService available globally
window.StatisticsService = StatisticsService;
