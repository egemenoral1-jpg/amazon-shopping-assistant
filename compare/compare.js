// compare/compare.js
let LANG = "tr";
let currentList = [];

const listEl = document.getElementById("productList");
const compareBtn = document.getElementById("compareBtn");
const clearBtn = document.getElementById("clearBtn");
const resultArea = document.getElementById("resultArea");

function applyStaticTexts() {
  document.getElementById("titleEl").textContent = t("compareTitle", LANG);
  clearBtn.textContent = t("clearAll", LANG);
  compareBtn.textContent = t("compareBtn", LANG);
}

function renderList() {
  if (currentList.length === 0) {
    listEl.innerHTML = `<div class="empty-msg">${t("noProducts", LANG)}</div>`;
    compareBtn.disabled = true;
    return;
  }

  listEl.innerHTML = currentList
    .map(
      (p, i) => `
      <div class="product-card">
        <button class="remove-btn" data-index="${i}" title="${t("removeBtn", LANG)}">✕</button>
        <h3>${escapeHtml(p.title || "-")}</h3>
        <p class="meta">💰 ${escapeHtml(p.price || "-")}</p>
        <p class="meta">⭐ ${escapeHtml(p.rating || "-")}</p>
      </div>`
    )
    .join("");

  listEl.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeAt(Number(btn.dataset.index)));
  });

  compareBtn.disabled = currentList.length < 2;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadList() {
  const { comparisonList } = await chrome.storage.local.get("comparisonList");
  currentList = comparisonList || [];
  renderList();
}

async function removeAt(index) {
  currentList.splice(index, 1);
  await chrome.storage.local.set({ comparisonList: currentList });
  resultArea.innerHTML = "";
  renderList();
}

clearBtn.addEventListener("click", async () => {
  currentList = [];
  await chrome.storage.local.set({ comparisonList: [] });
  resultArea.innerHTML = "";
  renderList();
});

compareBtn.addEventListener("click", () => {
  if (currentList.length < 2) {
    resultArea.innerHTML = `<p class="asa-error">${t("needTwo", LANG)}</p>`;
    return;
  }

  resultArea.innerHTML = `<p class="asa-muted">${t("comparing", LANG)}</p>`;
  compareBtn.disabled = true;

  chrome.runtime.sendMessage(
    { type: "COMPARE_PRODUCTS", payload: currentList },
    (response) => {
      compareBtn.disabled = currentList.length < 2;

      if (chrome.runtime.lastError) {
        resultArea.innerHTML = `<p class="asa-error">${chrome.runtime.lastError.message}</p>`;
        return;
      }
      if (!response || !response.ok) {
        resultArea.innerHTML = `<p class="asa-error">${
          (response && response.error) || t("unknownError", LANG)
        }</p>`;
        return;
      }
      renderResult(response.data);
    }
  );
});

function renderResult(data) {
  const rows = (data.products || [])
    .map((p) => {
      const isWinner = data.winner && p.title === data.winner;
      return `
        <div class="result-product-row ${isWinner ? "is-winner" : ""}">
          <div>
            <strong>${escapeHtml(p.title || "-")}</strong>
            <div class="asa-muted" style="font-size:12px;">${escapeHtml(p.bestFor || "")}</div>
          </div>
          <span class="score-badge">${escapeHtml(String(p.score ?? "-"))}/10</span>
        </div>`;
    })
    .join("");

  resultArea.innerHTML = `
    <div class="result-card">
      <p class="result-overview">${escapeHtml(data.overview || "")}</p>
      <div class="result-products">${rows}</div>
      <div class="winner-box">
        <div>${t("winner", LANG)}: <strong>${escapeHtml(data.winner || "-")}</strong></div>
        <p class="asa-muted">${escapeHtml(data.reasoning || "")}</p>
      </div>
    </div>
  `;
}

async function init() {
  LANG = await getLang();
  applyStaticTexts();
  await loadList();
}

init();
