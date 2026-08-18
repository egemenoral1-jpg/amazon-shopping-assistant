// content/content.js
// Bu script sadece bir Amazon ürün (dp) sayfası açıldığında çalışır.
// Görevi: (1) sayfadaki veriyi DOM'dan oku, (2) kullanıcıya bir "AI Analiz" butonu göster,
// (3) tıklanınca veriyi background'a gönder, (4) gelen sonucu ekranda göster,
// (5) istenirse ürünü karşılaştırma listesine ekle.
// NOT: i18n.js bu dosyadan ÖNCE yüklenir (manifest.json içinde sıralama önemli),
// bu yüzden t() ve I18N burada hazır olarak kullanılabilir.

(function () {
  "use strict";

  let LANG = "tr"; // background'dan/storage'dan okunana kadar varsayılan

  // ---------- 1) KAZIMA (SCRAPING) KATMANI ----------
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

    const bullets = Array.from(
      document.querySelectorAll("#feature-bullets li span.a-list-item")
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .slice(0, 10);

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
    btn.textContent = t("analyzeBtn", LANG);
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = "asa-panel";
    panel.className = "asa-hidden";
    panel.innerHTML = `
      <div class="asa-header">
        <span>${t("panelTitle", LANG)}</span>
        <button id="asa-close-btn">×</button>
      </div>
      <div id="asa-body" class="asa-body">
        <p class="asa-muted">${t("clickToStart", LANG)}</p>
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
      setBody(`<p class="asa-error">${t("cannotRead", LANG)}</p>`);
      return;
    }

    setBody(`<p class="asa-muted">${t("collecting", LANG)}</p>`);

    chrome.runtime.sendMessage(
      { type: "ANALYZE_PRODUCT", payload: product },
      (response) => {
        if (chrome.runtime.lastError) {
          setBody(`<p class="asa-error">${chrome.runtime.lastError.message}</p>`);
          return;
        }
        if (!response || !response.ok) {
          setBody(
            `<p class="asa-error">${(response && response.error) || t("unknownError", LANG)}</p>`
          );
          return;
        }
        renderAnalysis(response.data, product);
      }
    );
  }

  function renderAnalysis(data, product) {
    const prosHtml = (data.pros || []).map((p) => `<li>${p}</li>`).join("");
    const consHtml = (data.cons || []).map((c) => `<li>${c}</li>`).join("");

    setBody(`
      <p class="asa-summary">${data.summary || ""}</p>
      <div class="asa-cols">
        <div>
          <h4>${t("pros", LANG)}</h4>
          <ul>${prosHtml}</ul>
        </div>
        <div>
          <h4>${t("cons", LANG)}</h4>
          <ul>${consHtml}</ul>
        </div>
      </div>
      <p class="asa-verdict"><strong>${t("verdict", LANG)}</strong> ${data.verdict || ""}</p>
      <button id="asa-add-compare-btn" class="asa-secondary-btn">${t("addToCompare", LANG)}</button>
      <p id="asa-compare-msg" class="asa-muted asa-compare-msg"></p>
    `);

    document
      .getElementById("asa-add-compare-btn")
      .addEventListener("click", () => addToComparison(product));
  }

  async function addToComparison(product) {
    const msgEl = document.getElementById("asa-compare-msg");
    const { comparisonList } = await chrome.storage.local.get("comparisonList");
    const list = comparisonList || [];

    if (list.some((p) => p.url === product.url)) {
      msgEl.textContent = t("alreadyAdded", LANG);
      return;
    }
    if (list.length >= 4) {
      msgEl.textContent = t("maxReached", LANG);
      return;
    }

    list.push(product);
    await chrome.storage.local.set({ comparisonList: list });
    msgEl.textContent = t("addedToCompare", LANG);
  }

  async function init() {
    LANG = await getLang();
    createPanel();
  }

  init();
})();
