const PREVIEW_ROWS = 2;

const itemsPerRowOutput = document.getElementById("itemsPerRow");
const fewerButton = document.getElementById("fewer");
const moreButton = document.getElementById("more");
const preview = document.getElementById("preview");
const skipCategoriesList = document.getElementById("skipCategories");
const skipCategoryRow = document.getElementById("skipCategoryRow");

let itemsPerRow;

for (const { setting, label, color } of Object.values(SEGMENT_CATEGORIES)) {
  const row = skipCategoryRow.content.cloneNode(true);
  row.querySelector(".dot").style.background = color;
  row.querySelector(".name").textContent = label;
  row.querySelector("input").dataset.setting = setting;
  skipCategoriesList.append(row);
}

const switches = document.querySelectorAll("input[data-setting]");

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
  for (const input of switches) input.checked = settings[input.dataset.setting];
});

fewerButton.addEventListener("click", () => setItemsPerRow(itemsPerRow - 1));
moreButton.addEventListener("click", () => setItemsPerRow(itemsPerRow + 1));

for (const input of switches) {
  input.addEventListener("change", () => chrome.storage.sync.set({ [input.dataset.setting]: input.checked }));
}
