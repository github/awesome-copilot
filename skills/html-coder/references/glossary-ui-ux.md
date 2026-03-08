# UI/UX Terminology Glossary

Quick reference for user interface and user experience terms in HTML context.

## A

**Accessibility (a11y)**  
Design practice ensuring websites are usable by people with disabilities. Includes screen reader support, keyboard navigation, sufficient color contrast, and semantic HTML.

**Accordion**  
Collapsible content sections where clicking one section expands it while collapsing others. Often built with `<details>` and `<summary>`.

**Active State**  
Visual indication when an element is being interacted with (e.g., button being pressed). CSS: `:active` pseudo-class.

**ARIA (Accessible Rich Internet Applications)**  
Set of attributes (`aria-*`) that make web content more accessible to assistive technologies.

**Alt Text**  
Alternative text for images (`alt` attribute) read by screen readers and shown when image fails to load.

**Anchor**  
Link element (`<a>`) that navigates to another location, either on same page or different URL.

**Above the Fold**  
Content visible without scrolling when page first loads. Critical for first impressions and performance.

## B

**Breadcrumb Navigation**  
Secondary navigation showing user's location in site hierarchy (Home > Products > Electronics > Laptops).

**Button**  
Interactive element (`<button>`) that triggers an action. Should be keyboard accessible.

**Baseline Grid**  
Vertical rhythm system for consistent spacing and alignment of text and elements.

## C

**Call-to-Action (CTA)**  
Element (usually button) prompting user to take specific action (e.g., "Sign Up", "Buy Now").

**Caption**  
Descriptive text for tables (`<caption>`) or figures (`<figcaption>`). Important for accessibility.

**Card**  
Self-contained content block (article preview, product) typically using `<article>` or `<div>`.

**Checkbox**  
Input allowing multiple selections from options. HTML: `<input type="checkbox">`.

**Click Area**  
Interactive region of an element. Should be minimum 44×44px for touch targets per accessibility guidelines.

**Contrast Ratio**  
Difference in luminance between text and background. WCAG requires 4.5:1 for normal text, 3:1 for large text.

**Content Hierarchy**  
Organization of content by importance using headings (`<h1>`-`<h6>`), visual weight, and spacing.

**Cursor**  
Mouse pointer appearance. Changed with CSS `cursor` property (pointer for clickable, text for editable, etc.).

## D

**Dialog**  
Modal or non-modal overlay window. HTML: `<dialog>` element or custom implementation.

**Disabled State**  
Non-interactive state of form element. HTML: `disabled` attribute. Should be visually distinct.

**Disclosure Widget**  
Collapsible content section. HTML: `<details>` with `<summary>`.

**Dropdown**  
Selection list that expands to show options. HTML: `<select>` or custom with `<ul>`.

## E

**Empty State**  
UI shown when no content is available (e.g., empty shopping cart, no search results).

**Error Message**  
Feedback indicating problem with user input. Should be clear, specific, and suggest solution.

**Error State**  
Visual indication of invalid input. Often uses red color and error icon with descriptive message.

## F

**Favicon**  
Small icon displayed in browser tab. HTML: `<link rel="icon" href="favicon.ico">`.

**Fieldset**  
Group of related form fields. HTML: `<fieldset>` with `<legend>` for group label.

**Focus State**  
Visual indication of keyboard-focused element. CSS: `:focus` pseudo-class. Essential for accessibility.

**Focus Trap**  
Constraint keeping keyboard focus within modal or dialog. Prevents tabbing to background content.

**Footer**  
Bottom section of page or article. HTML: `<footer>`. Typically contains copyright, links, contact info.

**Form**  
Collection of input fields for user data entry. HTML: `<form>`.

**Form Validation**  
Checking user input for correctness. Can be HTML5 attributes (`required`, `pattern`) or JavaScript.

## G

**Global Navigation**  
Primary site-wide navigation menu. HTML: `<nav>` element.

**Grid**  
Layout system organizing content in rows and columns. HTML: `<table>` for data, CSS Grid for layout.

**Grouping**  
Organizing related elements together visually and semantically for better understanding.

## H

**Hamburger Menu**  
Three-line icon (☰) revealing mobile navigation menu when clicked. Common mobile pattern.

**Header**  
Top section of page or article. HTML: `<header>`. Contains branding, navigation, titles.

**Heading**  
Content title indicating hierarchy. HTML: `<h1>` (most important) to `<h6>` (least important).

**Hero Section**  
Prominent banner at page top, typically with large image, headline, and CTA.

**Hidden Content**  
Content not displayed but present in HTML. Can be conditionally shown. HTML: `hidden` attribute.

**Hover State**  
Visual change when mouse cursor is over element. CSS: `:hover` pseudo-class.

**Hyperlink**  
Clickable link to another page or resource. HTML: `<a href="url">`.

## I

**Icon**  
Small graphic representing action or concept. Can be image, SVG, or icon font.

**Input**  
Form field for user data entry. HTML: `<input>` with various types.

**Input Mask**  
Format constraint on input (e.g., phone number: (555) 123-4567).

**Interactive Element**  
Element user can interact with (buttons, links, form fields). Must be keyboard accessible.

**Invalid State**  
Indication that form field contains invalid data. Use `aria-invalid="true"`.

## J

**Jump Link**  
Link navigating to specific section on same page using fragment identifier (`href="#section-id"`).

## K

**Keyboard Navigation**  
Navigating website using keyboard only (Tab, Enter, Space, Arrows). Essential for accessibility.

**Keyboard Shortcut**  
Key combination triggering action. HTML: `accesskey` attribute (limited browser support).

## L

**Label**  
Text describing form field. HTML: `<label for="field-id">`. Essential for accessibility.

**Landmark**  
Major page region identified by semantic HTML or ARIA roles (navigation, main, complementary).

**Landing Page**  
Entry page designed for specific purpose (product launch, campaign, lead generation).

**Layout**  
Arrangement of elements on page. Use semantic HTML and CSS (Flexbox, Grid).

**Legend**  
Caption for fieldset. HTML: `<legend>`. Describes group of form fields.

**Link**  
Navigational element. HTML: `<a>`. Should have descriptive text, not "click here".

**List**  
Collection of items. HTML: `<ul>` (unordered), `<ol>` (ordered), `<dl>` (description).

**Loading State**  
Visual indication of background process (spinner, progress bar, skeleton screen).

**Logo**  
Brand identifier, typically image in header. Should link to homepage.

## M

**Main Content**  
Primary unique content of page. HTML: `<main>`. One per page, excludes repeated content.

**Menu**  
List of navigation links or actions. HTML: `<nav>` with `<ul>` or `<menu>`.

**Meta Description**  
Page summary for search engines. HTML: `<meta name="description" content="...">`.

**Microdata**  
Structured data markup using `itemscope`, `itemprop` attributes for SEO.

**Mobile-First**  
Design approach starting with mobile layout, then enhancing for larger screens.

**Modal**  
Overlay dialog requiring interaction before returning to main content. Use `<dialog>` or custom.

**Multi-Step Form**  
Form split across multiple pages or sections (wizard pattern). Show progress indicator.

## N

**Navigation**  
System for moving through website. HTML: `<nav>`. Should be consistent and predictable.

**Notification**  
Message alerting user to event or status change. Use `role="alert"` for urgent messages.

## O

**Onboarding**  
Process introducing new users to product/service through tutorials or walkthroughs.

**Option**  
Choice in select dropdown. HTML: `<option>` within `<select>`.

**Overlay**  
Content layer displayed over main page (modal, tooltip, dropdown).

## P

**Pagination**  
Breaking content across multiple pages with navigation controls (Previous, Next, page numbers).

**Placeholder**  
Example text in empty form field. HTML: `placeholder` attribute. Should NOT replace label.

**Primary Action**  
Most important action on page (e.g., "Submit", "Buy Now"). Should be visually prominent.

**Progress Indicator**  
Visual representation of task completion. HTML: `<progress>` or custom implementation.

**Prototype**  
Early version of design/feature for testing concepts before full development.

## R

**Radio Button**  
Input allowing single selection from options. HTML: `<input type="radio" name="group">`.

**Readability**  
How easily text can be read and understood. Affected by font, size, spacing, contrast, line length.

**Responsive Design**  
Adapting layout to different screen sizes. Use `<meta name="viewport">` and CSS media queries.

**Required Field**  
Form field that must be completed. HTML: `required` attribute. Mark visually (asterisk).

## S

**Screen Reader**  
Assistive technology reading page content aloud for visually impaired users.

**Scrollbar**  
Interface for scrolling through content. Avoid hiding unless providing alternative.

**Search**  
Functionality for finding content. HTML: `<input type="search">` in form with `role="search"`.

**Section**  
Thematic content grouping. HTML: `<section>` or `<article>`.

**Select**  
Dropdown menu for choosing option(s). HTML: `<select>` with `<option>` elements.

**Semantic HTML**  
Using HTML elements that convey meaning (e.g., `<nav>`, `<article>`) rather than generic `<div>`.

**Sidebar**  
Secondary content area alongside main content. HTML: `<aside>`.

**Skip Link**  
Link allowing keyboard users to jump past navigation to main content. Essential for accessibility.

**Slider**  
Input for selecting value from range. HTML: `<input type="range">` or custom carousel.

**Sticky Navigation**  
Navigation that remains visible while scrolling. CSS: `position: sticky`.

**Submit Button**  
Button submitting form data. HTML: `<button type="submit">` or `<input type="submit">`.

**Success State**  
Positive feedback indicating successful action (green checkmark, success message).

## T

**Tab Order**  
Sequence keyboard focus moves when pressing Tab key. Control with `tabindex`.

**Tabindex**  
Attribute controlling keyboard focus order. Use `0` for natural order, `-1` to exclude from tab order.

**Table**  
Structured data in rows and columns. HTML: `<table>`. Use `<th scope>` for accessibility.

**Textarea**  
Multi-line text input. HTML: `<textarea>`.

**Toast Notification**  
Temporary message appearing briefly then disappearing. Announce with `aria-live="polite"`.

**Toggle**  
Control switching between two states (on/off, show/hide). Often checkbox styled as switch.

**Tooltip**  
Small popup showing additional info on hover. Use `title` attribute or custom ARIA implementation.

**Touch Target**  
Interactive area for touch input. Minimum 44×44px per WCAG guidelines.

## U

**User Flow**  
Path users take through website to complete task. Optimize for common goals.

**User Testing**  
Observing real users interacting with website to identify usability issues.

## V

**Validation**  
Checking user input correctness. HTML5: `required`, `pattern`, `type`. Show clear error messages.

**Viewport**  
Visible area of webpage. Set with `<meta name="viewport" content="width=device-width, initial-scale=1">`.

**Visual Hierarchy**  
Organizing content by visual importance using size, color, spacing, contrast.

**Visually Hidden**  
Content hidden visually but available to screen readers. Important for accessibility.

## W

**WCAG (Web Content Accessibility Guidelines)**  
International standard for web accessibility. Levels: A (minimum), AA (recommended), AAA (enhanced).

**Web Form**  
Interactive form collecting user input. Use proper labels, validation, error messages.

**White Space**  
Empty space around elements. Essential for readability and visual hierarchy. Don't fear it.

**Widget**  
Interactive UI component (calendar picker, autocomplete, color picker).

**Wireframe**  
Low-fidelity sketch showing page layout and content structure without detailed design.

**Wizard**  
Multi-step process guiding user through complex task. Show progress and allow back navigation.

## Z

**Z-Index**  
CSS property controlling stacking order of overlapping elements (modals, dropdowns).

---

## Common UX Patterns in HTML

### Navigation Patterns
- **Primary Navigation**: Main site menu in `<nav>`
- **Breadcrumbs**: Showing current location in hierarchy
- **Pagination**: Navigating through lists or search results
- **Tabs**: Switching between related content sections
- **Hamburger Menu**: Mobile-friendly collapsible navigation

### Form Patterns
- **Single-Column Layout**: Easier to scan and complete
- **Field Labels**: Above or beside fields, not as placeholders only
- **Inline Validation**: Real-time feedback as user types
- **Required Fields**: Clearly marked with asterisk or "required"
- **Error Messages**: Specific, helpful, near relevant field
- **Success Confirmation**: Clear feedback after submission

### Content Patterns
- **Cards**: Contained content previews
- **Hero Section**: Prominent banner with key message and CTA
- **F-Pattern**: Users scan in F-shape, place important content accordingly
- **Accordion**: Expandable/collapsible content sections
- **Modal**: Focus attention on specific task or information

### Feedback Patterns
- **Loading Indicators**: Show progress during wait times
- **Toast Notifications**: Brief temporary messages
- **Inline Messages**: Success/error feedback near relevant content
- **Empty States**: Guidance when no content available
- **Confirmation Dialogs**: Prevent accidental destructive actions

## Accessibility Quick Reference

### Must-Have Features
- ✅ All images have `alt` text
- ✅ Form inputs have associated `<label>`
- ✅ Proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`)
- ✅ Sufficient color contrast (4.5:1 minimum)
- ✅ Keyboard navigation works (test with Tab key)
- ✅ Focus indicators visible
- ✅ Skip navigation link provided
- ✅ Language declared (`<html lang="en">`)

### ARIA Essentials
- `role` - Define element purpose
- `aria-label` - Provide accessible name
- `aria-labelledby` - Reference label by ID
- `aria-describedby` - Reference description by ID
- `aria-hidden` - Hide from screen readers
- `aria-live` - Announce dynamic content changes
- `aria-expanded` - Indicate expanded/collapsed state
- `aria-current` - Indicate current page/step

## Mobile UX Considerations

- **Viewport Meta Tag**: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- **Touch Targets**: Minimum 44×44px clickable areas
- **Readable Text**: Minimum 16px font size
- **Thumb-Friendly**: Place important actions within reach
- **Minimize Input**: Use appropriate input types (`tel`, `email`, `date`)
- **Responsive Images**: Use `srcset` and `<picture>` for different screen sizes

## Resources

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **A11y Project**: https://www.a11yproject.com/
- **Nielsen Norman Group**: https://www.nngroup.com/
- **Material Design**: https://material.io/design
- **Inclusive Components**: https://inclusive-components.design/
- **WebAIM**: https://webaim.org/
