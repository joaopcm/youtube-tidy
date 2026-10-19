const SEGMENT_CATEGORIES = {
  sponsor: { setting: "skipSponsor", label: "Sponsors", toastLabel: "sponsor", color: "#00d400" },
  selfpromo: { setting: "skipSelfpromo", label: "Self-promo", toastLabel: "self-promo", color: "#ffff00" },
  interaction: { setting: "skipInteraction", label: "Like & subscribe reminders", toastLabel: "reminder", color: "#cc00ff" },
  intro: { setting: "skipIntro", label: "Intros", toastLabel: "intro", color: "#00ffff" },
  outro: { setting: "skipOutro", label: "Outros", toastLabel: "outro", color: "#0202ed" },
};

const DEFAULT_SETTINGS = {
  itemsPerRow: 6,
  hideShorts: true,
  hideShelves: true,
  hideChips: true,
  trimSidebar: true,
  compactRecommendations: true,
  skipSponsor: true,
  skipSelfpromo: false,
  skipInteraction: false,
  skipIntro: false,
  skipOutro: false,
};

function loadSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}

function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener((changes) => {
    const changed = Object.fromEntries(
      Object.entries(changes)
        .filter(([key, change]) => key in DEFAULT_SETTINGS && change.newValue !== undefined)
        .map(([key, change]) => [key, change.newValue]),
    );
    if (Object.keys(changed).length) listener(changed);
  });
}
