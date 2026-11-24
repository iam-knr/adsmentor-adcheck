// Open the side panel when the toolbar icon is clicked.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  chrome.contextMenus.create({
    id: "check-selection",
    title: "Check selected text with AdCheck",
    contexts: ["selection"],
  });
});

// Right-click selected text -> open the panel and hand it the text.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "check-selection" || !info.selectionText) return;
  await chrome.storage.session.set({ pending: { text: info.selectionText, at: Date.now() } });
  try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (e) {}
});
