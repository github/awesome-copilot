---
name: 42crunch-code-to-oas
description: 'Analyze an entire API codebase and generate an accurate OpenAPI Specification
  (OAS 3.0) file from the source code. Use this skill whenever the user wants
  to generate, create, or derive an OpenAPI spec from code, reverse-engineer an
  API definition, or document an existing API. Triggers on phrases like "generate
  OAS from code", "create OpenAPI spec", "document my API", "reverse-engineer
  spec", "write openapi.json from my codebase", or any request to produce an
  OAS file by reading source files rather than an existing spec.'
---

# API source code to OpenAPI Specification

Analyzes an API codebase — regardless of language or framework — and produces
a complete, valid **OpenAPI 3.0.x** specification file (`openapi.json`) from
the source code. No existing OAS file is required.

---

## Entry Point

1. **Identify the root directory.** Use the directory the user specifies, or
   default to the current working directory. If a specific service subdirectory
   is open in the editor, use that.

2. **Detect the language and framework.** Scan for indicators without opening
   every file yet:
   - `package.json` → Node.js. Check `dependencies` for `express`, `fastify`,
     `koa`, `hapi`, `nestjs`, `@nestjs/core`.
   - `requirements.txt` / `pyproject.toml` / `setup.py` → Python. Check for
     `fastapi`, `flask`, `django`, `starlette`, `tornado`.
   - `pom.xml` / `build.gradle` → Java/Kotlin. Check for `spring-boot`,
     `quarkus`, `micronaut`.
   - `go.mod` → Go. Check for `gin`, `echo`, `chi`, `gorilla/mux`, `fiber`.
   - `Gemfile` → Ruby. Check for `rails`, `sinatra`, `grape`.
   - `*.csproj` / `*.sln` → C#/.NET. Check for `AspNetCore`, `WebApi`.
   - Any existing partial OAS file (e.g. `openapi.yaml`, `swagger.json`) —
     read it and use it as a starting scaffold, then extend/correct it.

3. **Announce the plan.**
   > "I'll analyze the codebase as a `<framework>` API and generate
   > `openapi.json`. I'll read route files, middleware, and model definitions.
   > This may take a moment."

4. **Execute the analysis** (Steps 1–8 below), then write the OAS file.

---

## Step 1 — Discover Route / Controller Files

Locate the files that define HTTP routes or controllers. Use glob and grep
patterns matched to the detected framework:

| Framework | Look for |
|---|---|
| **Express** | Files importing `express.Router()`, `app.get/post/put/delete/patch` |
| **FastAPI** | Files with `@app.get`, `@router.get`, `APIRouter()` |
| **Flask** | Files with `@app.route`, `@blueprint.route` |
| **Django** | `urls.py` files, `path()` / `re_path()` / `url()` calls |
| **NestJS** | Files with `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` |
| **Spring** | Files with `@RestController`, `@RequestMapping`, `@GetMapping`, etc. |
| **Gin/Echo/Chi** | Files calling `r.GET`, `r.POST`, `e.GET`, `r.Route`, `chi.NewRouter()` |
| **Rails** | `config/routes.rb` |
| **Sinatra/Grape** | Files with `get '/'`, `post '/'`, `resource :name` |

Read every discovered route file in full. For each route, record:
- HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`)
- Path string (convert framework-specific syntax to OAS path syntax:
  `:param` → `{param}`, `<param>` → `{param}`, `{param:int}` → `{param}`)
- Handler function name (use as a seed for `operationId`)
- Middleware applied to this route or router group

---

## Step 2 — Extract Operation Details from Handlers

For each route handler identified in Step 1, read the handler implementation.
Extract:

### Path Parameters
Any segment in the path like `{id}` is a path parameter. It must appear in
`parameters` with `in: path` and `required: true`.

### Query Parameters
Look for:
- Express: `req.query.foo`, destructuring `const { foo } = req.query`
- FastAPI: function arguments without `Body()` annotation and not in the path
- Flask: `request.args.get('foo')`
- Django: `request.GET.get('foo')`
- Spring: `@RequestParam`
- Go: `c.Query("foo")`, `r.URL.Query().Get("foo")`

### Request Body
Look for:
- Express: `req.body`, `req.body.foo`
- FastAPI: `Body()` annotated params, Pydantic model params
- Flask: `request.json`, `request.get_json()`
- Django: `request.data`, `request.POST`
- Spring: `@RequestBody`
- Go: `c.ShouldBindJSON()`, `json.NewDecoder(r.Body)`

### Response Structure
Look for:
- `res.json({...})`, `res.status(200).json({...})` (Express)
- `return {...}` with type annotations (FastAPI)
- `jsonify({...})` (Flask)
- `Response(data, ...)` (Django REST)
- `return ResponseEntity<>` (Spring)
- `c.JSON(200, ...)` (Gin)

Note every distinct status code sent and the shape of each response body.

### Headers
Look for authentication headers read from the request:
- `req.headers['authorization']`, `req.headers.authorization`
- `Authorization: Bearer` checks
- Custom headers like `x-api-key`, `x-user-id`

---

## Step 3 — Identify Authentication / Middleware

Read all middleware files. Look for:
- JWT verification middleware → `securityScheme` type `http`, scheme `bearer`,
  `bearerFormat: JWT`
- API key middleware checking a header → `securityScheme` type `apiKey`,
  `in: header`
- API key middleware checking a query param → `securityScheme` type `apiKey`,
  `in: query`
- Basic auth → `securityScheme` type `http`, scheme `basic`
- OAuth2 / OIDC → `securityScheme` type `oauth2` or `openIdConnect`
- Session / cookie auth → `securityScheme` type `apiKey`, `in: cookie`

For each route, determine whether authentication middleware is applied:
- Applied at the router/blueprint level (affects all routes in that group)
- Applied per-route
- Excluded via an allowlist (e.g. `/login`, `/register` are public)

Map each route to: **authenticated** (list the security scheme) or **public**
(no `security` requirement, or `security: [{}]`).

---

## Step 4 — Discover Data Models / Schemas

Locate model, schema, or DTO definitions:

| Framework | Source |
|---|---|
| **Express + Mongoose** | `mongoose.Schema({...})` definitions |
| **Express + Sequelize** | `sequelize.define(...)` or class models |
| **Express + TypeORM** | `@Entity` class definitions |
| **FastAPI** | Pydantic `BaseModel` subclasses |
| **Flask + SQLAlchemy** | `db.Model` subclasses |
| **Django** | `models.Model` subclasses, `serializers.Serializer` subclasses |
| **Spring** | `@Entity`, `@Document`, DTO/POJO classes |
| **Go** | `type Foo struct { ... }` with JSON tags |
| **Rails** | ActiveRecord model files, serializer files |

For each model/schema, extract:
- All fields with their types
- Required vs optional fields
- Validation constraints: `minLength`, `maxLength`, `minimum`, `maximum`,
  `pattern`, `enum`, etc.
- Relationships (for reference, not fully expanded in OAS)

Map framework types to OAS types:

| Framework type | OAS `type` + `format` |
|---|---|
| `String` / `str` / `string` | `type: string` |
| `Number` / `float` / `Float` | `type: number, format: float` |
| `Int` / `int` / `Integer` / `Long` | `type: integer, format: int64` |
| `Boolean` / `bool` | `type: boolean` |
| `Date` / `DateTime` / `datetime` | `type: string, format: date-time` |
| `Buffer` / `bytes` / `BinaryField` | `type: string, format: binary` |
| `Array` / `List` / `[]Type` | `type: array, items: <schema>` |
| `Object` / `Dict` / `Map` | `type: object` |
| `ObjectId` / `UUID` / `uuid` | `type: string, format: uuid` |
| `Email` / `EmailStr` | `type: string, format: email` |
| Enum | `type: string, enum: [...]` |

---

## Step 5 — Discover Server Configuration

Find the server's base URL and port:
- Express: `app.listen(PORT)` — check `PORT` env var and its default value
- FastAPI: `uvicorn.run(app, host=..., port=...)` or `Dockerfile`/`docker-compose.yml`
- Django: `ALLOWED_HOSTS`, `runserver` port
- Spring: `server.port` in `application.properties`/`application.yml`
- Go: `http.ListenAndServe(":PORT", ...)`
- Check `docker-compose.yml`, `.env`, `Dockerfile`, `Makefile` for exposed ports

Check for a URL prefix applied to all routes:
- Express: `app.use('/api/v1', router)`
- FastAPI: `app.include_router(router, prefix='/api/v1')`
- Django: `path('api/v1/', include(urlpatterns))`
- Spring: `@RequestMapping('/api/v1')`

Record: base URL (e.g. `http://localhost:3000`) and any API prefix
(e.g. `/api/v1`).

---

## Step 6 — Read Supporting Files

Read any existing documentation, README, or config that gives API context:
- `README.md` — API description, versioning, authentication instructions
- Existing partial `openapi.yaml` / `swagger.json` — scaffold to extend
- `CHANGELOG.md` — API version history
- `.env.example` — reveals environment variable names and defaults
- `package.json` `version` field or `pyproject.toml` `version` — API version

Use this to populate:
- `info.title`
- `info.description`
- `info.version`
- `info.contact` (if present in README)
- `info.license` (if present)

---

## Step 7 — Synthesize the OpenAPI Specification

Build the complete OAS 3.0 document in memory before writing:

### 7.1 — Construct `info`

```json
"info": {
  "title": "<API name from README or package.json name field>",
  "description": "<API description from README; CommonMark supported>",
  "version": "<version from package.json / pyproject.toml / git tag>",
  "contact": {           
    "name": "...",
    "email": "..."
  },
  "license": {           
    "name": "...",
    "url": "..."
  }
}
```

Omit `contact` and `license` if not found in the codebase.

### 7.2 — Construct `servers`

```json
"servers": [
  {
    "url": "http://localhost:<PORT>",
    "description": "Local development server"
  }
]
```

Add staging/production servers if found in environment config or README.

### 7.3 — Construct `components.securitySchemes`

Define one entry per distinct authentication mechanism found in Step 3.
Use descriptive names: `BearerAuth`, `ApiKeyAuth`, `BasicAuth`, `OAuth2`.

### 7.4 — Construct `components.schemas`

One schema per model found in Step 4. Name schemas in PascalCase. Use `$ref`
throughout the document to avoid duplication.

For request schemas (write payloads), exclude `readOnly` fields like `id`,
`createdAt`, `updatedAt`. Mark them `"readOnly": true` on the base schema
instead. Do not create separate `CreateFoo` and `Foo` schemas unless the
shapes genuinely differ significantly.

### 7.5 — Construct `paths`

For each route:

```json
"/path/{param}": {
  "<method>": {
    "operationId": "<camelCase unique id derived from handler name>",
    "summary": "<short description inferred from handler logic>",
    "description": "<longer description if handler is complex>",
    "tags": ["<resource name, e.g. Users, Vehicles, Auth>"],
    "parameters": [
      {
        "name": "param",
        "in": "path",
        "required": true,
        "schema": { "type": "string" }
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/FooRequest" }
        }
      }
    },
    "responses": {
      "200": {
        "description": "Success",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Foo" }
          }
        }
      },
      "400": { "description": "Bad request — invalid input" },
      "401": { "description": "Unauthorized — missing or invalid credentials" },
      "404": { "description": "Not found" },
      "500": { "description": "Internal server error" }
    },
    "security": [{ "BearerAuth": [] }]
  }
}
```

Omit `requestBody` for `GET`/`DELETE`/`HEAD` operations.
Omit `security` on public routes, or set it to `[]` to override a global default.

**`operationId` rules:**
- Must be globally unique and camelCase
- Derive from handler name when available: `getVehicleById`, `createUser`
- Fall back to `<method><Resource>` pattern: `getUserById`, `postVehicle`

**Tag rules:**
- Group by resource noun: `/vehicles/*` → tag `Vehicles`
- `/auth/*` → tag `Auth`
- List all tags used at the root `tags` field with short descriptions

**Response rules:**
- Always include the responses explicitly seen in the code
- Always add `401` to authenticated routes
- Always add `404` to routes with path parameters that fetch a resource
- Always add `400` to routes that accept a request body
- Add `403` if authorization checks (role/ownership) are present in the handler
- Always add `500`

### 7.6 — Apply global security

If the majority of routes are authenticated with the same scheme, apply it
globally and override public routes with `"security": []`:

```json
"security": [{ "BearerAuth": [] }]
```

If auth is mixed or inconsistent, apply `security` per-operation only.

---

## Step 8 — Write the File

**Output location:** place `openapi.json` at the project root, or in an
`openapi-spec/` subdirectory if one already exists. Never overwrite an existing
file without first reading it and confirming the intent with the user (unless
the existing file is clearly a scaffold or stub).

**Format:** JSON. Use 2-space indentation. Order root keys as:
`openapi`, `info`, `servers`, `tags`, `paths`, `components`.

After writing, perform a self-review:
- Every `$ref` resolves to a defined component
- Every `{param}` in a path has a matching parameter entry with `in: path` and `required: true`
- Every `operationId` is unique
- Every response has a `description`
- Every `in: path` parameter has `required: true`
- No path starts without `/`

---

## Step 9 — Report to the User

After writing the file, output a summary:

```
OpenAPI Specification Generated
  File:       <relative path to openapi.json>
  Version:    OAS 3.0.x
  Framework:  <detected framework>
  Paths:      <N> endpoints across <M> route files
  Tags:       <list of tags>
  Schemas:    <N> component schemas
  Security:   <scheme names, or "None detected">

Coverage notes:
  - <any routes that were ambiguous or skipped, and why>
  - <any response bodies that could not be inferred>
  - <any assumptions made that the user should verify>
```

---

## Framework-Specific Notes

### Express (Node.js)
- Route files often export a `Router` and are mounted in a central `app.js`
  or `server.js` — always read the entry point to find all mounts and their
  prefixes.
- Middleware like `authenticate` or `verifyToken` applied with `.use()` before
  route groups means all routes in that group are protected.
- `req.params`, `req.query`, `req.body` map to path/query/requestBody.

### FastAPI (Python)
- Type annotations on route function parameters are the source of truth for
  schemas — use them directly.
- `response_model=Foo` on the decorator tells you the response schema.
- `status_code=201` on the decorator overrides the default `200`.
- Pydantic `BaseModel` subclasses become `components.schemas` directly.

### Flask (Python)
- Blueprint `url_prefix` combines with `@blueprint.route` path.
- Flask-RESTX / Flask-RESTful `Resource` classes map methods to HTTP verbs.
- Marshmallow schemas, if present, are the source of truth for
  serialization/deserialization shapes.

### Django REST Framework
- `ViewSet` routers generate CRUD routes automatically — infer them from
  `router.register()` calls.
- `serializers.py` files define the schema shapes.
- `permission_classes` on a view define authentication requirements.

### NestJS (TypeScript)
- DTOs (Data Transfer Objects) annotated with `class-validator` decorators
  become request schemas.
- `@ApiProperty()` decorators (if Swagger module is used) carry schema metadata — prioritize these.
- Guard decorators (`@UseGuards(JwtAuthGuard)`) mark routes as authenticated.

### Spring Boot (Java/Kotlin)
- `@RequestBody`, `@PathVariable`, `@RequestParam` map directly to OAS concepts.
- Return type of controller methods (including `ResponseEntity<Foo>`) defines
  the response schema.
- `@Valid` / `@Validated` on request body parameters implies validation
  constraints are on the DTO class fields.

### Go (Gin / Echo / Chi)
- Struct tags (`json:"field_name" binding:"required"`) define field names and
  required constraints.
- `c.ShouldBindJSON(&dto)` or `c.BindJSON(&dto)` identifies the request body type.
- Middleware registered with `r.Use(AuthMiddleware)` before route groups marks
  those routes as authenticated.

---

## General Constraints

- **Do not fabricate** routes, schemas, or responses that are not evidenced in
  the source code. If a handler's response body is unclear, use
  `type: object` with `additionalProperties: true` and note the ambiguity.
- **Do not modify** any source code files. This skill is read-only with respect
  to the codebase.
- **Prefer `$ref`** over inline schemas for any object used more than once.
- **Use OAS 3.0.x** (e.g. `openapi: "3.0.3"`), not 2.0 (Swagger) or 3.1,
  unless the user explicitly requests otherwise.
- **Always include `operationId`** — it is required for downstream tooling
  such as 42Crunch audit and scan.
- **Use `nullable: true`** (OAS 3.0 style) for fields that can be null, not
  `type: ["string", "null"]` (OAS 3.1 style).
- Keep schema names in **PascalCase**, `operationId` values in **camelCase**,
  and tag names in **Title Case**.
