// AgentX — Chrome Extension Background Service Worker
// Opens the side panel when the extension icon is clicked

// Set the side panel to open when the action icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("AgentX: setPanelBehavior error:", error));
  }
});

// Also handle action click directly (fallback for some Chrome versions)
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId }).catch((error) =>
      console.error("AgentX: sidePanel.open error:", error)
    );
  }
});
