# Partner Center DOM and automation reference

Partner Center is a single-page application built with custom web components.
Treat the details below as observed patterns, not permanent contracts. Inspect
the live DOM before every state-changing action.

## Routes

```text
Store developer home
https://storedeveloper.microsoft.com/

Product overview
https://partner.microsoft.com/en-US/dashboard/products/{productId}/overview

Agreements
https://partner.microsoft.com/en-US/dashboard/account/v3/settings/agreements

Submission sections
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/availability
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/properties
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/ageratings
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/packages
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/managelanguages?producttype=app
https://partner.microsoft.com/en-US/dashboard/products/{productId}/submissions/{submissionId}/options

Additional testing information (product level, not under a submission)
https://partner.microsoft.com/en-US/dashboard/products/{productId}/suppinfo/additionaltestinginfo
```

Discover the current `submissionId` from overview-page anchors rather than
guessing it.

## Product overview

Observed card anchors use accessible labels similar to:

```text
Pricing and availability Status: - Complete
Properties Status: - Complete
Age ratings Status: - Complete
Packages Status: - Complete
Store listings Status: - Complete
Submission Options
```

Use `anchors` to capture their current `href` values.

The final control is normally discoverable as:

```javascript
page.getByRole("button", {
  name: "Submit for certification",
  exact: true
})
```

Always read `disabled` immediately before asking for approval and again after
approval.

Successful submission changes overview text to:

```text
In certification
Certification status
Submission
Pre-processing
Certification
Publishing
```

Each of the four steps is an `he-subway-stop` element. The current step has
the `current` attribute. This lists the steps and marks the current one:

```javascript
[...document.querySelectorAll("he-subway-stop")].map(
  (stop) =>
    stop.innerText.trim() + (stop.hasAttribute("current") ? " (current)" : ""),
);
```

After submission, the section-card labels can change from `Complete` to
`Read only`. The package filename and `Validated` text may no longer appear on
the overview. This is expected while the submitted revision is locked. Do not
interpret the absence of `Validated` as a package regression after the product
is already `In certification`.

An optional feedback dialog can appear immediately after submission. Do not
select a rating or press its **Submit** button without separate approval.

While the product is in certification, the overview also offers **Cancel
certification**. Never click it without approval for that exact action.

## Agreements

Current agreement rows have been observed inside:

```html
<accexp_he-data-grid>
```

The acceptance control has been observed as:

```html
<accexp_he-button
  appearance="link"
  testid="agreement-accept-now-button"
  type="button">
  Accept
</accexp_he-button>
```

Useful locator:

```javascript
page.getByText("Accept", { exact: true })
```

Multiple `Accept` controls can exist, including agreements for different
programs. Inspect the grid order and the row context. Do not click solely by
text when more than one match exists.

After acceptance, the row may update immediately without a confirmation
dialog. Verify:

- `Not Accepted` disappeared for the intended row.
- The agreement version remains visible.
- An acceptance date is shown.

## Age ratings

Once a questionnaire draft exists, the `ageratings` route redirects to
`ageratings/summary`. That page shows the rating preview and an `he-checkbox`
that agrees to the IARC Terms of Use and states that the user is of the age of
majority. Ticking it accepts a binding agreement, so get approval first.

Observed behavior of that checkbox:

- Its real input is in shadow DOM with an empty label. `getByLabel` times out,
  and clicking the inner input did not tick it.
- Its label contains a link to the IARC terms, so clicking the label text can
  open the link instead of ticking the box.
- Clicking the `he-checkbox` host element 8 pixels in from its left edge and
  no more than 12 pixels down from its top, where the box is drawn, ticked it.

Save is an `he-button` that stays disabled until the box is ticked. After a
successful save, the heading changes from `Age ratings preview` to
`Age ratings`, and `Current Rating ID` shows `Pending` until certification.

## Pricing

Until a base price is saved, the Pricing and availability page warns:

```text
No PriceSchedule created for purchasable product. You must configure a price for this product.
```

The base price uses two `he-select` elements:

- `he-select[label="Currency"]` lists markets with their currency, such as
  `USD - United States` (value `US`). Its roughly 240 options load only after
  the list opens.
- `he-select[label="Retail price"]` stays disabled until a currency is chosen.
  It then lists price tiers: `0`, `0.99`, and so on. There is no `Free`
  option. Tier `0` makes the product free.

Each `he-select` keeps an `input[role="combobox"]` in shadow DOM, so the
controller's `comboboxes` command lists them. Their indexes depend on the
page, so list them again right before using an index. To pick an option,
search only inside the intended `he-select`, for example:

```javascript
page
  .locator('he-select[label="Retail price"]')
  .getByRole("option", { name: "0", exact: true });
```

Save is `input[type="submit"][value="Save draft"]`. A successful save
redirects to the product overview. Reopen the page to verify the price and
markets. Changing pricing needs approval for that exact change.

## Saving sections

- Properties, Packages, and Submission options: `click-role button Save`
  saves and redirects to the product overview.
- Pricing and availability: **Save draft**, as described above.
- Additional testing information: the certification notes field is
  `textarea#certificationNotesDescription` (6000-character limit). Its save
  control is a link, `<a aria-label="Save description">`, so
  `click-role button Save` does not find it. Use
  `click-text-ancestor "Save description"`.

After every save, reopen the section and verify that the values persisted.

## Inputs and web components

Partner Center uses standard inputs mixed with custom elements such as:

```text
he-button
he-checkbox
he-select
he-subway-stop
accexp_he-button
accexp_he-data-grid
```

Playwright role, label, and exact-text locators generally work across these
components. When they do not, inspect:

- `tagName`
- `role`
- `aria-label`
- `aria-labelledby`
- `href`
- `disabled`
- `testid`
- ancestor text
- `outerHTML`

Avoid brittle generated CSS class names.

Observed input quirks:

- `he-checkbox` keeps its real input in shadow DOM with an empty label, so
  `getByLabel` and the controller's `check-label` and `uncheck-label` time
  out. `click-text` with the exact label text toggles most of them. The
  age-ratings terms box is an exception, described under Age ratings.
- A `span` inside radio labels intercepts pointer events, so Playwright's
  `check()` can fail. Clicking the label works.
- Exact-text matching must include curly apostrophes (U+2019) where Partner
  Center uses them.

## File uploads

Package and screenshot uploads use hidden:

```css
input[type="file"]
```

Observed screenshot behavior:

1. Uploading a screenshot creates another hidden file input.
2. Reusing input index `0` may replace the first screenshot.
3. Upload each additional screenshot through the next file-input index.
4. After every upload, wait for processing and count inputs again.
5. Verify every intended screenshot is visible before saving.

Use genuine app screenshots. Resize them outside Partner Center when required.

## Loading and stale state

Partner Center can temporarily show:

- Section labels without `Complete`.
- Package cards without the package filename.
- A disabled submission button after agreement acceptance.
- Only navigation chrome after reload.

Do not edit immediately. Wait, reload, and reread the page. A successful
pattern is:

1. Navigate directly to the product overview.
2. Wait 8 to 15 seconds.
3. Read body text.
4. Reload once if section state is missing.
5. Wait again and verify.

## Authentication redirects

Partner Center can redirect an authenticated product page to Microsoft's
account picker when a session expires. Before reading product or agreement
state, verify the current URL still belongs to `partner.microsoft.com`.

If the user previously specified the exact account to use, select only that
account. Never enter or retrieve credentials. Stop for user action if Microsoft
requests a password, passkey, MFA, CAPTCHA, or operating-system
authentication. After sign-in, navigate directly back to the intended product
or agreement URL and reread the page.

## Multiple tabs

Multiple Partner Center tabs can cause automation to target the wrong page.
The supplied controller:

- Lists all pages with `pages`.
- Prefers the most recently opened Partner Center page.
- Accepts `PARTNER_CENTER_PAGE_INDEX` to select an exact page.

Check `status` before every state-changing command.

## Safe inspection commands

```powershell
node .\partner-center-control.mjs status
node .\partner-center-control.mjs pages
node .\partner-center-control.mjs text
node .\partner-center-control.mjs anchors
node .\partner-center-control.mjs inputs
node .\partner-center-control.mjs radios
node .\partner-center-control.mjs comboboxes
node .\partner-center-control.mjs find-text "Accept"
node .\partner-center-control.mjs match-context "Accept"
node .\partner-center-control.mjs button-state "Submit for certification"
```

`combo-options <index>` is listed as read-only in the controller's help, but it
clicks the combobox to open its list. It does not choose an option or save,
but it does change the page. Run `comboboxes` first to confirm the index, and
run `reload` afterward if the open list gets in the way.

## State-changing commands

The controller rejects these unless
`PARTNER_CENTER_ALLOW_WRITE=1`:

- `click-role`
- `click-text`
- `click-text-index`
- `click-text-ancestor`
- `fill-label`
- `fill-selector`
- `check-label`
- `uncheck-label`
- `check-name` (types a product name and clicks **Check availability**)
- `select-combo`
- `add-combo-token`
- `upload-file`
- `upload-file-index`

The environment variable is a technical guard, not user approval. Obtain
approval first when required, set it for the single action, perform the action,
then clear it.
