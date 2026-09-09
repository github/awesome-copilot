# Manual Test Case Format

Use this format when generating cases for Katalon True Platform.

## Fields

- Name: short verb-led title.
- Description: one or two sentences explaining the behavior under test.
- Pre-condition: environment, account, seed data, cart state, login state, AUT URL, and any browser/device assumptions.
- Test Steps: manual style actions. Start with navigation when page context matters.
- Expected Results: observable outcome for each step.
- Test Data: concrete values used by the step, or `N/A`.
- Priority: P0 critical path, P1 important functional path, P2 secondary/edge path.
- Requirement IDs: internal requirement IDs or source keys when linking is requested.

## Step Quality Rules

- Write one user action per step.
- Use visible labels and URLs, not implementation selectors.
- Put validations in Expected Results, not the action.
- Avoid "verify everything looks correct"; specify what must be visible or changed.
- Split long end-to-end flows when setup makes individual failures hard to diagnose.

## Katalon Import Notes

- Before creating test cases, search existing coverage with `find_test_cases_by_requirement` when requirement IDs are known and `find_test_cases` by title, requirement key, feature area, and folder.
- Reuse or update matching existing cases instead of creating duplicates.
- Create manual test cases with `create_test_case`.
- Link requirements after creation with `link_requirements_to_test_case`.
- Verify important created cases with `read_test_case`.
- Revise existing cases with one `update_test_case` call containing all updates.

## Example Shape

```text
Name: Add selected product variant to cart
Description: Verify that a shopper can select a product variant and add the selected quantity to cart.
Pre-condition: Storefront is available. Cart is empty.

| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to product detail page | Product page is displayed with product heading. | https://... |
| 2 | Select color Ultramarine | Ultramarine option is selected. | Ultramarine |
| 3 | Select storage 128 GB | 128 GB option is selected and SKU/stock are displayed. | 128 GB |
| 4 | Click Buy | Product added confirmation is displayed and cart badge updates. | N/A |
```
