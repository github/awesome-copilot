# Data Classification Taxonomy

A comprehensive taxonomy for identifying sensitive data in codebases. Every field, column, model property, or variable matching these patterns should be inventoried and assigned the appropriate sensitivity tier.

---

## Tier 1 — Catastrophic (Irreversible harm if exposed)

### Biometric Data
**Detection patterns (field names / column names):**
- `fingerprint`, `thumbprint`, `retina_scan`, `iris_scan`, `face_id`, `facial_recognition`
- `voice_print`, `voice_biometric`, `gait_analysis`, `dna_profile`, `genetic_data`
- `biometric_template`, `biometric_hash`, `faceEmbedding`, `face_vector`

**Detection patterns (data values / format):**
- Base64-encoded blobs > 512 bytes in biometric-named fields
- Binary columns in tables named `biometric_*`, `face_*`, `fingerprint_*`

### Government-Issued Identifiers
**Detection patterns:**
- `ssn`, `social_security_number`, `social_security`, `sin` (Canada), `nino` (UK), `tfn` (Australia)
- `passport_number`, `passport_no`, `passport_id`
- `drivers_license`, `drivers_licence`, `dl_number`, `license_number`
- `national_id`, `national_identification`, `id_number`, `id_card_number`
- `tax_id`, `tin`, `ein`, `itin`, `vat_number`, `fiscal_code`
- `aadhaar`, `pan_number` (India), `cpf`, `cnpj` (Brazil), `rut` (Chile/Colombia)
- `nric`, `fin` (Singapore), `my_kad` (Malaysia), `nik` (Indonesia)

**Regex patterns for values:**
```
SSN:          \b\d{3}-\d{2}-\d{4}\b
UK NINO:      \b[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]\b
CPF (Brazil): \b\d{3}\.\d{3}\.\d{3}-\d{2}\b
Aadhaar:      \b\d{4}\s\d{4}\s\d{4}\b
```

### Health & Medical Data (PHI under HIPAA)
**Detection patterns:**
- `diagnosis`, `icd_code`, `icd10`, `icd11`, `snomed`, `loinc_code`
- `medication`, `prescription`, `drug_name`, `dosage`, `treatment`
- `medical_record_number`, `mrn`, `patient_id`, `encounter_id`
- `lab_result`, `test_result`, `pathology`, `radiology`
- `mental_health`, `psychiatric`, `therapy_notes`, `counseling`
- `hiv_status`, `std_status`, `substance_abuse`, `addiction`
- `insurance_id`, `insurance_member_id`, `health_plan_id`, `claim_number`
- `fhir_resource`, `hl7_message`, `dicom_data`
- `disability`, `handicap`, `chronic_condition`
- `pregnancy`, `reproductive_health`, `fertility`

### Authentication Credentials
**Detection patterns:**
- `password`, `passwd`, `pwd`, `hashed_password`, `password_hash`, `password_digest`
- `private_key`, `secret_key`, `api_key`, `api_secret`, `api_token`
- `access_token`, `refresh_token`, `bearer_token`, `id_token`, `jwt_token`
- `oauth_token`, `oauth_secret`, `oauth_access_token`
- `mfa_secret`, `totp_secret`, `otp_secret`, `backup_codes`
- `session_token`, `session_id`, `auth_token`
- `client_secret`, `client_credential`
- `private_key_pem`, `rsa_private`, `ecdsa_private`

---

## Tier 2 — Critical (High regulatory exposure)

### Payment Card Data (PCI-DSS)
**Detection patterns:**
- `card_number`, `pan`, `primary_account_number`, `credit_card`, `debit_card`
- `cvv`, `cvc`, `cvv2`, `card_verification`, `security_code`
- `card_expiry`, `expiration_date`, `exp_date`, `expiry_month`, `expiry_year`
- `cardholder_name`, `card_holder`
- `iban`, `bic`, `swift_code`, `routing_number`, `account_number`, `sort_code`
- `bank_account`, `bank_details`, `wire_transfer`

**Regex patterns for values:**
```
Visa:            \b4[0-9]{12}(?:[0-9]{3})?\b
Mastercard:      \b5[1-5][0-9]{14}\b
Amex:            \b3[47][0-9]{13}\b
Generic PAN:     \b[0-9]{13,19}\b (in a PAN-named field)
CVV:             \b[0-9]{3,4}\b (in a cvv-named field)
IBAN:            \b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b
```

### Identity Combinations (High re-identification risk when combined)
**Combinations that together constitute Tier 2:**
- Full name + date of birth
- Full name + address (street level)
- Email + date of birth + gender
- Phone number + address

**Detection patterns:**
- `full_name`, `first_name` + `last_name` (as separate fields — note both present)
- `date_of_birth`, `dob`, `birth_date`, `birthdate`, `birthday`
- `home_address`, `street_address`, `address_line1`, `postal_address`
- `gender`, `sex`, `pronoun` (when combined with other identifiers)

---

## Tier 3 — High (Regulatory notification triggers)

### Contact Information
**Detection patterns:**
- `email`, `email_address`, `user_email`, `contact_email`, `primary_email`
- `phone`, `phone_number`, `mobile`, `mobile_number`, `cell_phone`, `telephone`
- `whatsapp_number`, `signal_number`

**Regex patterns:**
```
Email:  \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b
Phone:  \+?[0-9\s\-\(\)]{7,20}  (in a phone-named field)
```

### Precise Location Data
**Detection patterns:**
- `latitude`, `longitude`, `lat`, `lng`, `lat_lng`, `coordinates`, `geo_point`
- `gps_location`, `precise_location`, `real_time_location`
- `home_location`, `work_location`

**Note:** City-level location is Tier 4; street-level or GPS coordinates are Tier 3.

### Network Identifiers
**Detection patterns:**
- `ip_address`, `ip`, `client_ip`, `remote_addr`, `x_forwarded_for`
- `mac_address`, `device_mac`, `hardware_id`
- `imei`, `imsi`, `device_id`, `advertising_id`, `idfa`, `gaid`

### Authentication Artifacts
**Detection patterns:**
- `session_id`, `cookie_value`, `csrf_token` (if long-lived and user-identifying)
- `remember_me_token`, `persistent_session`

---

## Tier 4 — Elevated (Privacy relevant)

### Partial Personal Identifiers
**Detection patterns:**
- `first_name`, `last_name`, `display_name`, `username` (when alone)
- `profile_picture`, `avatar_url`
- `city`, `state`, `country`, `region`, `zip_code`, `postal_code`
- `time_zone`, `locale`, `language_preference`

### Behavioral & Analytics Data
**Detection patterns:**
- `user_agent`, `browser`, `device_type`, `os`
- `search_query`, `search_history`, `browsing_history`
- `purchase_history`, `order_history`, `transaction_history`
- `click_event`, `page_view`, `session_duration`
- `preferences`, `interests`, `tags`, `segments`

### Financial Context (non-card)
**Detection patterns:**
- `salary`, `income`, `net_worth`, `credit_score`, `credit_rating`
- `account_balance`, `wallet_balance`, `subscription_tier`

---

## Tier 5 — Standard (No direct privacy impact)

- System configuration values (non-secret)
- Public user-facing content (blog posts, public profiles)
- Anonymized aggregated statistics
- Non-personal reference data (product catalog, country codes)
- Internal system identifiers with no external exposure

---

## Detection Guidance for AI Analysis

### Framework-Specific Patterns

**Django / Python:**
```python
# Sensitive fields typically appear in models.py
class User(models.Model):
    email = models.EmailField()           # Tier 3
    date_of_birth = models.DateField()    # Tier 2 (combined with name)
    ssn = models.CharField(max_length=11) # Tier 1
```

**TypeScript / Prisma:**
```prisma
model User {
  email       String    // Tier 3
  phoneNumber String?   // Tier 3
  dateOfBirth DateTime? // Tier 2 (when combined)
  cardNumber  String?   // Tier 2 PCI-DSS
}
```

**Java / Spring / JPA:**
```java
@Entity
public class Patient {
    @Column(name = "diagnosis")  // Tier 1 PHI
    private String diagnosis;
    
    @Column(name = "ssn")        // Tier 1
    private String ssn;
}
```

**C# / EF Core:**
```csharp
public class UserProfile {
    public string Email { get; set; }        // Tier 3
    public string PassportNumber { get; set; } // Tier 1
    public DateTime DateOfBirth { get; set; }  // Tier 2
}
```

### Log Statement Patterns (High Risk — often overlooked)
```python
# BAD — logs PII
logger.info(f"User {user.email} logged in from {request.remote_addr}")
logger.debug(f"Payment for card {card_number}")

# Look for these in logging calls:
# .info(), .debug(), .warn(), .error(), console.log(), System.out.println()
```

### API Response Leakage (Serializer/DTO patterns)
```typescript
// Check if these fields are included in response objects
// even if not requested — over-fetching is a common exposure vector
{
  "id": "...",
  "email": "...",          // Tier 3
  "phone": "...",          // Tier 3 
  "dateOfBirth": "...",    // Tier 2 — should this be returned?
  "passwordHash": "...",   // Tier 1 — should NEVER be returned
  "ssn": "...",            // Tier 1 — should NEVER be returned
}
```

---

## Aggregation Risk Assessment

Combination attacks — data that becomes more sensitive when combined:

| Alone | Combined With | Combined Tier | Risk |
|-------|--------------|---------------|------|
| Email (T3) | Password hash (T1) | T1 | Account takeover |
| Name (T4) | DOB (T2) + Address (T2) | T2 | Full identity reconstruction |
| IP address (T3) | Timestamps + User ID | T2 | Behavioral profiling |
| City (T4) | Purchase history (T4) | T3 | De-anonymization risk |
| Health category (T4) | Name + Email | T1 | HIPAA triggering |

**Rule:** Always assess fields in combination, not just in isolation.
