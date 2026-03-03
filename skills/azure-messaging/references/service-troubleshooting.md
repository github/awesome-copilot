# Service-Level Troubleshooting

Covers connectivity, firewall, and network issues that apply regardless of SDK language.

## Permanent Connectivity Issues

If the client **cannot connect at all**:

1. **Verify connection string** — Get from Azure portal. For **Event Hubs (Kafka endpoint)** clients, also check `producer.config` / `consumer.config`.
2. **Check service outage** — [Azure status page](https://azure.status.microsoft/status)
3. **Firewall / ports** — Open AMQP 5671 and 5672, HTTPS 443. For **Event Hubs (Kafka endpoint)** only, also open Kafka 9093. Use WebSockets (port 443) as fallback.
4. **IP firewall** — If enabled on namespace, ensure client IP is allowed.
5. **VNet / private endpoints** — Confirm app runs in correct subnet. Check service endpoint and NSG rules.
6. **Proxy / SSL** — Intercepting proxies can cause SSL handshake failures. Test with proxy disabled.

### Quick Connectivity Test

```bash
# Test endpoint reachability (expect Atom feed XML on success)
curl -v https://<namespace>.servicebus.windows.net/

# Resolve namespace IP
nslookup <namespace>.servicebus.windows.net
```

## Transient Connectivity Issues

If connectivity is **intermittent**:

1. **Upgrade SDK** — Use latest version; transient issues may already be fixed.
2. **Check dropped packets** — `netstat -s` (Linux) or `netsh interface ipv4 show subinterface` (Windows).
3. **Capture network traces** — Use Wireshark or `tcpdump` filtered on namespace IP.
4. **Idle disconnect** — Service disconnects idle AMQP connections. Clients auto-reconnect; this is expected.

## WebSocket Configuration by Language

| Language | Setting |
|----------|---------|
| .NET | `EventHubsTransportType.AmqpWebSockets` / `ServiceBusTransportType.AmqpWebSockets` |
| Java | `AmqpTransportType.AMQP_WEB_SOCKETS` |
| Python | `transport_type=TransportType.AmqpOverWebsocket` |
| JavaScript | `webSocketOptions` in client constructor |

## Authentication Checklist

| Issue | Fix |
|-------|-----|
| Invalid connection string | Re-copy from Azure portal |
| Expired SAS token | Regenerate or increase validity |
| Missing RBAC role | Assign the corresponding *Azure Event Hubs Data Owner/Sender/Receiver* or *Azure Service Bus Data Owner/Sender/Receiver* role |
| Managed Identity not configured | Enable system/user-assigned identity, assign role on namespace |

## Sender Issues (All Languages)

- **Batch >1MB fails** — Service rejects batches over 1MB even with Premium large message support. Send large messages individually.
- **Multiple partition keys in batch** — Not allowed. Group messages by `partitionKey` (or `sessionId`) into separate batches.

## Receiver Issues (All Languages)

- **Batch receive returns fewer messages** — After the first message arrives, the receiver waits briefly (20ms–1s depending on SDK) for more. `maxWaitTime` only controls the wait for the *first* message.
- **Lock lost before expiry** — Can occur on AMQP link detach (transient network or 10-min idle timeout), not only when processing exceeds lock duration.
- **Socket exhaustion** — Treat clients as singletons. Each new client creates a new AMQP connection. Always close/dispose clients when done.

## Further Reading

- [Event Hubs troubleshooting guide](https://learn.microsoft.com/azure/event-hubs/troubleshooting-guide)
- [Service Bus troubleshooting guide](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-troubleshooting-guide)
- [Event Hubs quotas and limits](https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas)
- [Service Bus quotas and limits](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas)
- [Event Hubs AMQP troubleshooting](https://learn.microsoft.com/azure/event-hubs/event-hubs-amqp-troubleshoot)
- [Service Bus AMQP troubleshooting](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-amqp-troubleshoot)
- [Event Hubs IP addresses and service tags](https://learn.microsoft.com/azure/event-hubs/troubleshooting-guide#what-ip-addresses-do-i-need-to-allow)
- [Service Bus IP addresses](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-faq#what-ip-addresses-do-i-need-to-add-to-allowlist-)
