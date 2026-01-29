---
name: documatica-v12-design-system
description: "Premium design system for modern web applications. Features extreme rounded corners (3-4rem), blue-600 accent, gold AI indicators (#FBBF24), Inter font, generous whitespace. Components: buttons, inputs, cards, tables, modals, navigation, hero sections, pricing. Triggers on: create UI, design component, style form, make card, add button. 50+ ready-to-use component pairs (HTML+CSS)."
---

# Documatica v12.0 Design System

Это официальная дизайн-система проекта Documatica. Используй этот skill для всех UI/UX задач.

**ВАЖНО:** При создании UI-компонентов ОБЯЗАТЕЛЬНО читай референсные файлы из директории `references/` этого skill.

---

## Библиотека компонентов (Reference Files)

Полная библиотека готовых компонентов находится в `references/`. Читай соответствующий файл перед созданием компонента:

| Компонент | HTML | CSS |
|-----------|------|-----|
| **Design Tokens** | - | [tokens.css](references/tokens.css) |
| **Buttons** | [buttons.html](references/buttons.html) | [buttons.css](references/buttons.css) |
| **Inputs** | [inputs.html](references/inputs.html) | [inputs.css](references/inputs.css) |
| **Cards** | [cards.html](references/cards.html) | [cards.css](references/cards.css) |
| **Tables** | [tables.html](references/tables.html) | [tables.css](references/tables.css) |
| **Modals** | [modals.html](references/modals.html) | [modals.css](references/modals.css) |
| **Navigation** | [navigation.html](references/navigation.html) | [navigation.css](references/navigation.css) |
| **Footer** | [footer.html](references/footer.html) | [footer.css](references/footer.css) |
| **Hero** | [hero.html](references/hero.html) | [hero.css](references/hero.css) |
| **Pricing** | [pricing.html](references/pricing.html) | [pricing.css](references/pricing.css) |
| **Testimonials** | [testimonials.html](references/testimonials.html) | [testimonials.css](references/testimonials.css) |
| **Stats** | [stats.html](references/stats.html) | [stats.css](references/stats.css) |
| **Alerts** | [alerts.html](references/alerts.html) | [alerts.css](references/alerts.css) |
| **Badges** | [badges.html](references/badges.html) | [badges.css](references/badges.css) |
| **Avatars** | [avatars.html](references/avatars.html) | [avatars.css](references/avatars.css) |
| **Checkboxes** | [checkboxes.html](references/checkboxes.html) | [checkboxes.css](references/checkboxes.css) |
| **Selects** | [selects.html](references/selects.html) | [selects.css](references/selects.css) |
| **Tabs** | [tabs.html](references/tabs.html) | [tabs.css](references/tabs.css) |
| **Accordion** | [accordion.html](references/accordion.html) | [accordion.css](references/accordion.css) |
| **Pagination** | [pagination.html](references/pagination.html) | [pagination.css](references/pagination.css) |
| **Progress** | [progress.html](references/progress.html) | [progress.css](references/progress.css) |
| **Timeline** | [timeline.html](references/timeline.html) | [timeline.css](references/timeline.css) |
| **Empty States** | [empty-states.html](references/empty-states.html) | [empty-states.css](references/empty-states.css) |
| **Error Pages** | [error-pages.html](references/error-pages.html) | [error-pages.css](references/error-pages.css) |
| **File Upload** | [file-upload.html](references/file-upload.html) | [file-upload.css](references/file-upload.css) |
| **Gallery** | [gallery.html](references/gallery.html) | [gallery.css](references/gallery.css) |
| **Sidebar** | [sidebar.html](references/sidebar.html) | [sidebar.css](references/sidebar.css) |
| **Chat** | [chat.html](references/chat.html) | [chat.css](references/chat.css) |
| **Comments** | [comments.html](references/comments.html) | [comments.css](references/comments.css) |
| **Reviews** | [reviews.html](references/reviews.html) | [reviews.css](references/reviews.css) |
| **Rating** | [rating.html](references/rating.html) | [rating.css](references/rating.css) |
| **Profile** | [profile.html](references/profile.html) | [profile.css](references/profile.css) |
| **Blog Article** | [blog-article.html](references/blog-article.html) | [blog-article.css](references/blog-article.css) |
| **Product** | [product.html](references/product.html) | [product.css](references/product.css) |
| **Cart** | [cart.html](references/cart.html) | [cart.css](references/cart.css) |
| **Checkout** | [checkout.html](references/checkout.html) | [checkout.css](references/checkout.css) |
| **Service Page** | [service-page.html](references/service-page.html) | [service-page.css](references/service-page.css) |
| **Typography** | [typography.html](references/typography.html) | [typography.css](references/typography.css) |
| **Colors** | [colors.html](references/colors.html) | [colors.css](references/colors.css) |
| **Icons** | [icons.html](references/icons.html) | [icons.css](references/icons.css) |
| **Grid** | [grid.html](references/grid.html) | [grid.css](references/grid.css) |
| **Containers** | [containers.html](references/containers.html) | [containers.css](references/containers.css) |
| **Dividers** | [dividers.html](references/dividers.html) | [dividers.css](references/dividers.css) |
| **Sliders** | [sliders.html](references/sliders.html) | [sliders.css](references/sliders.css) |
| **Datepicker** | [datepicker.html](references/datepicker.html) | [datepicker.css](references/datepicker.css) |
| **Social** | [social.html](references/social.html) | [social.css](references/social.css) |

---

## Философия дизайна

- **Экстремальные скругления** - никаких острых углов
- **Воздух** - много whitespace, большие паддинги
- **Минимализм** - только 2 акцентных цвета (blue + gold)
- **Типографика** - uppercase теги, черный font-weight для заголовков
- **БЕЗ эмодзи** - только SVG иконки (Heroicons, Lucide)

---

## CSS Variables (Design Tokens)

```css
:root {
  --docu-blue: #3b82f6;
  --docu-gold: #FBBF24;
  --docu-dark: #0f172a;
  --docu-base: #f1f5f9;
  --docu-radius-max: 3rem;
  --docu-radius-input: 1.5rem;
  --docu-ink: #0f172a;        /* slate-900 */
  --docu-body: #64748b;       /* slate-500 */
  --docu-muted: #94a3b8;      /* slate-400 */
}
```

---

## Типографика

| Элемент | Класс | Стили |
|---------|-------|-------|
| H1 Hero | `.docu-h1` | clamp(4rem, 12vw, 8rem), font-black, uppercase, tracking-tighter |
| H2 Section | `.docu-h2` | clamp(2.5rem, 6vw, 3.75rem), font-black, uppercase |
| H3 Card | `.docu-h3` | 1.5rem, font-black, uppercase |
| Tag Primary | `.docu-tag` | 10px, font-black, uppercase, tracking-[0.4em], blue-600 |
| Tag Muted | `.docu-tag-muted` | 10px, font-black, uppercase, tracking-[0.4em], slate-400 |
| Body | `.docu-body` | 1rem, font-medium, slate-500 |
| Lead | `.docu-lead` | 1.25rem, font-medium, slate-500 |
| Micro | `.docu-micro` | 9px, font-bold, uppercase, tracking-widest |

---

## Геометрия

| Элемент | Скругление |
|---------|------------|
| Секции, крупные контейнеры | `rounded-[3rem]` или `rounded-[4rem]` |
| Карточки, кнопки, инпуты | `rounded-2xl` или `rounded-[1.5rem]` |
| Таблицы | `rounded-[2.5rem]` |
| Чекбоксы | `rounded-lg` |

**НИКОГДА:** `rounded-md`, `rounded-sm`, острые углы

---

## Цветовая палитра

| Назначение | Цвет | Tailwind |
|------------|------|----------|
| Бренд/Акцент | #3b82f6 | `blue-600` |
| AI/Системные | #FBBF24 | `docu-gold`, `yellow-400` |
| Фон страницы | #f1f5f9 | `slate-50` |
| Заголовки | #0f172a | `slate-900` |
| Основной текст | #64748b | `slate-500` |
| Muted текст | #94a3b8 | `slate-400` |
| Границы | #e2e8f0 | `slate-100` |

---

## Кнопки

### Primary Button
```html
<button class="bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] px-10 py-4 text-[10px] hover:translate-y-[-2px] hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-300">
  Создать документ
</button>
```

### Massive CTA
```html
<button class="bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] px-16 py-8 text-[12px] hover:scale-[1.02] hover:translate-y-[-4px] transition-all duration-500">
  Начать бесплатно
</button>
```

### AI Action (Gold)
```html
<button class="bg-[#FBBF24] text-slate-900 rounded-2xl font-black uppercase tracking-widest px-8 py-4 text-[10px] hover:bg-[#f59e0b] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all duration-300">
  Заполнить с ИИ
</button>
```

### Ghost/Outline
```html
<button class="border-2 border-slate-200 text-slate-400 rounded-2xl font-black uppercase tracking-widest px-8 py-4 text-[10px] hover:bg-slate-50 hover:text-slate-600 transition-all duration-300">
  Отмена
</button>
```

---

## Формы

### Контейнер формы
```html
<div class="bg-white border border-slate-100 rounded-[4rem] p-10 md:p-16 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.05)]">
  <!-- форма -->
</div>
```

### Поле ввода
```html
<div>
  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">
    Название организации
  </label>
  <input type="text" class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all duration-200" />
</div>
```

### Checkbox
```html
<label class="flex items-center gap-3 cursor-pointer">
  <div class="w-6 h-6 rounded-lg border-2 border-slate-200 flex items-center justify-center peer-checked:bg-blue-600 peer-checked:border-blue-600">
    <svg class="w-4 h-4 text-white hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
    </svg>
  </div>
  <span class="text-sm font-medium text-slate-600">Согласен с условиями</span>
</label>
```

---

## Таблицы

```html
<div class="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden">
  <table class="w-full">
    <thead class="bg-slate-50/80">
      <tr>
        <th class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-8 py-5 text-left">Наименование</th>
        <th class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-8 py-5 text-right">Сумма</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
        <td class="text-sm font-bold text-slate-900 px-8 py-6">Услуга</td>
        <td class="text-sm font-medium text-slate-500 px-8 py-6 text-right">10 000 руб.</td>
      </tr>
    </tbody>
    <tfoot class="bg-blue-50/30">
      <tr>
        <td class="px-8 py-6 text-sm font-bold text-slate-900">Итого</td>
        <td class="px-8 py-6 text-xl font-black text-blue-600 tracking-tighter text-right">10 000 руб.</td>
      </tr>
    </tfoot>
  </table>
</div>
```

---

## Карточки

```html
<div class="bg-white border border-slate-100 rounded-[3rem] p-10 hover:-translate-y-2 hover:shadow-xl transition-all duration-500 cursor-pointer">
  <span class="docu-tag-muted mb-4 block">Категория</span>
  <h3 class="docu-h3 text-slate-900 mb-4">Заголовок карточки</h3>
  <p class="docu-body">Описание карточки с основной информацией.</p>
</div>
```

---

## Паттерн фона

```html
<div class="bg-slate-50 relative">
  <div class="pattern-light absolute inset-0 pointer-events-none"></div>
  <div class="relative z-10">
    <!-- контент -->
  </div>
</div>
```

```css
.pattern-light {
  background-image: radial-gradient(#3b82f6 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.25;
}
```

---

## Логотип

```html
<a href="/" class="docu-logo flex items-center gap-3">
  <svg viewBox="0 0 64 64" width="40" height="40">
    <path d="M12 16H48V48H12V16Z" fill="#3b82f6" fill-opacity="0.1"/>
    <path d="M18 24H46M18 32H46M18 40H34" stroke="#3b82f6" stroke-width="6" stroke-linecap="round"/>
    <circle cx="48" cy="40" r="6" fill="#FBBF24"/>
  </svg>
  <span class="text-xl font-black text-slate-900">docu</span><span class="text-xl font-light text-slate-400">matica</span>
</a>
```

---

## Секции лендинга

| Секция | Класс | Описание |
|--------|-------|----------|
| Hero | `.hero-v12` | pattern-light фон, massive typography |
| Features | `.features-section-v12` | 3-колоночная сетка карточек |
| UPD Types | `.upd-types-v12` | 9 Hub-style карточек |
| Pricing | `.pricing-section-v12` | 3 тарифа (Starter/Pro/Enterprise) |
| CTA | `.cta-section-v12` | Белая карточка с massive button |
| Footer | `.footer-v12` | 5-колоночный, status node, signature |

---

## Референсные файлы

При создании UI обращайся к реальным файлам проекта:

| Компонент | Файл |
|-----------|------|
| CSS-система | `backend/app/static/css/documatica.css` |
| Главная страница | `backend/app/templates/public/home.html` |
| Форма УПД | `backend/app/templates/public/upd/*.html` |
| Header | `backend/app/templates/components/header_dynamic.html` |

---

## Anti-patterns (ЗАПРЕЩЕНО)

- Эмодзи в UI
- `rounded-md`, `rounded-sm`, острые углы
- Серые акценты вместо blue-600
- Маленькие паддинги (`p-2`, `p-4`)
- `font-normal` для заголовков
- Темные фоны (только для специфических блоков)
- Градиенты (кроме subtle)
- Тени с высокой непрозрачностью

---

## Pre-Delivery Checklist

- [ ] Все скругления >= `rounded-2xl`
- [ ] Labels: 9px, uppercase, tracking-widest
- [ ] Кнопки: font-black, uppercase, tracking
- [ ] Паддинги >= `p-6` для карточек
- [ ] Акценты только blue-600 и docu-gold
- [ ] Нет эмодзи - только SVG иконки
- [ ] Hover состояния с transition
- [ ] Responsive: 375px, 768px, 1024px, 1440px

---

## Workflow: Как использовать этот skill

### При создании нового компонента:

1. **Найди нужный компонент** в таблице "Библиотека компонентов"
2. **Прочитай HTML и CSS файлы** из `references/`
3. **Скопируй структуру и классы** из референса
4. **Адаптируй под задачу**, сохраняя стиль v12.0

### Пример:

Если нужно создать кнопку:
```
1. Читай: references/buttons.html и references/buttons.css
2. Выбери нужный тип: btn--primary, btn--smart, btn--outline
3. Используй готовую структуру с правильными классами
```

### Ключевые CSS-классы из tokens.css:

```css
/* Spacing */
--spacing-4: 1rem;
--spacing-6: 1.5rem;
--spacing-8: 2rem;
--spacing-10: 2.5rem;
--spacing-16: 4rem;
--spacing-20: 5rem;

/* Radius */
--radius-lg: 1rem;
--radius-xl: 1.5rem;
--radius-2xl: 2rem;
--radius-3xl: 3rem;
--radius-4xl: 4rem;

/* Transitions */
--transition-base: all 0.2s ease;
--transition-spring: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
--transition-arrow: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```
