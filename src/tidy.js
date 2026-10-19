const UNWANTED_SHELF_TITLES = ["YouTube Playables", "Explore more topics"];

const HIDE_SETTING_ATTRIBUTES = {
  hideShorts: "yt-tidy-hide-shorts",
  hideShelves: "yt-tidy-hide-shelves",
  hideChips: "yt-tidy-hide-chips",
  trimSidebar: "yt-tidy-trim-sidebar",
};

let redirectShorts = DEFAULT_SETTINGS.hideShorts;

function applySettings(settings) {
  for (const [setting, attribute] of Object.entries(HIDE_SETTING_ATTRIBUTES)) {
    if (setting in settings) document.documentElement.toggleAttribute(attribute, settings[setting]);
  }
  if ("itemsPerRow" in settings) {
    document.documentElement.style.setProperty("--yt-tidy-items-per-row", settings.itemsPerRow);
  }
  if ("hideShorts" in settings) redirectShorts = settings.hideShorts;
}

function redirectShortsToWatchPage() {
  if (!redirectShorts) return;
  const shortsId = location.pathname.match(/^\/shorts\/([\w-]+)/)?.[1];
  if (shortsId) location.replace(`/watch?v=${shortsId}`);
}

function markUnwantedShelves() {
  for (const section of document.querySelectorAll("ytd-rich-section-renderer:not([yt-tidy-unwanted-shelf])")) {
    const text = section.textContent;
    if (UNWANTED_SHELF_TITLES.some((title) => text.includes(title))) {
      section.setAttribute("yt-tidy-unwanted-shelf", "");
    }
  }
}

let scanQueued = false;
new MutationObserver(() => {
  if (scanQueued) return;
  scanQueued = true;
  requestAnimationFrame(() => {
    scanQueued = false;
    markUnwantedShelves();
  });
}).observe(document.documentElement, { childList: true, subtree: true });

applySettings(DEFAULT_SETTINGS);
loadSettings().then((settings) => {
  applySettings(settings);
  redirectShortsToWatchPage();
});
onSettingsChanged(applySettings);
document.addEventListener("yt-navigate-finish", redirectShortsToWatchPage);
