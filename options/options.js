// options/options.js
const input = document.getElementById("apiKey");
const savedLabel = document.getElementById("saved");

chrome.storage.sync.get("geminiApiKey", ({ geminiApiKey }) => {
  if (geminiApiKey) input.value = geminiApiKey;
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const value = input.value.trim();
  chrome.storage.sync.set({ geminiApiKey: value }, () => {
    savedLabel.style.display = "inline";
    setTimeout(() => (savedLabel.style.display = "none"), 2000);
  });
});
