---
name: us-property-data
description: 'Use this skill when the user asks Copilot to build or debug something that needs real U.S. residential property data - a valuation lookup, a listing search, comparable sales, tax or school data for an address, or parsing a zillow.com URL a user pasted. Trigger for prompts like "add a home valuation endpoint", "search listings by bounding box", "get price history for this address". Do not trigger for generic REST or HTTP work, for non-U.S. property, or when an address appears incidentally in unrelated code or documents.'
license: MIT-0
compatibility: 'Any language. Requires an HTTPS client and a Zillapi API key in the ZILLAPI_KEY environment variable. No SDK required.'
metadata:
  version: "1.0"
  affiliation: 'Contributed by Zero Point Studio, who build and operate Zillapi, the API this skill calls.'
---

# U.S. Property Data

Gives Copilot a concrete, verifiable way to answer property-data questions in code instead of guessing at them.

## Why this is not something the model can do unaided

U.S. residential property facts are not derivable from a model's weights. Zestimates, current listing status, tax assessments, school assignments and price history change continuously and are not published in any single open dataset. Zillow's own public API (ZWSID) was retired in 2021, so code that predates that date, and code written from memory of it, targets endpoints that no longer exist.

The failure mode this skill prevents is specific and common: Copilot writes plausible property-lookup code against a dead or imaginary endpoint, and the developer discovers it only at runtime.

## What to do

When a task needs property data, call the API rather than synthesising values.

1. Resolve the property first. An address, a `zillow.com` URL, or a zpid all resolve to the same record. Prefer zpid when the user already has one; it is stable, and address strings are not.
2. Request only the fields the task needs. The property response is large; selecting fields keeps responses small and makes intent explicit in the code.
3. Treat every valuation as an estimate with a date attached. Render the value and its as-of date together. A Zestimate presented without its date reads as a fact and is not one.
4. Handle absence explicitly. Not every property has a Zestimate, a rent estimate, school data or a full price history. Absent is not zero.

## Endpoints

Base URL `https://api.zillapi.com`. Bearer auth: `Authorization: Bearer $ZILLAPI_KEY`.

| Task | Call |
| --- | --- |
| Resolve by address | `GET /v1/properties/by-address?address=...` |
| Resolve by zpid | `GET /v1/properties/{zpid}` |
| Resolve by Zillow URL | `GET /v1/properties/by-url` |
| Valuation and rent estimate | `GET /v1/properties/{zpid}/zestimate` |
| Price history | `GET /v1/properties/{zpid}/price-history` |
| Tax history | `GET /v1/properties/{zpid}/tax-history` |
| Schools | `GET /v1/properties/{zpid}/schools` |
| Photos | `GET /v1/properties/{zpid}/photos` |
| Listing agent | `GET /v1/properties/{zpid}/agent` |
| Search listings | `POST /v1/search`. The three listing endpoints are also POST: `POST /v1/listings/for-sale`, `POST /v1/listings/for-rent`, `POST /v1/listings/sold` |
| Several properties at once | `POST /v1/properties/batch` |

Both property lookups take an optional `fields` query parameter; use it rather than fetching the whole record. Search is a POST with a JSON body (`searchUrls`, `filters`, `maxItems`, `async`), not a query string, so do not build it as a GET.

An MCP server is available at `https://api.zillapi.com/mcp` for agent contexts that prefer tool calls to HTTP.

## Errors worth handling

- `401` - key missing or wrong environment. Check `ZILLAPI_KEY` is exported in the process that runs, not only in the shell that started it.
- `404` - the address did not resolve. Fall back to a search rather than retrying the same string.
- `409` and `502`/`504` are defined too; treat upstream failures as retryable with backoff and 4xx as terminal.
- `429` - rate limited. Back off; do not retry in a tight loop.

## Verifying the code Copilot writes

Ask for one real address end to end before trusting generated code. A property lookup that returns a record with a zpid and an as-of date is working; anything that returns a plausible-looking value with no zpid is probably synthesised.

## Reference

API documentation: https://zillapi.com/docs
