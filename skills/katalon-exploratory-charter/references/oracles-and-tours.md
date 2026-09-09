# Oracles and Tours

An oracle is how you decide something is wrong. A tour is how you decide where to look. The charter needs both: oracles make findings defensible, tours make the timebox productive.

## The oracle taxonomy

Seven kinds. Name which one you are using in the charter, because that is what a finding gets judged against later.

| Oracle | The question it asks | Katalon-flavoured example |
|---|---|---|
| **Consistency within the product** | Do two parts of the product disagree? | The logged-in checkout keeps the cart after a decline; the guest checkout empties it. |
| **Consistency with history** | Did this behave differently before? | Order search returned partial matches last release and now requires an exact ID. |
| **Consistency with a comparable product** | Does a peer product set the expectation? | Every storefront in the market keeps the cart on a payment failure. |
| **Consistency with claims** | Does a written statement say otherwise? | `read_requirement` on CEL-6 line 3 states the cart survives an unsuccessful payment. |
| **Consistency with user expectations** | Would a reasonable user be surprised? | A 41 second spinner with no progress indicator on the payment step. |
| **Consistency with purpose** | Does it defeat what the feature is for? | No order record exists but the provider dashboard shows a charge. |
| **Consistency with standards or statutes** | Is there a rule outside the product? | The payment provider's published test-card behavior, or a WCAG contrast minimum. |

The strongest findings break **two or more** at once. BUG-1 in the skill's worked example breaks claims (CEL-6 line 3), within-product consistency (the logged-in flow), and purpose (cart state lost) together, which is why it is a P0 and not an argument.

## Naming an oracle so it is checkable

The test: **could a second person verify the oracle without you in the room?**

| Not an oracle | An oracle |
|---|---|
| It feels wrong. | The logged-in flow keeps the cart after a decline and the guest flow does not. |
| This is bad UX. | The error shows the raw provider string `card_declined` rather than a user message, against CEL-6 line 4. |
| It seems slow. | The payment step takes 41 seconds with no progress indicator, against the 5 second budget in the requirement. |
| Users will hate this. | Every competitor keeps the cart on failure, and support ticket CS-882 says ours does not. |

Point at one of four things, always:

1. **An acceptance line** you can quote, from `read_requirement`.
2. **A covered flow** you can name, from `find_test_cases`.
3. **A published behavior** you can link, such as provider docs or a standard.
4. **A stated purpose** the feature would defeat.

If you cannot point at any of the four, you have a `Q`, not a `BUG`. Log it and ask.

## Tours

A tour is a lens that constrains where you look. Pick two or three, never all of them.

| Tour | Walk it by | It pays when |
|---|---|---|
| **Feature tour** | Visiting every capability once, shallowly | The feature is new and nobody has mapped it |
| **Money tour** | Following the paths that take or move money | Checkout, billing, subscriptions, refunds |
| **Landmark tour** | Hopping between the key screens in varied orders | Navigation and state are suspect |
| **Data tour** | Feeding empty, huge, unicode, and malformed values | Forms, imports, search |
| **Configuration tour** | Changing settings, then re-walking a flow | Feature flags, roles, tenant settings |
| **Error-message tour** | Deliberately provoking every failure path | Validation and error handling are the risk |
| **Back-button tour** | Browser back, forward, refresh, and deep links at every step | Multi-step flows and wizards |
| **Interruption tour** | Killing the network, the tab, or the session mid-flow | Long transactions, payments, uploads |
| **Anti-social tour** | Doing the least reasonable legal thing at each step | The happy path is already covered |

## Choosing tours from the mission

| Mission shape | Tours that pay |
|---|---|
| A new feature nobody has tested | Feature tour, then data tour |
| A rewrite of something that worked | Consistency-driven landmark tour, then back-button tour |
| A cluster of related bugs | Error-message tour, then interruption tour |
| A pre-release sweep with an hour | Money tour, then feature tour |
| A payment or checkout surface | Error-message tour, then money tour, then interruption tour |
| A form-heavy or search surface | Data tour, then anti-social tour |
| A permissions or multi-tenant change | Configuration tour, then landmark tour |

Two or three. A charter naming six tours has not chosen; it has listed.

## The boundary, restated

- **The Katalon MCP cannot see the application.** Drive the product with Browser or Playwright. The MCP reads requirements and writes cases, folders, and suites, and that is all it does here.
- **Evidence capture is on the tester.** There is no attachment upload tool, so screenshots, recordings, and HAR files belong in the ALM ticket, not in the platform. Reference them from the finding by ticket ID.
- **There is no exploratory session object**, so the charter and the session sheet are local artifacts unless you deliberately mirror the charter into a test case. Say which you did.
