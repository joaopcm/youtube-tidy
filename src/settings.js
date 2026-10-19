const DEFAULT_SETTINGS = { itemsPerRow: 6, skipSponsors: true };

function loadSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}
