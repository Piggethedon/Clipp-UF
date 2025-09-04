# 🚀 Clipp Chrome Extension - Installation Guide

Follow these simple steps to install and test the Clipp Chrome extension.

## 📋 Prerequisites

- Google Chrome browser (latest version recommended)
- Basic computer skills

## 🔧 Installation Steps

### 1. Download the Extension

- Download all the files from this project to a folder on your computer
- Make sure you have all these files:
  - `manifest.json`
  - `background.js`
  - `content.js`
  - `content.css`
  - `popup.html`
  - `popup.js`
  - `popup.css`
  - `config/stores.json`
  - `locales/sv.json`
  - `locales/en.json`
  - `icons/` folder with all icon files

### 2. Enable Developer Mode

1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. In the top-right corner, toggle ON the "Developer mode" switch

### 3. Load the Extension

1. Click the **"Load unpacked"** button
2. Navigate to and select the folder containing your Clipp extension files
3. Click **"Select Folder"** (Windows/Linux) or **"Open"** (Mac)

### 4. Verify Installation

✅ You should now see the Clipp extension in your extensions list  
✅ The Clipp icon should appear in your Chrome toolbar  
✅ The extension should show as "Enabled"

## 🧪 Testing the Extension

### Test the Popup
1. Click the Clipp icon in your Chrome toolbar
2. The popup should open showing:
   - Clipp logo and tagline
   - Language switcher (Swedish/English flags)
   - Statistics section (showing 0 purchases, 0 saved)
   - Supported stores grid

### Test on Supported Stores
1. Visit one of the supported stores:
   - https://zalando.se
   - https://adlibris.com
   - https://lyko.com
   - https://cdon.se
   - https://tradera.com

2. Look for:
   - Clipp floating button (bottom-right corner)
   - Notification indicator on the button
   - Extension popup showing "ready to help" status

### Test Coupon Discovery
1. On a supported store page, click the Clipp floating button
2. The extension should show "Searching for discount codes..."
3. After a few seconds, it may show found coupons or "no coupons found"

## 🐛 Troubleshooting

### Extension Not Loading
- **Check file structure**: Ensure `manifest.json` is in the root folder
- **Reload extension**: Go to `chrome://extensions/`, find Clipp, click the reload button (🔄)
- **Check console**: Click "Errors" next to the extension to see any error messages

### Icon Not Showing
- **Refresh Chrome**: Restart your browser after installation
- **Check permissions**: Extension needs permission to run on websites
- **Verify files**: Make sure all icon files exist in the `icons/` folder

### Popup Not Working
- **Right-click extension icon** → Select "Inspect popup" to see console errors
- **Check JavaScript**: Ensure `popup.js` file is present and error-free

### Content Script Not Injecting
- **Check permissions**: Extension needs access to store websites
- **Open DevTools** on store page (F12) and check for JavaScript errors
- **Verify selectors**: Store websites may have changed their HTML structure

## 📝 Common Issues

| Problem | Solution |
|---------|----------|
| Extension grayed out | Visit a supported store website |
| Popup blank/white | Check browser console for JavaScript errors |
| Floating button not appearing | Reload the page and wait 2-3 seconds |
| Language switcher not working | Check if language files are properly loaded |
| Statistics not updating | Verify Chrome storage permissions |

## 🔄 Making Changes

After modifying any extension files:

1. Go to `chrome://extensions/`
2. Find the Clipp extension
3. Click the **reload button (🔄)**
4. Test your changes

## ✅ Success Indicators

When everything is working correctly, you should see:

- ✅ Clipp extension enabled in `chrome://extensions/`
- ✅ Clipp icon visible in Chrome toolbar  
- ✅ Popup opens when clicking the icon
- ✅ Floating button appears on supported store pages
- ✅ Language switcher functions (Swedish ↔ English)
- ✅ Statistics display (even if showing zeros initially)

## 🎯 Next Steps

Once installed successfully:
- Visit supported stores to test coupon discovery
- Try the language switcher functionality
- Check that statistics update after simulated purchases
- Test the floating button interface on different stores

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify all files are present and correctly named
3. Ensure Chrome is updated to the latest version
4. Try disabling other extensions that might conflict

---

**Happy shopping with Clipp!** 🛒💙