const HIDDEN_SHELF_TITLES = ["YouTube Playables", "Explore more topics"];

function applyItemsPerRow(itemsPerRow) {
  document.documentElement.style.setProperty("--yt-tidy-items-per-row", itemsPerRow);
}

function hideUnwantedShelves() {
  for (const section of document.querySelectorAll("ytd-rich-section-renderer:not([yt-tidy-hidden])")) {
    const text = section.textContent;
    if (HIDDEN_SHELF_TITLES.some((title) => text.includes(title))) {
      section.setAttribute("yt-tidy-hidden", "");
    }
  }
}

let scanQueued = false;
new MutationObserver(() => {
  if (scanQueued) return;
  scanQueued = true;
  requestAnimationFrame(() => {
    scanQueued = false;
    hideUnwantedShelves();
  });
}).observe(document.documentElement, { childList: true, subtree: true });

loadSettings().then(({ itemsPerRow }) => applyItemsPerRow(itemsPerRow));
chrome.storage.onChanged.addListener((changes) => {
  if (changes.itemsPerRow) applyItemsPerRow(changes.itemsPerRow.newValue);
});
