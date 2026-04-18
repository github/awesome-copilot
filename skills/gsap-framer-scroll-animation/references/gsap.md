# GSAP ScrollTrigger — Full Reference

## Table of Contents
1. [Installation & Registration](#installation--registration)
2. [ScrollTrigger Config Reference](#scrolltrigger-config-reference)
3. [Start / End Syntax Decoded](#start--end-syntax-decoded)
4. [toggleActions Values](#toggleactions-values)
5. [Recipes with Copilot Prompts](#recipes-with-copilot-prompts)
   - Fade-in batch reveal
   - Scrub animation
   - Pinned timeline
   - Parallax layers
   - Horizontal scroll
   - Character stagger text
   - Scroll snap
   - Progress bar
   - ScrollSmoother
   - Scroll counter
6. [React Integration (useGSAP)](#react-integration-usegsap)
7. [Lenis Smooth Scroll](#lenis-smooth-scroll)
8. [Responsive with matchMedia](#responsive-with-matchmedia)
9. [Accessibility](#accessibility)
10. [Performance & Cleanup](#performance--cleanup)
11. [Common Copilot Pitfalls](#common-copilot-pitfalls)

---

## Installation & Registration

```bash
npm install gsap
# React
npm install gsap @gsap/react
```

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother'; // optional
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
```

CDN (vanilla):
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
```

---

## ScrollTrigger Config Reference

```js
gsap.to('.element', {
  x: 500,
  ease: 'none',          // Use 'none' for scrub animations
  scrollTrigger: {
    trigger: '.section',         // Element whose position triggers the animation
    start: 'top 80%',            // "[trigger edge] [viewport edge]"
    end: 'bottom 20%',           // Where animation ends
    scrub: 1,                    // Link progress to scroll; use true for instant scrub, or a number for smooth lag
    pin: true,                   // Pin trigger element during scroll; use a selector/element to pin something else
    pinSpacing: true,            // Add space below pinned element (default: true)
    markers: true,               // Debug markers — REMOVE in production
    toggleActions: 'play none none reverse', // onEnter onLeave onEnterBack onLeaveBack
    toggleClass: 'active',       // CSS class added/removed when active
    snap: { snapTo: 'labels', duration: 0.3, ease: 'power1.inOut' }, // Or use a number like 1 to snap to increments
    fastScrollEnd: true,         // Force completion if user scrolls past fast
    horizontal: false,           // true for horizontal scroll containers
    anticipatePin: 1,            // Reduces pin jump (seconds to anticipate)
    invalidateOnRefresh: true,   // Recalculate positions on resize
    id: 'my-trigger',            // For ScrollTrigger.getById()
    onEnter: () => {},
    onLeave: () => {},
    onEnterBack: () => {},
    onLeaveBack: () => {},
    onUpdate: self => console.log(self.progress), // 0 to 1
    onToggle: self => console.log(self.isActive),
  }
});
```

---

## Start / End Syntax Decoded

Format: `"[trigger position] [viewport position]"`

| Value | Meaning |
|---|---|
| `"top bottom"` | Top of trigger hits bottom of viewport — enters view |
| `"top 80%"` | Top of trigger reaches 80% down from top of viewport |
| `"top center"` | Top of trigger reaches viewport center |
| `"top top"` | Top of trigger at top of viewport |
| `"center center"` | Centers align |
| `"bottom top"` | Bottom of trigger at top of viewport — exits view |
| `"+=200"` | 200px after trigger position |
| `"-=100"` | 100px before trigger position |
| `"+=200%"` | 200% of viewport height after trigger |

---

## toggleActions Values

```
toggleActions: "play pause resume reset"
                ^      ^      ^        ^
              onEnter onLeave onEnterBack onLeaveBack
```

| Value | Effect |
|---|---|
| `play` | Play from current position |
| `pause` | Pause at current position |
| `resume` | Resume from where paused |
| `reverse` | Play backwards |
| `reset` | Jump to start |
| `restart` | Play from beginning |
| `none` | Do nothing |

Most common for entrance animations: `"play none none none"` (animate once, don't reverse).

---

## Recipes with Copilot Prompts

### 1. Fade-in Batch Reveal

**Copilot Chat Prompt:**
```
Using GSAP ScrollTrigger.batch, animate all .card elements: 
fade in from opacity 0, y 50 when they enter the viewport at 85%.
Stagger 0.15s between cards. Animate once (no reverse).
```

```js
gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.batch('.card', {
  onEnter: elements => {
    gsap.from(elements, {
      opacity: 0,
      y: 50,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power2.out',
    });
  },
  start: 'top 85%',
});
```

Why `batch` over individual ScrollTriggers: batch groups elements entering together into one animation call, which is more performant than creating one ScrollTrigger per element.

---

### 2. Scrub Animation (scroll-linked)

**Copilot Chat Prompt:**
```
GSAP scrub: animate .hero-image scale from 1 to 1.3 and opacity to 0
as the user scrolls past .hero-section. 
Perfectly synced to scroll position, no pin.
```

```js
gsap.to('.hero-image', {
  scale: 1.3,
  opacity: 0,
  ease: 'none',   // Critical: linear easing for scrub
  scrollTrigger: {
    trigger: '.hero-section',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  }
});
```

---

### 3. Pinned Timeline

**Copilot Chat Prompt:**
```
GSAP pinned timeline: pin .story-section while a sequence plays —
fade in .title (y: 60), scale .image to 1, slide .text from x: 80.
Total scroll distance 300vh. Scrub 1 for smoothness.
```

```js
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.story-section',
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 1,
    anticipatePin: 1,
  }
});

tl
  .from('.title',  { opacity: 0, y: 60, duration: 1 })
  .from('.image',  { scale: 0.85, opacity: 0, duration: 1 }, '-=0.3')
  .from('.text',   { x: 80, opacity: 0, duration: 1 }, '-=0.3');
```

---

### 4. Parallax Layers

**Copilot Chat Prompt:**
```
GSAP parallax: background image moves yPercent -20 (slow),
foreground text moves yPercent -60 (fast). Both scrubbed to scroll, no pin.
Trigger is .parallax-section, start top bottom, end bottom top.
```

```js
// Slow background
gsap.to('.parallax-bg', {
  yPercent: -20,
  ease: 'none',
  scrollTrigger: {
    trigger: '.parallax-section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  }
});

// Fast foreground
gsap.to('.parallax-fg', {
  yPercent: -60,
  ease: 'none',
  scrollTrigger: {
    trigger: '.parallax-section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  }
});
```

---

### 5. Horizontal Scroll Section

**Copilot Chat Prompt:**
```
GSAP horizontal scroll: 4 .panel elements inside .panels-container.
Pin .horizontal-section, scrub 1, snap per panel.
End should use offsetWidth so it recalculates on resize.
```

```js
const sections = gsap.utils.toArray('.panel');

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-section',
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => `+=${document.querySelector('.panels-container').offsetWidth}`,
    invalidateOnRefresh: true,
  }
});
```

Required HTML:
```html
<div class="horizontal-section">
  <div class="panels-container">
    <div class="panel">1</div>
    <div class="panel">2</div>
    <div class="panel">3</div>
    <div class="panel">4</div>
  </div>
</div>
```

Required CSS:
```css
.horizontal-section { overflow: hidden; }
.panels-container   { display: flex; flex-wrap: nowrap; width: 400vw; }
.panel              { width: 100vw; height: 100vh; flex-shrink: 0; }
```

---

### 6. Character Stagger Text Reveal

**Copilot Chat Prompt:**
```
Split .hero-title into characters using SplitType.
Animate each char: opacity 0→1, y 80→0, rotateX -90→0.
Stagger 0.03s, ease back.out(1.7). Trigger when heading enters at 85%.
```

```bash
npm install split-type
```

```js
import SplitType from 'split-type';

const text = new SplitType('.hero-title', { types: 'chars' });

gsap.from(text.chars, {
  opacity: 0,
  y: 80,
  rotateX: -90,
  stagger: 0.03,
  duration: 0.6,
  ease: 'back.out(1.7)',
  scrollTrigger: {
    trigger: '.hero-title',
    start: 'top 85%',
    toggleActions: 'play none none none',
  }
});
```

---

### 7. Scroll Snap Sections

**Copilot Chat Prompt:**
```
GSAP: each full-height section scales from 0.9 to 1 when it enters view.
Also add global scroll snapping between sections using ScrollTrigger.create snap.
```

```js
const sections = gsap.utils.toArray('section');

sections.forEach(section => {
  gsap.from(section, {
    scale: 0.9,
    opacity: 0.6,
    scrollTrigger: {
      trigger: section,
      start: 'top 90%',
      toggleActions: 'play none none reverse',
    }
  });
});

ScrollTrigger.create({
  snap: {
    snapTo: (progress) => {
      const step = 1 / (sections.length - 1);
      return Math.round(progress / step) * step;
    },
    duration: { min: 0.2, max: 0.5 },
    ease: 'power1.inOut',
  }
});
```

---

### 8. Scroll Progress Bar

**Copilot Chat Prompt:**
```
GSAP: fixed progress bar at top of page. scaleX 0→1 linked to 
full page scroll, scrub 0.3 for slight smoothing. transformOrigin left center.
```

```js
gsap.to('.progress-bar', {
  scaleX: 1,
  ease: 'none',
  transformOrigin: 'left center',
  scrollTrigger: {
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
  }
});
```

```css
.progress-bar {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 4px;
  background: #6366f1;
  transform-origin: left;
  transform: scaleX(0);
  z-index: 999;
}
```

---

### 9. ScrollSmoother Setup

**Copilot Chat Prompt:**
```
Set up GSAP ScrollSmoother with smooth: 1.5, effects: true.
Show the required wrapper HTML structure.
Add data-speed and data-lag to parallax elements.
```

```bash
# ScrollSmoother is part of gsap — no extra install needed
```

```js
import { ScrollSmoother } from 'gsap/ScrollSmoother';
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

ScrollSmoother.create({
  wrapper: '#smooth-wrapper',
  content: '#smooth-content',
  smooth: 1.5,
  effects: true,
  smoothTouch: 0.1,
});
```

```html
<div id="smooth-wrapper">
  <div id="smooth-content">
    <img data-speed="0.5" src="bg.jpg" />      <!-- 50% scroll speed -->
    <div data-lag="0.3" class="float">...</div> <!-- 0.3s lag -->
  </div>
</div>
```

---

### 10. Animated Number Counter

**Copilot Chat Prompt:**
```
GSAP: animate .counter elements from 0 to their data-target value 
when they enter the viewport. Duration 2s, ease power2.out.
Format with toLocaleString. Animate once.
```

```js
document.querySelectorAll('.counter').forEach(el => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: parseInt(el.dataset.target, 10),
    duration: 2,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); },
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      toggleActions: 'play none none none',
    }
  });
});
```

```html
<span class="counter" data-target="12500">0</span>
```

---

## React Integration (useGSAP)

```bash
npm install gsap @gsap/react
```

```jsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);
```

**Why useGSAP instead of useEffect:**
`useGSAP` automatically kills all ScrollTriggers created inside it when the component unmounts — preventing memory leaks. It also handles React strict mode's double-invoke correctly. Think of it as a drop-in replacement for `useLayoutEffect` that GSAP understands.

**Copilot Chat Prompt:**
```
React: use useGSAP from @gsap/react to animate .card elements inside containerRef.
Fade in from y 60, opacity 0, stagger 0.12, scrollTrigger start top 80%.
Scope to containerRef so selectors don't match outside this component.
```

```jsx
export function AnimatedSection() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from('.card', {
      opacity: 0,
      y: 60,
      stagger: 0.12,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 80%',
        toggleActions: 'play none none none',
      }
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      <div className="card">One</div>
      <div className="card">Two</div>
    </div>
  );
}
```

**Pinned timeline in React:**
```jsx
export function PinnedStory() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true, scrub: 1,
        start: 'top top', end: '+=200%',
      }
    });
    tl.from('.story-title', { opacity: 0, y: 40 })
      .from('.story-image', { scale: 0.85, opacity: 0 }, '-=0.2')
      .from('.story-text',  { opacity: 0, x: 40 }, '-=0.2');
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef}>
      <h2 className="story-title">Chapter One</h2>
      <img className="story-image" src="/photo.jpg" alt="" />
      <p className="story-text">The story begins.</p>
    </section>
  );
}
```

**Next.js note:** Run `gsap.registerPlugin(ScrollTrigger)` inside a `useGSAP` or `useLayoutEffect` — or guard it:
```js
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);
```

---

## Lenis Smooth Scroll

```bash
npm install lenis
```

**Copilot Chat Prompt:**
```
Integrate Lenis smooth scroll with GSAP ScrollTrigger.
Add lenis.raf to gsap.ticker. Set lagSmoothing to 0.
Destroy lenis on unmount if in React.
```

```js
import Lenis from 'lenis';
import { useEffect } from 'react';

const lenis = new Lenis({ duration: 1.2, smoothWheel: true });

const raf = (time) => lenis.raf(time * 1000);
gsap.ticker.add(raf);
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// React cleanup
useEffect(() => {
  return () => {
    lenis.destroy();
    gsap.ticker.remove(raf);
  };
}, []);
```

---

## Responsive with matchMedia

**Copilot Chat Prompt:**
```
Use gsap.matchMedia to animate x: 200 on desktop (min-width: 768px)
and y: 100 on mobile. Both should skip animation if prefers-reduced-motion is set.
```

```js
const mm = gsap.matchMedia();

mm.add({
  isDesktop: '(min-width: 768px)',
  isMobile:  '(max-width: 767px)',
  noMotion:  '(prefers-reduced-motion: reduce)',
}, context => {
  const { isDesktop, isMobile, noMotion } = context.conditions;
  if (noMotion) return;

  gsap.from('.box', {
    x: isDesktop ? 200 : 0,
    y: isMobile  ? 100 : 0,
    opacity: 0,
    scrollTrigger: { trigger: '.box', start: 'top 80%' }
  });
});
```

---

## Accessibility

```js
// Guard all scroll animations with prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!prefersReducedMotion.matches) {
  gsap.from('.box', {
    opacity: 0, y: 50,
    scrollTrigger: { trigger: '.box', start: 'top 85%' }
  });
} else {
  // Show element immediately, no animation
  gsap.set('.box', { opacity: 1, y: 0 });
}
```

Or use `gsap.matchMedia()` with `prefers-reduced-motion: reduce` condition (see above).

---

## Performance & Cleanup

```js
// Kill a specific trigger
const st = ScrollTrigger.create({ ... });
st.kill();

// Kill all triggers (e.g., on page transition)
ScrollTrigger.killAll();

// Refresh all trigger positions (after dynamic content loads)
ScrollTrigger.refresh();
```

**Performance rules:**
- Only animate `transform` and `opacity` — GPU-accelerated, no layout recalculation
- Avoid animating `width`, `height`, `top`, `left`, `box-shadow`, `filter`
- Use `ScrollTrigger.batch()` for many similar elements — far better than one trigger per element
- Add `will-change: transform` sparingly — only on actively animating elements
- Always remove `markers: true` before production

---

## Common Copilot Pitfalls

**Forgot registerPlugin:** Copilot often omits `gsap.registerPlugin(ScrollTrigger)`.
Always add it before any ScrollTrigger usage.

**Wrong ease for scrub:** Copilot defaults to `power2.out` even on scrub animations.
Always use `ease: 'none'` when `scrub: true` or `scrub: number`.

**useEffect instead of useGSAP in React:** Copilot generates `useEffect` — always swap to `useGSAP`.

**Static end value for horizontal scroll:** Copilot writes `end: "+=" + container.offsetWidth`.
Correct: `end: () => "+=" + container.offsetWidth` (function form recalculates on resize).

**markers left in production:** Copilot adds `markers: true` and leaves it. Always remove.

**Scrub without pin on long animations:** Scrubbing a long timeline without pinning means
the element scrolls out of view. Add `pin: true` or shorten the scroll distance.
