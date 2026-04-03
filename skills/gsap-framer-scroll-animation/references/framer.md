# Framer Motion (Motion v12) — Full Reference

> Framer Motion was renamed to **Motion** in mid-2025. The npm package is now `motion`,
> the import path is `motion/react`. All APIs are identical. `framer-motion` still works.

## Table of Contents
1. [Package & Import Paths](#package--import-paths)
2. [Two Types of Scroll Animation](#two-types-of-scroll-animation)
3. [useScroll — Options Reference](#usescroll--options-reference)
4. [useTransform — Full Reference](#usetransform--full-reference)
5. [useSpring for Smoothing](#usespring-for-smoothing)
6. [Recipes with Copilot Prompts](#recipes-with-copilot-prompts)
   - Scroll progress bar
   - Reusable ScrollReveal wrapper
   - Parallax layers
   - Horizontal scroll section
   - Image reveal with clipPath
   - Scroll-linked navbar (hide/show)
   - Staggered card grid
   - 3D tilt on scroll
7. [Variants Pattern for Stagger](#variants-pattern-for-stagger)
8. [Motion Value Events](#motion-value-events)
9. [Next.js & App Router Notes](#nextjs--app-router-notes)
10. [Accessibility](#accessibility)
11. [Common Copilot Pitfalls](#common-copilot-pitfalls)

---

## Package & Import Paths

```bash
npm install motion          # recommended (renamed 2025)
npm install framer-motion   # still works — same API
```

```js
// Recommended (Motion v12+)
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'motion/react';

// Legacy — still valid
import { motion, useScroll, useTransform } from 'framer-motion';
```

**Motion v12 new features (2025):**
- Hardware-accelerated scroll via browser ScrollTimeline API
- `useScroll` and `scroll()` now GPU-accelerated by default
- New color types: `oklch`, `oklab`, `color-mix` animatable directly
- Full React 19 + concurrent rendering support

---

## Two Types of Scroll Animation

### Scroll-triggered (fires once when element enters viewport)

```jsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
>
  Content
</motion.div>
```

`viewport.margin` — negative value triggers animation before element fully enters view.
`viewport.once` — `true` means animate once, never reverse.

### Scroll-linked (continuous, tied to scroll position)

```jsx
const { scrollYProgress } = useScroll();
const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
return <motion.div style={{ opacity }}>Content</motion.div>;
```

The value updates on every scroll frame — must use `style` prop, not `animate`.

---

## useScroll — Options Reference

```js
const {
  scrollX,          // Absolute horizontal scroll (pixels)
  scrollY,          // Absolute vertical scroll (pixels)
  scrollXProgress,  // Horizontal progress 0→1 between offsets
  scrollYProgress,  // Vertical progress 0→1 between offsets
} = useScroll({
  // Track a scrollable element instead of the viewport
  container: containerRef,

  // Track an element's position within the container
  target: targetRef,

  // Define when tracking starts and ends
  // Format: ["target position container position", "target position container position"]
  offset: ['start end', 'end start'],
  // Common offset pairs:
  // ['start end', 'end start']    = track while element is anywhere in view
  // ['start end', 'end end']      = track from element entering to bottom of page
  // ['start start', 'end start']  = track while element exits top
  // ['center center', 'end start']= track from center-center to exit

  // Update when content size changes (small perf cost, false by default)
  trackContentSize: false,
});
```

**Offset string values:**
- `start` = `0` = top/left edge
- `center` = `0.5` = middle
- `end` = `1` = bottom/right edge
- Numbers 0–1 also work: `[0, 1]` = `['start', 'end']`

---

## useTransform — Full Reference

```js
// Map a motion value from one range to another
const y = useTransform(scrollYProgress, [0, 1], [0, -200]);

// Multi-stop interpolation
const opacity = useTransform(
  scrollYProgress,
  [0, 0.2, 0.8, 1],
  [0, 1, 1, 0]
);

// Non-numeric values (colors, strings)
const color = useTransform(
  scrollYProgress,
  [0, 0.5, 1],
  ['#6366f1', '#ec4899', '#f97316']
);

// CSS string values
const clipPath = useTransform(
  scrollYProgress,
  [0, 1],
  ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)']
);

// Disable clamping (allow values outside output range)
const y = useTransform(scrollYProgress, [0, 1], [0, -200], { clamp: false });

// Transform from multiple inputs
const combined = useTransform(
  [scrollX, scrollY],
  ([x, y]) => Math.sqrt(x * x + y * y)
);
```

**Rule:** `useTransform` output is a `MotionValue`. It must go into the `style` prop of a `motion.*` element. Plain `<div style={{ y }}>` will NOT work — must be `<motion.div style={{ y }}>`.

---

## useSpring for Smoothing

Wrap any MotionValue in `useSpring` to add spring physics — great for progress bars that feel alive.

```js
const { scrollYProgress } = useScroll();

const smooth = useSpring(scrollYProgress, {
  stiffness: 100,   // Higher = faster/snappier response
  damping: 30,      // Higher = less bounce
  restDelta: 0.001  // Precision threshold for stopping
});

return <motion.div style={{ scaleX: smooth }} />;
```

For a subtle lag (not physics), use `useTransform` with `clamp: false` and an eased range instead.

---

## Recipes with Copilot Prompts

### 1. Scroll Progress Bar

**Copilot Chat Prompt:**
```
Framer Motion: fixed scroll progress bar at top of page.
useScroll for page scroll progress, useSpring to smooth scaleX.
stiffness 100, damping 30. Grows left to right.
```

```tsx
'use client';
import { useScroll, useSpring, motion } from 'motion/react';

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100, damping: 30, restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-1 bg-indigo-500 origin-left z-50"
    />
  );
}
```

---

### 2. Reusable ScrollReveal Wrapper

**Copilot Chat Prompt:**
```
Framer Motion: reusable ScrollReveal component that wraps children with 
fade-in-up entrance animation using whileInView. Props: delay (default 0), 
duration (default 0.6), once (default true). viewport margin -80px.
TypeScript. 'use client'.
```

```tsx
'use client';
import { motion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export function ScrollReveal({
  children, delay = 0, duration = 0.6, once = true, className
}: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Usage:
// <ScrollReveal delay={0.2}><h2>Section Title</h2></ScrollReveal>
```

---

### 3. Parallax Layers

**Copilot Chat Prompt:**
```
Framer Motion parallax section: background moves y from 0% to 30% (slow),
foreground text moves y from 50 to -50px (fast). 
Both use target ref with offset ['start end', 'end start'].
Fade out at top and bottom using opacity useTransform [0, 0.3, 0.7, 1] → [0,1,1,0].
```

```tsx
'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function ParallaxSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY        = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity      = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative h-screen overflow-hidden flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero-bg.jpg)', y: backgroundY, scale: 1.2 }}
      />
      <motion.div style={{ y: textY, opacity }} className="relative z-10 text-center text-white">
        <h2 className="text-6xl font-bold">Parallax Title</h2>
        <p className="text-xl mt-4">Scrolls at a different speed</p>
      </motion.div>
    </section>
  );
}
```

---

### 4. Horizontal Scroll Section

**Copilot Chat Prompt:**
```
Framer Motion horizontal scroll: 4 cards scroll horizontally as user scrolls vertically.
Outer container ref height 300vh controls speed (sticky pattern).
useScroll tracks outer container, useTransform maps scrollYProgress to x '0%' → '-75%'.
```

```tsx
'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const cards = [
  { id: 1, title: 'Card One',   color: 'bg-indigo-500' },
  { id: 2, title: 'Card Two',   color: 'bg-pink-500'   },
  { id: 3, title: 'Card Three', color: 'bg-amber-500'  },
  { id: 4, title: 'Card Four',  color: 'bg-teal-500'   },
];

export function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%']);

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ x, width: `${cards.length * 100}vw` }}
          className="flex gap-6 h-full items-center px-8"
        >
          {cards.map(card => (
            <div
              key={card.id}
              className={`${card.color} w-screen h-[70vh] rounded-2xl flex items-center justify-center flex-shrink-0`}
            >
              <h3 className="text-white text-4xl font-bold">{card.title}</h3>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
```

---

### 5. Image Reveal with clipPath

**Copilot Chat Prompt:**
```
Framer Motion: image reveals left to right as it scrolls into view.
useScroll target ref, offset ['start end', 'center center'].
useTransform clipPath from 'inset(0% 100% 0% 0%)' to 'inset(0% 0% 0% 0%)'.
Also scale from 1.15 to 1.
```

```tsx
'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function ImageReveal({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)']
  );
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <div ref={ref} className="overflow-hidden rounded-xl">
      <motion.img
        src={src} alt={alt}
        style={{ clipPath, scale }}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
```

---

### 6. Scroll-linked Navbar (Hide on Scroll Down)

**Copilot Chat Prompt:**
```
Framer Motion navbar: transparent when at top, white with shadow after 80px.
Hide by sliding up when scrolling down, reveal when scrolling up.
Use useScroll, useMotionValueEvent to detect direction.
Animate y, backgroundColor, boxShadow with motion.nav.
```

```tsx
'use client';
import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden,   setHidden]   = useState(false);
  const prevRef = useRef(0);

  useMotionValueEvent(scrollY, 'change', latest => {
    const nextScrolled = latest > 80;
    const nextHidden = latest > prevRef.current && latest > 200;
    setScrolled(current => (current === nextScrolled ? current : nextScrolled));
    setHidden(current => (current === nextHidden ? current : nextHidden));
    prevRef.current = latest;
  });

  return (
    <motion.nav
      animate={{
        y: hidden ? -80 : 0,
        backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0)',
        boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.08)' : 'none',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
    >
      {/* nav links */}
    </motion.nav>
  );
}
```

---

### 7. Staggered Card Grid

**Copilot Chat Prompt:**
```
Framer Motion: card grid with stagger entrance. Use variants: 
container has staggerChildren 0.1, delayChildren 0.2.
Each card: hidden (opacity 0, y 40, scale 0.96) → visible (opacity 1, y 0, scale 1).
Trigger with whileInView on the container. Once.
```

```tsx
'use client';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const cardVariants = {
  hidden:  { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }
  }
};

export function CardGrid({ cards }: { cards: { id: number; title: string }[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="grid grid-cols-3 gap-6"
    >
      {cards.map(card => (
        <motion.div key={card.id} variants={cardVariants}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <h3>{card.title}</h3>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

### 8. 3D Tilt on Scroll

**Copilot Chat Prompt:**
```
Framer Motion: 3D perspective card that rotates on X axis as it scrolls through view.
rotateX 15→0→-15, scale 0.9→1→0.9, opacity 0→1→0.
Target ref with offset ['start end', 'end start']. Wrap in perspective container.
```

```tsx
'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15,  0, -15]);
  const scale   = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1,  0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} style={{ perspective: '1000px' }}>
      <motion.div
        style={{ rotateX, scale, opacity }}
        className="bg-white rounded-2xl p-8 shadow-lg"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

---

## Variants Pattern for Stagger

Variants propagate automatically from parent to children — you don't need to pass them down manually.

```tsx
const parent = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,   // Delay between each child
      delayChildren: 0.2,      // Initial delay before first child
      when: 'beforeChildren',  // Parent animates before children
    }
  }
};

const child = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// Children with `variants={child}` automatically get the stagger
// when the parent transitions between 'hidden' and 'visible'
```

---

## Motion Value Events

```tsx
import { useScroll, useMotionValueEvent } from 'motion/react';

const { scrollY } = useScroll();

// Fires on every change — use for imperative side effects
useMotionValueEvent(scrollY, 'change', latest => {
  console.log('scroll position:', latest);
});

// Detect scroll direction
const [direction, setDirection] = useState<'up' | 'down'>('down');

useMotionValueEvent(scrollY, 'change', current => {
  const diff = current - scrollY.getPrevious()!;
  setDirection(diff > 0 ? 'down' : 'up');
});
```

**When to use `useMotionValueEvent` vs `useTransform`:**
- Use `useTransform` when you want a CSS value that animates smoothly (y, opacity, color)
- Use `useMotionValueEvent` when you want to fire React state changes or side effects

---

## Next.js & App Router Notes

```tsx
// Every file using motion hooks must be a Client Component
'use client';

// For page-level scroll tracking in App Router, use useScroll in a layout
// that's already a client component — don't try to use it in Server Components

// If you need SSR-safe scroll animations, gate with:
import { useEffect, useState } from 'react';
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null; // or a skeleton
```

**Recommended pattern for Next.js App Router:**
1. Keep all `motion.*` components in separate `'use client'` files
2. Import them into Server Components — they'll be client-rendered automatically
3. Use `AnimatePresence` at the layout level for page transitions

---

## Accessibility

```tsx
import { useReducedMotion } from 'motion/react';

export function AnimatedCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    >
      Content
    </motion.div>
  );
}
```

Or disable all scroll-linked transforms when reduced motion is preferred:
```tsx
const prefersReducedMotion = useReducedMotion();
const y = useTransform(
  scrollYProgress, [0, 1],
  prefersReducedMotion ? [0, 0] : [100, -100]  // no movement if reduced motion
);
```

---

## Common Copilot Pitfalls

**Missing 'use client':** Copilot forgets to add this for Next.js App Router files.
Every file using `useScroll`, `useTransform`, `motion.*`, or any hook needs `'use client'` at the top.

**Using style prop on a plain div:** Copilot sometimes writes `<div style={{ y }}>` where `y` is a MotionValue.
This silently does nothing. Must be `<motion.div style={{ y }}>`.

**Old import path:** Copilot still generates `from 'framer-motion'` (valid, but legacy).
Current canonical: `from 'motion/react'`.

**Forgetting offset on useScroll:** Without `offset`, `scrollYProgress` tracks the full page
from 0 to 1 — not the element's position. Always pass `target` + `offset` for element-level tracking.

**Missing ref on target:** Copilot sometimes writes `target: ref` but forgets to attach `ref` to the DOM element.
```tsx
const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref }); // ← ref passed
return <div ref={ref}>...</div>;                          // ← ref attached
```

**Using animate prop for scroll-linked values:** Scroll-linked values must use `style`, not `animate`.
`animate` runs on mount/unmount, not on scroll.
```tsx
// ❌ Wrong
<motion.div animate={{ opacity }} />

// ✅ Correct
<motion.div style={{ opacity }} />
```

**Not smoothing scroll progress:** Raw `scrollYProgress` can feel mechanical on fine motion.
Wrap in `useSpring` for progress bars and UI elements that need a polished feel.
