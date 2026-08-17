// AgentX — Chrome Extension Background Service Worker
// Opens the side panel when the extension icon is clicked

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("AgentX: setPanelBehavior error:", error));
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch((error) =>
    console.error("AgentX: sidePanel.open error:", error)
  );
});
