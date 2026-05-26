# FitTracker — instrukcja wdrożenia

## Pliki projektu
```
FitTracker/
├── index.html       ← główny plik apki
├── style.css        ← wygląd
├── app.js           ← logika
├── manifest.json    ← konfiguracja PWA (ikona, nazwa)
├── sw.js            ← obsługa offline
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Jak wdrożyć (GitHub + Cloudflare Pages)

1. Utwórz nowe repozytorium na GitHub (np. `fittracker`)
2. Wgraj wszystkie pliki (zachowując strukturę folderów)
3. W Cloudflare Pages połącz z tym repozytorium
4. Ustaw katalog wyjściowy: `/` (root)
5. Budowanie: brak (to statyczna strona)

## Jak zainstalować na Androidzie

1. Otwórz apkę w Chrome na telefonie
2. Kliknij menu (⋮) → **"Dodaj do ekranu głównego"**
3. Potwierdź — pojawi się ikonka FitTracker
4. Apka działa offline i wygląda jak natywna!

## Funkcje

- **Dzień A / Dzień B** — ćwiczenia podzielone na dwie grupy, apka automatycznie przełącza co dzień
- **Karty ćwiczeń** — przeglądaj ćwiczenia jak karty, oznaczaj jako zrobione
- **Przesuń na jutro** — jedno kliknięcie przenosi ćwiczenie na następny dzień
- **Edycja** — zmień nazwę, liczbę serii/powtórzeń lub czas w dowolnym momencie
- **Historia** — ostatnie 30 dni treningów z paskiem postępu
- **Offline** — działa bez internetu po pierwszym załadowaniu
- **Dane lokalne** — wszystko zapisuje się w pamięci telefonu (localStorage)
