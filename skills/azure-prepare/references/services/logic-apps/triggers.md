# Logic Apps - Triggers

## HTTP Request

```json
{
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "orderId": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## Recurrence (Schedule)

```json
{
  "triggers": {
    "Recurrence": {
      "type": "Recurrence",
      "recurrence": {
        "frequency": "Hour",
        "interval": 1
      }
    }
  }
}
```

## Service Bus Queue

```json
{
  "triggers": {
    "When_a_message_is_received": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['servicebus']['connectionId']"
          }
        },
        "method": "get",
        "path": "/@{encodeURIComponent('orders')}/messages/head"
      }
    }
  }
}
```

## Common Actions

### HTTP Action

```json
{
  "HTTP": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://api.example.com/orders",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": "@triggerBody()"
    }
  }
}
```

### Approval Email

```json
{
  "Send_approval_email": {
    "type": "ApiConnectionWebhook",
    "inputs": {
      "host": {
        "connection": {
          "name": "@parameters('$connections')['office365']['connectionId']"
        }
      },
      "body": {
        "NotificationUrl": "@{listCallbackUrl()}",
        "Message": {
          "To": "approver@example.com",
          "Subject": "Approval Required",
          "Options": "Approve, Reject"
        }
      },
      "path": "/approvalmail/$subscriptions"
    }
  }
}
```
