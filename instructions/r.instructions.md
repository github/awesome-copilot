---
description: 'R language and document formats (R, Rmd, Quarto): coding standards and Copilot guidance for idiomatic, safe, and consistent code generation.'
applyTo: '**/*.R, **/*.r, **/*.Rmd, **/*.rmd, **/*.qmd'
---

# R Programming Language Instructions

## Purpose

Help GitHub Copilot generate idiomatic, safe, and maintainable R code across projects.

## Core Conventions

- **Match the project’s style.** If the file shows a preference (tidyverse vs. base R, `%>%` vs. `|>`), follow it.
- **Prefer clear, vectorized code.** Keep functions small and avoid hidden side effects.
- **Qualify non-base functions in examples/snippets**, e.g., `dplyr::mutate()`, `stringr::str_detect()`. In project code, using `library()` is acceptable when that’s the repo norm.
- **Naming:** `lower_snake_case` for objects/files; avoid dots in names.
- **Side effects:** Never call `setwd()`; prefer project-relative paths (e.g., `here::here()`).
- **Reproducibility:** Set seeds locally around stochastic operations using `withr::with_seed()`.
- **Validation:** Validate and constrain user inputs; use typed checks and allowlists where possible.
- **Safety:** Avoid `eval(parse())`, unvalidated shell calls, and unparameterized SQL.

### Pipe Operators

- **Native pipe `|>` (R ≥ 4.1.0):** Prefer in R ≥ 4.1 (no extra dependency).
- **Magrittr pipe `%>%`:** Continue using in projects already committed to magrittr or when you need features like `.`, `%T>%`, or `%$%`.
- **Be consistent:** Don't mix `|>` and `%>%` within the same script unless there's a clear technical reason.

## Performance Considerations

- **Large datasets:** consider `data.table`; benchmark with your workload.
- **dplyr compatibility:** Use `dtplyr` to write dplyr syntax that translates to data.table operations automatically for performance gains.
- **Profiling:** Use `profvis::profvis()` to identify performance bottlenecks in your code. Profile before optimizing.
- **Caching:** Use `memoise::memoise()` to cache expensive function results. Particularly useful for repeated API calls or complex computations.
- **Vectorization:** Prefer vectorized operations over loops. Use `purrr::map_*()` family or `apply()` family for remaining iteration needs.

## Tooling & Quality

- **Formatting:** `styler` (tidyverse style), two-space indents, ~100-char lines.
- **Linting:** `lintr` configured via `.lintr`.
- **Pre-commit:** consider `precommit` hooks to lint/format automatically.
- **Docs:** roxygen2 for exported functions (`@param`, `@return`, `@examples`).
- **Tests:** prefer small, pure, composable functions that are easy to unit test.
- **Dependencies:** manage with `renv`; snapshot after adding packages.
- **Paths:** prefer `fs` and `here` for portability.

## Data Wrangling & I/O

- **Data frames:** prefer tibbles in tidyverse-heavy files; otherwise base `data.frame()` is fine.
- **Iteration:** use `purrr` in tidyverse code. In base-style code, prefer type-stable, vectorized patterns such as `vapply()`
   (for atomic outputs) or `Map()` (for elementwise operations) instead of explicit `for` loops when they improve clarity or performance.
- **Strings & Dates:** use `stringr`/`lubridate` where already present; otherwise use clear base helpers (e.g., `nchar()`, `substr()`, `as.Date()` with explicit format).
- **I/O:** prefer explicit, typed readers (e.g., `readr::read_csv()`); make parsing assumptions explicit.

## Plotting

- Prefer `ggplot2` for publication-quality plots. Keep layers readable and label axes and units.

## Error Handling

- In tidyverse contexts, use `rlang::abort()` / `rlang::warn()` for structured conditions; in base-only code, use `stop()` / `warning()`.
- For recoverable operations:
- Use `purrr::possibly()` when you want a typed fallback value of the same type (simpler).
- Use `purrr::safely()` when you need to capture both results and errors for later inspection or logging.
- Use `tryCatch()` in base R for fine-grained control or compatibility with non-tidyverse code.
- Prefer consistent return structures—typed outputs for normal flows, structured lists only when error details are required.

## Security Best Practices

- **Command execution:** Prefer `processx::run()` or `sys::exec_wait()` over `system()`; validate and sanitize all arguments.
- **Database queries:** Use parameterized `DBI` queries to prevent SQL injection.
- **File paths:** Normalize and sanitize user-provided paths (e.g., `fs::path_sanitize()`), and validate against allowlists.
- **Credentials:** Never hardcode secrets. Use env vars (`Sys.getenv()`), config outside VCS, or `keyring`.

## Shiny

- Modularize UI and server logic for non-trivial apps. Use `eventReactive()` / `observeEvent()` for explicit dependencies.
- Validate inputs with `req()` and clear, user-friendly messages.
- Use connection pooling (`pool`) for databases; avoid long-lived global objects.
- Isolate expensive computations and prefer `reactiveVal()` / `reactiveValues()` for small state.

## R Markdown / Quarto

- Keep chunks focused; prefer explicit chunk options (`echo`, `message`, `warning`).
- Avoid global state; prefer local helpers. Use `withr::with_seed()` for deterministic chunks.

## Copilot-Specific Guidance

- If the current file uses tidyverse, **suggest tidyverse-first patterns** (e.g., `dplyr::across()` instead of superseded verbs). If base-R style is present, **use base idioms**.
- Qualify non-base calls in suggestions (e.g., `dplyr::mutate()`).
- Suggest vectorized or tidy solutions over loops when idiomatic.
- Prefer small helper functions over long pipelines.
- When multiple approaches are equivalent, prefer readability and type stability and explain the trade-offs.

---

## Minimal Examples

```r
# Base R variant
scores <- data.frame(id = 1:5, x = c(1, 3, 2, 5, 4))
safe_log <- function(x) tryCatch(log(x), error = function(e) NA_real_)
scores$z <- vapply(scores$x, safe_log, numeric(1))

# Tidyverse variant (if this file uses tidyverse)
result <- tibble::tibble(id = 1:5, x = c(1, 3, 2, 5, 4)) |>
dplyr::mutate(z = purrr::map_dbl(x, purrr::possibly(log, otherwise = NA_real_))) |>
dplyr::filter(z > 0)

# Example reusable helper with roxygen2 doc
#' Compute the z-score of a numeric vector
#' @param x A numeric vector
#' @return Numeric vector of z-scores
#' @examples z_score(c(1, 2, 3))
z_score <- function(x) (x - mean(x, na.rm = TRUE)) / stats::sd(x, na.rm = TRUE)
```
