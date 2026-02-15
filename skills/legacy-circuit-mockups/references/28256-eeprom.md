# AT28C256 256K (32K x 8) Parallel EEPROM Specification

## 1. Overview

The **AT28C256** is a non-volatile, electrically erasable and programmable read-only memory (EEPROM) manufactured by Atmel (now Microchip). It provides **256 Kbits** of storage organized as **32,768 x 8 bits** and is commonly used in 8-bit microprocessor systems such as those based on the **6502**, **Z80**, and similar CPUs.

The device supports byte-level write operations, fast read access, and software-controlled data protection.

---

## 2. General Characteristics

| Feature        | Description                    |
| -------------- | ------------------------------ |
| Memory size    | 256 Kbits (32 KB)              |
| Organization   | 32,768 x 8 bits                |
| Data bus       | 8-bit                          |
| Address bus    | 15-bit (A0-A14)                |
| Technology     | EEPROM                         |
| Endurance      | ≥ 100,000 write cycles         |
| Data retention | ≥ 10 years                     |
| Access time    | 150-250 ns (variant dependent) |
| Package types  | DIP-28, PLCC-32, TSOP          |

---

## 3. Pin Configuration (Logical)

### 3.1 Address Pins (A0-A14)

* Select one of 32,768 memory locations

### 3.2 Data Pins (I/O0-I/O7)

* Bidirectional tri-state data bus
* Outputs valid during read cycles

### 3.3 Control Pins

| Pin | Description                |
| --- | -------------------------- |
| CE  | Chip Enable (active low)   |
| OE  | Output Enable (active low) |
| WE  | Write Enable (active low)  |
| VCC | +5 V power supply          |
| GND | Ground                     |

---

## 4. Memory Organization

* Linear address space from `$0000` to `$7FFF`
* Each address corresponds to one 8-bit byte

```text
Address Range: 0000h - 7FFFh
Data Width:    8 bits
```

---

## 5. Read Operation

### 5.1 Read Cycle Conditions

| Signal | State |
| ------ | ----- |
| CE     | LOW   |
| OE     | LOW   |
| WE     | HIGH  |

* Data appears on I/O pins after access time
* Output remains valid while CE and OE are asserted
* Outputs are high-impedance when CE or OE is HIGH

---

## 6. Write Operation

### 6.1 Byte Write Cycle

| Signal | State     |
| ------ | --------- |
| CE     | LOW       |
| OE     | HIGH      |
| WE     | LOW pulse |

* Address and data must be stable during WE low pulse
* Internal write cycle time ≈ 10 ms (max)
* Device automatically handles erase-before-write

---

## 7. Software Data Protection (SDP)

The AT28C256 includes optional **Software Data Protection** to prevent accidental writes.

### 7.1 SDP Enable Sequence

```text
Write $AA to address $5555
Write $55 to address $2AAA
Write $A0 to address $5555
```

### 7.2 SDP Disable Sequence

```text
Write $AA to address $5555
Write $55 to address $2AAA
Write $80 to address $5555
Write $AA to address $5555
Write $55 to address $2AAA
Write $20 to address $5555
```

---

## 8. Write Cycle Timing Notes

* Writes are internally timed; no external polling required
* During write cycle, reads return undefined data
* Device ignores additional write attempts while busy

---

## 9. Data Polling (Optional)

* I/O7 may be monitored during write
* When I/O7 matches written data, write is complete

---

## 10. Reset and Power Behavior

* No explicit reset pin
* Writes inhibited during power-up and power-down
* Outputs default to high-impedance until CE and OE asserted

---

## 11. Typical System Integration (6502 Example)

```text
Address Range: $8000 - $FFFF
A15 used as chip select
OE  R/W?
WE  inverted R/W?
```

---

## 12. Absolute Maximum Ratings (Summary)

| Parameter     | Rating                |
| ------------- | --------------------- |
| VCC           | -0.6 V to +6.25 V     |
| Input voltage | -0.6 V to VCC + 0.6 V |
| Storage temp  | -65 °C to +150 °C     |

---

## 13. Variants and Compatible Devices

| Device           | Notes                        |
| ---------------- | ---------------------------- |
| AT28C256         | Original Atmel               |
| AT28C256F        | Faster access time           |
| SST28SF256       | Flash-compatible alternative |
| 28C256 (generic) | Common pin-compatible EEPROM |

---

## 14. Common Use Cases

* ROM replacement in retro systems
* Firmware storage
* Microcomputer monitors and BASIC ROMs
* Prototyping and hobbyist computers

---

## 15. References

* <https://www.utmel.com/components/at28bv256-eeproms-pinout-equivalent-and-datasheet?id=1019>
* <https://www.futurlec.com/Memory/28C256.shtml>
* <https://ww1.microchip.com/downloads/en/DeviceDoc/doc0006.pdf>
* <https://bread80.com/2020/08/10/the-ben-eater-eeprom-programmer-28c256-and-software-data-protection/>

---
