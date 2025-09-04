# Clipp - Chrome Extension 🛒💰

**Clipp** is a smart Chrome extension that automatically finds and applies discount codes for Swedish online stores. Save time and money on every purchase with our intelligent coupon discovery system.

## ✨ Features

- **🔍 Automatic Code Discovery**: Scans thousands of discount codes in seconds
- **🇸🇪 Swedish Store Support**: Specially optimized for Zalando, Adlibris, Lyko, CDON, and Tradera
- **📊 Purchase Statistics**: Track your savings and successful purchases
- **🌍 Multi-language Support**: Swedish (default) and English interface
- **⚡ Real-time Application**: Automatically applies codes during checkout
- **🔒 Privacy-focused**: All data stored locally on your device

## 🚀 Installation

### Manual Installation (Developer Mode)

1. **Download the Extension**
   - Download or clone this repository to your computer

2. **Install in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the project folder containing `manifest.json`
   - The Clipp extension should now appear in your extensions list

3. **Verify Installation**
   - Look for the Clipp icon in your Chrome toolbar
   - Visit a supported store (e.g., zalando.se) to test functionality

## 🛍️ Supported Stores

| Store | Category | Status |
|-------|----------|--------|
| **Zalando** | Fashion & Shoes | ✅ Active |
| **Adlibris** | Books & Media | ✅ Active |
| **Lyko** | Beauty & Cosmetics | ✅ Active |
| **CDON** | Electronics & Games | ✅ Active |
| **Tradera** | Auctions & Marketplace | ✅ Active |

## 📁 Project Structure

```
clipp-extension/
├── manifest.json              # Extension configuration (Manifest v3)
├── background.js             # Service worker for extension logic
├── content.js                # Content script injected into store pages
├── content.css               # Styles for content script UI
├── popup.html                # Extension popup interface
├── popup.js                  # Popup functionality
├── popup.css                 # Popup styles
├── config/
│   └── stores.json           # Store configurations and selectors
├── locales/
│   ├── sv.json              # Swedish translations
│   └── en.json              # English translations
└── icons/
    ├── icon16.png           # Extension icons
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    ├── flag-sv.png          # Language flags
    └── flag-en.png
```

## ⚙️ Configuration

### Adding New Stores

Edit `config/stores.json` to add support for additional stores:

```json
{
  "id": "new-store",
  "name": "New Store", 
  "domain": "newstore.com",
  "selectors": {
    "coupon_input": "input[name='coupon']",
    "apply_button": ".apply-coupon-btn"
  }
}
```

### Updating Languages

Modify `locales/sv.json` or `locales/en.json` to update interface text.

## 🔧 Development & Testing

1. **Make changes** to extension files
2. **Reload extension**: Go to `chrome://extensions/` → Find Clipp → Click reload 🔄
3. **Test**: Visit supported store websites

### Debug Console Access

- **Background Script**: `chrome://extensions/` → Clipp → "service worker" link
- **Content Script**: Browser DevTools (F12) on store pages
- **Popup**: Right-click extension icon → "Inspect popup"

## 🛡️ Privacy & Security

- All statistics stored locally on your device
- No personal data collection
- Minimal permissions requested
- Open source transparency

## 🛠️ Building for Chrome Web Store

1. Update version in `manifest.json`
2. Create zip file: `zip -r clipp-extension.zip . -x "*.git*" "README.md"`
3. Upload to Chrome Web Store Developer Dashboard

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension not working | Reload extension in `chrome://extensions/` |
| Popup not opening | Check for JavaScript errors in DevTools |
| Coupons not applying | Verify store selectors in `config/stores.json` |

## 📞 Support

- **Issues**: Create GitHub issues for bugs/feature requests
- **Email**: support@clipp.se
- **Website**: [clipp.se](https://clipp.se)

---

**Made with ❤️ for Swedish shoppers** 🇸🇪
