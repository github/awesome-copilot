---
description: 'Ruby on Rails coding conventions and guidelines'
applyTo: '**/*.rb'
---

# Ruby on Rails

## General Guidelines

- Follow the RuboCop Style Guide and use tools like `rubocop`, `standardrb`, or `rufo` for consistent formatting.
- Use snake_case for variables/methods and CamelCase for classes/modules.
- Keep methods short and focused; use early returns, guard clauses, and private methods to reduce complexity.
- Favor meaningful names over short or generic ones.
- Comment only when necessary — avoid explaining the obvious.
- Apply the Single Responsibility Principle to classes, methods, and modules.
- Prefer composition over inheritance; extract reusable logic into modules or services.
- Keep controllers thin — move business logic into models, services, or command/query objects.
- Apply the “fat model, skinny controller” pattern thoughtfully and with clean abstractions.
- Extract business logic into service objects for reusability and testability.
- Use partials or view components to reduce duplication and simplify views.
- Use `unless` for negative conditions, but avoid it with `else` for clarity.
- Avoid deeply nested conditionals — favor guard clauses and method extractions.
- Use safe navigation (`&.`) instead of multiple `nil` checks.
- Prefer `.present?`, `.blank?`, and `.any?` over manual nil/empty checks.
- Follow RESTful conventions in routing and controller actions.
- Use Rails generators to scaffold resources consistently.
- Use strong parameters to whitelist attributes securely.
- Prefer enums and typed attributes for better model clarity and validations.
- Keep migrations database-agnostic; avoid raw SQL when possible.
- Always add indexes for foreign keys and frequently queried columns.
- Define `null: false` and `unique: true` at the DB level, not just in models.
- Use `find_each` for iterating over large datasets to reduce memory usage.
- Scope queries in models or use query objects for clarity and reuse.
- Use `before_action` callbacks sparingly — avoid business logic in them.
- Use `Rails.cache` to store expensive computations or frequently accessed data.
- Construct file paths with `Rails.root.join(...)` instead of hardcoding.
- Use `class_name` and `foreign_key` in associations for explicit relationships.
- Keep secrets and config out of the codebase using `Rails.application.credentials` or ENV variables.
- Write isolated unit tests for models, services, and helpers.
- Cover end-to-end logic with request/system tests.
- Use background jobs (ActiveJob) for non-blocking operations like sending emails or calling APIs.
- Use `FactoryBot` (RSpec) or fixtures (Minitest) to set up test data cleanly.
- Avoid using `puts` — debug with `byebug`, `pry`, or logger utilities.
- Document complex code paths and methods with YARD or RDoc.

## App Directory Structure

- Define service objects in the `app/services` directory to encapsulate business logic.
- Use form objects located in `app/forms` to manage validation and submission logic.
- Implement JSON serializers in the `app/serializers` directory to format API responses.
- Define authorization policies in `app/policies` to control user access to resources.
- Structure the GraphQL API by organizing schemas, queries, and mutations inside `app/graphql`.
- Create custom validators in `app/validators` to enforce specialized validation logic.
- Isolate and encapsulate complex ActiveRecord queries in `app/queries` for better reuse and testability.
- Define custom data types and coercion logic in the `app/types` directory to extend or override ActiveModel type behavior.

## Commands

- Use `rails generate` to create new models, controllers, and migrations.
- Use `rails db:migrate` to apply database migrations.
- Use `rails db:seed` to populate the database with initial data.
- Use `rails db:rollback` to revert the last migration.
- Use `rails console` to interact with the Rails application in a REPL environment.
- Use `rails server` to start the development server.
- Use `rails test` to run the test suite.
- Use `rails routes` to list all defined routes in the application.
- Use `rails assets:precompile` to compile assets for production.


## API Development Best Practices

- Structure routes using Rails' `resources` to follow RESTful conventions.
- Use namespaced routes (e.g., `/api/v1/`) for versioning and forward compatibility.
- Serialize responses using `ActiveModel::Serializer` or `fast_jsonapi` for consistent output.
- Return proper HTTP status codes for each response (e.g., 200 OK, 201 Created, 422 Unprocessable Entity).
- Use `before_action` filters to load and authorize resources, not business logic.
- Leverage pagination (e.g., `kaminari` or `pagy`) for endpoints returning large datasets.
- Rate limit and throttle sensitive endpoints using middleware or gems like `rack-attack`.
- Return errors in a structured JSON format including error codes, messages, and details.
- Sanitize and whitelist input parameters using strong parameters.
- Use custom serializers or presenters to decouple internal logic from response formatting.
- Avoid N+1 queries by using `includes` when eager loading related data.
- Implement background jobs for non-blocking tasks like sending emails or syncing with external APIs.
- Log request/response metadata for debugging, observability, and auditing.
- Document endpoints using OpenAPI (Swagger), `rswag`, or `apipie-rails`.
- Use CORS headers (`rack-cors`) to allow cross-origin access to your API when needed.
- Ensure sensitive data is never exposed in API responses or error messages.

## Frontend Development Best Practices

- Use `app/javascript` as the main directory for managing JavaScript packs, modules, and frontend logic in Rails 6+ with Webpacker or esbuild.
- Structure your JavaScript by components or domains, not by file types, to keep things modular.
- Leverage Hotwire (Turbo + Stimulus) for real-time updates and minimal JavaScript in Rails-native apps.
- Use Stimulus controllers for binding behavior to HTML and managing UI logic declaratively.
- Organize styles using SCSS modules, Tailwind, or BEM conventions under `app/assets/stylesheets`.
- Keep view logic clean by extracting repetitive markup into partials or components.
- Use semantic HTML tags and follow accessibility (a11y) best practices across all views.
- Avoid inline JavaScript and styles; instead, move logic to separate `.js` or `.scss` files for clarity and reusability.
- Optimize assets (images, fonts, icons) using the asset pipeline or bundlers for caching and compression.
- Use `data-*` attributes to bridge frontend interactivity with Rails-generated HTML and Stimulus.
- Test frontend functionality using system tests (Capybara) or integration tests with tools like Cypress or Playwright.
- Use environment-specific asset loading to prevent unnecessary scripts or styles in production.
- Follow a design system or component library to keep UI consistent and scalable.
- Optimize time-to-first-paint (TTFP) and asset loading using lazy loading, Turbo Frames, and deferring JS.

## Testing Guidelines

- Write unit tests for models using `test/models` (Minitest) or `spec/models` (RSpec) to validate business logic.
- Use fixtures (Minitest) or factories with `FactoryBot` (RSpec) to manage test data cleanly and consistently.
- Organize controller specs under `test/controllers` or `spec/requests` to test RESTful API behavior.
- Prefer `before` blocks in RSpec or `setup` in Minitest to initialize common test data.
- Avoid hitting external APIs in tests — use `WebMock`, `VCR`, or `stub_request` to isolate test environments.
- Use `system tests` in Minitest or `feature specs` with Capybara in RSpec to simulate full user flows.
- Isolate slow and expensive tests (e.g., external services, file uploads) into separate test types or tags.
- Run test coverage tools like `SimpleCov` to ensure adequate code coverage.
- Avoid `sleep` in tests; use `perform_enqueued_jobs` (Minitest) or `ActiveJob::TestHelper` with RSpec.
- Use database cleaning tools (`rails test:prepare`, `DatabaseCleaner`, or `transactional_fixtures`) to maintain clean state between tests.
- Test background jobs by enqueuing and performing jobs using `ActiveJob::TestHelper` or `have_enqueued_job` matchers.
- Ensure tests run consistently across environments using CI tools (e.g., GitHub Actions, CircleCI).
- Use custom matchers (RSpec) or custom assertions (Minitest) for reusable and expressive test logic.
- Tag tests by type (e.g., `:model`, `:request`, `:feature`) for faster and targeted test runs.
- Avoid brittle tests — don’t rely on specific timestamps, randomized data, or order unless explicitly necessary.
- Write integration tests for end-to-end flows across multiple layers (model, view, controller).
- Keep tests fast, reliable, and as DRY as production code.
