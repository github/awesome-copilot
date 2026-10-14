# Password encoding

Expose a `PasswordEncoder` bean; never store or compare plain text, MD5, or SHA-1 hashes.

```java
@Bean
PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder(); // {bcrypt}... prefix
}
```

- `DelegatingPasswordEncoder` stores `{id}hash`, defaults to bcrypt, and verifies older formats so you can upgrade hashes over time (`upgradeEncoding`, `UserDetailsPasswordService`).
- Direct choices: `new BCryptPasswordEncoder(12)`, `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()` (needs Bouncy Castle `bcprov`), `SCryptPasswordEncoder`, `Pbkdf2PasswordEncoder`. Pick a cost that takes roughly 100-500 ms on production hardware.
- bcrypt truncates input at 72 bytes; consider Argon2 for long passphrases.
- Check with `passwordEncoder.matches(raw, stored)`; never compare hashes with `equals`.
- Users: back `UserDetailsService` with a database (`JdbcUserDetailsManager` or a custom service). `User.withDefaultPasswordEncoder()` and `InMemoryUserDetailsManager` are for demos and tests only.
- Do not log passwords, hashes, or authentication objects containing credentials. Do not put real credentials in `application.properties` or `.env` files in the repository.
- Add rate limiting/lockout for login endpoints and generic error messages to avoid user enumeration.
