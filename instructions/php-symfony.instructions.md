---
description: "Symfony development standards aligned with official Symfony Best Practices"
applyTo: "**/*.php, **/*.yaml, **/*.yml, **/*.xml, **/*.twig"
---

# Symfony Development Instructions

Instructions for developing Symfony applications following the official Symfony Best Practices and core framework philosophy.

## Project Context
- Symfony (latest stable or LTS)
- Default Symfony directory structure
- Autowiring and autoconfiguration enabled
- Doctrine ORM when persistence is needed
- Twig for templating
- Symfony Forms, Validator, Security, Messenger as needed
- PHPUnit for testing
- Attribute-based configuration where supported

## Project Structure
- Use the default Symfony directory structure
- Do not create bundles for application code
- Organize application code using PHP namespaces
- Keep configuration in `config/`, application code in `src/`, templates in `templates/`

## Configuration

### Environment Configuration
- Use environment variables for infrastructure-related configuration
- Use `.env` files to define environment-specific values
- Do not use environment variables to control application behavior

### Sensitive Configuration
- Store secrets (API keys, credentials) using Symfony Secrets
- Never commit secrets to the repository

### Application Configuration
- Use parameters in `config/services.yaml` for application behavior configuration
- Override parameters per environment only when needed
- Prefix parameters with `app.` to avoid collisions
- Use short, descriptive parameter names
- Use PHP constants for configuration values that rarely change

## Services & Dependency Injection
- Use dependency injection exclusively
- Prefer constructor injection
- Use autowiring and autoconfiguration by default
- Keep services private whenever possible
- Avoid accessing services via `$container->get()`
- Use YAML as the preferred format for service configuration
- Use interfaces where it improves decoupling or clarity

## Controllers
- Extend `AbstractController`
- Keep controllers thin and focused on glue code
- Do not place business logic in controllers
- Use attributes to configure routing, caching, and security
- Use dependency injection for services
- Use Entity Value Resolvers when convenient and appropriate
- Perform complex queries explicitly via repositories when needed

## Doctrine & Persistence
- Use Doctrine entities as plain PHP objects
- Define Doctrine mapping using PHP attributes
- Use repositories for querying data
- Avoid putting business logic in repositories
- Use migrations for all schema changes

## Templates (Twig)
- Use snake_case for template names, directories, and variables
- Prefix template fragments with an underscore
- Keep templates focused on presentation
- Avoid business logic in Twig templates
- Escape output by default
- Avoid using `|raw` unless content is trusted and sanitized

## Forms
- Define forms as PHP classes
- Do not build forms directly in controllers
- Add form buttons in templates, not in form classes
- Define validation constraints on the underlying object
- Use a single controller action to render and process each form
- Define submit buttons in controllers only when multiple submits are required

## Validation
- Use Symfony Validator constraints
- Validate data at application boundaries
- Prefer object-level validation over form-only validation when reuse is needed

## Internationalization
- Use XLIFF for translation files
- Use translation keys instead of literal content strings
- Use descriptive keys that express purpose, not location

## Security
- Prefer a single firewall unless multiple systems are required
- Use the auto password hasher
- Use voters for complex authorization logic
- Avoid complex security expressions in attributes

## Web Assets
- Use AssetMapper to manage web assets
- Avoid unnecessary frontend build complexity unless required

## Asynchronous Processing
- Use Symfony Messenger for async and background tasks
- Keep message handlers small and focused
- Configure failure transports for failed messages

## Testing
- Write functional tests using `WebTestCase`
- Add smoke tests to ensure all public URLs respond successfully
- Hard-code URLs in functional tests instead of generating routes
- Use unit tests where appropriate for isolated logic
- Add more specific tests incrementally as the application evolves

## General Guidelines
- Prefer clarity over abstraction
- Follow Symfony conventions before introducing custom patterns
- Keep configuration explicit and readable
- Avoid premature optimization
- Use Symfony Demo as a reference implementation
