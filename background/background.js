// background/background.js
// MV3'te bu dosya bir "service worker" olarak çalışır: sürekli açık kalmaz,
// olay (message) geldiğinde uyanır, işini yapar, tekrar uyur.

importScripts("../lib/llm-client.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_PRODUCT") {
    handleAnalyzeRequest(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async sendResponse kullanacağımızı Chrome'a bildiriyoruz
  }

  if (message.type === "COMPARE_PRODUCTS") {
    handleCompareRequest(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === "OPEN_COMPARE_PAGE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("compare/compare.html") });
    return false; // senkron, cevap beklemiyoruz
  }
});

async function getSettings() {
  const { geminiApiKey, uiLanguage } = await chrome.storage.local.get([
    "geminiApiKey",
    "uiLanguage",
  ]);
  return { geminiApiKey, uiLanguage: uiLanguage || "tr" };
}

async function handleAnalyzeRequest(product) {
  const { geminiApiKey, uiLanguage } = await getSettings();

  if (!geminiApiKey) {
    throw new Error(
      "API anahtarı ayarlanmamış. Eklenti ayarlarından Google Gemini API anahtarınızı girin."
    );
  }

  return analyzeProductWithLLM(product, geminiApiKey, uiLanguage);
}

async function handleCompareRequest(products) {
  const { geminiApiKey, uiLanguage } = await getSettings();

  if (!geminiApiKey) {
    throw new Error(
      "API anahtarı ayarlanmamış. Eklenti ayarlarından Google Gemini API anahtarınızı girin."
    );
  }

  return compareProductsWithLLM(products, geminiApiKey, uiLanguage);
}
