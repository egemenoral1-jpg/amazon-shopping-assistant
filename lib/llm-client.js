// lib/llm-client.js
// Google Gemini API'sine istek atan yardımcı katman (ÜCRETSİZ tier).
// Service worker içinde importScripts ile dahil edilir.
// Anahtar almak için: https://aistudio.google.com/apikey (kredi kartı istemiyor)

const MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const LANG_NAMES = { tr: "Türkçe", en: "English" };

async function callGemini(systemPrompt, userContent, apiKey) {
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API hatası (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Modelden metin yanıtı alınamadı.");

  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function purposeInstruction(purpose) {
  if (!purpose) return "";
  return `\nKullanıcı bu ürünü şu amaçla değerlendiriyor: "${purpose}". Özetini, artı/eksilerini
ve tavsiyeni bu amaca göre şekillendir; bu amaç için ne kadar uygun olduğunu vurgula.`;
}

/**
 * Tek bir ürünü analiz eder + yorumların duygu analizini yapar.
 * @param {object} product - scrapeProduct() çıktısı (içinde ham "reviews" dizisi de var)
 * @param {string} apiKey - kullanıcının kendi Gemini API anahtarı
 * @param {string} lang - "tr" | "en"
 * @param {string} purpose - kullanıcının ürünü alma amacı (opsiyonel, boş olabilir)
 */
async function analyzeProductWithLLM(product, apiKey, lang = "tr", purpose = "") {
  const langName = LANG_NAMES[lang] || LANG_NAMES.tr;
  const systemPrompt = `Sen bir alışveriş danışmanısın. Sana bir ürün sayfasından kazınmış
veriler verilecek (başlık, fiyat, puan, özellikler ve "reviews" adında ham kullanıcı
yorumlarından oluşan bir dizi).
Cevabını SADECE ${langName} dilinde yaz.${purposeInstruction(purpose)}

"reviews" dizisindeki yorumları oku ve genel duygu tonunu belirle: yorumlar çoğunlukla
olumluysa "positive", karışıksa "mixed", çoğunlukla olumsuzsa "negative"; hiç yorum yoksa
"unknown" yaz.

Görevin, SADECE aşağıdaki JSON şemasına uyan bir yanıt üretmek (başka hiçbir metin ekleme,
markdown kod bloğu da ekleme):
{
  "summary": "2-3 cümlelik kısa özet",
  "pros": ["madde", "madde"],
  "cons": ["madde", "madde"],
  "verdict": "alınmalı mı, alternatif aranmalı mı, kısa tavsiye",
  "sentiment": "positive" | "mixed" | "negative" | "unknown",
  "sentimentSummary": "yorumlardaki genel eğilimi özetleyen 1-2 cümle (yorum yoksa boş bırak)"
}`;

  const userContent = `Ürün verisi:\n${JSON.stringify(product, null, 2)}`;
  return callGemini(systemPrompt, userContent, apiKey);
}

/**
 * Birden fazla ürünü (2-4 adet) birbiriyle karşılaştırır.
 * @param {object[]} products - scrapeProduct() çıktılarının dizisi
 * @param {string} apiKey
 * @param {string} lang - "tr" | "en"
 * @param {string} purpose - kullanıcının ürünü alma amacı (opsiyonel)
 */
async function compareProductsWithLLM(products, apiKey, lang = "tr", purpose = "") {
  const langName = LANG_NAMES[lang] || LANG_NAMES.tr;
  const systemPrompt = `Sen bir alışveriş danışmanısın. Sana birden fazla ürünün kazınmış
verileri (başlık, fiyat, puan, özellikler, yorumlar) verilecek. Bunları birbiriyle
karşılaştırıp en iyi seçeneği önereceksin.
Cevabını SADECE ${langName} dilinde yaz.${purposeInstruction(purpose)}

Görevin, SADECE aşağıdaki JSON şemasına uyan bir yanıt üretmek (başka hiçbir metin ekleme,
markdown kod bloğu da ekleme). "products" dizisindeki öğe sayısı ve sırası, sana verilen
ürün listesiyle birebir aynı olmalı:
{
  "overview": "Genel karşılaştırma özeti, 2-3 cümle",
  "products": [
    { "title": "ürünün kısa adı", "score": 1-10 arası puan, "bestFor": "bu ürün kime/ne için uygun, kısa" }
  ],
  "winner": "en iyi seçenek olarak önerdiğin ürünün kısa adı",
  "reasoning": "neden bu ürünü önerdiğine dair 1-2 cümlelik gerekçe"
}`;

  const userContent = `Karşılaştırılacak ürünler:\n${JSON.stringify(products, null, 2)}`;
  return callGemini(systemPrompt, userContent, apiKey);
}
