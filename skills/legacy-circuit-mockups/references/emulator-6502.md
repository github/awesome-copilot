# 6502 CPU Emulation Specification

A technical Markdown specification for **emulating the MOS Technology 6502 CPU family**, suitable for software emulators, educational tools, testing frameworks, and retrocomputing projects.

---

## 1. Scope

This specification describes the functional requirements for emulating:

* MOS 6502
* WDC 65C02 (where noted)

Out of scope:

* Cycle-exact analog behavior
* Physical bus contention
* Undocumented silicon defects (unless explicitly implemented)

---

## 2. CPU Overview

### Core Characteristics

| Feature       | Value         |
| ------------- | ------------- |
| Data width    | 8-bit         |
| Address width | 16-bit        |
| Address space | 64 KB         |
| Endianness    | Little-endian |
| Clock         | Single-phase  |

---

## 3. Registers

| Register | Size   | Description                |
| -------- | ------ | -------------------------- |
| A        | 8-bit  | Accumulator                |
| X        | 8-bit  | Index register             |
| Y        | 8-bit  | Index register             |
| SP       | 8-bit  | Stack pointer (page $01xx) |
| PC       | 16-bit | Program counter            |
| P        | 8-bit  | Processor status flags     |

### Status Flags (P)

| Bit | Name | Meaning                       |
| --- | ---- | ----------------------------- |
| 7   | N    | Negative                      |
| 6   | V    | Overflow                      |
| 5   | -    | Unused (always 1 when pushed) |
| 4   | B    | Break                         |
| 3   | D    | Decimal                       |
| 2   | I    | IRQ disable                   |
| 1   | Z    | Zero                          |
| 0   | C    | Carry                         |

---

## 4. Memory Model

### Addressing

* 16-bit address bus (`$0000-$FFFF`)
* Byte-addressable

### Required Emulator Interfaces

```text
read(address)  -> byte
write(address, byte)
```

### Stack Behavior

* Stack base: `$0100`
* Push: `write($0100 + SP, value); SP--`
* Pull: `SP++; value = read($0100 + SP)`

---

## 5. Reset and Interrupt Handling

### Reset Sequence

1. Set `I = 1`
2. Set `SP = $FD`
3. Clear `D`
4. Load `PC` from `$FFFC-$FFFD`

### Interrupt Vectors

| Interrupt | Vector Address |
| --------- | -------------- |
| NMI       | `$FFFA-$FFFB`  |
| RESET     | `$FFFC-$FFFD`  |
| IRQ/BRK   | `$FFFE-$FFFF`  |

---

## 6. Instruction Fetch-Decode-Execute Cycle

### Execution Loop (Conceptual)

```text
opcode = read(PC++)
decode opcode
fetch operands
execute instruction
update flags
increment cycles
```

---

## 7. Addressing Modes

| Mode             | Example       | Notes                 |
| ---------------- | ------------- | --------------------- |
| Immediate        | `LDA #$10`    | Constant              |
| Zero Page        | `LDA $20`     | Wraps at $00FF        |
| Absolute         | `LDA $2000`   | Full address          |
| Indexed          | `LDA $2000,X` | Optional page penalty |
| Indirect         | `JMP ($FFFC)` | Page wrap bug         |
| Indexed Indirect | `LDA ($20,X)` | ZP indexed            |
| Indirect Indexed | `LDA ($20),Y` | ZP pointer            |

---

## 8. Instruction Set Requirements

### Categories

* Load/Store
* Arithmetic (ADC, SBC)
* Logic (AND, ORA, EOR)
* Shifts & Rotates
* Branches
* Stack operations
* System control

### Decimal Mode (NMOS 6502)

* Applies to `ADC` and `SBC`
* Uses BCD arithmetic when `D = 1`

---

## 9. Flags Behavior Rules

| Instruction Type | Flags Affected |
| ---------------- | -------------- |
| Loads            | N, Z           |
| ADC/SBC          | N, V, Z, C     |
| CMP/CPX/CPY      | N, Z, C        |
| INC/DEC          | N, Z           |
| Shifts           | N, Z, C        |

---

## 10. Cycle Counting

### Cycle Accuracy Levels

| Level                | Description          |
| -------------------- | -------------------- |
| Functional           | Correct results only |
| Instruction-accurate | Fixed cycle counts   |
| Cycle-accurate       | Page-cross penalties |

### Page Boundary Penalties

* Branch taken: +1 cycle
* Branch crosses page: +2 cycles
* Indexed load crosses page: +1 cycle

---

## 11. Known Hardware Quirks (NMOS 6502)

| Quirk            | Description                     |
| ---------------- | ------------------------------- |
| JMP indirect bug | High byte wrap at page boundary |
| BRK sets B flag  | Only when pushed                |
| Unused flag bit  | Always reads as 1               |

---

## 12. Illegal / Undocumented Opcodes (Optional)

* Many opcodes perform composite operations
* Behavior varies by silicon revision
* Should be disabled or explicitly enabled

---

## 13. Timing and Clocking

* One instruction executed per multiple clock cycles
* Emulator may execute instructions per host tick
* Cycle counter required for I/O timing

---

## 14. Integration with Peripherals

### Memory-Mapped I/O

```text
if address in IO range:
    delegate to device
```

Examples:

* 6522 VIA
* UART
* Video hardware

---

## 15. Testing and Validation

### Recommended Test ROMs

* Klaus Dormann 6502 functional tests
* Interrupt and decimal mode tests

### Validation Checklist

* All instructions execute correctly
* Flags match reference behavior
* Vectors handled properly
* Stack operations correct

---

## 16. Reference Links

* [https://www.masswerk.at/6502/6502_instruction_set.html](https://www.masswerk.at/6502/6502_instruction_set.html)
* [https://www.nesdev.org/wiki/6502](https://www.nesdev.org/wiki/6502)
* [https://github.com/Klaus2m5/6502_65C02_functional_tests](https://github.com/Klaus2m5/6502_65C02_functional_tests)
* [https://en.wikipedia.org/wiki/MOS_Technology_6502](https://en.wikipedia.org/wiki/MOS_Technology_6502)

---

**Document Scope:** Software emulation of the 6502 CPU
**Audience:** Emulator developers, retrocomputing engineers
**Status:** Stable technical reference
