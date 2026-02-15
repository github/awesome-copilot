# 7400-Series Logic ICs Specification

## 1. Overview

The **7400-series** is a large family of **digital logic integrated circuits** originally implemented in **TTL (Transistor-Transistor Logic)** and later expanded to include **CMOS-compatible variants**. These devices provide fundamental building blocks such as gates, flip-flops, counters, multiplexers, decoders, and bus transceivers.

7400-series ICs are widely used in **retrocomputing**, **6502/Z80 systems**, **glue logic**, and educational designs.

---

## 2. Logic Families

| Family  | Technology              | Notes                   |
| ------- | ----------------------- | ----------------------- |
| 74xx    | TTL                     | Original bipolar TTL    |
| 74LSxx  | Low-power Schottky TTL  | Faster, lower power     |
| 74HCTxx | CMOS (TTL-level inputs) | Ideal for mixed systems |
| 74HCxx  | CMOS                    | Wide voltage range      |
| 74ACTxx | Advanced CMOS TTL-level | Very fast               |

---

## 3. Electrical Characteristics (Typical)

| Parameter         | TTL     | CMOS                |
| ----------------- | ------- | ------------------- |
| VCC               | 5 V     | 2-6 V (5 V typical) |
| Input HIGH        | ≥ 2.0 V | ≥ 0.7xVCC           |
| Input LOW         | ≤ 0.8 V | ≤ 0.3xVCC           |
| Fan-out           | ~10     | Very high           |
| Power consumption | Higher  | Lower               |

---

## 4. Standard Package Types

| Package | Pins       | Notes               |
| ------- | ---------- | ------------------- |
| DIP     | 14, 16, 20 | Breadboard-friendly |
| SOIC    | 14, 16, 20 | Surface-mount       |
| TSSOP   | 14, 16     | Compact SMT         |

---

## 5. Common Logic Categories

### 5.1 Basic Logic Gates

| IC   | Function          |
| ---- | ----------------- |
| 7400 | Quad 2-input NAND |
| 7402 | Quad 2-input NOR  |
| 7404 | Hex inverter      |
| 7408 | Quad 2-input AND  |
| 7432 | Quad 2-input OR   |
| 7486 | Quad 2-input XOR  |

---

### 5.2 Latches and Flip-Flops

| IC    | Function              |
| ----- | --------------------- |
| 7474  | Dual D-type flip-flop |
| 7473  | Dual JK flip-flop     |
| 7475  | Quad latch            |
| 74175 | Quad D-type FF        |

---

### 5.3 Counters and Registers

| IC    | Function                              |
| ----- | ------------------------------------- |
| 74161 | Synchronous 4-bit counter             |
| 74163 | Synchronous binary counter            |
| 74193 | Up/down counter                       |
| 74164 | Serial-in/parallel-out shift register |
| 74165 | Parallel-in/serial-out shift register |

---

### 5.4 Decoders and Multiplexers

| IC    | Function                |
| ----- | ----------------------- |
| 74138 | 3-to-8 decoder          |
| 74139 | Dual 2-to-4 decoder     |
| 74151 | 8-to-1 multiplexer      |
| 74157 | Quad 2-to-1 multiplexer |

---

### 5.5 Bus Interface and Glue Logic

| IC    | Function                            |
| ----- | ----------------------------------- |
| 74244 | Octal buffer / line driver          |
| 74245 | Octal bidirectional bus transceiver |
| 74373 | Octal transparent latch             |
| 74574 | Octal D-type FF                     |

---

## 6. Pin Numbering Convention

* DIP packages use **counter-clockwise numbering**
* Pin 1 identified by notch or dot

```text
       ________
  1 °|       |° 14
  2 °|        |° 13
  3 °|        |° 12
  4 °|        |° 11
  5 °|        |° 10
  6 °|        |°  9
  7 °|________|°  8
```

---

## 7. Power and Ground Pins

| Package | VCC | GND |
| ------- | --- | --- |
| DIP-14  | 14  | 7   |
| DIP-16  | 16  | 8   |
| DIP-20  | 20  | 10  |

---

## 8. Timing Characteristics (General)

| Parameter         | TTL     | CMOS     |
| ----------------- | ------- | -------- |
| Propagation delay | 5-15 ns | 8-25 ns  |
| Max frequency     | ~25 MHz | ~50+ MHz |

---

## 9. Interfacing Notes

* TTL outputs reliably drive TTL inputs
* CMOS inputs must not float
* Use **74HCT** when interfacing CMOS with TTL signals
* Decoupling capacitors (0.1 µF) required per IC

---

## 10. Typical Retrocomputer Applications

* Address decoding
* Chip-select generation
* Bus buffering
* Clock gating and control
* State machines

---

## 11. Absolute Maximum Ratings (Summary)

| Parameter           | Rating                |
| ------------------- | --------------------- |
| VCC                 | -0.5 V to +7.0 V      |
| Input voltage       | -0.5 V to VCC + 0.5 V |
| Storage temperature | -65 °C to +150 °C     |

---

## 12. References

* <https://www.ti.com/lit/ds/symlink/sn74ls00.pdf>
* <https://archive.org/details/TTLCookBook>
* <https://digilent.com/reference/test-and-measurement/analog-discovery-2/hardware-design-guide>

---
