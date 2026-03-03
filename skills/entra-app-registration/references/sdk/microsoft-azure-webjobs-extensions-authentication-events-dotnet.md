# Authentication Events — .NET SDK Quick Reference

> Condensed from **microsoft-azure-webjobs-extensions-authentication-events-dotnet**.
> Full patterns (attribute collection, OTP customization, external data enrichment)
> in the source plugin skill if installed.

## Install
dotnet add package Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents

## Quick Start
```csharp
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.TokenIssuanceStart;

[FunctionName("OnTokenIssuanceStart")]
public static WebJobsAuthenticationEventResponse Run(
    [WebJobsAuthenticationEventsTrigger] WebJobsTokenIssuanceStartRequest request,
    ILogger log)
{
    var response = new WebJobsTokenIssuanceStartResponse();
    response.Actions.Add(new WebJobsProvideClaimsForToken
    {
        Claims = new Dictionary<string, string> { { "claim", "value" } }
    });
    return response;
}
```

## Best Practices
- Validate all inputs — never trust request data; validate before processing
- Handle errors gracefully — return appropriate error responses, don't throw
- Log correlation IDs — use CorrelationId for troubleshooting
- Keep functions fast — authentication events have timeout limits
- Use managed identity — access Azure resources securely
- Cache external data — avoid slow lookups on every request
- Test locally — use Azure Functions Core Tools with sample payloads
- Monitor with App Insights — track function execution and errors
