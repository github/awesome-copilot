# DAW Bridge · GOD MODE 4.2

**Lokalny audyt projektów, mediów i sesji DAW.** 4.2 zachowuje funkcje ULTRA 3.0 oraz dodaje tryby Turbo/Full/Deep, limitowaną analizę fingerprint/tempo/transient/chroma, fail-closed preflight i weryfikowane manifesty backupów. Project-first indexing, techniczne tagi, raporty kompatybilności i eksport source-media stems pozostają lokalne. Launcher zapisuje ostatni folder i może używać opcjonalnego WebView.

> **Uczciwy zakres:** „AI” to lokalne, deterministyczne reguły i rankingi — nie ma generatywnego modelu ani chmurowej usługi. Wyniki audio są heurystycznymi pomiarami, a parsowanie projektów jest ograniczone do pól dostępnych w adapterze. Nie jest to uniwersalny konwerter, system source separation ani certyfikacja miksu.

## Standalone launcher: szybki start

### Windows
1. Zainstaluj Python 3.12 lub 3.13 z python.org (włącz Python Launcher).
2. Rozpakuj paczkę GOD MODE 4.2 i uruchom `START_WINDOWS.vbs` dla normalnego, bezkonsolowego startu. `START_WINDOWS.bat` jest dostępny do diagnostyki.
3. Pierwsze uruchomienie doinstaluje zależności z `requirements.txt` (potrzebny Internet wyłącznie do instalacji), po czym otworzy launcher.
4. W launcherze wybierz **ograniczony folder** projektów i mediów. Ostatni folder jest zapamiętywany lokalnie. Gdy opcjonalny `pywebview` jest zainstalowany i działa, Bridge otwiera osadzone WebView; w przeciwnym razie używa przeglądarki systemowej. Kliknij **Scan**.

### macOS / Linux
```bash
python3 -m pip install -r requirements.txt
./start_daw_bridge.sh
```
Launcher wymaga Tkinter. Alternatywnie można uruchomić serwer bez launchera:
```bash
python3 server.py --root "/path/to/audio-workspace" --host 127.0.0.1 --port 8765
```

Serwer domyślnie nasłuchuje wyłącznie na `127.0.0.1`; nie wystawiaj go na LAN ani Internet. Launcher otwiera lokalny UI w opcjonalnym WebView albo przeglądarce. Wybrany root zapamiętuje się w ustawieniach użytkownika. Instalacja `pywebview` jest opcjonalna (`python -m pip install pywebview`). **To lokalna aplikacja Python + UI, nie samodzielny EXE/native installer i nie zawiera DAW.** Zatrzymanie launchera kończy serwer. Log uruchomienia znajduje się w `<workspace>/.dawbridge/launcher.log`.

## GOD MODE 4.2 — funkcje

| Moduł | Co robi | Granice działania |
|---|---|---|
| **Adaptive Fingerprinting X** | Segmenty dopasowywane do zmian energii/transientów, 8 pasm, chroma 12-bin, rytmiczny profil; constrained-DTW i similarity components. | Do 180 s adaptive coverage na plik; porównanie jest rankingiem, nie identyfikacją nagrania. Cache upgrade’uje się leniwie z v3. |
| **Mix Integrity Scan** | Sekcyjne RMS/peak/crest, transient density, energia pasm/chroma oraz próbkowane M/S width, balans i korelacja L/R w czasie. | Heurystyka lokalna; brak LUFS, true-peak, odsłuchu, mastering certification i source separation. |
| **Auto Stem Rebuild** | Konsoliduje rozpoznane źródła w stem float WAV od wspólnej osi czasu; raportuje powtórne refs i dokładne duplikaty SHA-256. Manifest wylicza zapisane stem-y/źródła i osobne missing-source warnings. | Jawne potwierdzenie + Safe Mode/hash. SHA-256 do 100 plików / 2 GiB; stałe tempo wymagane, jeśli regiony są w beat. Bez renderu DAW/pluginów, automatyki, fades, warp/stretch, gain/pan ani sidechainu. |
| **Cross-DAW Routing Map** | Pokazuje wyekstrahowane track/group/bus/send/routing hints i opcjonalne sugestie mapowania do projektu docelowego. | Brakujące dane parsera nie dowodzą braku routingu; mapowanie nie zmienia sesji. |
| **Plugin Awareness X** | Raportuje nazwy z adapterów/string hints, wykryte preset/instrument/IR/media dependency hints i unresolved refs. | Nie skanuje katalogów pluginów/rejestru, nie ładuje instancji, nie sprawdza wersji ani kompatybilności. Brak wersji oznacza „nieznane”, nie „zgodne”. |
| **Session Storyboard** | Rozdziela timeline według sparsowanych markerów; wiąże regiony/tracki i eksportuje neutralny JSON. | Nie „słucha” ani nie opisuje treści audio; pominięte pola wynikają z ograniczeń parsera. |
| **Auto Gain Match** | Wyznacza wspólny cel RMS (domyślnie mediana wybranych plików), proponuje/eksportuje kopie float WAV z jednolitym gainem. Opcja stem rebuild stosuje ten sam sposób do wygenerowanych stemów. | Jednolity scalar gain zachowuje crest factor; matching request ograniczony do -24…+12 dB, a dodatkowe tłumienie może być użyte, by ograniczyć zmierzony sample peak do ≤ -1 dBFS. RMS/sample peak nie są LUFS/true-peak. Eksport zawsze tworzy kopie, nie nadpisuje źródeł. |
| **Bridge Watchdog X** | Raportuje watcher, projekty zmienione od skanu, health issues i recovery hints. | Nie blokuje procesu systemowym lockiem, nie zamyka DAW i nie gwarantuje wykrycia każdego procesu. |
| **Auto-Tagging** | Zapisuje wyłącznie tagi techniczne: source type, oszacowane BPM/key oraz bucket energy wyprowadzony z RMS. | BPM/key są lokalnymi heurystykami; energy nie jest oceną percepcyjną. Nie wyciąga semantycznych tagów z nazw plików. |
| **Library Intelligence** | Ograniczone grupowanie na podstawie nazwy/folderu i estymacji key/tempo; podaje coverage. | To heurystyka, nie semantyczny model audio. Do 200 rekordów na żądanie. |
| **Smart Similarity Search** | Ranking plików z adaptacyjnego widma, chroma, rytmu i czasu. | Do 300 kandydatów na wywołanie; w UI 120. Wymaga ręcznej weryfikacji/odsłuchu. |
| **Auto Tonality Detect** | 12-bin chroma correlation i alternatywne tonacje. | Wynik może być niejednoznaczny, szczególnie dla perkusji, materiału atonalnego lub wielotonowego. |
| **Auto Transient Map** | Lokalne spektralny-flux/energy-change candidates oraz propozycja beat grid. | Nie zapisuje do projektu; grid dziedziczy błędy estymacji BPM/fazy. Nie jest gwarantowanym beat trackerem. |
| **Producer AI Ultra** | Łączy istniejące techniczne metryki i deterministyczne raporty z storyboardem/safety hints. | Brak generatywnego modelu/LLM; sugestie nie są oceną artystyczną ani masteringiem. |
| **Performance Boost X** | Leniwy SQLite-cache fingerprintów, odczyty blokowe, bounded analysis, do 4 workerów similarity search; raport zasobów i limitów. | Pierwsza analiza/hash nadal zużywa I/O/CPU. Skan/operacje HTTP są serializowane dla bezpieczeństwa. |
| **Snapshot Engine Pro** | Snapshot v4 z polami adaptera, issue summary, folder proposals, media SHA i opcjonalnymi fingerprint summaries; diff dwóch snapshotów. | SHA źródeł ograniczone do 200 plików / 2 GiB; pominięcia są oznaczone. Diff obejmuje sparsowane pola, nie nieprzezroczyste dane natywne. |
| **Fail-closed Preflight + logs** | Sprawdza DAW, hash projektu, watcher, parser, pliki źródłowe, statystyki/readability, możliwość zapisu, wolne miejsce i integralność istniejących backupów. Kandydaci repair są walidowani po ręcznym wyborze. | Nie usuwa wyścigów filesystemowych; każda operacja powtarza kontrole, a systemowe ograniczenia procesów nadal mają znaczenie. |
| **Standalone App Pro** | Tkinter launcher, wybór zapamiętanego workspace, loopback server, opcjonalny embedded WebView, lokalny log. | Nie jest pakowanym EXE/native installerem; wymaga Python/Tkinter. Bez pywebview używa systemowej przeglądarki. |

## Zachowane funkcje ULTRA 3.0
Skan i filtry projektów; Smart Media Resolver; cache SHA/audio; duplikaty SHA bez kasowania; folder mappings; Health Check; Cross-DAW Sync/export; RPP repair z ręcznym wyborem, backupem i walidacją; portable RPP package; warunkowy FLP tempo-copy; Producer Report; watcher i opt-in fingerprint/tagging; Bridge Monitor; Metadata JSON; neutralny session/stem export. Ryzykowne zapisy nadal wymagają Safe Mode, jawnego potwierdzenia, walidacji i kopii.

## Zakres parserów (bez deklaracji pełnego wsparcia)

| Format | Odczyt | Zapis |
|---|---|---|
| **Reaper `.rpp`** | Adapter tekstowy: TRACK/NAME, SOURCE/FILE, ITEM position/length/offset, stałe tempo, markery/regiony, wybrane plugin hints i `AUXRECV`. | Wybrane refs repair po ręcznym wyborze, backupie/hash/atomowym zapisie; portable package. |
| **Ableton `.als`** | Częściowy gzip/XML: typowe track/FileRef/clip/tempo/locator/plugin pola. | Read-only. Schemat różni się między wersjami. |
| **FL Studio `.flp`** | PyFLP 2.2.1: obsługiwane zdarzenia/modele zależne od wersji. | Zweryfikowana nowa kopia tempa tylko, gdy parser potrafi ją ponownie otworzyć; oryginał zostaje. |
| **Studio One `.song`** | ZIP/XML strukturalny i heurystyczny dla wybranych pól. | **Read-only.** Adapter częściowy i zależny od schematu/wariantu. |
| **Cubase `.cpr`** | Heurystyka stringów; XML parser tylko dla jawnego, czytelnego XML snapshotu. Typowy CPR jest wersjonowanym formatem binarnym. | Brak native write. |
| **Logic `.logicx`** | Wybrane plist-y, bounded ProjectData strings i media hints; wersjonowany binarny element pozostaje częściowo nieprzezroczysty. | Read-only. |

**Nie deklarujemy pełnego parsera FLP/CPR/SONG/LOGICX.** PyFLP oraz `.als`/`.song` zależą od wersji/pokrycia; CPR, Studio One SONG i Logic są częściowe i read-only. Demo-workspace zawiera sztuczne fixtures i nie jest produkcyjną sesją DAW.

## Honest limitations
- Brak renderowania instrumentów ani pluginów; eksport stems bazuje na plikach źródłowych i rozpoznanych regionach.
- Brak pełnej konwersji między DAW; neutralne mapy i podobieństwa nie zapisują nowej sesji do innego formatu.
- Brak modelu ML/generatywnego, source separation, mastering certification i zastępstwa za odsłuch.
- CPR/LOGICX/SONG parsowane są częściowo/read-only; brak wskazówki pluginu lub routingu nie dowodzi jej braku.
- Fingerprint/similarity to lokalna miara techniczna, nie dowód tożsamości plików.

## Safe Mode, dane i limity
- Wszystkie operacje lokalne. Domyślne `server.py` wiąże `127.0.0.1`, używa tokena sesji, kontroli Host/Origin, ścieżek do jawnie wybranego root i limitu JSON 1 MB.
- Naprawy RPP, portable export, session export/stems i kopie FLP blokują się, gdy działa proces odpowiedniego DAW (nawet jeśli otwarty jest inny projekt) lub hash projektu różni się od skanu. Procesy muszą być wykrywalne przez psutil; brak weryfikacji blokuje zapis.
- RPP repair wymaga ręcznego `confirm=true`, sprawdzenia każdego old path → new path, walidacji kandydatów i statystyk pliku, zweryfikowanego backupu oraz ponownego skanu po operacji. Backup zawiera lokalny manifest integralności SHA-256; uszkodzony lub nierozpoznany backup nie zostanie użyty do restore. Nieczytelny projekt, nieznany rozmiar, nieweryfikowalny proces DAW/watcher, niedostępne źródło, brak miejsca lub brak testowego zapisu blokują operację.
- Session export/stems eksportuje surowe source media według rozpoznanych regionów, **nie miks wyrenderowany przez DAW**; nie renderuje pluginów/instrumentów, automatyki, fades, warp/stretch, pan/gain ani sidechain.
- Dla RPP naprawa tworzy backup i zapis atomowy. Jedyna natywna kopia-tempo pozostaje ograniczona do wspieranego FLP; ALS/SONG/CPR/LOGICX nie są zapisywane.
- Watcher domyślnie nie wykonuje akcji po zmianach; opt-in Auto-Fingerprint/Auto-Tagging jest oddzielny od ryzykownych workflowów.
- Root max 50 000 plików; limity projektu/XML zwykle 32 MB; adaptive analysis maksymalnie 180 s/plik. Deep Scan wybiera maks. 20 plików, do 45 s/plik i do 512 MiB szacowanych zdekodowanych PCM na skan; media z referencji projektów mają priorytet, a reszta jest wybierana równomiernie. Cache może zawierać szerszą analizę z innych workflowów; raport pokazuje wybrany zakres/coverage. Pojedyncze źródło fingerprint do 30 min; stem timeline do 30 min; podobieństwo maks. 300 kandydatów; gain-match maks. 50 plików / 2 h; snapshot SHA maks. 200 plików / 2 GiB.
- CPR/LOGICX/SONG są read-only częściowymi adapterami; raport kompatybilności rozdziela dane strukturalne od heuristic plugin/routing hints.
- Auto-Tagging zapisuje tylko source type, BPM/key (jeśli estymacja przejdzie próg) i RMS-derived energy bucket.
- **Turbo Scan** parsuje projekty i indeksuje ścieżki, pomijając audio headers/fingerprint; **Full Scan** po projekcie równolegle odczytuje nagłówki audio; **Deep Scan** wykonuje Full, po czym limitowaną lokalną analizę adaptacyjnego fingerprintu, propozycji BPM, transient candidates i chroma/key. Ustawienie `scanMode` (`turbo`/`full`/`deep`) oraz poziom logów są przechowywane w `.dawbridge/settings-v3.json`; stare `lightMode=true` mapuje się na Turbo.
- Wykonaj niezależny backup biblioteki. Nie wskazuj całego dysku.

## API GOD MODE 4.2
Wszystkie `/api/*` wymagają `X-Bridge-Token`; POST dodatkowo sprawdza lokalny Origin. Nowe trasy obejmują:
- `POST /api/preflight` `{id,operation}` — raport bezpieczeństwa przed wybraną operacją; `POST /api/compatibility` `{id}` — rozdział danych parsera i wskazówek heurystycznych
- `POST /api/mix-integrity` `{path}`, `/api/tonality` `{path}`, `/api/transient-map` `{path}`
- `POST /api/similarity-search` `{path,limit?,candidateLimit?}`, `/api/library-intelligence` `{limit?}`
- `POST /api/gain-match` `{paths|path,targetRmsDbfs?,confirm?}` — bez confirm raport; z `confirm:true` nowa kopia ZIP
- `POST /api/session-storyboard` `{id}`, `/api/routing-map` `{id,targetId?}`, `/api/plugin-awareness-x` `{id}`
- `POST /api/watchdog-x` `{id?}`, `/api/snapshot-compare` `{a,b}`
- `POST /api/automation` zachowuje workflowy 3.0 i przyjmuje m.in. `auto-stem-rebuild`, `auto-transient-map`, `auto-tonality`, `mix-integrity`, `auto-gain-match`, `similarity-search`, `library-intelligence`, `session-storyboard`, `watchdog-x` i `plugin-awareness-x`.

`POST /api/scan` akceptuje `{mode:"turbo"|"full"|"deep"}`; pominięcie mode używa zapamiętanej preferencji. Deep scan zwraca `deepAnalysis` z coverage, confidence estimates, liczbą transient candidates oraz listą błędów/pominięć.

Zachowane endpointy: `smart-index`, `resolve`, `fingerprint`, `folder-map`, `health`, `cross-sync`, `sync-export`, `session-export`, `repair`, `portable`, `audio`, `producer`, `metadata-brain`, `settings`, `watcher`, `snapshot`, `performance`, `monitor` i `download`.

## Testy i zależności
```bash
python -m pip install -r requirements.txt
python -m unittest -v
```
Testy obejmują adaptery, Safe Mode, confirmation, fail-closed preflight, Turbo/Full/Deep modes, limity Deep Scan, technical tagging, compatibility reports, zweryfikowane backupy, cache/export workflows i bounded audio analysis. Testy syntetyczne nie dowodzą zgodności z komercyjnymi sesjami. Nie wykonano jeszcze pełnej walidacji GUI na Windows ani odsłuchu w DAW.

Zależności: Python 3.12/3.13, `pyflp==2.2.1` (GPL-3.0), NumPy, SoundFile/libsndfile i psutil. Przed redystrybucją zależności sprawdź właściwe licencje; źródło PyFLP nie jest vendored w paczce.
