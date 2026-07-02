# dependency-mapping-ts

## purpose

Cross-language dependency mapping — finding npm/TypeScript equivalents for Ruby gems, Java Maven artifacts, and Python pip packages commonly found in Slack bot projects.

## rules

1. Always check if an `@types/{package}` exists on DefinitelyTyped before declaring a package as untyped. Run `npm info @types/{package}` or search https://www.npmjs.com/~types.
2. Prefer packages with built-in TypeScript types over untyped packages + `@types` shims. A package exporting its own `.d.ts` is better maintained than relying on community type definitions.
3. When no npm equivalent exists for a gem or Maven artifact, first check if the functionality is built into Node.js (e.g., `crypto`, `http`, `fs`, `url`, `path`, `util`). Many small gems/JARs solve problems that Node.js handles natively.
4. For HTTP clients: Ruby `faraday`/`httparty`/`net/http` and Java `OkHttp`/`HttpClient`/`RestTemplate` all map to `fetch` (built-in since Node 18) or `undici` for advanced use cases. Avoid adding `axios` or `got` unless you need interceptors or retry logic.
5. For web frameworks: Ruby `sinatra` → `express` or `fastify`. Ruby `rails` → `express` + individual packages for ORM, validation, etc. Java `Spring Boot` → `express` or `fastify` + middleware. Do NOT look for a single Rails/Spring equivalent — the Node ecosystem is modular.
6. For testing: Ruby `rspec`/`minitest` → `vitest` or `jest`. Java `JUnit`/`TestNG` → `vitest` or `jest`. Java `Mockito` → `vitest` built-in mocking or `jest.fn()`.
7. For environment/config: Ruby `dotenv` → `dotenv`. Java `System.getenv()` → `process.env`. Java Spring `@Value` / `application.properties` → `dotenv` + typed config module.
8. For JSON handling: Ruby `json` (stdlib) and Java `Jackson`/`Gson` → built-in `JSON.parse()`/`JSON.stringify()`. For schema validation, use `zod` or `ajv`.
9. For database access: Ruby `activerecord`/`sequel` → `prisma`, `drizzle`, or `knex`. Java `Hibernate`/`JPA` → `prisma` or `typeorm`. Java `JDBC` → `pg` (Postgres) / `mysql2` / `better-sqlite3` with raw queries.
10. For scheduling/cron: Ruby `clockwork`/`whenever` → `node-cron` or `bullmq`. Java `ScheduledExecutorService`/`Quartz` → `node-cron` or `bullmq`.
11. For logging: Ruby `logger` (stdlib) → `pino` or `winston`. Java `SLF4J`/`Logback`/`Log4j` → `pino` (fast, JSON) or `winston` (flexible transports).
12. When replacing a dependency, verify feature parity. A mapping table entry doesn't mean the npm package covers 100% of the original's API. Identify which features the bot actually uses and confirm the replacement supports them.

## patterns

### Gem → npm mapping table (common Slack bot gems)

| Ruby Gem | npm Package | Notes |
|---|---|---|
| `slack-ruby-bot` | `@slack/bolt` | Different API; rewrite handlers |
| `slack-ruby-client` | `@slack/web-api` | Direct API client equivalent |
| `sinatra` | `express` | Route syntax differs; see ruby-to-ts-ts.md |
| `faraday` / `httparty` | `fetch` (built-in) | No extra dependency needed (Node 18+) |
| `json` (stdlib) | `JSON` (built-in) | Native in both; zero effort |
| `dotenv` | `dotenv` | Nearly identical API |
| `redis` / `redis-rb` | `ioredis` | TS-typed, Promise-based |
| `pg` | `pg` + `@types/pg` | Same name, same purpose |
| `activerecord` | `prisma` or `drizzle` | Full rewrite of data layer |
| `rspec` | `vitest` | Describe/it syntax similar |
| `puma` / `unicorn` | N/A | Node handles HTTP serving natively |
| `rake` | `tsx` scripts or `npm scripts` | Task runner built into npm |
| `erb` | Template literals or `ejs` | For HTML templating only |
| `chronic` / `ice_cube` | `date-fns` or `luxon` | Date parsing/recurrence |
| `nokogiri` | `cheerio` | HTML/XML parsing |

### Maven → npm mapping table (common Slack bot JARs)

| Maven Artifact | npm Package | Notes |
|---|---|---|
| `com.slack.api:bolt` | `@slack/bolt` | Different API; rewrite handlers |
| `com.slack.api:slack-api-client` | `@slack/web-api` | Direct API client equivalent |
| `org.springframework.boot:*` | `express` + middleware | No single equivalent; modular |
| `com.google.code.gson:gson` | `JSON` (built-in) | Native JSON support |
| `com.fasterxml.jackson.core:*` | `JSON` (built-in) + `zod` | Zod for schema validation |
| `org.apache.httpcomponents:httpclient` | `fetch` (built-in) | No extra dependency (Node 18+) |
| `org.slf4j:slf4j-api` | `pino` or `winston` | Structured logging |
| `ch.qos.logback:logback-classic` | `pino` | Fast JSON logger |
| `org.junit.jupiter:*` | `vitest` | Test framework |
| `org.mockito:*` | `vitest` mocking | Built-in mock support |
| `io.github.cdimascio:dotenv-java` | `dotenv` | Same concept |
| `com.zaxxer:HikariCP` | N/A | Node uses single-thread; pool via `pg` |
| `org.postgresql:postgresql` | `pg` + `@types/pg` | PostgreSQL driver |
| `redis.clients:jedis` | `ioredis` | Redis client |
| `com.google.guava:guava` | Various / built-in | Most Guava utils are native in JS |

### Dependency audit workflow

```typescript
// Step 1: Extract all dependencies from the source project
// Ruby: parse Gemfile / Gemfile.lock
// Java: parse pom.xml / build.gradle

// Step 2: Categorize each dependency
type DepCategory =
  | 'builtin'      // Covered by Node.js or TS natively
  | 'direct-map'   // 1:1 npm equivalent exists
  | 'rewrite'      // Functionality exists but API differs significantly
  | 'eliminate'     // Language-specific concern (e.g., thread pools, GC tuning)
  | 'custom';      // No equivalent; must implement from scratch

interface DependencyAudit {
  source: string;           // e.g., "faraday" or "com.google.code.gson:gson"
  category: DepCategory;
  target: string;           // npm package name or "built-in"
  notes: string;            // Migration notes
  typesPackage?: string;    // @types/* if needed
}

// Step 3: Install and verify each mapped dependency
// npm install {package} @types/{package}
// Step 4: Write adapter code for 'rewrite' category deps
```

## pitfalls

- **Don't assume name similarity means API similarity**: Ruby's `redis` gem and npm's `ioredis` serve the same purpose but have completely different APIs. Plan for handler rewrites.
- **Check Node.js built-ins first**: Before adding `uuid`, check if `crypto.randomUUID()` suffices. Before adding `axios`, check if `fetch` works. Before adding `path-to-regexp`, check if your framework already includes routing.
- **Gem/JAR version matters**: A Ruby project on `slack-ruby-bot 0.10` has a very different API from `0.16`. Check the source project's locked version to understand which features are actually used.
- **Transitive dependencies**: Ruby's `Gemfile.lock` and Java's dependency tree include transitive deps. Only map the **direct** dependencies — transitives are handled by the npm package you're switching to.
- **Dev dependencies**: Don't forget to map dev-only tools: `rubocop` → `eslint` + `prettier`, `bundler` → `npm`, `mvn` → `npm scripts`, `pry` → Node debugger.
- **Web server is implicit**: Ruby needs `puma`/`unicorn`/`thin` as a web server. Java needs `tomcat`/`jetty` (embedded in Spring). Node.js `http` module IS the web server — no additional package needed (Express wraps it).

## references

- https://www.npmjs.com/ -- npm package registry (search for equivalents)
- https://www.npmjs.com/~types -- DefinitelyTyped @types packages
- https://rubygems.org/ -- Ruby gem registry (for understanding source deps)
- https://search.maven.org/ -- Maven Central (for understanding source deps)
- https://nodejs.org/api/ -- Node.js built-in modules

## instructions

Use this expert when auditing and replacing dependencies during a language conversion. Start by extracting all dependencies from the source project (Gemfile, pom.xml, build.gradle, or package.json), then categorize each using the audit workflow pattern. Consult the mapping tables for common equivalents. Pair with the appropriate language conversion expert (`js-to-ts-ts.md`, `ruby-to-ts-ts.md`, or `java-to-ts-ts.md`) for API-level migration guidance.

## research

Deep Research prompt:

"Write a micro expert for mapping dependencies across languages to TypeScript/npm. Cover: Ruby gems to npm packages, Java Maven artifacts to npm packages, identifying Node.js built-in replacements, @types packages from DefinitelyTyped, dependency audit workflow, and common Slack bot dependency mappings. Include mapping tables for the 15 most common gems and 15 most common Maven artifacts found in chat bot projects."
