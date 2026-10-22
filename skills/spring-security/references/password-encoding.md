# Password encoding

Expose a `PasswordEncoder` bean: `PasswordEncoderFactories.createDelegatingPasswordEncoder()` (stores `{id}hash`, defaults to bcrypt, verifies older formats; `upgradeEncoding`/`UserDetailsPasswordService` migrate hashes over time).

- bcrypt truncates input at 72 bytes; consider Argon2 (needs Bouncy Castle `bcprov`) for long passphrases. Pick a cost of roughly 100-500 ms on production hardware.
- `User.withDefaultPasswordEncoder()` and `InMemoryUserDetailsManager` are for demos and tests only; back `UserDetailsService` with a database.
- Rate-limit login endpoints and use generic error messages to avoid user enumeration.
