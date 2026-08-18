// content/content.js
// Bu script Amazon, Trendyol ve Hepsiburada ürün sayfalarında çalışır.
// Görevi: (1) sayfadaki veriyi DOM'dan oku, (2) kullanıcıya bir "AI Analiz" butonu göster,
// (3) tıklanınca veriyi background'a gönder, (4) gelen sonucu + ham yorumları ekranda göster,
// (5) istenirse ürünü karşılaştırma listesine ekle.
// NOT: i18n.js bu dosyadan ÖNCE yüklenir (manifest.json içinde sıralama önemli).

(function () {
  "use strict";

  let LANG = "tr";

  // ---------- 0) SİTE TESPİTİ ----------
  function detectSite() {
    const host = location.hostname;
    if (host.includes("amazon.")) return "amazon";
    if (host.includes("trendyol.com")) return "trendyol";
    if (host.includes("hepsiburada.com")) return "hepsiburada";
    return null;
  }

  const SITE_LABELS = { amazon: "Amazon", trendyol: "Trendyol", hepsiburada: "Hepsiburada" };

  // ---------- 1) KAZIMA (SCRAPING) KATMANI ----------
  // Her site için ayrı bir fonksiyon var çünkü DOM yapıları tamamen farklı.
  // Her alan için birden fazla CSS seçici deniyoruz (fallback listesi), çünkü
  // bu siteler sık sık class isimlerini değiştiriyor.
  function firstMatchText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return null;
  }

  function allMatchTexts(selectors, limit) {
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        return Array.from(els)
          .map((el) => el.textContent.trim())
          .filter(Boolean)
          .slice(0, limit);
      }
    }
    return [];
  }

  function scrapeAmazon() {
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
    const bullets = allMatchTexts(["#feature-bullets li span.a-list-item"], 10);
    const reviews = allMatchTexts(["[data-hook='review-body'] span"], 8);
    const availability = firstMatchText(["#availability span"]);

    return { title, price, rating, reviewCount, availability, bullets, reviews };
  }

  function scrapeTrendyol() {
    // NOT: Trendyol seçicileri en iyi tahmindir, site sık değişiyor.
    // Çalışmazsa DevTools ile (F12 > Elements) doğru class'ları bulup güncellemek gerekir.
    const title = firstMatchText([
      "h1.pr-new-br",
      ".product-name",
      ".pr-in-w h1",
      "h1",
    ]);
    const price = firstMatchText([
      ".prc-dsc",
      ".product-price-container .prc-dsc",
      ".prc-slg",
    ]);
    const rating = firstMatchText([
      ".pr-rnr-sm-point",
      ".pr-rnr-p-sm-point",
      ".rating-line-count",
    ]);
    const reviewCount = firstMatchText([
      ".pr-rnr-sm-count",
      ".reviews-summary-star-count",
    ]);
    const bullets = allMatchTexts(
      [".detail-attr-container li", ".detail-desc-list li"],
      10
    );
    const reviews = allMatchTexts(
      [".review-comment", ".comment-text", ".reviews-container .comment", "[itemprop='reviewBody']"],
      8
    );

    return { title, price, rating, reviewCount, availability: null, bullets, reviews };
  }

  function scrapeHepsiburada() {
    // NOT: Hepsiburada seçicileri en iyi tahmindir, site sık değişiyor.
    // Çalışmazsa DevTools ile (F12 > Elements) doğru class'ları/data-test-id'leri bulup
    // güncellemek gerekir.
    const title = firstMatchText([
      "h1[data-test-id='title']",
      "h1.product-name",
      "h1",
    ]);
    const price = firstMatchText([
      "[data-test-id='price-current-price']",
      ".price-value",
      ".product-price",
    ]);
    const rating = firstMatchText([
      "[data-test-id='rating-summary']",
      ".rating-star span",
    ]);
    const reviewCount = firstMatchText([
      "[data-test-id='review-count']",
      ".rating-count",
    ]);
    const bullets = allMatchTexts(
      [".detail-attr li", ".product-feature-list li"],
      10
    );
    const reviews = allMatchTexts(
      [
        "div[class*='ReviewList-module'] span[style*='text-align']",
        "div[class*='ReviewCard-module'] span[style]",
        "[data-test-id='comment-text']",
        ".comment-text",
      ],
      8
    );

    return { title, price, rating, reviewCount, availability: null, bullets, reviews };
  }

  function scrapeProduct() {
    const site = detectSite();
    let data;
    if (site === "trendyol") data = scrapeTrendyol();
    else if (site === "hepsiburada") data = scrapeHepsiburada();
    else data = scrapeAmazon();

    return { ...data, site, url: location.href, scrapedAt: new Date().toISOString() };
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

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  async function handleAnalyzeClick() {
    const panel = document.getElementById("asa-panel");
    panel.classList.remove("asa-hidden");

    const product = scrapeProduct();

    if (!product.title) {
      setBody(`<p class="asa-error">${t("cannotRead", LANG)}</p>`);
      return;
    }

    showPurposeForm(product);
  }

  function showPurposeForm(product) {
    setBody(`
      <p class="asa-muted">${t("purposeLabel", LANG)}</p>
      <input id="asa-purpose-input" type="text" class="asa-purpose-input"
        placeholder="${t("purposePlaceholder", LANG)}" />
      <button id="asa-purpose-submit" class="asa-secondary-btn">${t("purposeSubmit", LANG)}</button>
    `);

    const input = document.getElementById("asa-purpose-input");
    input.focus();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("asa-purpose-submit").click();
    });

    document.getElementById("asa-purpose-submit").addEventListener("click", () => {
      runAnalysis(product, input.value.trim());
    });
  }

  function runAnalysis(product, purpose) {
    setBody(`<p class="asa-muted">${t("collecting", LANG)}</p>`);

    chrome.runtime.sendMessage(
      { type: "ANALYZE_PRODUCT", payload: { product, purpose } },
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

  function renderReviewsHtml(product) {
    if (!product.reviews || product.reviews.length === 0) {
      return `<p class="asa-muted">${t("noReviews", LANG)}</p>`;
    }
    const items = product.reviews
      .map((r) => `<li>${escapeHtml(r.length > 220 ? r.slice(0, 220) + "…" : r)}</li>`)
      .join("");
    return `<ul class="asa-reviews-list">${items}</ul>`;
  }

  function sentimentLabel(sentiment) {
    const map = {
      positive: "sentimentPositive",
      mixed: "sentimentMixed",
      negative: "sentimentNegative",
    };
    return t(map[sentiment] || "sentimentUnknown", LANG);
  }

  function confidenceLabel(level) {
    const map = { high: "confidenceHigh", low: "confidenceLow" };
    return t(map[level] || "confidenceMedium", LANG);
  }

  function renderVerificationHtml(v) {
    if (!v) return "";
    const concerns = (v.concerns || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    return `
      <div class="asa-verification">
        <strong>${t("verificationLabel", LANG)}:</strong> ${confidenceLabel(v.confidence)}
        ${concerns ? `<ul class="asa-concerns-list">${concerns}</ul>` : ""}
        ${v.correction ? `<p class="asa-muted">${escapeHtml(v.correction)}</p>` : ""}
      </div>
    `;
  }

  function renderAnalysis(data, product) {
    const prosHtml = (data.pros || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    const consHtml = (data.cons || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    const siteLabel = SITE_LABELS[product.site] || "";

    setBody(`
      ${siteLabel ? `<span class="asa-site-badge">${siteLabel}</span>` : ""}
      <p class="asa-summary">${escapeHtml(data.summary || "")}</p>
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
      <p class="asa-verdict"><strong>${t("verdict", LANG)}</strong> ${escapeHtml(data.verdict || "")}</p>

      ${renderVerificationHtml(data.verification)}

      <div class="asa-sentiment">
        <strong>${t("sentimentLabel", LANG)}:</strong> ${sentimentLabel(data.sentiment)}
        ${data.sentimentSummary ? `<p class="asa-muted">${escapeHtml(data.sentimentSummary)}</p>` : ""}
      </div>

      <details class="asa-reviews-details">
        <summary>${t("reviewsTitle", LANG)} (${(product.reviews || []).length})</summary>
        ${renderReviewsHtml(product)}
      </details>

      <button id="asa-add-compare-btn" class="asa-secondary-btn">${t("addToCompare", LANG)}</button>
      <p id="asa-compare-msg" class="asa-muted asa-compare-msg"></p>
    `);

    document
      .getElementById("asa-add-compare-btn")
      .addEventListener("click", () => addToComparison(product));

    saveToHistory(product, data);
  }

  async function saveToHistory(product, data) {
    const { analysisHistory } = await chrome.storage.local.get("analysisHistory");
    const list = analysisHistory || [];

    list.unshift({
      title: product.title,
      site: product.site,
      url: product.url,
      price: product.price,
      rating: product.rating,
      summary: data.summary,
      verdict: data.verdict,
      sentiment: data.sentiment,
      confidence: data.verification ? data.verification.confidence : null,
      timestamp: new Date().toISOString(),
    });

    // Depolama şişmesin diye en fazla son 30 kaydı tutuyoruz.
    await chrome.storage.local.set({ analysisHistory: list.slice(0, 30) });
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
    // Kategori/ana sayfa gibi ürün olmayan sayfalarda butonu hiç göstermiyoruz.
    const probe = scrapeProduct();
    if (!probe.title) return;
    createPanel();
  }

  init();
})();
