// lib/llm-client.js
// Google Gemini API'sine istek atan küçük yardımcı katman (ÜCRETSİZ tier).
// Service worker içinde import edilir (importScripts ile).
// Anahtar almak için: https://aistudio.google.com/apikey (kredi kartı istemiyor)

const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Ürün verisini LLM'e gönderip yapılandırılmış (JSON) bir analiz ister.
 * @param {object} product - scrapeProduct() çıktısı
 * @param {string} apiKey - kullanıcının kendi Google AI Studio (Gemini) API anahtarı
 */
async function analyzeProductWithLLM(product, apiKey) {
  const systemPrompt = `Sen bir alışveriş danışmanısın. Sana bir Amazon ürün sayfasından
kazınmış veriler verilecek (başlık, fiyat, puan, özellikler, birkaç yorum).
Görevin, SADECE aşağıdaki JSON şemasına uyan bir yanıt üretmek (başka hiçbir metin ekleme,
markdown kod bloğu (\`\`\`) da ekleme):
{
  "summary": "2-3 cümlelik kısa özet",
  "pros": ["madde", "madde"],
  "cons": ["madde", "madde"],
  "verdict": "alınmalı mı, alternatif aranmalı mı, kısa tavsiye"
}`;

  const userContent = `Ürün verisi:\n${JSON.stringify(product, null, 2)}`;

  // Gemini, API anahtarını URL query parametresi olarak alıyor (header yerine).
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Gemini'de "system" ayrı bir alan: system_instruction
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1000,
        // Gemini'ye doğrudan JSON modunda cevap vermesini söylüyoruz:
        responseMimeType: "application/json",
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

  // responseMimeType: "application/json" istesek de garanti olsun diye yine temizliyoruz.
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
