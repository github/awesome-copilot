---
description: 'Rust programming language coding conventions, guidelines, and best practices'
applyTo: '**/*.rs'
---

# Rust Coding Guidelines and Best Practices

Follow idiomatic Rust practices and community standards when writing Rust code.

## General Principles

- Write clear, idiomatic, and efficient Rust code.
- Prefer safe Rust; isolate and document any `unsafe` blocks.
- Use the type system to make invalid states unrepresentable.
- Favor iterators and combinators over manual index-based loops.

## Naming Conventions

- Use `snake_case` for functions, variables, and modules.
- Use `PascalCase` for types, traits, and enum variants.
- Use `SCREAMING_SNAKE_CASE` for constants and statics.

## Error Handling

- Return `Result<T, E>` for fallible operations; avoid `unwrap()`/`expect()` outside tests.
- Use the `?` operator to propagate errors.
- Prefer `thiserror` for library errors and `anyhow` for application errors.

## Tooling

- Format with `rustfmt` and lint with `clippy` before committing.
- Keep `Cargo.toml` dependencies minimal and pinned where appropriate.
