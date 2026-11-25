# Wallet access and `cast`

This skill needs a wallet it can sign with. This page covers the non-secret
parts: address, USDC balance, manual sends, and EIP-712 signing. It never asks
you to print a private key.

## What you need

- An EVM-compatible wallet on **Base** funded with **USDC**
  (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).
- A signer the agent can use without a human typing a key each time:
  - a Foundry encrypted keystore: run `cast wallet import <name> --interactive`
    once, then use `--keystore <path> --password-file <0600 file>` for
    non-interactive use (`--account <name>` is the shorthand when the
    environment can unlock the keystore, for example with Touch ID);
  - a hardware wallet (`--ledger` or `--trezor`);
  - the signer configured in the x402 client (`@x402/fetch` + `viem`, or the
    Python `x402` package).
- `cast` (Foundry) and a free Base RPC.

Create the keystore password file with an editor or password manager, mode
`0600`; do not type the password into a command line or shell history.
`cast wallet import` prompts for the private key without echoing it. Mode `0600`
limits access to the same OS user, so any code running as that user, including an
agent with shell access, can read both files. Give the agent access only to a
keystore intended for this job, and never paste a private key into a command,
log, chat, or commit.

The x402 purchase is an EIP-3009 `TransferWithAuthorization` signature. The
facilitator submits the transfer, so the payer needs USDC but **no ETH** for
that purchase. A manual `cast send` needs ETH for gas.

## Never do this

- `cast ... --private-key "$RAW_KEY"` or `--private-key "$(cat keyfile)"`: the
  key becomes a process argument visible to `ps`, shell history, and telemetry.
- `echo "$PRIVATE_KEY"`, `cat keyfile`, `set -x`, or any command that prints the
  key.
- Put the key in a URL, an exported variable that reaches logs, a commit, a chat,
  or a transcript.
- Use a hot wallet holding more than you are willing to spend.

Use `--account`, `--keystore` plus `--password-file`, `--ledger`, or `--trezor`.
Keep the keystore and password file at mode `0600`.

## Free Base RPCs (low volume)

These are public and rate-limited. Use them for read-only calls and occasional
transactions; do not use them for bulk work. If one is rate-limited, try another.

- `https://mainnet.base.org`
- `https://base-rpc.publicnode.com`
- `https://1rpc.io/base`
- `https://base.drpc.org`

A public RPC operator can associate the queried wallet address with the caller's
source IP and request metadata. That is normal for a shared public endpoint. If
that disclosure is not acceptable for the operator, use a Base RPC endpoint the
operator controls instead; the `cast` commands are unchanged.

## Address and balance

```bash
export BASE_RPC=https://mainnet.base.org
export USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
export KEYSTORE="$HOME/.foundry/keystores/x402socks"
export KEYPASS="$HOME/.config/x402socks/keystore.pass"   # mode 600

cast wallet address --keystore "$KEYSTORE" --password-file "$KEYPASS"
cast call "$USDC" "balanceOf(address)(uint256)" \
  "$(cast wallet address --keystore "$KEYSTORE" --password-file "$KEYPASS")" \
  --rpc-url "$BASE_RPC"
```

The balance is atomic USDC with 6 decimals: `1000000` is $1.00. Check it before
quoting a package.

## Manual USDC send (not the x402 flow)

Use this only if the service tells you to pay by transfer. It needs ETH for gas
and does **not** create a proxy token.

```bash
cast send "$USDC" "transfer(address,uint256)" \
  0xRECIPIENT 1000000 \
  --keystore "$KEYSTORE" --password-file "$KEYPASS" --rpc-url "$BASE_RPC"
```

`1000000` is $1.00. Confirm the recipient and amount with the user first.

## Signing the x402 authorization with `cast`

The x402 `exact` EVM scheme signs EIP-712 typed data for EIP-3009. Build the
typed data from the **live 402 challenge** - do not hardcode the recipient or
amount - write it to a `0600` file, and sign with the keystore:

```json
{
  "types": {
    "EIP712Domain": [
      { "name": "name", "type": "string" },
      { "name": "version", "type": "string" },
      { "name": "chainId", "type": "uint256" },
      { "name": "verifyingContract", "type": "address" }
    ],
    "TransferWithAuthorization": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "validAfter", "type": "uint256" },
      { "name": "validBefore", "type": "uint256" },
      { "name": "nonce", "type": "bytes32" }
    ]
  },
  "primaryType": "TransferWithAuthorization",
  "domain": {
    "name": "USD Coin",
    "version": "2",
    "chainId": 8453,
    "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  "message": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000",
    "validAfter": "0",
    "validBefore": "1799999999",
    "nonce": "0x...32-bytes..."
  }
}
```

```bash
umask 077
# Write the JSON above to typed-data.json (mode 600), then:
cast wallet sign --data --from-file typed-data.json \
  --keystore "$KEYSTORE" --password-file "$KEYPASS"
```

Before signing, confirm the live 402 `accepts[]` has exactly one option and that
its `name`, `version`, `chainId`, `verifyingContract`, `to`, and `value` equal
the approved terms; abort on any difference. Then use those values for the typed
data. `nonce` must be a fresh random 32-byte value; `validBefore` must be in the
future and within `maxTimeoutSeconds`. Then put the signature and authorization
into the x402 v2 payload and retry with `PAYMENT-SIGNATURE` (see `payments.md`).
If your x402 client already does this, prefer the client - it is less error-prone.

## Recovery signature

Recovery uses EIP-191 `personal_sign`, not EIP-712.
`scripts/x402socks.sh recover-message <tx_hash>` prints the exact bytes and the
`issued_at` to reuse; sign them with
`cast wallet sign "<message>" --keystore "$KEYSTORE" --password-file "$KEYPASS"`
and feed the signature to `recover <tx_hash> <issued_at>` on stdin. Never put the
signature in argv; the helper sends the timestamp you pass, so it must be the one
you signed.

## If there is no wallet access

There is no way to buy a package. The service has no free tier and no account
credit. Ask the operator for a funded wallet and a signer before continuing.
