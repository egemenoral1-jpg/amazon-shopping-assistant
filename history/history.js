// history/history.js
let LANG = "tr";
let currentList = [];

const listEl = document.getElementById("historyList");
const clearBtn = document.getElementById("clearBtn");

const SITE_LABELS = { amazon: "Amazon", trendyol: "Trendyol", hepsiburada: "Hepsiburada" };

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(LANG === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function applyStaticTexts() {
  document.getElementById("titleEl").textContent = t("historyTitle", LANG);
  clearBtn.textContent = t("clearAll", LANG);
}

function renderList() {
  if (currentList.length === 0) {
    listEl.innerHTML = `<div class="empty-msg">${t("noHistory", LANG)}</div>`;
    return;
  }

  listEl.innerHTML = currentList
    .map((item, i) => {
      const siteLabel = SITE_LABELS[item.site] || "";
      return `
      <div class="history-card">
        <button class="remove-btn" data-index="${i}" title="${t("removeBtn", LANG)}">✕</button>
        ${siteLabel ? `<span class="history-site-badge">${siteLabel}</span>` : ""}
        <div class="history-meta">${formatDate(item.timestamp)} · 💰 ${escapeHtml(
        item.price || "-"
      )} · ⭐ ${escapeHtml(item.rating || "-")}</div>
        <h3>${escapeHtml(item.title || "-")}</h3>
        <p class="history-summary">${escapeHtml(item.summary || "")}</p>
        <p class="history-verdict"><strong>${t("verdict", LANG)}</strong> ${escapeHtml(
        item.verdict || ""
      )}</p>
        <div class="history-links">
          <a href="${escapeHtml(item.url || "#")}" target="_blank">${t("viewProduct", LANG)} →</a>
        </div>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeAt(Number(btn.dataset.index)));
  });
}

async function loadList() {
  const { analysisHistory } = await chrome.storage.local.get("analysisHistory");
  currentList = analysisHistory || [];
  renderList();
}

async function removeAt(index) {
  currentList.splice(index, 1);
  await chrome.storage.local.set({ analysisHistory: currentList });
  renderList();
}

clearBtn.addEventListener("click", async () => {
  currentList = [];
  await chrome.storage.local.set({ analysisHistory: [] });
  renderList();
});

async function init() {
  LANG = await getLang();
  applyStaticTexts();
  await loadList();
}

init();
