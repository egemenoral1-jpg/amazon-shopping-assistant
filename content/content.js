// content/content.js
// Bu script sadece bir Amazon ürün (dp) sayfası açıldığında çalışır.
// Görevi: (1) sayfadaki veriyi DOM'dan oku, (2) kullanıcıya bir "AI Analiz" butonu göster,
// (3) tıklanınca veriyi background'a gönder, (4) gelen sonucu ekranda göster.

(function () {
  "use strict";

  // ---------- 1) KAZIMA (SCRAPING) KATMANI ----------
  // Amazon sayfa yapısı sık değiştiği + ülkeye göre farklılaştığı için
  // her alan için birden fazla CSS seçici deniyoruz (fallback listesi).
  function firstMatchText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return null;
  }

  function scrapeProduct() {
    const title = firstMatchText(["#productTitle", "#title span"]);

    const price = firstMatchText([
      ".a-price .a-offscreen",
      "#corePrice_feature_div .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
    ]);

    const rating = firstMatchText([
      "#acrPopover .a-icon-alt",
      "span[data-hook='rating-out-of-text']",
    ]);

    const reviewCount = firstMatchText([
      "#acrCustomerReviewText",
      "span[data-hook='total-review-count']",
    ]);

    // Ürün özellik maddeleri (bullet points)
    const bullets = Array.from(
      document.querySelectorAll("#feature-bullets li span.a-list-item")
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .slice(0, 10);

    // Görünen ilk birkaç müşteri yorumu (varsa)
    const reviews = Array.from(
      document.querySelectorAll("[data-hook='review-body'] span")
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .slice(0, 5);

    const availability = firstMatchText(["#availability span"]);

    return {
      url: location.href,
      title,
      price,
      rating,
      reviewCount,
      availability,
      bullets,
      reviews,
      scrapedAt: new Date().toISOString(),
    };
  }

  // ---------- 2) ARAYÜZ KATMANI ----------
  function createPanel() {
    if (document.getElementById("asa-panel")) return;

    const btn = document.createElement("button");
    btn.id = "asa-trigger-btn";
    btn.textContent = "🤖 AI ile Analiz Et";
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = "asa-panel";
    panel.className = "asa-hidden";
    panel.innerHTML = `
      <div class="asa-header">
        <span>Amazon Shopping Assistant</span>
        <button id="asa-close-btn">×</button>
      </div>
      <div id="asa-body" class="asa-body">
        <p class="asa-muted">Analiz başlatmak için butona tıklayın.</p>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("asa-close-btn").addEventListener("click", () => {
      panel.classList.add("asa-hidden");
    });

    btn.addEventListener("click", handleAnalyzeClick);
  }

  function setBody(html) {
    document.getElementById("asa-body").innerHTML = html;
  }

  async function handleAnalyzeClick() {
    const panel = document.getElementById("asa-panel");
    panel.classList.remove("asa-hidden");

    const product = scrapeProduct();

    if (!product.title) {
      setBody(
        `<p class="asa-error">Ürün bilgisi okunamadı. Sayfa yapısı desteklenmiyor olabilir.</p>`
      );
      return;
    }

    setBody(`<p class="asa-muted">⏳ Ürün verisi toplandı, LLM analizi bekleniyor...</p>`);

    // Kazınan veriyi background service worker'a gönderiyoruz.
    // Gerçek API çağrısı background'da yapılır (API anahtarını content script'te tutmamak için).
    chrome.runtime.sendMessage(
      { type: "ANALYZE_PRODUCT", payload: product },
      (response) => {
        if (chrome.runtime.lastError) {
          setBody(`<p class="asa-error">Hata: ${chrome.runtime.lastError.message}</p>`);
          return;
        }
        if (!response || !response.ok) {
          setBody(
            `<p class="asa-error">${(response && response.error) || "Bilinmeyen hata"}</p>`
          );
          return;
        }
        renderAnalysis(response.data);
      }
    );
  }

  function renderAnalysis(data) {
    // data: { summary, pros, cons, verdict, fairPrice }
    const prosHtml = (data.pros || []).map((p) => `<li>${p}</li>`).join("");
    const consHtml = (data.cons || []).map((c) => `<li>${c}</li>`).join("");

    setBody(`
      <p class="asa-summary">${data.summary || ""}</p>
      <div class="asa-cols">
        <div>
          <h4>✅ Artılar</h4>
          <ul>${prosHtml}</ul>
        </div>
        <div>
          <h4>⚠️ Eksiler</h4>
          <ul>${consHtml}</ul>
        </div>
      </div>
      <p class="asa-verdict"><strong>Sonuç:</strong> ${data.verdict || ""}</p>
    `);
  }

  createPanel();
})();
