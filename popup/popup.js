// popup/popup.js
const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyzeBtn");
const optionsBtn = document.getElementById("optionsBtn");
const compareBtn = document.getElementById("compareBtn");

const SUPPORTED_PAGE_REGEX =
  /amazon\.[a-z.]+\/.*\/dp\/|trendyol\.com\/.+-p-\d|hepsiburada\.com\/.+-p-/;

async function init() {
  const lang = await getLang();

  analyzeBtn.textContent = t("analyzeThisPage", lang);
  optionsBtn.textContent = t("setApiKey", lang);
  compareBtn.textContent = t("compareProducts", lang);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isProductPage = tab && SUPPORTED_PAGE_REGEX.test(tab.url || "");

  if (isProductPage) {
    statusEl.textContent = t("supportedPage", lang);
    analyzeBtn.disabled = false;
  } else {
    statusEl.textContent = t("goToProduct", lang);
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

compareBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("compare/compare.html") });
  window.close();
});

optionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
