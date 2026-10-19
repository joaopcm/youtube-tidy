const PREVIEW_ROWS = 2;

const itemsPerRowOutput = document.getElementById("itemsPerRow");
const fewerButton = document.getElementById("fewer");
const moreButton = document.getElementById("more");
const preview = document.getElementById("preview");
const skipSponsorsInput = document.getElementById("skipSponsors");

let itemsPerRow;

function renderItemsPerRow() {
  itemsPerRowOutput.value = itemsPerRow;
  fewerButton.disabled = itemsPerRow <= 1;
  preview.style.gridTemplateColumns = `repeat(${itemsPerRow}, 1fr)`;
  preview.replaceChildren(...Array.from({ length: itemsPerRow * PREVIEW_ROWS }, () => document.createElement("span")));
}

function setItemsPerRow(value) {
  itemsPerRow = value;
  renderItemsPerRow();
  chrome.storage.sync.set({ itemsPerRow });
}

loadSettings().then((settings) => {
  itemsPerRow = settings.itemsPerRow;
  renderItemsPerRow();
  skipSponsorsInput.checked = settings.skipSponsors;
});

fewerButton.addEventListener("click", () => setItemsPerRow(itemsPerRow - 1));
moreButton.addEventListener("click", () => setItemsPerRow(itemsPerRow + 1));

skipSponsorsInput.addEventListener("change", () => {
  chrome.storage.sync.set({ skipSponsors: skipSponsorsInput.checked });
});
