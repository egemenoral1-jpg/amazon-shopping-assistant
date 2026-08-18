// lib/i18n.js
// Basit bir çeviri (i18n) katmanı. Bu dosya "modül" değil, düz bir script:
// content script'te, popup'ta, options'ta ve compare sayfasında <script> ile
// veya content_scripts listesinde art arda dahil edilerek kullanılıyor.
// Bu yüzden import/export yerine global bir I18N objesi ve t() fonksiyonu tanımlıyoruz.

const I18N = {
  tr: {
    // panel (content.js)
    analyzeBtn: "🤖 AI ile Analiz Et",
    panelTitle: "Amazon Shopping Assistant",
    clickToStart: "Analiz başlatmak için butona tıklayın.",
    collecting: "⏳ Ürün verisi toplandı, LLM analizi bekleniyor...",
    cannotRead: "Ürün bilgisi okunamadı. Sayfa yapısı desteklenmiyor olabilir.",
    unknownError: "Bilinmeyen hata",
    pros: "✅ Artılar",
    cons: "⚠️ Eksiler",
    verdict: "Sonuç:",
    addToCompare: "➕ Karşılaştırmaya Ekle",
    addedToCompare: "✅ Karşılaştırma listesine eklendi",
    alreadyAdded: "Bu ürün zaten listede",
    maxReached: "En fazla 4 ürün karşılaştırabilirsiniz. Önce listeden birini kaldırın.",
    reviewsTitle: "💬 Kullanıcı Yorumları",
    noReviews: "Bu sayfada okunabilir bir yorum bulunamadı.",
    purposeLabel: "Bu ürünü ne için almayı düşünüyorsunuz? (opsiyonel)",
    purposePlaceholder: "Örn: oyun, hediye, iş, günlük kullanım...",
    purposeSubmit: "Analiz Et",
    sentimentLabel: "🧠 Yorum Analizi",
    sentimentPositive: "😊 Genel olarak olumlu",
    sentimentMixed: "😐 Karışık",
    sentimentNegative: "😟 Genel olarak olumsuz",
    sentimentUnknown: "Yeterli yorum yok",

    // popup.js
    checking: "Kontrol ediliyor...",
    supportedPage: "Bu sayfa desteklenen bir Amazon ürün sayfası. ✅",
    goToProduct: "Bir Amazon ürün (dp) sayfasına gidin.",
    analyzeThisPage: "Bu sayfayı analiz et",
    setApiKey: "API Anahtarı Ayarla",
    compareProducts: "🔍 Ürünleri Karşılaştır",

    // options.js
    settingsTitle: "Amazon Shopping Assistant - Ayarlar",
    apiKeyLabel: "Google Gemini API Anahtarı",
    save: "Kaydet",
    saved: "Kaydedildi ✓",
    languageLabel: "Arayüz ve Analiz Dili",
    apiNote:
      "Anahtarınız yalnızca bu tarayıcıda (chrome.storage.local) saklanır ve doğrudan Gemini API'sine gönderilir; başka bir sunucuya iletilmez.",

    // compare.js
    compareTitle: "🔍 Ürün Karşılaştırma",
    noProducts: "Henüz karşılaştırmaya ürün eklenmedi. Bir ürün sayfasında panelden \"Karşılaştırmaya Ekle\" butonuna basın.",
    removeBtn: "Kaldır",
    compareBtn: "🤖 AI ile Karşılaştır",
    comparing: "⏳ Ürünler karşılaştırılıyor...",
    clearAll: "Tümünü Temizle",
    winner: "🏆 Önerilen",
    needTwo: "Karşılaştırma için en az 2 ürün ekleyin.",
  },
  en: {
    analyzeBtn: "🤖 Analyze with AI",
    panelTitle: "Amazon Shopping Assistant",
    clickToStart: "Click the button to start the analysis.",
    collecting: "⏳ Product data collected, waiting for LLM analysis...",
    cannotRead: "Could not read product info. The page layout may not be supported.",
    unknownError: "Unknown error",
    pros: "✅ Pros",
    cons: "⚠️ Cons",
    verdict: "Verdict:",
    addToCompare: "➕ Add to Comparison",
    addedToCompare: "✅ Added to comparison list",
    alreadyAdded: "This product is already in the list",
    maxReached: "You can compare up to 4 products. Remove one from the list first.",
    reviewsTitle: "💬 User Reviews",
    noReviews: "No readable reviews were found on this page.",
    purposeLabel: "What are you planning to use this for? (optional)",
    purposePlaceholder: "e.g. gaming, gift, work, everyday use...",
    purposeSubmit: "Analyze",
    sentimentLabel: "🧠 Review Sentiment",
    sentimentPositive: "😊 Mostly positive",
    sentimentMixed: "😐 Mixed",
    sentimentNegative: "😟 Mostly negative",
    sentimentUnknown: "Not enough reviews",

    checking: "Checking...",
    supportedPage: "This is a supported Amazon product page. ✅",
    goToProduct: "Go to an Amazon product (dp) page.",
    analyzeThisPage: "Analyze this page",
    setApiKey: "Set API Key",
    compareProducts: "🔍 Compare Products",

    settingsTitle: "Amazon Shopping Assistant - Settings",
    apiKeyLabel: "Google Gemini API Key",
    save: "Save",
    saved: "Saved ✓",
    languageLabel: "Interface & Analysis Language",
    apiNote:
      "Your key is stored only in this browser (chrome.storage.local) and sent directly to the Gemini API; it is never sent to any other server.",

    compareTitle: "🔍 Product Comparison",
    noProducts: "No products added yet. On a product page, click \"Add to Comparison\" in the panel.",
    removeBtn: "Remove",
    compareBtn: "🤖 Compare with AI",
    comparing: "⏳ Comparing products...",
    clearAll: "Clear All",
    winner: "🏆 Recommended",
    needTwo: "Add at least 2 products to compare.",
  },
};

function t(key, lang) {
  const dict = I18N[lang] || I18N.tr;
  return dict[key] || key;
}

// Kayıtlı dili okuyup geri döndüren küçük bir yardımcı (varsayılan: "tr").
async function getLang() {
  const { uiLanguage } = await chrome.storage.local.get("uiLanguage");
  return uiLanguage || "tr";
}
