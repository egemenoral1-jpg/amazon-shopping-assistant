// options/options.js
const input = document.getElementById("apiKey");
const savedLabel = document.getElementById("saved");
const langSelect = document.getElementById("langSelect");

function applyTexts(lang) {
  document.getElementById("titleEl").textContent = t("settingsTitle", lang);
  document.getElementById("apiKeyLabel").textContent = t("apiKeyLabel", lang);
  document.getElementById("langLabel").textContent = t("languageLabel", lang);
  document.getElementById("saveBtn").textContent = t("save", lang);
  document.getElementById("saved").textContent = t("saved", lang);
  document.getElementById("noteEl").innerHTML = `${t("apiNote", lang)}
    ${lang === "en" ? "Get a free key at" : "Ücretsiz anahtar almak için"}
    <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>.`;
}

async function init() {
  const { geminiApiKey, uiLanguage } = await chrome.storage.local.get([
    "geminiApiKey",
    "uiLanguage",
  ]);
  const lang = uiLanguage || "tr";

  if (geminiApiKey) input.value = geminiApiKey;
  langSelect.value = lang;
  applyTexts(lang);
}

langSelect.addEventListener("change", () => applyTexts(langSelect.value));

document.getElementById("saveBtn").addEventListener("click", () => {
  const value = input.value.trim();
  const lang = langSelect.value;
  chrome.storage.local.set({ geminiApiKey: value, uiLanguage: lang }, () => {
    applyTexts(lang);
    savedLabel.style.display = "inline";
    setTimeout(() => (savedLabel.style.display = "none"), 2000);
  });
});

init();
