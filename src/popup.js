const itemsPerRowInput = document.getElementById("itemsPerRow");
const skipSponsorsInput = document.getElementById("skipSponsors");

loadSettings().then(({ itemsPerRow, skipSponsors }) => {
  itemsPerRowInput.value = itemsPerRow;
  skipSponsorsInput.checked = skipSponsors;
});

itemsPerRowInput.addEventListener("change", () => {
  const itemsPerRow = Number(itemsPerRowInput.value);
  if (Number.isInteger(itemsPerRow) && itemsPerRow >= 1) chrome.storage.sync.set({ itemsPerRow });
});

skipSponsorsInput.addEventListener("change", () => {
  chrome.storage.sync.set({ skipSponsors: skipSponsorsInput.checked });
});
