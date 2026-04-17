# Arduino Azure IoT Checklist

Use this checklist before finalizing architecture or implementation guidance.

## 0) Official Arduino Baseline

- Official references reviewed from <https://www.arduino.cc/en/Guide> and <https://docs.arduino.cc/>.
- Language/API calls validated against <https://docs.arduino.cc/language-reference/>.
- Best practices reviewed from `references/arduino-official-best-practices.md`.

## 1) Device Profile

- MCU model and memory constraints documented.
- Sensor list and sampling strategy defined.
- Power model documented (mains, battery, sleep cycles).

## 2) Connectivity

- Selected transport documented (MQTT over TLS preferred).
- Network failure behavior defined.
- Local timestamp strategy defined if device lacks RTC sync.

## 3) Security

- Unique identity per device.
- No secrets in source control.
- Credential rotation plan documented.
- Firmware update and rollback plan documented.

## 4) Edge and Cloud Flow

- Routing from edge to IoT Hub documented.
- Offline buffering limits defined.
- Duplicate handling strategy documented.
- Alerting thresholds and destinations defined.

## 5) Validation

- Connectivity soak test scenario.
- Packet loss and reconnection test.
- Command authorization test.
- Firmware version and health reporting verification.
