---
name: arduino-azure-iot-edge-integration
description: 'Design and implement Arduino integration with Azure IoT Hub and IoT Edge, including secure provisioning, resilient telemetry, command handling, and production guardrails.'
---

# Arduino Azure IoT Edge Integration

Use this skill when the user needs to connect Arduino-class devices to Azure IoT, especially in edge-heavy scenarios (gateways, intermittent networks, offline buffering, and local actuation).

## When to use it

Use this skill for requests such as:

- "I want to connect Arduino sensors to Azure"
- "How do I send MQTT telemetry to IoT Hub?"
- "I need an edge gateway for field devices"
- "I want cloud-to-device commands and OTA configuration updates"

## Mandatory documentation review

Before recommending an IoT Edge topology or runtime behavior, review:

- https://learn.microsoft.com/azure/iot-edge/

If documentation cannot be consulted, proceed with explicit assumptions and highlight them in a dedicated section.

## Official Arduino references and best practices (required)

Before proposing firmware, wiring, or communication implementation details, consult official Arduino sources first:

- https://www.arduino.cc/en/Guide
- https://docs.arduino.cc/
- https://docs.arduino.cc/language-reference/
- references/arduino-official-best-practices.md

When choosing between implementation alternatives, prioritize official Arduino guidance over community snippets unless there is a clear technical reason to deviate.

## Objectives

- Produce a secure end-to-end reference path from the Arduino device to cloud insights.
- Handle unstable links (store-and-forward, retries, idempotency).
- Define an actionable device and cloud backlog.

## Integration patterns

### Pattern A: Arduino direct to IoT Hub

Use when connectivity is stable and cloud latency is acceptable.

- Protocol: MQTT over TLS.
- Identity: per-device credentials (SAS or X.509).
- Telemetry payload: compact JSON with timestamp, device ID, metrics, and optional quality flags.

### Pattern B: Arduino to local gateway, then IoT Edge

Use when links are constrained, local control is required, or batching improves cost/reliability.

- Arduino communicates with a local gateway (serial, BLE, local MQTT, RS-485, Modbus bridge).
- The gateway publishes upstream through the IoT Edge runtime and routes data to IoT Hub.
- Local modules can filter, aggregate, and trigger actions even during cloud outages.

## Design flow

### 1) Device contract

Define:

- Sensor catalog and units.
- Sampling frequency and expected throughput.
- Message schema versioning strategy.
- Desired/reported device twin properties to control runtime behavior.

### 2) Security baseline

Require:

- Unique identity per device.
- No hardcoded secrets in source code or firmware artifacts.
- Credential rotation strategy.
- Signed firmware and a controlled update process when possible.

### 3) Reliability and offline behavior

Plan and document:

- Backoff with jitter.
- Local queue/buffer strategy with bounded size.
- Duplicate suppression or downstream idempotent processing.
- Fallback to last-known-good configuration.

### 4) Cloud and edge routing

Define routes for:

- Raw telemetry to cold storage.
- Curated telemetry to hot analytics.
- Alerts to operations channels.
- Commands and configuration back to edge/device.

### 5) Observability

Specify minimum operations telemetry:

- Device heartbeat and firmware version.
- Connectivity state transitions.
- Message send success/error counters.
- Gateway module health and restart reasons.

## Reuse other skills

When relevant, combine with:

- `azure-smart-city-iot-solution-builder` for city-wide architecture and phased rollout.
- `azure-resource-visualizer` for relationship diagrams.
- `appinsights-instrumentation` for app and service telemetry patterns.

Also use `references/arduino-official-best-practices.md` as a quality baseline for firmware and hardware recommendations.

## Required output

Always provide:

1. Chosen connectivity pattern and rationale.
2. Message contract (fields, units, sample payload).
3. Security checklist for identity/credentials/updates.
4. Reliability plan (retry, buffering, dedupe).
5. Implementation backlog (firmware, gateway, cloud).

## Output template

1. Scenario and assumptions
2. Recommended architecture
3. Device and gateway contract
4. Security and reliability controls
5. Deployment plan and validation tests

## Guidelines

- Do not propose production deployments with shared credentials across devices.
- Do not assume always-on connectivity in field deployments.
- Do not omit command authorization and auditing in actuator scenarios.
