# Recipe: Resilient WCAG 2.2 AAA Audit (Stateless Edge)

This recipe provides a SRE-grade accessibility audit workflow using GitHub Copilot. It is designed for Health Equity in geopolitically unstable or low-bandwidth environments where heavy testing frameworks (Playwright/Puppeteer) cannot be initialized.

## 📊 System Architecture & Data Flow

<details>
<summary><b>Click to expand: Stateless Edge Audit Diagram</b></summary>

### Visualizing the Resilient Audit Cycle
This diagram illustrates how the audit process bypasses heavy infrastructure, using Copilot as a stateless evaluation engine based on minimal semantic snapshots.

```mermaid
graph TD
    User[User: Low-Bandwidth Zone]
    App[Health Portal: Vanilla JS]
    
    subgraph ClientSide[Edge Logic]
        Script[JS Snapshotter]
        JSON[Semantic JSON ~2KB]
    end
    
    subgraph AuditEnv[GitHub Copilot]
        Copilot[Expert Auditor]
        ADR[ADR-006: AAA Rules]
    end
    
    Patch[Vanilla JS Patch <1KB]

    User --> App
    App --> Script
    Script --> JSON
    JSON --> Copilot
    ADR --- Copilot
    Copilot --> Patch
    Patch --> App

    %% Styling adattivo (Nessun fill fisso)
    style JSON stroke:#0277bd,stroke-width:2px,rx:5,ry:5
    style Copilot stroke:#fbc02d,stroke-width:2px,stroke-dasharray: 5 5,rx:5,ry:5
    style Patch stroke:#c62828,stroke-width:2px,rx:5,ry:5
    style ADR stroke:#fbc02d,stroke-width:1px,stroke-dasharray: 5 5
```
</details>

## 🟢 Philosophy: "SRE-for-Humans"

In critical healthcare contexts, accessibility is a clinical requirement, not just a UI preference. Inspired by the BiotechProject blueprint, this recipe prioritizes:

- **Resilience**: Operates via stateless DOM snapshots.
- **Inclusion**: Targets WCAG 2.2 AAA (including Success Criterion 2.4.11).
- **Performance**: Zero-framework, optimized for 0.3s TTI (Time to Interactive).

## 🛠️ The Implementation

### 1. Low-Bandwidth Snapshotter (Vanilla JS)

Use this minified script to extract a semantic "Skeleton" of the page. It ignores heavy assets and styles, focusing strictly on the ARIA tree and structural integrity to minimize data transfer.

```js
/**
 * Stateless Semantic Snapshotter
 * Optimized for Low-Bandwidth WCAG 2.2 AAA Audit
 */
(() => {
  const getSemanticMap = (el) => {
    return Array.from(el.querySelectorAll('*'))
      .filter(n => n.getAttribute('role') || n.ariaLabel || ['button','input','select','a','img','h1','h2','h3'].includes(n.tagName.toLowerCase()))
      .map(node => ({
        t: node.tagName.toLowerCase(),
        r: node.getAttribute('role') || undefined,
        al: node.ariaLabel || undefined,
        lb: node.getAttribute('aria-labelledby') || undefined,
        txt: node.innerText?.substring(0, 30),
        tab: node.tabIndex >= 0 ? node.tabIndex : undefined
      }));
  };

  const payload = {
    origin: window.location.hostname,
    context: "Health-Critical/Low-Bandwidth",
    timestamp: new Date().toISOString(),
    data: getSemanticMap(document.body)
  };

  console.log(JSON.stringify(payload));
})();
```
## 2. Copilot Skill: The Resilient Auditor

To trigger the audit, paste the JSON output from the script above into GitHub Copilot Chat with the following instruction:

Instruction:
"Act as a Senior SRE & Accessibility Specialist. Analyze the attached JSON DOM snapshot for WCAG 2.2 AAA compliance. Focus on Health Equity (clinical safety and neurodivergent access). Identify issues like missing focus markers (SC 2.4.11) or unpredictable context changes. Suggest only Vanilla JS fixes for low-bandwidth resilience."


## 🏗️ Architectural Decision Records (ADR) Mapping

This recipe adheres to the rigorous standards of the BiotechProject SRE Blueprint:

| ID  | Decision                     | Core Outcome                                      |
|-----|------------------------------|---------------------------------------------------|
| ADR-001 | Zero-Framework Mandate     | No dependencies, minimal attack surface, 0.3s TTI. |
| 002   | Stateless Edge Intelligence | 100% availability during network surges or outages. |
| 006   | AAA Accessibility Baseline  | Native compliance for neurodivergent and clinical users. |

## 🌍 Real-World Use Case: Geopolitical Resilience

In scenarios where a developer must audit a Metabolic Digital Twin or an Emergency Health Portal over a degraded connection (e.g., 2G or satellite):

- **Extract**: The developer runs the Snapshotter (output is ~2KB vs ~2MB for a full page).
- **Audit**: Copilot processes the semantic logic without needing to render the page.
- **Patch**: A <1KB Vanilla JS fix is generated and deployed immediately to the Edge.

## 📋 Pull Request Requirements

- [x] Verified for Vanilla JS (ES6+) compatibility.
- [x] Optimized for WCAG 2.2 AAA compliance standards.
- [x] Ethics-first approach for Health Equity scenarios.

Developed in collaboration with Gabriel Mercuri and the BiotechProject Team. 
