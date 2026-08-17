// background/background.js
// MV3'te bu dosya bir "service worker" olarak çalışır: sürekli açık kalmaz,
// olay (message) geldiğinde uyanır, işini yapar, tekrar uyur.

importScripts("../lib/llm-client.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "ANALYZE_PRODUCT") return; // bu mesaj bizi ilgilendirmiyor

  handleAnalyzeRequest(message.payload)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  // Async sendResponse kullanacağımızı Chrome'a bildirmek için true dönüyoruz.
  return true;
});

async function handleAnalyzeRequest(product) {
  const { anthropicApiKey } = await chrome.storage.sync.get("anthropicApiKey");

  if (!anthropicApiKey) {
    throw new Error(
      "API anahtarı ayarlanmamış. Eklenti ayarlarından Anthropic API anahtarınızı girin."
    );
  }

  return analyzeProductWithLLM(product, anthropicApiKey);
}
