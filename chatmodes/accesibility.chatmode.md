---
description: 'Accessibility mode.'
model: GPT-4.1
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'findTestFiles', 'githubRepo', 'new', 'openSimpleBrowser', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI']
title: 'Accessibility mode'
---

## ⚠️ Accessibility is a Priority in This Project

All code generated for this project must adhere to the Web Content Accessibility Guidelines (WCAG) 2.1. Accessibility is not an afterthought—it is a core requirement. By following these guidelines, we ensure our project is usable by everyone, including people with disabilities.

## 📋 Key WCAG 2.1 Guidelines

When generating or modifying code, always consider these four core principles:

### 1. Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

- **Provide text alternatives** for non-text content (images, icons, buttons)
- **Provide captions and alternatives** for multimedia
- **Create content** that can be presented in different ways without losing information
- **Make it easier** for users to see and hear content by separating foreground from background

### 2. Operable
User interface components and navigation must be operable.

- **Make all functionality available** from a keyboard
- **Give users enough time** to read and use content
- **Do not use content** that causes seizures or physical reactions
- **Provide ways** to help users navigate and find content
- **Make it easier** to use inputs other than keyboard

### 3. Understandable
Information and the operation of user interface must be understandable.

- **Make text readable** and understandable
- **Make content appear and operate** in predictable ways
- **Help users avoid and correct mistakes** with clear instructions and error handling

### 4. Robust
Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

- **Maximize compatibility** with current and future user tools
- **Use semantic HTML** elements appropriately
- **Ensure ARIA attributes** are used correctly when needed

## 🧩 Code Reminders for Accessibility

### HTML Reminders
- Always include appropriate semantic HTML elements (`<nav>`, `<main>`, `<section>`, etc.)
- Always add `alt` attributes to images: `<img src="image.jpg" alt="Description of image">`
- Always include a language attribute in the HTML tag: `<html lang="en">`
- Always use heading elements (`<h1>` through `<h6>`) in logical, hierarchical order
- Always associate `<label>` elements with form controls or use `aria-label`
- Always include skip links for keyboard navigation
- Always ensure proper color contrast for text elements

### CSS Reminders
- Never rely solely on color to convey information
- Always provide visible focus indicators for keyboard navigation
- Always test layouts at different zoom levels and viewport sizes
- Always use relative units (`em`, `rem`, `%`) instead of fixed units where appropriate
- Never use CSS to hide content that should be available to screen readers

### JavaScript Reminders
- Always make custom interactive elements keyboard accessible
- Always manage focus when creating dynamic content
- Always use ARIA live regions for dynamic content updates
- Always maintain logical focus order in interactive applications
- Always test with keyboard-only navigation

## IMPORTANT

Please execute pa11y and axe-core every time you make changes to the codebase to ensure compliance with accessibility standards. This will help catch any issues early and maintain a high standard of accessibility throughout the project.
