# 6522 VIA (Versatile Interface Adapter) Emulation Specification

A technical Markdown specification for **emulating the MOS Technology / WDC 6522 VIA**, suitable for 6502-family emulators, SBC simulators, and retrocomputing software environments.

---

## 1. Scope

This document defines the functional behavior required to emulate:

* MOS Technology 6522 VIA
* WDC 65C22 VIA (CMOS variant, where noted)

Out of scope:

* Analog electrical characteristics
* Bus contention and propagation delay
* Undocumented silicon race conditions

---

## 2. Chip Overview

### Core Features

| Feature          | Description                          |
| ---------------- | ------------------------------------ |
| I/O Ports        | Two 8-bit bidirectional ports (A, B) |
| Timers           | Two programmable timers              |
| Shift Register   | 8-bit serial shift register          |
| Interrupt System | Maskable, prioritized                |
| Handshaking      | CA1/CA2, CB1/CB2 control lines       |

---

## 3. External Signals (Logical Model)

| Signal   | Direction | Purpose                  |
| -------- | --------- | ------------------------ |
| PA0-PA7  | I/O       | Port A                   |
| PB0-PB7  | I/O       | Port B                   |
| CA1, CA2 | I/O       | Control lines A          |
| CB1, CB2 | I/O       | Control lines B          |
| IRQ      | Output    | Interrupt request to CPU |
| CS1, CS2 | Input     | Chip select              |
| R/W      | Input     | Read / write             |
| RS0-RS3  | Input     | Register select          |

---

## 4. Register Map

Registers are selected using RS3-RS0.

| Address | Name        | R/W | Description                      |
| ------- | ----------- | --- | -------------------------------- |
| 0       | ORB / IRB   | R/W | Output/Input Register B          |
| 1       | ORA / IRA   | R/W | Output/Input Register A          |
| 2       | DDRB        | R/W | Data Direction Register B        |
| 3       | DDRA        | R/W | Data Direction Register A        |
| 4       | T1C-L       | R   | Timer 1 Counter Low              |
| 5       | T1C-H       | R   | Timer 1 Counter High             |
| 6       | T1L-L       | W   | Timer 1 Latch Low                |
| 7       | T1L-H       | W   | Timer 1 Latch High               |
| 8       | T2C-L       | R   | Timer 2 Counter Low              |
| 9       | T2C-H       | R   | Timer 2 Counter High             |
| 10      | SR          | R/W | Shift Register                   |
| 11      | ACR         | R/W | Auxiliary Control Register       |
| 12      | PCR         | R/W | Peripheral Control Register      |
| 13      | IFR         | R/W | Interrupt Flag Register          |
| 14      | IER         | R/W | Interrupt Enable Register        |
| 15      | ORA (no HS) | R/W | Output Register A (no handshake) |

---

## 5. Data Direction Registers

* Bit = 1  Output
* Bit = 0  Input

```text
output = ORx & DDRx
input  = external & ~DDRx
```

---

## 6. Port Behavior

### Read

* Returns input pins for bits configured as input
* Returns output latch for bits configured as output

### Write

* Updates output latch only
* Actual pin value depends on DDR

---

## 7. Timers

### Timer 1 (T1)

* 16-bit down counter
* Can generate interrupts
* Optional PB7 toggle

### Timer 2 (T2)

* 16-bit down counter
* One-shot or pulse counting (CB1)

### Timer Emulation Rules

* Decrement once per CPU cycle
* Reload from latch when appropriate
* Set interrupt flag on underflow

---

## 8. Shift Register (SR)

Modes controlled via ACR:

* Disabled
* Shift in under CB1 clock
* Shift out under system clock

Emulator requirements:

* 8-bit shift
* Correct bit order
* Optional external clock handling

---

## 9. Control Registers

### Auxiliary Control Register (ACR)

Controls:

* Timer 1 mode
* Timer 2 mode
* Shift register mode
* PB7 behavior

### Peripheral Control Register (PCR)

Controls:

* CA1/CB1 edge sensitivity
* CA2/CB2 handshake / pulse / output modes

---

## 10. Interrupt System

### Interrupt Flag Register (IFR)

| Bit | Source                     |
| --- | -------------------------- |
| 0   | CA2                        |
| 1   | CA1                        |
| 2   | Shift Register             |
| 3   | CB2                        |
| 4   | CB1                        |
| 5   | Timer 2                    |
| 6   | Timer 1                    |
| 7   | Any interrupt (logical OR) |

### Interrupt Enable Register (IER)

* Bit 7 = set/clear mode
* Bits 0-6 enable individual sources

### IRQ Logic

```text
IRQ = (IFR & IER & 0x7F) != 0
```

---

## 11. Handshaking Lines

### CA1 / CB1

* Edge-detect inputs
* Trigger interrupts

### CA2 / CB2

* Input or output
* Pulse or handshake modes

Emulator must:

* Track pin state
* Detect configured edges

---

## 12. Reset Behavior

On reset:

* DDRx = $00
* ORx = $00
* Timers stopped
* IFR cleared
* IER cleared
* IRQ inactive

---

## 13. Read/Write Side Effects

| Register    | Side Effect              |
| ----------- | ------------------------ |
| ORA/ORB     | Clears handshake flags   |
| T1C-H write | Loads and starts Timer 1 |
| IFR write   | Clears written bits      |
| IER write   | Sets or clears enables   |

---

## 14. Emulation Timing Levels

| Level          | Description               |
| -------------- | ------------------------- |
| Functional     | Correct register behavior |
| Cycle-based    | Timers tick per CPU cycle |
| Cycle-accurate | Matches real VIA timing   |

---

## 15. Integration with 6502 Emulator

```text
CPU cycle  VIA tick  update timers  update IRQ
```

* VIA must be clocked in sync with CPU
* IRQ line sampled by CPU at instruction boundaries

---

## 16. Testing and Validation

### Recommended Tests

* VIA timer test ROMs
* Port read/write tests
* Interrupt priority tests

### Validation Checklist

* Timers count correctly
* IRQ asserts and clears properly
* DDR behavior correct
* Side effects implemented

---

## 17. Differences: 6522 vs 65C22 (Summary)

| Feature        | 6522   | 65C22    |
| -------------- | ------ | -------- |
| Power          | Higher | Lower    |
| Decimal quirks | N/A    | Fixed    |
| Timer accuracy | NMOS   | Improved |

---

## 18. Reference Links

* [https://www.westerndesigncenter.com/wdc/documentation](https://www.westerndesigncenter.com/wdc/documentation)
* [https://www.princeton.edu/~mae412/HANDOUTS/Datasheets/6522.pdf](https://www.princeton.edu/~mae412/HANDOUTS/Datasheets/6522.pdf)
* [https://www.nesdev.org/wiki/6522](https://www.nesdev.org/wiki/6522)

---

**Document Scope:** Software emulation of the 6522 VIA
**Audience:** Emulator developers, SBC designers
**Status:** Stable technical reference
