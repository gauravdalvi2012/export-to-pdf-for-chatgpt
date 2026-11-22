chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith('https://chatgpt.com/')) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['export.js']
    });
  } catch (error) {
    console.error('ChatGPT PDF export failed:', error);
  }
});

// One explicit screenshot of the active tab; the content script crops only
// the target assistant visualization. Nothing is uploaded to external servers.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'CHAT_PDF_CAPTURE_WIDGET') return false;
  if (!sender.tab?.id || !sender.tab.url?.startsWith('https://chatgpt.com/')) {
    respond({ error: 'Not a ChatGPT tab' });
    return false;
  }
  // Do not accidentally screenshot another tab if the user switches tabs
  // during a long export: captureVisibleTab always targets the active tab.
  chrome.tabs
    .query({ active: true, windowId: sender.tab.windowId })
    .then((tabs) => {
      if (tabs[0]?.id !== sender.tab.id)
        throw new Error('ChatGPT tab is no longer active');
      return chrome.tabs.captureVisibleTab(sender.tab.windowId, {
        format: 'png'
      });
    })
    .then((dataUrl) => respond({ dataUrl }))
    .catch((error) => respond({ error: String(error) }));
  return true;
});
