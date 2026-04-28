---
description: 'Require Azure IoT Edge documentation review before proposing edge IoT architectures or Azure implementation guidance.'
applyTo: '**/*.bicep,**/*.tf,**/*iot*.md,**/*smart-city*.md,**/*edge*.md'
---

## Azure IoT Edge Architecture Instruction

When the task includes Azure IoT, Smart City, edge processing, gateway design, or disconnected edge scenarios, do this before providing architecture recommendations:

1. Review Azure IoT Edge documentation first:
   - https://learn.microsoft.com/azure/iot-edge/
   - https://learn.microsoft.com/es-es/azure/iot-edge/
2. Confirm key constraints from the documentation:
   - Runtime architecture
   - Supported systems
   - Version/release status
   - Relevant Linux/Windows quickstart path
3. Explicitly state that you reviewed the documentation, or state that it could not be consulted.
4. If the documentation was not accessible, continue with clearly labeled assumptions.

### Response Rules

- Never jump directly to a list of services without validating edge applicability first.
- Always explain why IoT Edge is or is not required.
- Include operational implications: update strategy, observability, and support model.
- Prioritize secure defaults: managed identity, least privilege, secret management, and network isolation.
