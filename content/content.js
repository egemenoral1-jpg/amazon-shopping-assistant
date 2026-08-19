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

  // Her sitenin kendi marka kimliğiyle (isim, rozet, gradient renk) görünmesi için.
  const SITE_THEME = {
    amazon: {
      name: "Amazon Shopping Assistant",
      badge: "AI",
      gradient: "linear-gradient(135deg, #232f3e 0%, #0f1621 100%)",
    },
    trendyol: {
      name: "Trendyol Asistan AI",
      badge: "Beta",
      gradient: "linear-gradient(135deg, #ff9a3c 0%, #ff5b1f 100%)",
    },
    hepsiburada: {
      name: "HepsiAI Asistan",
      badge: "Beta",
      gradient: "linear-gradient(135deg, #7b2ff7 0%, #f9573b 100%)",
    },
  };

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

  // Başlık elementini (metin değil, gerçek DOM node'unu) buluyoruz ki panelimizi
  // tam onun altına, sayfanın doğal akışına yerleştirebilelim. Bu seçiciler zaten
  // test edilip doğrulanmış olanlarla aynı - ekstra bir tahmin gerekmiyor.
  const TITLE_SELECTORS = {
    amazon: ["#productTitle", "#title span"],
    trendyol: ["h1.pr-new-br", ".product-name", ".pr-in-w h1", "h1"],
    hepsiburada: ["h1[data-test-id='title']", "h1.product-name", "h1"],
  };

  function findTitleElement(site) {
    const selectors = TITLE_SELECTORS[site] || TITLE_SELECTORS.amazon;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el;
    }
    return null;
  }

  // Bazı siteler, başlığı sarmalayan kutuya "overflow: hidden" + sabit/küçük
  // yükseklik veriyor (metni kırpmak için tasarlanmış). Panelimizi oraya
  // eklersek görünmez şekilde kırpılır. Bu yüzden, uygun bir yer bulana kadar
  // (en fazla 5 seviye) yukarı çıkıyoruz.
  function findInsertionAnchor(titleEl) {
    let el = titleEl;
    let guard = 0;
    while (el.parentElement && guard < 5) {
      const style = getComputedStyle(el.parentElement);
      if (style.overflow === "hidden" || style.overflowY === "hidden") {
        el = el.parentElement;
        guard++;
        continue;
      }
      break;
    }
    return el;
  }

  // ---------- 2) ARAYÜZ KATMANI ----------
  // Panel artık sayfanın kendi akışına, ürün başlığının hemen altına ekleniyor
  // ve her sitenin kendi marka renkleriyle (gradient, isim, rozet) görünüyor.
  function createPanel() {
    if (document.getElementById("asa-panel")) return;

    const site = detectSite();
    const titleEl = findTitleElement(site);
    const theme = SITE_THEME[site] || SITE_THEME.amazon;
    const taglineKey = "bannerTagline" + (site ? site[0].toUpperCase() + site.slice(1) : "Amazon");
    const tagline = t(taglineKey, LANG);

    const panel = document.createElement("div");
    panel.id = "asa-panel";
    panel.dataset.asaSite = site || "";
    panel.innerHTML = `
      <div class="asa-banner" id="asa-banner-trigger" style="background:${theme.gradient}">
        <div class="asa-avatar">🤖</div>
        <div class="asa-banner-text">
          <div class="asa-banner-title">${theme.name} <span class="asa-badge">${theme.badge}</span></div>
          <div class="asa-banner-tagline">${tagline}</div>
        </div>
        <button id="asa-dismiss-btn" class="asa-dismiss-btn" title="Kapat">×</button>
      </div>
      <div id="asa-body" class="asa-body"></div>
    `;

    if (titleEl && titleEl.parentElement) {
      const anchor = findInsertionAnchor(titleEl);
      anchor.insertAdjacentElement("afterend", panel);
    } else {
      // Başlık bulunamazsa (beklenmedik bir durum), en azından görünür olsun diye yedek.
      document.body.prepend(panel);
    }

    document.getElementById("asa-banner-trigger").addEventListener("click", handleAnalyzeClick);
    document.getElementById("asa-dismiss-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      panel.remove();
    });
  }

  // ---------- 2.5) BENZER ÜRÜN ARAMA ----------
  // Aynı site üzerinde (aynı origin) bir arama isteği atıp sonuç sayfasını
  // arka planda çekiyoruz, sonra o HTML'i tarayarak ürün linklerini çıkarıyoruz.
  // Class isimlerine güvenmek yerine, zaten güvendiğimiz URL kalıplarını
  // (Amazon: /dp/, Trendyol & Hepsiburada: -p-) kullanıyoruz - bu, site
  // tasarımı değişse bile daha dayanıklı bir yöntem.
  function buildSearchQuery(title) {
    if (!title) return "";
    return title.split(/\s+/).slice(0, 5).join(" ");
  }

  function buildSearchUrl(site, query) {
    const q = encodeURIComponent(query);
    if (site === "trendyol") return `https://www.trendyol.com/sr?q=${q}`;
    if (site === "hepsiburada") return `https://www.hepsiburada.com/ara?q=${q}`;
    return `${location.origin}/s?k=${q}`; // amazon.com ya da amazon.com.tr, hangisindeysek
  }

  // Sorgu string'i (tracking parametreleri vb.) farklı olsa bile aynı ürünü
  // tanıyabilmek için URL'yi origin + path'e indirgiyoruz.
  function normalizeUrl(u) {
    try {
      const url = new URL(u);
      return url.origin + url.pathname;
    } catch {
      return u;
    }
  }

  // URL'ler farklı görünse bile (tracking parametresi, varyant seçimi vb.)
  // aynı ürünü kesin olarak tanıyabilmek için, adresin içindeki gerçek ürün
  // kimliğini çıkarıyoruz (Amazon: ASIN, Trendyol/Hepsiburada: "-p-" sonrası kod).
  function extractProductId(url, site) {
    try {
      const path = new URL(url).pathname;
      if (site === "amazon") {
        const m = path.match(/\/dp\/([A-Za-z0-9]{10})/);
        return m ? m[1].toUpperCase() : null;
      }
      const m = path.match(/-p-([a-zA-Z0-9]+)/);
      return m ? m[1].toUpperCase() : null;
    } catch {
      return null;
    }
  }

  // "1.234,56 TL" (TR) ya da "1,234.56" (EN) gibi fiyat metinlerini sayıya çeviriyoruz.
  function parsePriceToNumber(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^\d.,]/g, "");
    if (!cleaned) return null;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    let normalized;
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", "."); // TR format
    } else if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, ""); // EN format
    } else {
      normalized = cleaned;
    }

    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }

  // Bir kutunun (ürün kartının) metninde birden fazla "TL" geçen rakam olabilir
  // (taksit tutarı, kupon indirimi, gerçek fiyat...). Bunların içinden EN
  // BÜYÜĞÜ genelde gerçek fiyattır - taksit/kupon rakamları küçük çıkar.
  function extractBestPrice(text) {
    const matches = text.matchAll(/[\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*(TL|₺|\$)/g);
    let bestText = null;
    let bestNum = -Infinity;
    for (const m of matches) {
      const num = parsePriceToNumber(m[0]);
      if (num !== null && num > bestNum) {
        bestNum = num;
        bestText = m[0].trim();
      }
    }
    return { text: bestText, num: bestNum === -Infinity ? null : bestNum };
  }

  // "Ek 100 TL KuponEk 100 TL KuponMSI Cyborg..." gibi başlığın önüne
  // yapışan kupon/rozet metinlerini temizliyoruz.
  function cleanTitle(title) {
    return title.replace(/^(Ek\s*[\d.,]+\s*TL\s*Kupon\s*)+/gi, "").trim();
  }

  function extractCandidatesFromSearchHtml(doc, site, currentProduct) {
    const pattern = site === "amazon" ? "a[href*='/dp/']" : "a[href*='-p-']";
    const anchors = Array.from(doc.querySelectorAll(pattern));
    const seen = new Set();
    const results = [];

    const currentUrlNorm = normalizeUrl(currentProduct.url);
    const currentProductId = extractProductId(currentProduct.url, site);
    const currentTitleNorm = (currentProduct.title || "").trim().toLowerCase();
    const currentPriceNum = parsePriceToNumber(currentProduct.price);

    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href) continue;

      let absUrl;
      try {
        absUrl = new URL(href, location.origin).href;
      } catch {
        continue;
      }

      // Kendi ürünümüzü (aynı ürün ID'si, aynı URL, ya da birebir aynı başlık
      // olabilir) listeye katmıyoruz. ID karşılaştırması en güvenilir yöntem
      // çünkü URL'de küçük farklar (tracking parametresi vb.) olsa da değişmiyor.
      const candidateId = extractProductId(absUrl, site);
      if (candidateId && currentProductId && candidateId === currentProductId) continue;
      if (normalizeUrl(absUrl) === currentUrlNorm) continue;
      if (seen.has(absUrl)) continue;
      seen.add(absUrl);

      const container = a.closest("div,li,article") || a;
      let title = (a.textContent || "").trim();
      if (title.length < 5) title = container.textContent.trim().slice(0, 140);
      title = cleanTitle(title);
      if (!title) continue;
      if (title.trim().toLowerCase() === currentTitleNorm) continue;

      const best = extractBestPrice(container.textContent);
      const priceText = best.text;
      const priceNum = best.num;

      // Fiyat okuma bu sitelerde güvenilir değil (taksit/kupon rakamları
      // karışabiliyor), o yüzden sadece AŞIRI uçtaki (ör. 5 kattan fazla
      // ucuz/pahalı) belirgin uyumsuzlukları eliyoruz; asıl güvendiğimiz
      // filtre başlık/ID eşleşmesi.
      if (currentPriceNum && priceNum && priceNum >= 50) {
        const ratio = priceNum / currentPriceNum;
        if (ratio < 0.2 || ratio > 5) continue;
      }

      results.push({ title: title.slice(0, 140), url: absUrl, price: priceText });
      if (results.length >= 8) break;
    }

    return results;
  }

  async function findAlternatives(product) {
    const box = document.getElementById("asa-alternatives-box");
    box.innerHTML = `<p class="asa-muted">${t("searchingAlternatives", LANG)}</p>`;

    try {
      const query = buildSearchQuery(product.title);
      const searchUrl = buildSearchUrl(product.site, query);
      const res = await fetch(searchUrl, { credentials: "include" });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const candidates = extractCandidatesFromSearchHtml(doc, product.site, product);

      if (candidates.length === 0) {
        box.innerHTML = `<p class="asa-muted">${t("noAlternatives", LANG)}</p>`;
        return;
      }

      box.innerHTML = candidates
        .map(
          (c) => `
        <a class="asa-alt-item" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">
          <span class="asa-alt-title">${escapeHtml(c.title)}</span>
          ${c.price ? `<span class="asa-alt-price">${escapeHtml(c.price)}</span>` : ""}
        </a>`
        )
        .join("");
    } catch (err) {
      box.innerHTML = `<p class="asa-error">${escapeHtml(err.message)}</p>`;
    }
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

  function renderVerificationResultHtml(v) {
    const concerns = (v.concerns || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    return `
      <strong>${t("verificationLabel", LANG)}:</strong> ${confidenceLabel(v.confidence)}
      ${concerns ? `<ul class="asa-concerns-list">${concerns}</ul>` : ""}
      ${v.correction ? `<p class="asa-muted">${escapeHtml(v.correction)}</p>` : ""}
    `;
  }

  function runVerification(product, analysis) {
    const box = document.getElementById("asa-verification-box");
    box.innerHTML = `<p class="asa-muted">${t("collecting", LANG)}</p>`;

    chrome.runtime.sendMessage(
      { type: "VERIFY_ANALYSIS", payload: { product, analysis } },
      (response) => {
        if (chrome.runtime.lastError) {
          box.innerHTML = `<p class="asa-error">${chrome.runtime.lastError.message}</p>`;
          return;
        }
        if (!response || !response.ok) {
          box.innerHTML = `<p class="asa-error">${
            (response && response.error) || t("unknownError", LANG)
          }</p>`;
          return;
        }
        box.innerHTML = renderVerificationResultHtml(response.data);
      }
    );
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

      <div class="asa-verification" id="asa-verification-box">
        <button id="asa-verify-btn" class="asa-secondary-btn">${t("verificationLabel", LANG)}</button>
      </div>

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

      <button id="asa-alternatives-btn" class="asa-secondary-btn">${t("alternativesBtn", LANG)}</button>
      <div id="asa-alternatives-box" class="asa-alt-list"></div>
    `);

    document
      .getElementById("asa-add-compare-btn")
      .addEventListener("click", () => addToComparison(product));

    document
      .getElementById("asa-verify-btn")
      .addEventListener("click", () => runVerification(product, data));

    document
      .getElementById("asa-alternatives-btn")
      .addEventListener("click", () => findAlternatives(product));

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
