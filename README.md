# 🛒 Clipp - Swedish Discount Code Assistant

Clipp is a Chrome extension that automatically finds and applies discount codes for Swedish online stores. Based on the Syrup project, Clipp helps Swedish shoppers save money by automatically testing available coupon codes during checkout.

## ✨ Features

- **Automatic Coupon Testing**: Tests discount codes on supported store checkouts with animated progress
- **Real-time Code Discovery**: Shows current available codes when visiting stores  
- **Statistics Tracking**: Tracks purchases and savings in `chrome.storage.local`
- **Multi-language Support**: Swedish (default) and English with flag switching
- **120+ Supported Stores**: Major Swedish and international retailers across all categories
- **Manual Purchase Tracking**: "Mark as purchased" button for manual tracking
- **Modern UI**: Blue (#3b82f6) and white design with rounded corners and animations
- **Three-Section Popup**: Ongoing code testing, active deals, and user statistics

## 📦 Installation

### Installation locally
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → Select the project folder
4. Extension is installed and can be tested directly
5. Verify Clipp icon appears in toolbar

### Adding a new store
1. Open `config/stores.json`
2. Add new object with `id`, `name`, `domainPatterns`, `couponInputSelectors`, `applyButtonSelectors`
3. Save file and reload extension in `chrome://extensions/`
4. New store will be automatically supported

Example store structure:
```json
{
  "id": "example",
  "name": "Example Store", 
  "domain": "example.com",
  "category": "Mode & Skönhet",
  "color": "#3b82f6",
  "active": true,
  "selectors": {
    "coupon_input": "input[name='voucher']", 
    "apply_button": "button.applyVoucher",
    "cart_button": ".add-to-cart",
    "checkout_button": ".checkout"
  },
  "url_patterns": [
    "https://example.com/*",
    "https://www.example.com/*"
  ]
}
```

### Updating discount codes
- Codes can be stored in a separate JSON file or fetched via API
- Built-in module for integration with couponfollow.com and other sources
- Change file → reload extension to update codes
- System automatically fetches fresh codes when available

### Publishing to Chrome Web Store
1. Create ZIP of the project folder
2. Upload via Chrome Developer Dashboard  
3. Fill in title, description, screenshots, privacy policy
4. Submit for review (review time: 1-7 days)

## 🏪 Supported Stores (120+)

### Mode & Skönhet (25 stores)
Zalando, Boozt, NA-KD, Nelly, Ellos, H&M, Åhléns, Gina Tricot, KappAhl, Lindex, Dressmann, Cubus, Bubbleroom, Stadium, XXL, JD Sports, Nike, Adidas, Foot Locker, Monki, COS, Arket, Acne Studios, Mango, Zara

### Elektronik (20 stores)  
CDON, NetOnNet, Webhallen, Dustin, Komplett, MediaMarkt, Elgiganten, Teknikmagasinet, Kjell & Company, Inet, Apple Store, Samsung, Sony, Microsoft Store, Lenovo, HP, Logitech, OnePlus, Philips, LG

### Böcker & Media (10 stores)
Adlibris, Bokus, Akademibokhandeln, Discshop, CDJapan, Audible, Storytel, Nextory, Bookbeat, SF Anytime

### Hem & Inredning (20 stores)
IKEA, Jotex, Hemtex, RoyalDesign, Cervera, Nordic Nest, Mio, Furniturebox, Confident Living, Rum21, Desenio, Granit, Lagerhaus, Hafa, Byggmax, Bauhaus, Hornbach, Clas Ohlson, Plantagen, Chilli

### Skönhet & Hälsa (15 stores)
Lyko, KICKS, Apotea, Apotek Hjärtat, Kronans Apotek, Sephora, NordicFeel, Cocopanda, Yves Rocher, The Body Shop, Dermosil, Hudoteket, Eleven, Skincity, Glossybox

### Barn & Leksaker (10 stores)
Jollyroom, Lekia, Babyshop, Babyland, Lego, BR Leksaker, Toys R Us, Barnparadiset, MICKI, Fisher-Price

### Resor & Transport (10 stores)
SJ, SAS, Norwegian, Flixbus, Booking.com, Hotels.com, Expedia, Hertz, Avis, Sixt

### Mat & Livsmedel (10 stores)
Mathem, Coop Online, ICA Online, Willys, Hemköp, Godis365, Matsmart, CityGross, Delitea, Apotea (kosttillskott)

### Internationellt (10 stores)
Amazon.se, eBay, Aliexpress, Wish, Shein, Etsy, Zalando Lounge, Asos, Farfetch, Net-a-Porter

**Total: ~120 butiker** - *Complete configuration available in `config/stores.json`*

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