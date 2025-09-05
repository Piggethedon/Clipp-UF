# Clipp Chrome Extension

Clipp is a Chrome extension that automatically finds and applies coupon codes for Swedish online stores, helping users save money while shopping.

## Features

- 🔍 **Automatic coupon detection** - Scans for available coupon codes on supported stores
- 💰 **One-click coupon application** - Apply coupon codes with a single click
- 🏪 **Store affiliate support** - Direct links to stores with affiliate support
- 📊 **Savings tracking** - Keep track of your total savings
- 🌐 **Multi-language support** - Swedish and English languages
- 🎨 **Clean, modern UI** - Blue and white design with smooth animations

## Supported Stores

- Zalando
- Apotea
- Boozt
- CDON
- H&M
- Stadium

## Installation

### For Development/Testing

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The Clipp extension should now appear in your browser toolbar

### For Production

The extension can be published to the Chrome Web Store following Google's guidelines.

## Configuration

### Adding/Editing Stores

To add new stores or modify affiliate links, edit the `config/stores.json` file:

```json
{
  "stores": [
    {
      "id": "store-id",
      "name": "Store Name", 
      "domain": "store.com",
      "url": "https://www.store.com",
      "affiliateUrl": "https://www.store.com?ref=clipp",
      "logo": "logo-url",
      "category": "Category",
      "color": "#hexcolor",
      "active": true,
      "selectors": {
        "coupon_input": "#coupon-field",
        "apply_button": ".apply-btn",
        "cart_button": ".add-to-cart",
        "checkout_button": ".checkout"
      },
      "url_patterns": [
        "*://store.com/*",
        "*://www.store.com/*"
      ]
    }
  ]
}
```

### Store Configuration Fields

- **id**: Unique identifier for the store
- **name**: Display name shown in the UI
- **domain**: Primary domain to match against current tab
- **url**: Regular store URL
- **affiliateUrl**: Affiliate URL (can be same as url initially, replace when you get affiliate links)
- **logo**: URL to store logo image
- **category**: Store category for grouping
- **color**: Brand color in hex format
- **active**: Boolean to enable/disable the store
- **selectors**: CSS selectors for coupon input, apply button, etc.
- **url_patterns**: Array of URL patterns to match

### Adding Affiliate Links

When you get affiliate links from networks like Adtraction or Awin:

1. Open `config/stores.json`
2. Find the store you want to update
3. Replace the `affiliateUrl` with your new affiliate link
4. Save the file

Example:
```json
{
  "id": "zalando",
  "name": "Zalando",
  "url": "https://www.zalando.se",
  "affiliateUrl": "https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&p=https://www.zalando.se"
}
```

### Language Support

The extension supports Swedish (default) and English. Language files are located in:
- `locales/sv.json` (Swedish)
- `locales/en.json` (English)

To add new text strings, add them to both language files with the same key structure.

## File Structure

```
chrome-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── content.js            # Content script for web pages  
├── popup.html            # Extension popup HTML
├── popup.js              # Popup JavaScript
├── popup.css             # Popup styles
├── content.css           # Content script styles
├── config/
│   └── stores.json       # Store configuration
├── locales/
│   ├── sv.json          # Swedish translations
│   └── en.json          # English translations
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Development

The extension is built with vanilla JavaScript and follows Chrome Extension Manifest V3 standards.

### Key Components

- **Background Script**: Handles extension lifecycle, coupon finding, and message passing
- **Content Script**: Injected into store pages to apply coupons
- **Popup**: Extension interface shown when clicking the toolbar icon

### Testing

1. Load the extension in development mode
2. Navigate to a supported store
3. Click the Clipp extension icon
4. Test coupon scanning and application

## Privacy & Permissions

The extension requires the following permissions:
- `activeTab`: To interact with the current tab
- `storage`: To save user preferences and statistics  
- `tabs`: To open store links

The extension only activates on supported store domains and does not collect personal data.

## Version History

- **v1.0.0**: Initial release with coupon scanning and affiliate store links