# Sources & Validation

Every number, formula, and classification in this skill is sourced from a publicly verifiable primary source. This file exists so contributors, reviewers, and users can independently verify all claims before trusting the output.

**If you find a number that is wrong, outdated, or missing a citation — please open a PR against this file.**

---

## Data Classification Standards

### GDPR Special Categories (Tier 1 classification basis)
- **Source:** Regulation (EU) 2016/679 — Article 9 "Processing of special categories of personal data"
- **URL:** https://gdpr-info.eu/art-9-gdpr/
- **What it says:** Biometric data, health data, genetic data, racial/ethnic origin, political opinions, religious beliefs, sex life/orientation are "special categories" requiring explicit consent.
- **Our use:** These map directly to Tier 1 in `data-classification.md`

### PCI-DSS Data Classification
- **Source:** PCI Security Standards Council — PCI DSS v4.0 (March 2022)
- **URL:** https://www.pcisecuritystandards.org/document_library/
- **What it says:** Primary Account Number (PAN), cardholder name, expiration date, service code = cardholder data. CVV = sensitive authentication data. Both must be protected.
- **Our use:** Maps to Tier 2 PCI-DSS in `data-classification.md`

### HIPAA Protected Health Information (PHI) Definition
- **Source:** 45 CFR Part 160 and Part 164 (Health Insurance Portability and Accountability Act)
- **URL:** https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html
- **What it says:** The 18 HIPAA identifiers that make health data "protected" — includes names, geographic data, dates, phone numbers, emails, SSNs, medical record numbers, health plan IDs, etc.
- **Our use:** Tier 1 PHI fields in `data-classification.md`

---

## GDPR Fine Formulas

**Source:** Regulation (EU) 2016/679 — Article 83 "General conditions for imposing administrative fines"
**URL:** https://gdpr-info.eu/art-83-gdpr/

**Exact legal text (Article 83.4):**
> "Infringements of the following provisions shall...be subject to administrative fines up to 10 000 000 EUR, or in the case of an undertaking, up to 2 % of the total worldwide annual turnover of the preceding financial year, whichever is higher..."

**Exact legal text (Article 83.5):**
> "Infringements of the following provisions shall...be subject to administrative fines up to 20 000 000 EUR, or in the case of an undertaking, up to 4 % of the total worldwide annual turnover of the preceding financial year, whichever is higher..."

**Our formula:** Directly transcribed from Article 83.4 (Tier 1 violations) and Article 83.5 (Tier 2 violations). No interpretation added.

**Historic fines for calibration (all publicly verified):**

| Fine | Organization | Year | Source URL |
|------|-------------|------|------------|
| €1.2B | Meta (Ireland DPC) | 2023 | https://www.dataprotection.ie/en/news-media/press-releases/data-protection-commission-announces-decision-in-meta-ireland-inquiry |
| €746M | Amazon (Luxembourg) | 2021 | https://iapp.org/news/a/amazon-hit-with-887m-fine-for-gdpr-violations/ |
| €225M | WhatsApp (Ireland DPC) | 2021 | https://www.dataprotection.ie/en/news-media/press-releases/data-protection-commission-announces-decision-in-whatsapp-inquiry |
| €150M | Google (France CNIL) | 2022 | https://www.cnil.fr/en/cookies-cnil-fines-google-150-million-euros-and-facebook-60-million-euros |
| €35.3M | H&M (Hamburg DPA) | 2020 | https://www.datenschutz-hamburg.de/news/detail/article/hamburgische-beauftragte-fuer-datenschutz-und-informationsfreiheit-verhaengt-bussgeld-gegen-hm.html |
| €22M | British Airways (ICO) | 2020 | https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2020/10/ico-fines-british-airways-20m-for-data-breach-affecting-more-than-400-000-customers/ |
| €18.4M | Marriott (ICO) | 2020 | https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2020/10/ico-fines-marriott-international-inc18-4million-for-failing-to-keep-customers-personal-data-secure/ |

---

## CCPA / CPRA Fine Formula

**Source:** California Civil Code § 1798.155(a) — California Consumer Privacy Act
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.155

> **Note (as of June 30, 2025):** Stats. 2025, Ch. 20, Sec. 1 (AB 137) amended § 1798.155. The administrative fine amounts are now in **subsection (a)**. Old references to `§ 1798.155(b)` for fine amounts are incorrect under the amended text. Verify at the URL above for any future changes.

**Exact statutory text (§ 1798.155(a) as amended):**
> "Any business, service provider, contractor, or other person that violates this title shall be liable for an administrative fine of not more than two thousand five hundred dollars ($2,500) for each violation or seven thousand five hundred dollars ($7,500) for each intentional violation..."

**Private Right of Action source:** California Civil Code § 1798.150
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150

**Exact statutory text:**
> "Any consumer whose nonencrypted and nonredacted personal information...is subject to an unauthorized access and exfiltration...may institute a civil action for...damages in an amount not less than one hundred dollars ($100) and not greater than seven hundred and fifty ($750) per consumer per incident or actual damages, whichever is greater..."

**Our formula:** Directly transcribed. $2,500 / $7,500 per violation comes verbatim from § 1798.155(a) (as amended June 30, 2025). $100–$750 private right of action comes verbatim from § 1798.150.

---

## HIPAA Fine Formula

**Source:** 45 CFR § 160.404 — Civil Money Penalties
**URL:** https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-160/subpart-D/section-160.404

**Source (HHS penalty tiers explained):** HHS Office for Civil Rights
**URL:** https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html

**HHS OCR penalty tiers (current inflation-adjusted 2024 amounts):**
- Tier A (no knowledge): $137–$68,928 per violation, $2,067,813 annual cap
- Tier B (reasonable cause): $1,379–$68,928, $2,067,813 annual cap
- Tier C (willful, corrected): $13,785–$68,928, $2,067,813 annual cap
- Tier D (willful, not corrected): $68,928–$1,919,173, $1,919,173 annual cap

**URL for current amounts:** https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/examples/all-cases/index.html

**Note on our figures:** The dollar amounts in `regulatory-impact.md` match HHS's inflation-adjusted 2024 penalty tiers. HHS adjusts these annually. Always verify against the HHS OCR website for the current year.

**Criminal penalties source:** 42 U.S.C. § 1320d-6
**URL:** https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1320d-6

---

## LGPD Fine Formula

**Source:** Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709/2018, Article 52
**URL:** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

**Exact text (Art. 52, I):** Fine of up to 2% of revenue of a private legal entity or group in Brazil in its last fiscal year, limited to R$50,000,000 (fifty million reais) per infraction.

**Our formula:** Verbatim from Article 52.

---

## Singapore PDPA Fine Formula

**Source:** Personal Data Protection Act 2012 (Singapore) — Section 48J
**URL:** https://sso.agc.gov.sg/Act/PDPA2012

**Maximum fine:** S$1,000,000 per breach OR 10% of annual turnover in Singapore (if turnover > S$10M) — whichever is higher, per the 2021 amendment.

---

## Breach Cost Benchmarks

**Source:** IBM Security — "Cost of a Data Breach Report" (published annually since 2005)
**URL:** https://www.ibm.com/reports/data-breach
**Publisher:** IBM Security + Ponemon Institute
**Methodology (2024 edition):** Survey of 604 organizations across 17 industries in 16 countries/regions. Each breach involved 2,170–113,954 compromised records.

**Last-verified figures (IBM 2024 edition):**
| Metric | Value | Source |
|--------|-------|--------|
| Global average total cost | $4.88M | IBM 2024, p.4 |
| Healthcare cost per record | $408 | IBM 2024, p.12 |
| Average cost per record (all industries) | $165 | IBM 2024, p.11 |
| Average time to identify breach | 194 days | IBM 2024, p.15 |
| Average time to contain breach | 73 days | IBM 2024, p.15 |
| Cost premium for breaches > 200 days | +$1.02M | IBM 2024, p.16 |
| Cost reduction from AI/ML security | -$2.22M | IBM 2024, p.20 |
| Cost reduction from IR planning | -$232K | IBM 2024, p.21 |
| Cost reduction from employee training | -$258K | IBM 2024, p.21 |

**2025 update:** The IBM 2025 report (live at the URL above) reports a 9% decrease in the global average from $4.88M. The exact 2025 figure requires downloading the report PDF. **Skill maintainers: update this table annually when a new edition is published.**

---

## Breach Notification Timelines

| Regulation | Timeline | Source |
|-----------|---------|--------|
| GDPR | 72 hours | GDPR Article 33.1 — https://gdpr-info.eu/art-33-gdpr/ |
| UK GDPR | 72 hours | UK GDPR Article 33 (retained EU law) — https://ico.org.uk/for-organisations/report-a-breach/ |
| HIPAA | 60 days | 45 CFR § 164.412 — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D/section-164.412 |
| CCPA | "Most expedient time" | Cal. Civ. Code § 1798.82 — https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82 |
| Singapore PDPA | 3 calendar days | PDPA Section 26D — https://sso.agc.gov.sg/Act/PDPA2012 |
| Australia Privacy Act | 30 days | Privacy Act 1988, APP 1 + NDB Scheme — https://www.oaic.gov.au/privacy/notifiable-data-breaches |
| LGPD Brazil | 2 business days (ANPD guidance) | ANPD Resolution CD/ANPD nº 2/2022 — https://www.gov.br/anpd/pt-br |
| Japan APPI | 3–5 business days (2022 amendment) | Act on Protection of Personal Information Art. 26 — https://www.ppc.go.jp/en/legal/ |
| PIPEDA Canada | "As soon as feasible" | PIPEDA s.10.1 — https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/ |

---

## Blast Radius Formula Basis

The scoring formula structure is adapted from established risk quantification frameworks:

| Component | Based on |
|-----------|---------|
| Tier Weight × Exposure Likelihood | OWASP Risk Rating Methodology — https://owasp.org/www-community/OWASP_Risk_Rating_Methodology |
| Completeness Factor | FAIR (Factor Analysis of Information Risk) model — https://www.fairinstitute.org/ |
| Population Scale normalization | CVSS v4.0 Attack Scale metric — https://www.first.org/cvss/v4-0/ |
| Context multipliers | GDPR recitals 75, 91 (special categories increase risk level) — https://gdpr-info.eu/recital-75-gdpr/ |

**What the formula is NOT:** It is not a legally recognized standard. It is a planning heuristic based on accepted risk frameworks, producing a relative score to compare exposure vectors — not an absolute prediction of breach cost.

---

## What Is Estimated vs. What Is Exact

| Item | Status | Notes |
|------|--------|-------|
| GDPR fine maximum (€20M / 4% turnover) | **Exact** — verbatim from Art. 83.5 | This is the law |
| CCPA fine ($2,500 / $7,500) | **Exact** — verbatim from § 1798.155(a) (as amended June 30, 2025) | This is the law |
| HIPAA tier amounts | **Exact for 2024** — HHS inflation-adjusted | Update annually |
| Blast Radius Score | **Estimate** — heuristic planning tool | Not a legal or insurance figure |
| Financial impact range ($X–$Y) | **Estimate** — IBM benchmarks + fine formula applied to population | Not a prediction |
| "Probable" fine amount | **Estimate** — based on historic fine patterns | Real fines vary enormously by regulator |
| Notification timeline | **Exact** — verbatim from law | These are hard legal deadlines |
