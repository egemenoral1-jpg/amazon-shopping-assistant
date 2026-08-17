// options/options.js
const input = document.getElementById("apiKey");
const savedLabel = document.getElementById("saved");

chrome.storage.sync.get("anthropicApiKey", ({ anthropicApiKey }) => {
  if (anthropicApiKey) input.value = anthropicApiKey;
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const value = input.value.trim();
  chrome.storage.sync.set({ anthropicApiKey: value }, () => {
    savedLabel.style.display = "inline";
    setTimeout(() => (savedLabel.style.display = "none"), 2000);
  });
});
