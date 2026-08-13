# Проверочные примеры для регулярных выражений

Новый файл в v2.3. Справочник разбит на части: эталонные пары «образец / результат» для всех регулярных выражений из `chatbot-artifacts.md` собраны в файлах из таблицы ниже. Эти образцы используются для проверки регулярных выражений перед публикацией изменений в скилле.

Каждое регулярное выражение проходит три проверки:

- **Прямой образец** — выражение должно сработать.
- **Отрицательный образец** — похожий, но не относящийся к ИИ текст. Выражение не должно сработать.
- **Граничный образец** — пустая строка, многократные совпадения, юникод. Выражение не должно ломаться.

Автоматический прогон — `python3 scripts/check_markers.py` (он же в CI). Ручной вариант для PowerShell приведён в конце файла.


---

## Состав файла

Справочник разбит на части: содержимое живёт в файлах из таблицы, а этот файл остаётся входом. Нумерация разделов сохранена: остальные файлы проекта ссылаются на неё.

| Раздел | Где читать |
|---|---|
| Разделы 1–15 — образцы для регулярных выражений: прямой, отрицательный и граничный на каждое выражение | `test-fixtures-cases.md` |
| Полные пары «до / после» для содержательной правки: маркетинг, биография, художественная проза, юридический текст | `test-fixtures-pairs.md` |
| Эмпирическая проверка выражений и принцип использования | этот файл, разделы ниже |

## Эмпирическая проверка регулярных выражений

**Основной способ (с v2.6) — автоматический прогон.** Все выражения из `chatbot-artifacts.md` проверяются скриптом на стандартной библиотеке Python — три уровня на каждое выражение (прямой, отрицательный, граничный образец плюс многократные совпадения):

```bash
python3 scripts/check_markers.py
```

Скрипт запускается в CI (`.github/workflows/regex-check.yml`) на каждом PR, затрагивающем `scripts/` или файлы с маркерами. Локальный запуск перед релизом обязателен. При добавлении нового выражения образцы добавляются в скрипт и в раздел «Образцы для регулярных выражений» выше.

**Альтернативный способ — PowerShell.** Ручная проверка для среды Windows без Python:

```powershell
$test = @{
  oaicite_full = @{
    pattern = ':contentReference\[oaicite:\d+\]\{index=\d+\}'
    positive = 'Согласно :contentReference[oaicite:0]{index=0}, цифры верны.'
    negative = 'Упомянуто слово oaicite в статье об ИИ.'
  }
  oai_citation = @{
    pattern = 'oai_citation:\d+‡'
    positive = 'oai_citation:5‡Wiki источник'
    negative = 'oai_citation без двоеточия'
  }
  turn_search = @{
    pattern = 'turn\d+search\d+'
    positive = 'turn0search0'
    negative = 'turn around and search'
  }
  utm_chatgpt = @{
    pattern = '[?&]utm_source=chatgpt\.com'
    positive = 'https://example.com/?utm_source=chatgpt.com'
    negative = 'utm_source=chatgpt.com упомянут в тексте'
  }
  utm_openai = @{
    pattern = '[?&]utm_source=openai'
    positive = 'https://docs.example.com/?utm_source=openai'
    negative = 'OpenAI utm_source без знака запроса'
  }
  attached_file = @{
    pattern = 'attached_file:\/\/'
    positive = 'attached_file:///tmp/file.pdf'
    negative = 'См. прикрепленный файл (русский текст)'
  }
  grok_card = @{
    pattern = 'grok_card:\/\/'
    positive = 'grok_card://1234567890'
    negative = 'карточка Grok без специальной разметки'
  }
  vertexai = @{
    pattern = 'vertexaisearch\.cloud\.google\.com/grounding-api-redirect'
    positive = 'ссылка vertexaisearch.cloud.google.com/grounding-api-redirect/abc в тексте'
    negative = 'cloud.google.com/vertex-ai-search'
  }
  copilot_caret = @{
    pattern = '\[\^\d+\^\]'
    positive = 'Рынок вырос на 12%[^1^] по отчёту'
    negative = 'Обычная сноска Markdown[^1] ниже'
  }
  assistants_source = @{
    pattern = '【\d+(?::\d+)?†source】'
    positive = 'политика【1†source】разрешает'
    negative = 'декоративные уголки 【примечание】'
  }
  cite_turn = @{
    pattern = 'citeturn\d+[a-z]+\d+'
    positive = 'текст citeturn0file0 ссылка'
    negative = 'процитируй, затем turn to page 5'
  }
  sandbox_link = @{
    pattern = '\]\(sandbox:/mnt/data/'
    positive = '[Скачать](sandbox:/mnt/data/r.xlsx)'
    negative = 'окружение sandbox на /mnt/data сервера'
  }
}

foreach ($name in $test.Keys) {
  $t = $test[$name]
  $pos = $t.positive -match $t.pattern
  $neg = $t.negative -match $t.pattern
  $ok = $pos -and (-not $neg)
  $status = if ($ok) { 'OK' } else { 'FAIL' }
  Write-Host ('{0,-18} {1}  pos={2}  neg={3}' -f $name, $status, $pos, $neg)
}
```

В PowerShell-варианте приведены 12 выражений как образец ручной проверки. Полный прогон всех 38 (включая усечённые формы, невидимые символы из A.7 и A.10, метки file_search и метки Gemini) выполняет `scripts/check_markers.py` — он и считается каноническим. Тот же скрипт умеет проверять произвольный текст: `python3 scripts/check_markers.py --scan файл.md`.

---

## Принцип использования

Если в скилл добавляется новое регулярное выражение или новый признак — он обязан получить три проверочных образца в этом файле до публикации. Файл служит автоматизированным набором тестов для регрессионной защиты.

При смене флагманской модели (см. `llm-fingerprints.md`) нужно:

1. Проверить, изменился ли формат вывода инструментов.
2. Если да — добавить новые регулярные выражения с образцами.
3. Старые регулярные выражения сохранить для текстов прежней эпохи.

Принцип «без регрессий»: ни одно работающее правило не удаляется.
