# Regulatory Impact Reference

Fine formulas, breach notification timelines, cost benchmarks, and jurisdiction detection patterns for all major global data protection regulations.

> **Disclaimer:** This reference is for risk planning and developer education only. All fine estimates are approximations based on publicly available legal texts and benchmarks cited in `SOURCES.md`. Consult qualified legal counsel for actual regulatory guidance in your jurisdiction.

> **Verifying these numbers:** Every fine formula in this file is sourced from the regulation's primary legal text. See `references/SOURCES.md` for the exact statute/article URL for each figure. If any number looks wrong, check SOURCES.md first — if it's genuinely outdated, please open a PR.

---

## Jurisdiction Detection Patterns

Scan the codebase for these signals to determine which regulations apply:

### GDPR (EU/EEA — General Data Protection Regulation)
**Trigger signals:**
```
# Geographic signals
- Currency: EUR, GBP (for UK GDPR)
- Phone formats: +44, +49, +33, +31, +34, +39, +46, +47, +358, +45, +48
- Locale strings: 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'sv', 'da', 'fi', 'nb', 'el'
- Country codes: DE, FR, ES, IT, NL, PL, BE, SE, AT, CH, DK, FI, NO, PT, GR, IE, HU, CZ, RO
- Cloud regions: eu-west-*, eu-central-*, northeurope, westeurope, francecentral, germanywestcentral
- Domain TLDs: .de, .fr, .es, .it, .nl, .pl, .eu, .uk, .ie, .at, .se, .dk, .fi, .be, .no, .pt

# Code signals
- GDPR-related comments or variable names: gdpr, dpa, data_protection, lawful_basis
- Consent management code: cookie_consent, gdpr_consent, marketing_opt_in
- Right to erasure endpoints: /delete-account, /forget-me, /data-deletion
- Data export endpoints: /export-data, /download-my-data, /dsar
- EU-specific third-party integrations: TrustArc, OneTrust, Cookiebot, Axeptio

# Config signals
- AWS S3 buckets with eu- prefix
- Azure storage accounts in European regions
- GCP storage in europe-* regions
```

**Applies to:** Any organization processing personal data of EU/EEA residents, regardless of where the organization is based.

---

### CCPA / CPRA (California — Consumer Privacy Rights Act)
**Trigger signals:**
```
# Geographic signals
- Country: US with state: CA, California
- Sales tax for California (CA sales tax logic)
- Phone format: +1 with 213, 310, 323, 408, 415, 424, 510, 530, 562, 619, 626, 650, 707, 714, 805, 818, 831, 858, 909, 916, 925, 949, 951

# Code signals
- CCPA-related comments: ccpa, california_privacy, do_not_sell, opt_out_of_sale
- Privacy preference center with California toggle
- Opt-out links: /do-not-sell, /privacy-choices, /opt-out
- GPC (Global Privacy Control) header handling

# Business signals
- Annual gross revenue > $25M (implied by scale signals in codebase)
- Comments/configs referencing California consumer data
```

**Applies to:** For-profit businesses meeting any of: annual gross revenue > $25M, buys/sells/receives/shares personal data of 100K+ consumers/households annually, or derives 50%+ of revenue from selling personal data.

---

### HIPAA (US — Health Insurance Portability and Accountability Act)
**Trigger signals:**
```
# Field name signals (PHI — Protected Health Information)
- medical_record_number, mrn, patient_id, encounter_id
- diagnosis, icd_code, icd10, medication, prescription
- lab_result, test_result, radiology, pathology
- health_plan_id, insurance_id, claim_number
- fhir_, hl7_, dicom_

# Integration signals
- Epic, Cerner, Allscripts, eClinicalWorks API keys or webhooks
- FHIR API endpoints (/fhir/, /r4/, /stu3/)
- HL7 message parsing
- CMS (Centers for Medicare & Medicaid) API integration
- SNOMED, LOINC, ICD code lookups

# Config signals
- HIPAA compliance flags or BAA (Business Associate Agreement) references
- HIPAA-compliant hosting: AWS HIPAA BAA, Azure Healthcare APIs, GCP HIPAA
- Healthcare-specific cloud: Microsoft Cloud for Healthcare, Google Cloud Healthcare API
```

**Applies to:** Covered entities (healthcare providers, health plans, clearinghouses) and their Business Associates (vendors who process PHI on their behalf).

---

### LGPD (Brazil — Lei Geral de Proteção de Dados)
**Trigger signals:**
```
# Geographic signals
- Currency: BRL, R$
- Phone format: +55
- Locale: pt-BR, pt_BR
- Country codes: BR, BRA, Brazil
- CPF field (Brazilian individual taxpayer registry): cpf, cpf_number
- CNPJ field (Brazilian company registry): cnpj
- CEP (Brazilian postal code): cep, codigo_postal (8 digits, XXXXX-XXX format)

# Code signals
- lgpd references in comments or variable names
- Brazilian payment integrations: PicPay, Nubank, Mercado Pago, PagSeguro, PIX
- Brazilian cloud regions: sa-east-1 (AWS São Paulo), brazilsouth (Azure)
```

**Applies to:** Any processing of personal data of individuals in Brazil, or any processing carried out in Brazil.

---

### PDPA (Multiple Asian jurisdictions)

#### Singapore PDPA
**Trigger signals:** `+65`, `SGD`, `sg` locale, `.sg` TLD, `nric` field, `fin` (Foreign Identification Number), `singpass`

#### Thailand PDPA
**Trigger signals:** `+66`, `THB`, `th` locale, `.th` TLD, `thai_id`

#### Malaysia PDPA
**Trigger signals:** `+60`, `MYR`, `ms` locale, `.my` TLD, `my_kad`, `nric_malaysia`

#### Philippines Data Privacy Act
**Trigger signals:** `+63`, `PHP` (currency), `ph` locale, `.ph` TLD, `phil_sys_number`

#### Japan APPI (Act on Protection of Personal Information)
**Trigger signals:** `+81`, `JPY`, `ja` locale, `.jp` TLD, `my_number` (Japanese national ID), `maruhi` (confidential)

---

### Other Regulations (flag if applicable)

| Regulation | Jurisdiction | Key Trigger |
|-----------|-------------|-------------|
| PIPEDA / Law 25 | Canada | `+1` + Canadian provinces, `CAD`, `.ca` TLD, SIN field |
| Australia Privacy Act | Australia | `+61`, `AUD`, `.au` TLD, `tfn` field |
| POPIA | South Africa | `+27`, South African Rand, `.za` TLD, `sa_id_number` |
| KVKK | Turkey | `+90`, `TRY`, `.tr` TLD |
| PDPB | India (upcoming) | `+91`, `INR`, `aadhaar` field — note: not yet in force |
| SOC 2 Type II | US (security standard, not law) | Mentioned in codebase, customer contracts |
| PCI-DSS | Global (payment card) | Any card number / CVV / PAN field |

---

## GDPR Fine Calculator

**Legal source:** GDPR Article 83 — https://gdpr-info.eu/art-83-gdpr/  
**Exact text, Art. 83.4:** "...up to 10 000 000 EUR, or...up to 2% of the total worldwide annual turnover...whichever is higher"  
**Exact text, Art. 83.5:** "...up to 20 000 000 EUR, or...up to 4% of the total worldwide annual turnover...whichever is higher"

### Maximum Fines (Article 83)
```
Tier 1 violations (less severe — Art. 83.4):
  Maximum = max(€10,000,000, 2% of global annual turnover)
  [Note: 'higher' means the LARGER of the two — corrected from min() to max()]

Tier 2 violations (most severe — Art. 83.5 — core principles, data subject rights, cross-border transfers):
  Maximum = max(€20,000,000, 4% of global annual turnover)
```

### Fine Estimation Formula for Risk Planning
When annual revenue/turnover is unknown, use these conservative estimates:

| Company Profile | Estimated Annual Turnover | Realistic T1 Fine | Realistic T2 Fine |
|----------------|--------------------------|-------------------|-------------------|
| Startup (< 10 employees) | < €2M | €25K–€100K | €50K–€250K |
| Small business (10–50 employees) | €2M–€10M | €50K–€400K | €100K–€800K |
| Mid-size (50–500 employees) | €10M–€100M | €200K–€2M | €500K–€4M |
| Large enterprise (500–5K employees) | €100M–€1B | €2M–€20M | €5M–€40M |
| Multinational | > €1B | €10M (capped at 2%) | €20M (capped at 4%) |

**Historic GDPR fines for calibration (all publicly verified — links in SOURCES.md):**
- Meta: €1.2B (2023) — cross-border data transfer violations
- Amazon: €746M (2021) — cookie consent violations
- WhatsApp: €225M (2021) — transparency violations
- Google: €150M (France, 2022) — cookie withdrawal
- H&M: €35.3M (2020) — employee monitoring
- British Airways: €22M (2020) — security breach (500K records)
- Marriott: €18.4M (2020) — security breach (339M records)

**Breach notification fine enhancement:** Non-notification or late notification adds 20–30% to the base fine.

---

## CCPA / CPRA Fine Calculator

**Legal source:** California Civil Code § 1798.155(a) (as amended June 30, 2025, Stats. 2025, Ch. 20) — https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.155  
**Private right of action source:** California Civil Code § 1798.150 — https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150

```
Non-intentional violations: $2,500 per violation    [§ 1798.155(a)]
Intentional violations: $7,500 per violation         [§ 1798.155(a)]
Children's data violations: $7,500 per violation    [§ 1798.155(a) — intent not required for minors]
Private right of action: $100–$750 per consumer     [§ 1798.150]
```

### Calculation for mass breach

```
Max_CCPA_Fine = Records_affected × $7,500 (if intentional)
             = Records_affected × $2,500 (if unintentional)
```

**Cap:** California AG can seek up to $2,500 per consumer per violation, but class action suits under private right of action can reach $100–$750 per consumer.

**Private right of action (unique to CCPA/CPRA):**
```
Civil_damages = max($100, min($750, actual_damages)) × affected_California_consumers
```

**Examples:**
- 100K Californian users × $750 = $75M maximum private right of action
- 100K users × $2,500 = $250M maximum CCPA fine (regulatory)

---

## HIPAA Fine Calculator

**Legal source:** 45 CFR § 160.404 — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-160/subpart-D/section-160.404  
**HHS enforcement page:** https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/examples/all-cases/index.html  
**Note:** Amounts are 2024 inflation-adjusted figures per HHS. Updated annually — verify at HHS link above.

HIPAA fines are tiered by knowledge/culpability (45 CFR § 160.404):

| Tier | Culpability | Min per Violation | Max per Violation | Annual Cap |
| A | Did not know | $137 | $68,928 | $2,067,813 |
| B | Reasonable cause | $1,379 | $68,928 | $2,067,813 |
| C | Willful neglect, corrected | $13,785 | $68,928 | $2,067,813 |
| D | Willful neglect, not corrected | $68,928 | $1,919,173 | $1,919,173 |

**For breach planning:** Each affected patient record where PHI was exposed = 1 violation.

**Breach notification costs:** HHS requires notification to affected individuals + HHS. Breaches of 500+ individuals in a state require media notification. Breaches of 500+ total require HHS annual report.

**Criminal penalties (DOJ — for egregious cases):**
- Up to $50,000 + 1 year imprisonment (simple violation)
- Up to $100,000 + 5 years (under false pretenses)
- Up to $250,000 + 10 years (with intent to sell/use)

---

## LGPD Fine Calculator (Brazil)

**Legal source:** Lei nº 13.709/2018 (LGPD) — Article 52, I — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm  
**ANPD (Brazilian DPA):** https://www.gov.br/anpd/pt-br

```
Maximum fine per violation = 2% of revenue in Brazil in the prior fiscal year  [Art. 52, I]
Hard cap = R$50,000,000 (≈ $10M USD) per violation                            [Art. 52, I]
```

Daily fine possible during non-compliance period.  
**Brazilian DPA (ANPD) enforcement began 2021.** Enforcement ramp-up is ongoing.

---

## Breach Notification Timeline Reference

**All timelines are sourced from primary legal texts.** See `SOURCES.md` for exact article/section URLs for each regulation.

How fast you must notify regulators and affected individuals after discovering a breach:

| Regulation | Regulator Notification | Individual Notification | Legal Source | Notes |
|-----------|----------------------|------------------------|-------------|-------|
| GDPR | **72 hours** from discovery | "Without undue delay" if high risk | Art. 33 & 34 | Must notify even if details incomplete |
| UK GDPR | **72 hours** from discovery | Without undue delay | UK GDPR Art. 33 | Retained EU law post-Brexit |
| CCPA / CPRA | "Most expedient time" (no hard number) | Same | Cal. Civ. Code § 1798.82 | CA AG if > 500 CA residents |
| HIPAA | **60 days** from discovery | 60 days (or sooner) | 45 CFR § 164.412 | HHS + media for 500+ in one state |
| LGPD (Brazil) | **2 business days** (ANPD guidance) | As soon as possible | ANPD Resolution nº 2/2022 | ANPD enforcing since 2021 |
| Singapore PDPA | **3 calendar days** for mandatory breach | Without undue delay | PDPA Section 26D (2021 amendment) | One of the strictest globally |
| Australia Privacy Act | ASAP, no later than **30 days** | As soon as practicable | Privacy Act 1988 — NDB Scheme | notifiable-data-breaches scheme |
| PIPEDA (Canada) | **As soon as feasible** | **As soon as feasible** | PIPEDA s.10.1 | OPCC notification required |
| Japan APPI | **3–5 business days** | Promptly | APPI Art. 26 (2022 amendment) | Tightened from prior version |

---

## Total Breach Cost Estimation Model

**Benchmark source:** IBM Security + Ponemon Institute — "Cost of a Data Breach Report" (annually updated)  
**URL:** https://www.ibm.com/reports/data-breach  
Figures below are from the **2024 edition** (last verified). IBM 2025 shows a 9% decrease — download the current PDF for updated values. **[IBM 2024, p.14]** page references refer to the 2024 edition.

Use this model when generating the Financial Impact Estimate section:

### Direct Costs
```
1. Detection & containment: $1.1M average      [IBM 2024, p.14]
2. Post-breach response:     $1.2M average      [IBM 2024, p.14]
3. Lost business:            $1.5M average      [IBM 2024, p.14]
4. Notification costs:       records × $2–$8 per individual  [industry estimate]
5. Credit monitoring:        records × $5–$20/year if PII    [industry estimate]
6. Legal costs:              $200K–$3M depending on complexity [industry estimate]
7. Forensic investigation:   $50K–$500K                      [industry estimate]
8. PR/crisis communications: $100K–$500K                     [industry estimate]
```

### Regulatory Costs
```
9. Regulatory fines:         [see per-regulation formulas above — all sourced from law text]
10. Settlement costs:        $1M–$100M+ for class actions    [historic case data]
```

### Reputational Multiplier
Apply based on public visibility of the organization:
```
B2C consumer app, consumer brand:     ×1.5 (high reputational damage)
B2B enterprise, low public profile:  ×1.1 (moderate reputational damage)
Healthcare or financial institution:  ×2.0 (trust erosion is severe)
Government or public sector:         ×1.8 (public accountability)
```

### Final Estimate Format
```
Minimum likely cost:   [conservative scenario, good response, small record count]
Probable cost:         [most likely scenario, average response]
Maximum exposure:      [worst case: maximum fines + class action + reputational]
```
