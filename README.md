# 🛒 Clipp - Swedish Discount Code Assistant

Clipp is a Chrome extension that automatically finds and applies discount codes for Swedish online stores. Based on the Syrup project, Clipp helps Swedish shoppers save money by automatically testing available coupon codes during checkout.

## ✨ Features

- **Automatic Coupon Testing**: Tests discount codes on supported store checkouts
- **Real-time Code Discovery**: Shows current available codes when visiting stores  
- **Statistics Tracking**: Tracks purchases and savings in `chrome.storage.local`
- **Multi-language Support**: Swedish (default) and English with flag switching
- **100+ Supported Stores**: Major Swedish and international retailers
- **Manual Purchase Tracking**: "Mark as purchased" button for manual tracking
- **Modern UI**: Blue (#3b82f6) and white design with animations

## 📦 Installation

### Local Installation
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → Select extension folder
4. Verify Clipp icon appears in toolbar

### Adding New Stores
1. Edit `config/stores.json`
2. Add store with selectors and URL patterns
3. Update `manifest.json` permissions
4. Reload extension at `chrome://extensions/`

### Publishing to Chrome Web Store
1. Create ZIP of project folder
2. Upload via Chrome Developer Dashboard
3. Fill in metadata and screenshots
4. Submit for review (1-7 days)

## 🏪 Supported Stores (100+)

**Mode & Skönhet**: Zalando, H&M, Nelly, Ellos, Åhléns, Gina Tricot, Weekday, COS, Monki
**Sport**: Stadium, XXL, Nike, Adidas, JD Sports, Foot Locker  
**Elektronik**: CDON, Webhallen, MediaMarkt, Apple Store, Samsung, Elgiganten
**Hem & Inredning**: IKEA, Jotex, Hemtex, RoyalDesign, Cervera, Nordic Nest
**Skönhet**: Lyko, KICKS, Apotea, Sephora, NordicFeel
**Övrigt**: Amazon.se, ASOS, Zara, Uniqlo, eBay, AliExpress

*Complete list in `config/stores.json`*

## 🛠️ Technical Structure

```
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker
├── content.js             # DOM interaction
├── popup.html/js/css      # Popup interface
├── config/stores.json     # Store configurations  
├── locales/sv.json        # Swedish translations
├── locales/en.json        # English translations
└── icons/                 # Extension and flag icons
```

## 📊 Statistics Tracking

Data stored in `chrome.storage.local`:
- Purchase count via Clipp
- Total amount saved (SEK)
- Transaction history with dates, stores, codes used

## 🔒 Privacy

- Only anonymous statistics saved locally
- No personal data sent to external servers
- Required permissions: `activeTab`, `storage`, `tabs`

## 📝 License

MIT License - Based on [Syrup](https://github.com/Abdallah-Alwarawreh/Syrup)

---

**Happy shopping with Clipp!** 🛒💙