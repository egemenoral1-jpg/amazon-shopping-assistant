# Amazon Shopping Assistant

Amazon ürün sayfalarını (client-side, DOM üzerinden) okuyup Google Gemini API
ile analiz eden bir Chrome eklentisi (Manifest V3).

## Özellikler
- Amazon, Trendyol ve Hepsiburada ürün sayfalarında çalışır
- Tek ürün analizi (özet, artılar, eksiler, tavsiye)
- Sayfadan kazınan gerçek kullanıcı yorumlarını panelde gösterir
- Türkçe / İngilizce arayüz ve analiz dili desteği
- 2-4 ürünü birbiriyle karşılaştırma (ayrı bir sekmede, puanlama ve öneri ile)

## Bilinen sınırlama
Trendyol ve Hepsiburada için kullanılan CSS seçicileri en iyi tahmindir (bu sitelerin
canlı yapısı test edilerek doğrulanmadı). Panelde "Ürün bilgisi okunamadı" hatası
alırsanız, ilgili sitenin ürün sayfasında F12 (DevTools) ile başlık/fiyat/yorum
elemanlarının class isimlerini kontrol edip `content/content.js` içindeki
`scrapeTrendyol()` / `scrapeHepsiburada()` fonksiyonlarındaki seçicileri güncellemek
gerekebilir.

## Kurulum
1. `chrome://extensions` adresine gidin.
2. Sağ üstten "Geliştirici modu"nu açın.
3. "Paketlenmemiş öğe yükle" (Load unpacked) ile bu klasörü seçin.
4. Eklenti ikonuna tıklayıp "API Anahtarı Ayarla" ile kendi Anthropic API
   anahtarınızı girin (https://console.anthropic.com/).
5. Bir Amazon ürün sayfasına (`.../dp/...`) gidin, sağ altta çıkan
   "🤖 AI ile Analiz Et" butonuna tıklayın.

## Klasör yapısı
```
amazon-shopping-assistant/
├── manifest.json          # Eklentinin tanımı, izinler, hangi script nerede çalışacak
├── content/
│   ├── content.js         # Sayfa DOM'unu kazır, buton/panel enjekte eder
│   └── content.css        # Panel ve butonun stili
├── background/
│   └── background.js      # Service worker: mesajları dinler, API çağrılarını başlatır
├── lib/
│   ├── llm-client.js      # Gemini API'ye istek atan yardımcı fonksiyonlar (analiz + karşılaştırma)
│   └── i18n.js            # TR/EN çeviri sözlüğü ve dil yardımcıları
├── popup/
│   ├── popup.html/js/css  # Toolbar ikonuna tıklayınca açılan küçük pencere
├── options/
│   └── options.html/js    # API anahtarı ve dil ayarlarının girildiği sayfa
└── compare/
    └── compare.html/js/css # Ürün karşılaştırma sayfası (ayrı sekmede açılır)
```

## Not
İkon dosyaları (icons/) eklenmemiştir; isterseniz 16x16, 48x48, 128x128 px
PNG dosyaları ekleyip manifest.json içine `"icons"` alanı olarak
tanımlayabilirsiniz.
