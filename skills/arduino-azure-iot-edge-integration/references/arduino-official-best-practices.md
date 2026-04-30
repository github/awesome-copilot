# Arduino Official References and Best Practices

Use these official Arduino resources before finalizing firmware or hardware guidance.

## Official References

- Arduino main guide: <https://www.arduino.cc/en/Guide>
- Arduino docs home: <https://docs.arduino.cc/>
- Getting started path: <https://docs.arduino.cc/learn/starting-guide/getting-started-arduino/>
- Arduino IDE usage: <https://docs.arduino.cc/learn/starting-guide/the-arduino-software-ide/>
- Arduino language reference: <https://docs.arduino.cc/language-reference/>
- Arduino programming reference overview: <https://docs.arduino.cc/learn/programming/reference/>
- Arduino memory guide: <https://docs.arduino.cc/learn/programming/memory-guide/>
- Arduino debugging fundamentals: <https://docs.arduino.cc/learn/microcontrollers/debugging/>
- Arduino low-power design guide: <https://docs.arduino.cc/learn/electronics/low-power/>
- Arduino communication protocols index: <https://docs.arduino.cc/learn/communication/>
- Arduino style guide for libraries: <https://docs.arduino.cc/learn/contributions/arduino-library-style-guide/>

## Firmware Best Practices

- Keep the `loop()` non-blocking; avoid long `delay()` usage in production logic.
- Use `millis()`-based scheduling for periodic tasks.
- Budget SRAM explicitly and avoid dynamic allocation in hot paths.
- Validate sensor ranges and provide safe defaults for invalid readings.
- Add startup self-checks and periodic health heartbeat messages.
- Version the payload schema and firmware version in every telemetry stream.
- Implement retry with exponential backoff and jitter for network operations.
- Store credentials outside source code and rotate them according to policy.

## Hardware and Power Best Practices

- Document voltage levels, pin mapping, and current limits per peripheral.
- Design for brownout and power fluctuation scenarios.
- Use watchdog and safe recovery behavior where available.
- Plan low-power modes for battery deployments and validate wake cycles.

## Integration Best Practices for Azure IoT

- Prefer secure transports (MQTT over TLS) and per-device identity.
- Define idempotent upstream processing for duplicate message scenarios.
- Include device health metrics (uptime, reset reason, RSSI where applicable).
- Validate offline buffering bounds to avoid uncontrolled memory growth.
