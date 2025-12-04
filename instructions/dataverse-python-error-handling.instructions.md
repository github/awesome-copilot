---
applyTo: '**'
---

# Dataverse SDK for Python — Error Handling & Troubleshooting Guide

Based on official Microsoft documentation for Azure SDK error handling patterns and Dataverse SDK specifics.

## 1. DataverseError Class Overview

The Dataverse SDK for Python provides a structured exception hierarchy for robust error handling.

### DataverseError Constructor

```python
from PowerPlatform.Dataverse.core.errors import DataverseError

DataverseError(
    message: str,                          # Human-readable error message
    code: str,                             # Error category (e.g., "validation_error", "http_error")
    subcode: str | None = None,            # Optional specific error identifier
    status_code: int | None = None,        # HTTP status code (if applicable)
    details: Dict[str, Any] | None = None, # Additional diagnostic information
    source: str | None = None,             # Error source: "client" or "server"
    is_transient: bool = False             # Whether error may succeed on retry
)
```

### Key Properties

```python
try:
    client.get("account", record_id="invalid-id")
except DataverseError as e:
    print(f"Message: {e.message}")           # Human-readable message
    print(f"Code: {e.code}")                 # Error category
    print(f"Subcode: {e.subcode}")           # Specific error type
    print(f"Status Code: {e.status_code}")   # HTTP status (401, 403, 429, etc.)
    print(f"Source: {e.source}")             # "client" or "server"
    print(f"Is Transient: {e.is_transient}") # Can retry?
    print(f"Details: {e.details}")           # Additional context
    
    # Convert to dictionary for logging
    error_dict = e.to_dict()
```

---

## 2. Common Error Scenarios

### Authentication Errors (401)

**Cause**: Invalid credentials, expired tokens, or misconfigured settings.

```python
from PowerPlatform.Dataverse.client import DataverseClient
from PowerPlatform.Dataverse.core.errors import DataverseError
from azure.identity import InteractiveBrowserCredential

try:
    # Bad credentials or expired token
    credential = InteractiveBrowserCredential()
    client = DataverseClient(
        base_url="https://invalid-org.crm.dynamics.com",
        credential=credential
    )
    records = client.get("account")
except DataverseError as e:
    if e.status_code == 401:
        print("Authentication failed. Check credentials and token expiration.")
        print(f"Details: {e.message}")
        # Don't retry - fix credentials first
    else:
        raise
```

### Authorization Errors (403)

**Cause**: User lacks permissions for the requested operation.

```python
try:
    # User doesn't have permission to read contacts
    records = client.get("contact")
except DataverseError as e:
    if e.status_code == 403:
        print("Access denied. User lacks required permissions.")
        print(f"Request ID for support: {e.details.get('request_id')}")
        # Escalate to administrator
    else:
        raise
```

### Resource Not Found (404)

**Cause**: Record, table, or resource doesn't exist.

```python
try:
    # Record doesn't exist
    record = client.get("account", record_id="00000000-0000-0000-0000-000000000000")
except DataverseError as e:
    if e.status_code == 404:
        print("Resource not found. Using default data.")
        record = {"name": "Unknown", "id": None}
    else:
        raise
```

### Rate Limiting (429)

**Cause**: Too many requests exceeding service protection limits.

**Note**: The SDK has minimal built-in retry support. Handle transient consistency issues manually.

```python
import time

def create_with_retry(client, table_name, payload, max_retries=3):
    """Create record with retry logic for rate limiting."""
    for attempt in range(max_retries):
        try:
            result = client.create(table_name, payload)
            return result
        except DataverseError as e:
            if e.status_code == 429 and e.is_transient:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Rate limited. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
    
    raise Exception(f"Failed after {max_retries} retries")
```

### Server Errors (500, 502, 503, 504)

**Cause**: Temporary service issues or infrastructure problems.

```python
try:
    result = client.create("account", {"name": "Acme"})
except DataverseError as e:
    if 500 <= e.status_code < 600:
        print(f"Server error ({e.status_code}). Service may be temporarily unavailable.")
        # Implement retry logic with exponential backoff
    else:
        raise
```

### Validation Errors (400)

**Cause**: Invalid request format, missing required fields, or business rule violations.

```python
try:
    # Missing required field or invalid data
    client.create("account", {"telephone1": "not-a-phone-number"})
except DataverseError as e:
    if e.status_code == 400:
        print(f"Validation error: {e.message}")
        if e.details:
            print(f"Details: {e.details}")
        # Log validation issues for debugging
    else:
        raise
```

---

## 3. Error Handling Best Practices

### Use Specific Exception Handling

Always catch specific exceptions before general ones:

```python
from PowerPlatform.Dataverse.core.errors import DataverseError
from azure.core.exceptions import AzureError

try:
    records = client.get("account", filter="statecode eq 0", top=100)
except DataverseError as e:
    # Handle Dataverse-specific errors
    if e.status_code == 401:
        print("Re-authenticate required")
    elif e.status_code == 404:
        print("Resource not found")
    elif e.is_transient:
        print("Transient error - may retry")
    else:
        print(f"Operation failed: {e.message}")
except AzureError as e:
    # Handle Azure SDK errors (network, auth, etc.)
    print(f"Azure error: {e}")
except Exception as e:
    # Catch-all for unexpected errors
    print(f"Unexpected error: {e}")
```

### Implement Smart Retry Logic

**Don't retry on**:
- 401 Unauthorized (authentication failures)
- 403 Forbidden (authorization failures)
- 400 Bad Request (client errors)
- 404 Not Found (unless resource should eventually appear)

**Consider retrying on**:
- 408 Request Timeout
- 429 Too Many Requests (with exponential backoff)
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

```python
def should_retry(error: DataverseError) -> bool:
    """Determine if operation should be retried."""
    if not error.is_transient:
        return False
    
    retryable_codes = {408, 429, 500, 502, 503, 504}
    return error.status_code in retryable_codes

def call_with_exponential_backoff(func, *args, max_attempts=3, **kwargs):
    """Call function with exponential backoff retry."""
    for attempt in range(max_attempts):
        try:
            return func(*args, **kwargs)
        except DataverseError as e:
            if should_retry(e) and attempt < max_attempts - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s...
                print(f"Attempt {attempt + 1} failed. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
```

### Extract Meaningful Error Information

```python
import json
from datetime import datetime

def log_error_for_support(error: DataverseError):
    """Log error with diagnostic information."""
    error_info = {
        "timestamp": datetime.utcnow().isoformat(),
        "error_type": type(error).__name__,
        "message": error.message,
        "code": error.code,
        "subcode": error.subcode,
        "status_code": error.status_code,
        "source": error.source,
        "is_transient": error.is_transient,
        "details": error.details
    }
    
    print(json.dumps(error_info, indent=2))
    
    # Save to log file or send to monitoring service
    return error_info
```

### Handle Bulk Operations Gracefully

```python
def bulk_create_with_error_tracking(client, table_name, payloads):
    """Create multiple records, tracking which succeed/fail."""
    results = {
        "succeeded": [],
        "failed": []
    }
    
    for idx, payload in enumerate(payloads):
        try:
            record_ids = client.create(table_name, payload)
            results["succeeded"].append({
                "payload": payload,
                "ids": record_ids
            })
        except DataverseError as e:
            results["failed"].append({
                "index": idx,
                "payload": payload,
                "error": {
                    "message": e.message,
                    "code": e.code,
                    "status": e.status_code
                }
            })
    
    return results
```

---

## 4. Enable Diagnostic Logging

### Configure Logging

```python
import logging
import sys

# Set up root logger
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dataverse_sdk.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Configure specific loggers
logging.getLogger('azure').setLevel(logging.DEBUG)
logging.getLogger('PowerPlatform').setLevel(logging.DEBUG)

# HTTP logging (careful with sensitive data)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.DEBUG)
```

### Enable SDK-Level Logging

```python
from PowerPlatform.Dataverse.client import DataverseClient
from PowerPlatform.Dataverse.core.config import DataverseConfig
from azure.identity import InteractiveBrowserCredential

cfg = DataverseConfig()
cfg.logging_enable = True  # Enable detailed logging

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=InteractiveBrowserCredential(),
    config=cfg
)

# Now SDK will log detailed HTTP requests/responses
records = client.get("account", top=10)
```

### Parse Error Responses

```python
import json

try:
    client.create("account", invalid_payload)
except DataverseError as e:
    # Extract structured error details
    if e.details and isinstance(e.details, dict):
        error_code = e.details.get('error', {}).get('code')
        error_message = e.details.get('error', {}).get('message')
        
        print(f"Error Code: {error_code}")
        print(f"Error Message: {error_message}")
        
        # Some errors include nested details
        if 'error' in e.details and 'details' in e.details['error']:
            for detail in e.details['error']['details']:
                print(f"  - {detail.get('code')}: {detail.get('message')}")
```

---

## 5. Dataverse-Specific Error Handling

### Handle OData Query Errors

```python
try:
    # Invalid OData filter
    records = client.get(
        "account",
        filter="invalid_column eq 0"
    )
except DataverseError as e:
    if "invalid column" in e.message.lower():
        print("Check OData column names and syntax")
    else:
        print(f"Query error: {e.message}")
```

### Handle File Upload Errors

```python
try:
    client.upload_file(
        table_name="account",
        record_id=record_id,
        column_name="document_column",
        file_path="large_file.pdf"
    )
except DataverseError as e:
    if e.status_code == 413:
        print("File too large. Use chunked upload mode.")
    elif e.status_code == 400:
        print("Invalid column or file format.")
    else:
        raise
```

### Handle Table Metadata Operations

```python
try:
    # Create custom table
    table_def = {
        "SchemaName": "new_CustomTable",
        "DisplayName": "Custom Table"
    }
    client.create("EntityMetadata", table_def)
except DataverseError as e:
    if "already exists" in e.message:
        print("Table already exists")
    elif "permission" in e.message.lower():
        print("Insufficient permissions to create tables")
    else:
        raise
```

---

## 6. Monitoring and Alerting

### Wrap Client Calls with Monitoring

```python
from functools import wraps
import time

def monitor_operation(operation_name):
    """Decorator to monitor SDK operations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                print(f"✓ {operation_name} completed in {duration:.2f}s")
                return result
            except DataverseError as e:
                duration = time.time() - start_time
                print(f"✗ {operation_name} failed after {duration:.2f}s")
                print(f"  Error: {e.code} ({e.status_code}): {e.message}")
                raise
        return wrapper
    return decorator

@monitor_operation("Fetch Accounts")
def get_accounts(client):
    return client.get("account", top=100)

# Usage
try:
    accounts = get_accounts(client)
except DataverseError:
    print("Operation failed - check logs for details")
```

---

## 7. Common Troubleshooting Checklist

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| 401 Unauthorized | Expired token or bad credentials | Re-authenticate with valid credentials |
| 403 Forbidden | User lacks permissions | Request access from administrator |
| 404 Not Found | Record/table doesn't exist | Verify schema name and record ID |
| 429 Rate Limited | Too many requests | Implement exponential backoff retry |
| 500+ Server Error | Service issue | Retry with exponential backoff; check status page |
| 400 Bad Request | Invalid request format | Check OData syntax, field names, required fields |
| Network timeout | Connection issues | Check network, increase timeout in DataverseConfig |
| InvalidOperationException | Plugin/workflow error | Check plugin logs in Dataverse |

---

## 8. Logging Best Practices

```python
import logging
import json
from datetime import datetime

class DataverseErrorHandler:
    """Centralized error handling and logging."""
    
    def __init__(self, log_file="dataverse_errors.log"):
        self.logger = logging.getLogger("DataverseSDK")
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.ERROR)
    
    def log_error(self, error: DataverseError, context: str = ""):
        """Log error with context for debugging."""
        error_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "context": context,
            "error": error.to_dict()
        }
        
        self.logger.error(json.dumps(error_record, indent=2))
    
    def is_retryable(self, error: DataverseError) -> bool:
        """Check if error should be retried."""
        return error.is_transient and error.status_code in {408, 429, 500, 502, 503, 504}

# Usage
error_handler = DataverseErrorHandler()

try:
    client.create("account", payload)
except DataverseError as e:
    error_handler.log_error(e, "create_account_batch_1")
    if error_handler.is_retryable(e):
        print("Will retry this operation")
    else:
        print("Operation failed permanently")
```

---

## 9. See Also

- [DataverseError API Reference](https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.core.errors.dataverseerror)
- [Azure SDK Error Handling](https://learn.microsoft.com/en-us/azure/developer/python/sdk/fundamentals/errors)
- [Dataverse SDK Getting Started](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/sdk-python/get-started)
- [Service Protection API Limits](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimize-performance-create-update)
