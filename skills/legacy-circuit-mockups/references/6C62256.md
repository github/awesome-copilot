# AS6C62256 32K x 8 Low-Power CMOS SRAM Specification

## 1. Overview

The **AS6C62256** is a **256 Kbit (32K x 8)** low-power CMOS static random-access memory (SRAM) manufactured by Alliance Memory (and second-sourced by others). It is fully compatible with common 28-pin SRAM pinouts and is widely used in **6502**, **Z80**, and other 8-bit microprocessor systems for read/write memory.

The device offers fast access times, simple control logic, and very low standby power consumption.

---

## 2. General Characteristics

| Feature           | Description                       |
| ----------------- | --------------------------------- |
| Memory size       | 256 Kbits (32 KB)                 |
| Organization      | 32,768 x 8 bits                   |
| Data bus          | 8-bit                             |
| Address bus       | 15-bit (A0-A14)                   |
| Technology        | CMOS SRAM                         |
| Access time       | 55 ns / 70 ns (variant dependent) |
| Operating voltage | 5 V ± 10%                          |
| Standby current   | < 1 µA (typical)                  |
| Package types     | DIP-28, SOJ-28, TSOP-28           |

---

## 3. Pin Configuration (Logical)

### 3.1 Address Pins (A0-A14)

* Select one of 32,768 memory locations
* Address must be stable during read or write cycle

### 3.2 Data Pins (I/O0-I/O7)

* Bidirectional tri-state data bus
* High-impedance when not enabled

### 3.3 Control Pins

| Pin | Description                |
| --- | -------------------------- |
| CE# | Chip Enable (active low)   |
| OE# | Output Enable (active low) |
| WE# | Write Enable (active low)  |
| VCC | +5 V power supply          |
| GND | Ground                     |

---

## 4. Memory Organization

* Linear address space from `$0000` to `$7FFF`
* Each address corresponds to one byte (8 bits)

```text
Address range: 0000h - 7FFFh
Data width:    8 bits
```

---

## 5. Read Operation

### 5.1 Read Cycle Conditions

| Signal | State |
| ------ | ----- |
| CE?    | LOW   |
| OE?    | LOW   |
| WE?    | HIGH  |

* Data becomes valid after access time (tAA)
* Outputs remain valid while CE? and OE? are LOW
* Outputs are high-impedance when CE? or OE? is HIGH

---

## 6. Write Operation

### 6.1 Write Cycle Conditions

| Signal | State       |
| ------ | ----------- |
| CE?    | LOW         |
| OE?    | HIGH or LOW |
| WE?    | LOW pulse   |

* Data is written on the rising edge of WE? or CE?
* Address and data must be stable during write window
* No internal write delay (true SRAM behavior)

---

## 7. Timing Notes (Summary)

| Parameter            | Typical  |
| -------------------- | -------- |
| Address access (tAA) | 55-70 ns |
| CE? access (tACE)    | 55-70 ns |
| OE? access (tOE)     | 25-35 ns |
| Write cycle time     | ≥ 55 ns  |

---

## 8. Power Modes

### 8.1 Active Mode

* CE? = LOW
* Normal read/write operation

### 8.2 Standby Mode

* CE? = HIGH
* Data retained
* Very low power consumption

---

## 9. Reset and Power-Up Behavior

* No reset pin required
* Data is undefined at power-up
* Memory contents preserved only while VCC is present

---

## 10. Typical System Integration (6502 Example)

```text
Mapped at:     $0000 - $7FFF
CE?   decoded address
OE?   R/W?
WE?   inverted R/W?
```

---

## 11. Absolute Maximum Ratings (Summary)

| Parameter     | Rating                |
| ------------- | --------------------- |
| VCC           | -0.5 V to +6.5 V      |
| Input voltage | -0.5 V to VCC + 0.5 V |
| Storage temp  | -65 °C to +150 °C     |

---

## 12. Compatible and Equivalent Devices

| Device    | Notes           |
| --------- | --------------- |
| AS6C62256 | Alliance Memory |
| CY62256   | Cypress         |
| HM62256   | Hitachi         |
| KM62256   | Samsung         |
| IS62C256  | ISSI            |

---

## 13. Common Use Cases

* Main RAM for 6502 / Z80 systems
* Video buffers and frame memory
* Embedded systems requiring fast R/W memory
* Retrocomputer SBC designs

---

## 14. References

* <https://www.alliancememory.com/wp-content/uploads/AS6C62256-23-March-2016-rev1.2.pdf>
* <https://www.futurlec.com/Datasheet/Memory/62256.pdf>
* <https://www.malinov.com/sergeys-blog/homebrew-notes.html>

---
