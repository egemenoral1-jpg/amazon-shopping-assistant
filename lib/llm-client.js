// lib/llm-client.js
// Anthropic Messages API'sine istek atan küçük yardımcı katman.
// Service worker içinde import edilir (importScripts ile).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

/**
 * Ürün verisini LLM'e gönderip yapılandırılmış (JSON) bir analiz ister.
 * @param {object} product - scrapeProduct() çıktısı
 * @param {string} apiKey - kullanıcının kendi Anthropic API anahtarı
 */
async function analyzeProductWithLLM(product, apiKey) {
  const systemPrompt = `Sen bir alışveriş danışmanısın. Sana bir Amazon ürün sayfasından
kazınmış veriler verilecek (başlık, fiyat, puan, özellikler, birkaç yorum).
Görevin, SADECE aşağıdaki JSON şemasına uyan bir yanıt üretmek (başka hiçbir metin ekleme):
{
  "summary": "2-3 cümlelik kısa özet",
  "pros": ["madde", "madde"],
  "cons": ["madde", "madde"],
  "verdict": "alınmalı mı, alternatif aranmalı mı, kısa tavsiye"
}`;

  const userContent = `Ürün verisi:\n${JSON.stringify(product, null, 2)}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Tarayıcıdan doğrudan çağrı yapabilmek için gereken header:
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API hatası (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("Modelden metin yanıtı alınamadı.");

  // Model saf JSON döndürmesi istense de bazen ```json ... ``` ile sarabilir; temizliyoruz.
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
