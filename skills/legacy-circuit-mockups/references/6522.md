# MOS Technology 6522 Versatile Interface Adapter (VIA)

## 1. Overview

The **MOS Technology 6522 VIA** is a general-purpose I/O controller designed to interface the 6502 family of microprocessors with external peripherals. Introduced in the mid-1970s, it provides parallel I/O ports, timers, shift register support, and interrupt handling. The 6522 is widely used in systems such as the Commodore PET, VIC-20, Apple II, BBC Micro, and many 6502-based embedded designs.

---

## 2. General Characteristics

| Feature        | Description                      |
| -------------- | -------------------------------- |
| Data width     | 8-bit                            |
| Addressing     | Memory-mapped I/O                |
| Registers      | 16 (4-bit register select)       |
| I/O ports      | Two 8-bit ports (Port A, Port B) |
| Timers         | Two 16-bit timers                |
| Shift register | 8-bit serial I/O                 |
| Interrupts     | Maskable, multiple sources       |
| Clock          | System clock (φ2)                |

---

## 3. Pin Functions (Logical)

### 3.1 Port A (PA0-PA7)

* 8-bit bidirectional parallel I/O
* Handshake support via CA1 / CA2

### 3.2 Port B (PB0-PB7)

* 8-bit bidirectional parallel I/O
* Handshake support via CB1 / CB2
* PB6 and PB7 may be controlled by Timer 1

### 3.3 Control Pins

| Pin       | Description                           |
| --------- | ------------------------------------- |
| CA1 / CB1 | Interrupt-capable control inputs      |
| CA2 / CB2 | Handshake / pulse / interrupt pins    |
| IRQ       | Interrupt request output (active low) |
| RESET     | Reset input                           |

---

## 4. Register Map

Registers are selected using 4 address lines (RS0-RS3). The base address is system-defined.

| Offset | Register  | Description                          |
| -----: | --------- | ------------------------------------ |
|     $0 | ORB       | Output Register B                    |
|     $1 | ORA / IRB | Output Register A / Input Register B |
|     $2 | DDRB      | Data Direction Register B            |
|     $3 | DDRA      | Data Direction Register A            |
|     $4 | T1C-L     | Timer 1 Counter Low                  |
|     $5 | T1C-H     | Timer 1 Counter High                 |
|     $6 | T1L-L     | Timer 1 Latch Low                    |
|     $7 | T1L-H     | Timer 1 Latch High                   |
|     $8 | T2C-L     | Timer 2 Counter Low                  |
|     $9 | T2C-H     | Timer 2 Counter High                 |
|     $A | SR        | Shift Register                       |
|     $B | ACR       | Auxiliary Control Register           |
|     $C | PCR       | Peripheral Control Register          |
|     $D | IFR       | Interrupt Flag Register              |
|     $E | IER       | Interrupt Enable Register            |
|     $F | ORA / IRA | Output Register A / Input Register A |

---

## 5. Data Direction Registers (DDRA / DDRB)

Each bit controls the direction of its corresponding port pin:

* `0` = Input
* `1` = Output

```text
DDRB bit = 1  PBx is output
DDRB bit = 0  PBx is input
```

---

## 6. Timers

### 6.1 Timer 1 (T1)

* 16-bit down counter
* Can operate in one-shot or free-running mode
* Can toggle PB7 on timeout
* Generates interrupts

### 6.2 Timer 2 (T2)

* 16-bit down counter
* Supports pulse counting on PB6
* One-shot operation only

---

## 7. Shift Register (SR)

* 8-bit shift register
* Can shift data in or out
* Clock source selectable via ACR
* Often used for serial communication or keyboard scanning

---

## 8. Control Registers

### 8.1 Auxiliary Control Register (ACR)

| Bit | Function                           |
| --: | ---------------------------------- |
|   7 | Timer 1 control (PB7 output)       |
|   6 | Timer 1 mode (free-run / one-shot) |
|   5 | Timer 2 control                    |
|   4 | Shift register mode                |
|   3 | Shift register clock source        |
|   2 | Port B latching                    |
|   1 | Port A latching                    |
|   0 | Unused                             |

### 8.2 Peripheral Control Register (PCR)

Controls CA1, CA2, CB1, CB2 behavior:

* Input/output mode
* Active edge selection
* Pulse or handshake modes

---

## 9. Interrupt System

### 9.1 Interrupt Flag Register (IFR)

| Bit | Source                             |
| --: | ---------------------------------- |
|   7 | IRQ status (any enabled interrupt) |
|   6 | Timer 1                            |
|   5 | Timer 2                            |
|   4 | CB1                                |
|   3 | CB2                                |
|   2 | Shift Register                     |
|   1 | CA1                                |
|   0 | CA2                                |

### 9.2 Interrupt Enable Register (IER)

* Bit 7 determines set/clear mode:

  * `1` = set bits
  * `0` = clear bits

```text
Write $80 | mask  enable interrupts
Write $00 | mask  disable interrupts
```

---

## 10. Reset Behavior

On RESET:

* All DDR bits cleared (ports default to input)
* Timers stopped
* Shift register disabled
* Interrupts disabled

---

## 11. Timing Notes

* VIA registers are accessed synchronously with φ2
* Timer counters decrement once per φ2 cycle
* Some operations have side effects when reading/writing registers

---

## 12. Common Use Cases

* Keyboard and joystick interfaces
* Parallel printer interfaces
* Timers and event counting
* Simple serial communications
* General-purpose GPIO expansion

---

## 13. Variants and Related Chips

| Chip  | Notes                         |
| ----- | ----------------------------- |
| 6522  | Original NMOS VIA             |
| 65C22 | CMOS VIA, faster, lower power |
| 6520  | Earlier PIA (simpler)         |

---

## 14. References

* <https://en.wikipedia.org/wiki/MOS_Technology_6522>
* <https://grokipedia.com/page/MOS_Technology_6522>

---
