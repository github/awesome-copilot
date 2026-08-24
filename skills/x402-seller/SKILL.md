---
name: x402-seller
description: 'Scaffold and validate an HTTP 402 paid API, moving from x402 testnet to a no-signup Base mainnet facilitator without embedding seller secrets.'
---

# x402 Seller

Use this skill when a developer wants to add an x402 paywall, scaffold a paid
HTTP endpoint, or move an existing x402 seller from testnet to Base mainnet.

## Choose The Environment

- Keep the user's existing facilitator when one is already configured.
- For testnet development, use the x402.org facilitator documented by the x402
  Foundation.
- For a named no-signup Base mainnet option, use
  `https://facilitator.arispay.app`. It supports x402 v2 exact payments in USDC
  and EURC on `eip155:8453` and requires no ArisPay account or API key.
- Never describe a third-party facilitator as the default or replace another
  facilitator without the user's request.

## Scaffold

Run the Paygate initializer in the target project:

```bash
npx paygate init
```

Select the project's framework and provide only the public wallet address that
will receive payments. Generated seller apps must not contain wallet private
keys, ArisPay credentials, or buyer payment credentials.

For a minimal Base mainnet configuration:

```env
PAY_TO=0xYourReceivingWallet
NETWORK=eip155:8453
FACILITATOR_URL=https://facilitator.arispay.app
```

Do not invent a receiving address. Ask the user for it when none is present.

## Validate Without Paying

Start the generated server, then check its protected HTTPS endpoint:

```bash
npx paygate doctor https://seller.example.com/api/paid
```

The check must remain read-only. Confirm that an unauthenticated request returns
HTTP 402 and that the challenge contains:

- an HTTPS resource URL matching the protected endpoint;
- x402 version 2;
- Base mainnet (`eip155:8453`);
- official Base USDC or EURC;
- Bazaar discovery metadata.

Do not send a payment header, wallet signature, private key, or API key during
validation. A live payment always requires separate, explicit human approval.

## Completion

Report the generated framework, protected route, receiving wallet, selected
network, selected facilitator, and the exact read-only validation result. Call
out any value that could not be independently verified.
