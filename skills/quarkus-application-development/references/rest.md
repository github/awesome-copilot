# REST, validation, exception mappers, OpenAPI

Extensions: `quarkus-rest-jackson` (Quarkus REST + Jackson), `quarkus-hibernate-validator`, `quarkus-smallrye-openapi`. Do not mix with `quarkus-resteasy*` (legacy) in new code.

## Resource, validation, exception mapper (verified 3.40.1 and 3.27.6)

```java
@Path("/greetings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class GreetingResource {
    public record GreetingRequest(@NotBlank @Size(max = 20) String name) {}
    public record Greeting(String message) {}
    public record ApiError(String code, String message) {}
    public static class NotFound extends RuntimeException { public NotFound(String m) { super(m); } }

    @Inject GreetingConfig config;            // package-private injection, no private

    @POST
    @Operation(summary = "Create a greeting")          // org.eclipse.microprofile.openapi.annotations
    public Greeting create(@Valid @NotNull GreetingRequest req) { return new Greeting(config.prefix() + " " + req.name()); }

    @GET @Path("/{name}")
    public Greeting get(@PathParam("name") String name) {
        if ("missing".equals(name)) throw new NotFound("no " + name);
        return new Greeting(config.prefix() + " " + name);
    }

    @ServerExceptionMapper                               // org.jboss.resteasy.reactive.server
    public RestResponse<ApiError> notFound(NotFound e) {
        return RestResponse.status(Response.Status.NOT_FOUND, new ApiError("NOT_FOUND", e.getMessage()));
    }
}
```

- Invalid bodies return 400 automatically with a violation report; `@NotNull` makes a JSON `null` body a 400 too, since `@Valid` skips null. Test: `given().contentType("application/json").body("{\"name\":\"\"}").post("/greetings")` returns 400.
- `@ServerExceptionMapper` methods live in the resource class (local) or in any CDI bean (global). A classic `ExceptionMapper<T>` provider with `@Provider` also works; prefer the annotation form.

## OpenAPI

`quarkus-smallrye-openapi` serves `/q/openapi` (add `?format=json`) and Swagger UI at `/q/swagger-ui` in dev (verified: the JSON contains the `/greetings` path). Configure with `quarkus.smallrye-openapi.info-title=...`. Annotate only where descriptions add value (`@Operation`, `@APIResponse`, `@Tag`); the schema is inferred from records and resource methods.

## Other points

- Content negotiation, multipart and SSE exist in Quarkus REST (`Multi<T>` with `@RestStreamElementType`); read the REST guide at https://quarkus.io/guides/rest before using them.
- Cross-cutting: `@ServerRequestFilter` / `@ServerResponseFilter` (static or CDI methods) instead of JAX-RS filters.
- CORS: `quarkus.http.cors.enabled=true` and explicit `quarkus.http.cors.origins`; do not use `*` in production.
- Do not run long blocking work in `Uni`-returning methods without `@Blocking`; see `reactive-messaging.md`.
