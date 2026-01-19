# MOS Technology 6502 Microprocessor Specification

## 1. Overview

The **MOS Technology 6502** is an 8-bit microprocessor introduced in 1975. It is notable for its low cost, efficient instruction set, and widespread use in early personal computers and game consoles, including the Apple II, Commodore 64, Atari 2600, NES (Ricoh 2A03 variant), and BBC Micro.

---

## 2. General Characteristics

| Feature       | Description              |
| ------------- | ------------------------ |
| Data width    | 8-bit                    |
| Address width | 16-bit                   |
| Address space | 64 KB (0x0000–0xFFFF)    |
| Registers     | A, X, Y, SP, PC, P       |
| Endianness    | Little-endian            |
| Clock speed   | ~1–3 MHz (original NMOS) |
| Technology    | NMOS                     |

---

## 3. Programmer-Visible Registers

### 3.1 Accumulator (A)

* 8-bit register
* Used for arithmetic, logic, and data transfer operations

### 3.2 Index Registers (X, Y)

* 8-bit registers
* Used for indexing memory, counters, and offsets

### 3.3 Stack Pointer (SP)

* 8-bit register
* Points to the current stack location
* Stack resides in page `$0100–$01FF`

### 3.4 Program Counter (PC)

* 16-bit register
* Holds address of next instruction

### 3.5 Processor Status Register (P)

| Bit | Name | Description                   |
| --: | ---- | ----------------------------- |
|   7 | N    | Negative                      |
|   6 | V    | Overflow                      |
|   5 | –    | Unused (always set in pushes) |
|   4 | B    | Break                         |
|   3 | D    | Decimal Mode                  |
|   2 | I    | Interrupt Disable             |
|   1 | Z    | Zero                          |
|   0 | C    | Carry                         |

---

## 4. Memory Map Conventions

| Address Range | Usage                |
| ------------- | -------------------- |
| `$0000–$00FF` | Zero Page            |
| `$0100–$01FF` | Hardware Stack       |
| `$0200–$FFFF` | Program / Data / I/O |

### 4.1 Interrupt Vectors

| Vector  | Address       | Description            |
| ------- | ------------- | ---------------------- |
| NMI     | `$FFFA–$FFFB` | Non-maskable interrupt |
| RESET   | `$FFFC–$FFFD` | Reset vector           |
| IRQ/BRK | `$FFFE–$FFFF` | Interrupt request      |

---

## 5. Addressing Modes

| Mode             | Syntax        | Description             |
| ---------------- | ------------- | ----------------------- |
| Implied          | `CLC`         | Operand implied         |
| Accumulator      | `ASL A`       | Operates on accumulator |
| Immediate        | `LDA #$10`    | Constant value          |
| Zero Page        | `LDA $20`     | Zero-page address       |
| Zero Page,X      | `LDA $20,X`   | Zero-page indexed       |
| Zero Page,Y      | `LDX $20,Y`   | Zero-page indexed       |
| Absolute         | `LDA $1234`   | Full 16-bit address     |
| Absolute,X       | `LDA $1234,X` | Indexed absolute        |
| Absolute,Y       | `LDA $1234,Y` | Indexed absolute        |
| Indirect         | `JMP ($1234)` | Pointer-based jump      |
| Indexed Indirect | `LDA ($20,X)` | X-indexed pointer       |
| Indirect Indexed | `LDA ($20),Y` | Y-indexed pointer       |
| Relative         | `BEQ label`   | Branch offset           |

---

## 6. Instruction Set Summary

### 6.1 Load / Store

* `LDA`, `LDX`, `LDY`
* `STA`, `STX`, `STY`

### 6.2 Register Transfers

* `TAX`, `TAY`, `TXA`, `TYA`, `TSX`, `TXS`

### 6.3 Stack Operations

* `PHA`, `PLA`, `PHP`, `PLP`

### 6.4 Arithmetic

* `ADC` – Add with Carry
* `SBC` – Subtract with Carry

### 6.5 Logical

* `AND`, `ORA`, `EOR`

### 6.6 Shifts and Rotates

* `ASL`, `LSR`, `ROL`, `ROR`

### 6.7 Increment / Decrement

* `INC`, `INX`, `INY`
* `DEC`, `DEX`, `DEY`

### 6.8 Comparisons

* `CMP`, `CPX`, `CPY`

### 6.9 Branching

* `BEQ`, `BNE`, `BMI`, `BPL`, `BCS`, `BCC`, `BVS`, `BVC`

### 6.10 Jumps & Subroutines

* `JMP`, `JSR`, `RTS`, `RTI`

### 6.11 Status Flag Control

* `CLC`, `SEC`, `CLI`, `SEI`, `CLV`, `CLD`, `SED`

### 6.12 System Control

* `BRK`, `NOP`

---

## 7. Cycle Timing (General)

* Most instructions execute in **2–7 cycles**
* Additional cycles may be added for:

  * Page boundary crossings
  * Taken branches

---

## 8. Decimal Mode

When the **D flag** is set:

* `ADC` and `SBC` operate using **BCD arithmetic**
* Only valid on NMOS 6502 (behavior varies on CMOS derivatives)

---

## 9. Known Hardware Quirks

* `JMP (addr)` indirect bug: page boundary wraparound

  * Example: `JMP ($10FF)` reads from `$10FF` and `$1000`
* No dedicated multiply or divide instructions
* Stack is fixed to page `$01xx`

---

## 10. Variants and Derivatives

| Variant | Notes                               |
| ------- | ----------------------------------- |
| 6502    | Original NMOS                       |
| 65C02   | CMOS, fixes bugs, adds instructions |
| 2A03    | NES variant, decimal mode disabled  |
| 6510    | Adds I/O port (Commodore 64)        |

---

## 11. Example Code

```asm
        LDX #$00
loop:   INX
        TXA
        STA $0200,X
        CPX #$10
        BNE loop
        BRK
```

---

## 12. References

* <https://syncopate.us/books/Synertek6502ProgrammingManual.html>
* <https://en.wikipedia.org/wiki/MOS_Technology_6502>
* <https://web.archive.org/web/20061114024257/http://www.westerndesigncenter.com/wdc/documentation/Programmanual.pdf>
* Tutorial excerpts from <https://wilsonminesco.com/6502primer/>
  * <https://wilsonminesco.com/6502primer/LogicFamilies.html>
  * <https://wilsonminesco.com/6502primer/ClkGen.html>
  * <https://wilsonminesco.com/6502primer/RSTreqs.html>
  * <https://wilsonminesco.com/6502primer/displays.html>
  * <https://wilsonminesco.com/6502primer/debug.html>
  * <https://wilsonminesco.com/6502primer/potpourri.html>

---
