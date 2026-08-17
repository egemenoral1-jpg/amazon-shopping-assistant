# Amazon Shopping Assistant

Amazon ürün sayfalarını (client-side, DOM üzerinden) okuyup Anthropic API
(Claude) ile analiz eden bir Chrome eklentisi (Manifest V3).

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
│   └── background.js      # Service worker: mesajları dinler, API çağrısını başlatır
├── lib/
│   └── llm-client.js      # Anthropic API'ye istek atan yardımcı fonksiyon
├── popup/
│   ├── popup.html/js/css  # Toolbar ikonuna tıklayınca açılan küçük pencere
└── options/
    └── options.html/js    # API anahtarının girildiği ayarlar sayfası
```

## Not
İkon dosyaları (icons/) eklenmemiştir; isterseniz 16x16, 48x48, 128x128 px
PNG dosyaları ekleyip manifest.json içine `"icons"` alanı olarak
tanımlayabilirsiniz.
