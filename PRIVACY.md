# Privacy Policy — Export to PDF for ChatGPT

*Official Web Version: [https://gauravdalvi.com/privacy/export-to-pdf-for-chatgpt](https://gauravdalvi.com/privacy/export-to-pdf-for-chatgpt)*

---

## 1. Zero Remote Transmission & Local Processing

The extension operates entirely client-side within your browser runtime. All conversation extraction, DOM virtualization handling, Markdown/syntax preservation, and print styling happen strictly in volatile local memory:

- **Zero Data Harvesting:** The extension does not record, track, log, transmit, sell, or monetize any user chat history, prompts, API keys, or personal account identifiers.
- **Complete Network Isolation:** The extension contains zero remote API calls, zero analytics beacons, zero tracking pixels, and zero background network pings.
- **User-Initiated Trigger:** The extension executes only when you explicitly invoke it while viewing an active ChatGPT tab.

---

## 2. Chrome Extension Permissions Justification

In accordance with Chrome Web Store Developer Program Policies, the extension requests only the minimum least-privilege permissions necessary for its single purpose:

- **`activeTab`:** Grants temporary, scoped access to the currently active ChatGPT conversation tab only when you click the extension action icon.
- **`scripting`:** Executes the local client-side extraction script that unrolls virtualized DOM nodes and formats the document for Chrome's native print engine.
- **`storage`:** Used via `chrome.storage.sync` solely to save your export formatting preferences (such as print theme, paper size, and page numbering). Preferences are synchronized across your signed-in browser instances via Chrome Sync and never leave Google's secure browser sync infrastructure.
- **`https://chatgpt.com/*`:** Restricts host execution strictly to official ChatGPT URLs, preventing the extension from ever running on or inspecting any other website.

---

## 3. Local Data Storage & User Deletion Rights

The extension does not maintain servers, databases, or cloud infrastructure. All stored preferences reside on your machine in your browser profile:

- **Profile & Sync Scope:** Formatting preferences are stored via `chrome.storage.sync` so your display preferences persist across your signed-in browser sessions without any external servers or third-party databases.
- **Instant Deletion:** You can purge all saved preferences at any time by clearing extension data via `chrome://extensions` or by uninstalling the extension.

---

## 4. Third-Party Sharing & AI Training

We do not sell, rent, disclose, or transfer any user data, prompts, or conversation content to third parties, advertising networks, data brokers, or AI model providers under any circumstances.

---

## 5. Browser Compatibility

This extension is developed in compliance with the Google Chrome Extension Manifest V3 specification. It is fully compatible with Chromium-based browsers including Google Chrome, Brave, Microsoft Edge, Arc, and Opera.

---

## 6. Policy Changes

If future releases introduce new features that require updated runtime capabilities, this privacy policy will be updated accordingly with a revised version number and timestamp prior to deployment on the Chrome Web Store.

---

## 7. Developer Contact & Inquiries

For questions, technical support, or privacy inquiries regarding this extension, please contact:

- **Developer:** Gaurav Dalvi
- **Email:** [gdalvi20dec@gmail.com](mailto:gdalvi20dec@gmail.com)
- **Website:** [https://gauravdalvi.com](https://gauravdalvi.com)
- **Chrome Web Store:** [Export to PDF for ChatGPT](https://chromewebstore.google.com/detail/export-to-pdf-for-chatgpt/pfkbinehddbjfacdgcghoflahnllcpaf)
- **Issue Tracker:** [GitHub Issues](https://github.com/gauravdalvi2012/export-to-pdf-for-chatgpt/issues)
