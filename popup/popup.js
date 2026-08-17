// popup/popup.js
const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyzeBtn");
const optionsBtn = document.getElementById("optionsBtn");

const AMAZON_DP_REGEX = /amazon\.[a-z.]+\/.*\/dp\//;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isProductPage = tab && AMAZON_DP_REGEX.test(tab.url || "");

  if (isProductPage) {
    statusEl.textContent = "Bu sayfa desteklenen bir Amazon ürün sayfası. ✅";
    analyzeBtn.disabled = false;
  } else {
    statusEl.textContent = "Bir Amazon ürün (dp) sayfasına gidin.";
    analyzeBtn.disabled = true;
  }
}

analyzeBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Sayfadaki (content script'in oluşturduğu) butonu programatik tetikliyoruz.
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.getElementById("asa-trigger-btn")?.click(),
  });
  window.close();
});

optionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
