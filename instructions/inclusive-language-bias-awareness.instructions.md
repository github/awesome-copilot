---
description: "Comprehensive guidelines for using inclusive, bias-aware language in code, documentation, and all technical artifacts"
applyTo: "**"
---

# Inclusive Language and Bias Awareness

## Purpose

This instruction file provides guidance for creating inclusive, respectful, and bias-aware technical content across all aspects of software development, including code, documentation, comments, variable names, commit messages, and user-facing text.

## Core Principles

### 1. Inclusive by Default

**Use language that welcomes everyone:**

- Choose terms that are inclusive and respectful of all people
- Avoid language that excludes, stereotypes, or marginalizes groups
- Consider diverse backgrounds, cultures, and experiences
- Default to neutral and professional language

**Think globally:**

- Remember that code is read by people worldwide
- Avoid idioms or cultural references that may not translate
- Use clear, straightforward language
- Consider non-native English speakers

### 2. People-First Language

**Put people before labels:**

- Use "person with disability" not "disabled person"
- Use "developer who uses a screen reader" not "blind developer"
- Emphasize the person, not the characteristic
- Avoid defining people by a single attribute

**Respect identity:**

- Use gender-neutral language by default
- Avoid unnecessary gender references
- Respect self-identified terms and pronouns
- Don't make assumptions about users or developers

### 3. Technical Terminology Review

**Audit and update problematic terminology:**

**Problematic master/slave terminology:**

```diff
- master/slave
+ primary/replica
+ leader/follower
+ main/worker
+ primary/secondary
```

**Problematic whitelist/blacklist terminology:**

```diff
- whitelist/blacklist
+ allowlist/denylist
+ permitted/blocked
+ approved/rejected
```

**Problematic grandfather/legacy terminology:**

```diff
- grandfathered in
+ legacy exception
+ pre-existing
+ historically included
```

**Other terms to reconsider:**

```diff
- sanity check
+ verification check
+ validation check
+ confidence check

- dummy value
+ placeholder value
+ sample value
+ test value

- master branch
+ main branch

- native/non-native
+ built-in/third-party
+ core/external
```

## Naming Conventions

### Variable and Function Names

**Use descriptive, neutral names:**

**Good examples:**

```javascript
// Descriptive, neutral names
const primaryDatabase = config.database.primary;
const replicaDatabase = config.database.replica;
const userPermissions = getUserPermissions();
const isAuthorized = checkAuthorization(user);
const mainController = new Controller();
```

**Avoid examples:**

```javascript
// Problematic names
const masterDB = config.database.master; // Use 'primary' or 'main'
const slaveDB = config.database.slave; // Use 'replica' or 'secondary'
const whitelist = getWhitelist(); // Use 'allowlist'
const sanityCheck = performSanity(); // Use 'validation'
```

**Gender-neutral examples:**

```javascript
// Good: Gender-neutral
const user = getUser();
const developer = getDeveloper();
const administrator = getAdmin();
const participant = getParticipant();

// Avoid: Gendered
const guys = getUsers(); // Use 'users', 'people', 'folks', 'team'
const chairman = getChair(); // Use 'chairperson', 'chair', 'lead'
const manpower = getResources(); // Use 'staff', 'workforce', 'team size'
```

### Class and Type Names

**Use inclusive, professional names:**

```typescript
// Good: Professional, inclusive naming
interface UserProfile {
  id: string;
  displayName: string;
  preferredPronouns?: string;
  emailAddress: string;
}

class AccessControlManager {
  checkPermissions(user: User, resource: Resource): boolean;
  grantAccess(user: User, resource: Resource): void;
  revokeAccess(user: User, resource: Resource): void;
}

type AuthorizationLevel = "read" | "write" | "admin";
```

### Database and Schema Names

**Apply inclusive naming to database objects:**

```sql
-- Good: Inclusive naming
CREATE TABLE primary_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE replica_sync_status (
  id SERIAL PRIMARY KEY,
  last_sync TIMESTAMP
);

-- Avoid: Problematic naming
-- CREATE TABLE master_users ...
-- CREATE TABLE slave_sync_status ...
```

## Code Comments and Documentation

### Writing Inclusive Comments

**Be professional and neutral:**

**Good examples:**

```javascript
/**
 * Validates user input before processing.
 * Checks for common security issues and malformed data.
 *
 * @param input - The user-provided data to validate
 * @returns true if validation passes, false otherwise
 */
function validateInput(input: string): boolean {
  // Implementation
}

/**
 * Synchronizes data from the primary database to replica databases.
 * Ensures data consistency across all database instances.
 */
async function syncDatabases(): Promise<void> {
  // Implementation
}
```

**Avoid examples:**

```javascript
// Avoid: Ableist language
// This is a sanity check to make sure the user isn't crazy
// Prefer: This validates the user input is reasonable

// Avoid: Violent language
// Kill the process if it's taking too long
// Prefer: Terminate the process if it exceeds timeout

// Avoid: Gendered assumptions
// When the user clicks, he will see...
// Prefer: When the user clicks, they will see...
```

### Documentation Best Practices

**Use inclusive examples:**

```markdown
## User Profile Example

A user might have the following profile information:

{
"name": "Alex Chen",
"email": "alex@example.com",
"role": "developer",
"pronouns": "they/them"
}

Note: Users can specify their preferred pronouns in their profile settings.
```

**Avoid gendered examples:**

```markdown
<!-- Avoid -->

For example, if a developer wants to test the API, he can use:

<!-- Prefer -->

For example, if a developer wants to test the API, they can use:
```

**Use diverse names in examples:**

```markdown
<!-- Good: Diverse, international names -->

- Alex Chen (Software Engineer)
- Priya Patel (Product Manager)
- Jordan Williams (Designer)
- Amara Okafor (Data Analyst)

<!-- Avoid: Only Western, traditionally male names -->

- John Smith
- Bob Johnson
- Mike Davis
```

## User-Facing Text

### UI Text and Messages

**Be welcoming and neutral:**

**Good examples:**

```javascript
const messages = {
  welcome: "Welcome! Let's get started.",
  emptyState: "No items yet. Create your first one to get started.",
  error: "We encountered an issue. Please try again.",
  success: "Your changes have been saved.",
  loading: "Loading your data...",
};
```

**Avoid examples:**

```javascript
// Avoid gendered language
"Welcome, guys!"; // Use "Welcome, everyone!" or "Welcome!"

// Avoid ableist language
"Click here"; // Use "Select this option" (screen reader friendly)

// Avoid violent language
"Kill the session"; // Use "End the session"

// Avoid cultural assumptions
"Starting on Monday"; // Specify "Starting on the first day of the week"
```

### Error Messages

**Be helpful and respectful:**

**Good examples:**

```javascript
// Clear, helpful, respectful
"The email address format is not recognized. Please check and try again.";

"Access to this resource requires authentication. Please sign in.";

"The operation could not be completed. Please verify your input and try again.";
```

**Avoid examples:**

```javascript
// Avoid blaming language
"You entered an invalid email."; // Prefer: "The email format is not recognized."

// Avoid patronizing language
"Oops! Silly you!"; // Prefer: "Please check your input."

// Avoid technical jargon for users
"FATAL: Segmentation fault"; // Prefer: "An error occurred. Please try again."
```

## Bias Awareness in AI-Generated Code

### Review AI Suggestions for Bias

**When using AI tools like Copilot, watch for:**

**Gendered assumptions:**

```javascript
// AI might suggest:
const user = { name: "John", gender: "male" };

// Consider instead:
const user = {
  name: "Jordan",
  // Only include gender if functionally required
  // If required, make it optional and inclusive
  gender?: "male" | "female" | "non-binary" | "prefer-not-to-say"
};
```

**Stereotypical examples:**

```javascript
// AI might suggest:
const doctor = { name: "Dr. Smith", gender: "male" };
const nurse = { name: "Emily", gender: "female" };

// Consider instead:
const doctor = { name: "Dr. Patel", specialty: "cardiology" };
const nurse = { name: "Jordan", certification: "RN" };
```

**Cultural assumptions:**

```javascript
// AI might suggest:
const holidays = ["Christmas", "New Year's"];

// Consider instead:
const holidays = [
  "New Year's Day",
  "MLK Day",
  "Presidents Day",
  // Include diverse cultural and religious holidays
];
```

### Challenge Biased Patterns

**Question AI suggestions that:**

- Make assumptions about gender, race, ethnicity, or ability
- Use stereotypical examples or scenarios
- Exclude or marginalize certain groups
- Reflect historical biases in training data

**Take action:**

- Modify AI suggestions to be more inclusive
- Request alternative suggestions
- Document problematic patterns
- Share concerns with your team
- Report issues to tool maintainers

## Testing and Validation

### Inclusive Test Data

**Use diverse, realistic test data:**

**Good examples:**

```javascript
const testUsers = [
  { name: "Alex Chen", email: "alex@example.com", locale: "en-US" },
  { name: "Priya Patel", email: "priya@example.com", locale: "en-IN" },
  { name: "Yuki Tanaka", email: "yuki@example.jp", locale: "ja-JP" },
  { name: "Amara Okafor", email: "amara@example.ng", locale: "en-NG" },
  { name: "Jordan Williams", email: "jordan@example.com", locale: "en-GB" },
];
```

**Test edge cases:**

```javascript
// Test different name formats
const nameTestCases = [
  "Jordan", // Single name
  "Alex Chen", // Two names
  "María José García", // Names with accents
  "Björk Guðmundsdóttir", // Nordic names
  "Sun-Hee Park", // Hyphenated names
  "O'Brien", // Names with apostrophes
  "van der Berg", // Names with prefixes
];
```

### Accessibility in Testing

**Include accessibility tests:**

```javascript
describe("Form accessibility", () => {
  it("should have proper labels for all form fields", () => {
    // Test that all inputs have associated labels
  });

  it("should be keyboard navigable", () => {
    // Test keyboard navigation
  });

  it("should have proper ARIA attributes", () => {
    // Test ARIA labels and roles
  });
});
```

## Commit Messages and PR Descriptions

### Inclusive Communication

**Good examples:**

```markdown
feat: Replace master/slave terminology with primary/replica

Updated database configuration to use more inclusive terminology.

- Renamed master_db to primary_db
- Renamed slave_db to replica_db
- Updated documentation to reflect changes

Breaking change: Configuration files need to be updated
```

```markdown
docs: Add examples with diverse user names

Updated documentation examples to include diverse, international names
that better represent our global user base.
```

**Avoid:**

```markdown
// Avoid gendered language
"Fixed the issue with user profiles - they were driving me crazy"

// Prefer
"Fixed validation issue in user profiles"
```

## Localization and Internationalization

### Global Perspective

**Consider internationalization:**

```javascript
// Good: Locale-aware formatting
const formatter = new Intl.DateTimeFormat(userLocale);
const formattedDate = formatter.format(date);

// Good: Support for multiple languages
const messages = {
  "en-US": { greeting: "Hello" },
  "es-ES": { greeting: "Hola" },
  "ja-JP": { greeting: "こんにちは" },
  "ar-SA": { greeting: "مرحبا" },
};
```

**Avoid cultural assumptions:**

```javascript
// Avoid: Assumes Western date format
"Enter date as MM/DD/YYYY";

// Prefer: Locale-aware
"Enter date in your local format";
// Or use a date picker that handles localization
```

## Continuous Improvement

### Regular Audits

**Conduct periodic reviews:**

- Audit codebase for non-inclusive language
- Review documentation for bias and assumptions
- Check UI text for welcoming tone
- Evaluate test data for diversity
- Update terminology based on evolving best practices

### Team Education

**Foster inclusive culture:**

- Provide training on inclusive language
- Share resources and best practices
- Encourage open discussions
- Create safe space for questions
- Learn from mistakes and improve

### Feedback Mechanisms

**Welcome input:**

- Encourage team members to point out non-inclusive language
- Create clear processes for suggesting improvements
- Act on feedback promptly
- Thank people for raising concerns
- Document changes and learnings

## Resources

### Terminology Guides

- [Microsoft Style Guide - Bias-free communication](https://docs.microsoft.com/en-us/style-guide/bias-free-communication)
- [Google Developer Documentation Style Guide - Inclusive documentation](https://developers.google.com/style/inclusive-documentation)
- [Salesforce Inclusive Language Guidelines](https://github.com/salesforce/inclusive-language)
- [The Conscious Style Guide](https://consciousstyleguide.com/)

### Industry Initiatives

- [Inclusive Naming Initiative](https://inclusivenaming.org/)
- [Linux Foundation: Inclusive Naming](https://www.linuxfoundation.org/research/terminology-diversity-project)
- [IETF Terminology Working Group](https://datatracker.ietf.org/group/terminology/about/)

## Summary Checklist

Before committing code, ask yourself:

- [ ] Have I used inclusive, neutral terminology?
- [ ] Are variable and function names free from bias?
- [ ] Do code comments use respectful language?
- [ ] Does documentation include diverse examples?
- [ ] Are user-facing messages welcoming to all?
- [ ] Have I avoided gendered language?
- [ ] Are test cases representative of diverse users?
- [ ] Did I review AI suggestions for bias?
- [ ] Would this code be welcoming to any developer?
- [ ] Am I proud to have my name associated with this language?

## Conclusion

Inclusive language is not about being "politically correct" - it's about being professional, respectful, and welcoming to all people who use or contribute to our software. By consciously choosing inclusive language, we:

- **Create better products** that serve diverse users
- **Build stronger teams** where everyone feels welcome
- **Write clearer code** with precise, professional terminology
- **Lead by example** in the software development community
- **Future-proof** our codebases with modern, inclusive practices

Remember: **Words matter. Choose inclusively.**
