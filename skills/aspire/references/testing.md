# Testing — Complete Reference

Aspire provides `Aspire.Hosting.Testing` for running integration tests against your full AppHost. Tests spin up the entire distributed application (or a subset) and run assertions against real services.

---

## Package

```xml
<PackageReference Include="Aspire.Hosting.Testing" Version="*" />
```

---

## Core pattern: DistributedApplicationTestingBuilder

```csharp
// 1. Create a testing builder from your AppHost
var builder = await DistributedApplicationTestingBuilder
    .CreateAsync<Projects.MyAppHost>();

// 2. (Optional) Override resources for testing
// ... see customization section below

// 3. Build and start the application
await using var app = await builder.BuildAsync();
await app.StartAsync();

// 4. Create HTTP clients for your services
var client = app.CreateHttpClient("api");

// 5. Run assertions
var response = await client.GetAsync("/health");
Assert.Equal(HttpStatusCode.OK, response.StatusCode);
```

---

## xUnit examples

### Basic health check test

```csharp
public class HealthTests(ITestOutputHelper output)
{
    [Fact]
    public async Task AllServicesAreHealthy()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.AppHost>();

        await using var app = await builder.BuildAsync();
        await app.StartAsync();

        // Test each service's health endpoint
        var apiClient = app.CreateHttpClient("api");
        var apiHealth = await apiClient.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, apiHealth.StatusCode);

        var workerClient = app.CreateHttpClient("worker");
        var workerHealth = await workerClient.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, workerHealth.StatusCode);
    }
}
```

### API integration test

```csharp
public class ApiTests(ITestOutputHelper output)
{
    [Fact]
    public async Task CreateOrder_ReturnsCreated()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.AppHost>();

        await using var app = await builder.BuildAsync();
        await app.StartAsync();

        var client = app.CreateHttpClient("api");

        var order = new { ProductId = 1, Quantity = 2 };
        var response = await client.PostAsJsonAsync("/orders", order);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<Order>();
        Assert.NotNull(created);
        Assert.Equal(1, created.ProductId);
    }
}
```

### Testing with wait for readiness

```csharp
[Fact]
public async Task DatabaseIsSeeded()
{
    var builder = await DistributedApplicationTestingBuilder
        .CreateAsync<Projects.AppHost>();

    await using var app = await builder.BuildAsync();
    await app.StartAsync();

    // Wait for the API to be fully ready (all dependencies healthy)
    await app.WaitForResourceReadyAsync("api");

    var client = app.CreateHttpClient("api");
    var response = await client.GetAsync("/products");

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    var products = await response.Content.ReadFromJsonAsync<List<Product>>();
    Assert.NotEmpty(products);
}
```

---

## MSTest examples

```csharp
[TestClass]
public class IntegrationTests
{
    [TestMethod]
    public async Task ApiReturnsProducts()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.AppHost>();

        await using var app = await builder.BuildAsync();
        await app.StartAsync();

        var client = app.CreateHttpClient("api");
        var response = await client.GetAsync("/products");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    }
}
```

---

## NUnit examples

```csharp
[TestFixture]
public class IntegrationTests
{
    [Test]
    public async Task ApiReturnsProducts()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.AppHost>();

        await using var app = await builder.BuildAsync();
        await app.StartAsync();

        var client = app.CreateHttpClient("api");
        var response = await client.GetAsync("/products");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }
}
```

---

## Customizing the test AppHost

### Override resources

```csharp
var builder = await DistributedApplicationTestingBuilder
    .CreateAsync<Projects.AppHost>();

// Replace a real database with a test container
builder.Services.ConfigureHttpClientDefaults(http =>
{
    http.AddStandardResilienceHandler();
});

// Add test-specific configuration
builder.Configuration["TestMode"] = "true";

await using var app = await builder.BuildAsync();
await app.StartAsync();
```

### Exclude resources

```csharp
var builder = await DistributedApplicationTestingBuilder
    .CreateAsync<Projects.AppHost>(args =>
    {
        // Don't start the worker for API-only tests
        args.Args = ["--exclude-resource", "worker"];
    });
```

### Test with specific environment

```csharp
var builder = await DistributedApplicationTestingBuilder
    .CreateAsync<Projects.AppHost>(args =>
    {
        args.Args = ["--environment", "Testing"];
    });
```

---

## Connection string access

```csharp
// Get the connection string for a resource in tests
var connectionString = await app.GetConnectionStringAsync("db");

// Use it to query the database directly in tests
using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync();
var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM products");
Assert.True(count > 0);
```

---

## Best practices

1. **Use `WaitForResourceReadyAsync`** before making requests — ensures all dependencies are healthy
2. **Each test should be independent** — don't rely on state from previous tests
3. **Use `await using`** for the app — ensures cleanup even on test failure
4. **Test real infrastructure** — Aspire spins up real containers (Redis, PostgreSQL, etc.), giving you high-fidelity integration tests
5. **Keep test AppHost lean** — exclude resources you don't need for specific test scenarios
6. **Use test-specific configuration** — override settings for test isolation
7. **Timeout protection** — set reasonable test timeouts since containers take time to start:

```csharp
[Fact(Timeout = 120_000)]  // 2 minutes
public async Task SlowIntegrationTest() { ... }
```

---

## Project structure

```
MyApp/
├── src/
│   ├── MyApp.AppHost/           # AppHost project
│   ├── MyApp.Api/               # API service
│   ├── MyApp.Worker/            # Worker service
│   └── MyApp.ServiceDefaults/   # Shared defaults
└── tests/
    └── MyApp.Tests/             # Integration tests
        ├── MyApp.Tests.csproj   # References AppHost + Testing package
        └── ApiTests.cs          # Test classes
```

```xml
<!-- MyApp.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <IsAspireTestProject>true</IsAspireTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Aspire.Hosting.Testing" Version="*" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="*" />
    <PackageReference Include="xunit" Version="*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\MyApp.AppHost\MyApp.AppHost.csproj" />
  </ItemGroup>
</Project>
```
