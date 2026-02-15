# 6502 Assembly Language with AT28C256 EEPROM

A practical specification for writing **6502/65C02 assembly language programs** intended to be stored in and executed from an **AT28C256 (32 KB) parallel EEPROM** in single-board computers (SBCs) and retro systems.

---

## 1. Scope and Assumptions

This document assumes:

* A **6502-family CPU** (6502, 65C02, or compatible)
* Program code stored in an **AT28C256 (32K x 8) EEPROM**
* Memory-mapped I/O (e.g., 6522 VIA)
* Reset and interrupt vectors located in EEPROM
* External RAM mapped elsewhere (e.g., 62256 SRAM)

---

## 2. AT28C256 EEPROM Overview

| Parameter      | Value               |
| -------------- | ------------------- |
| Capacity       | 32 KB (32768 bytes) |
| Address Lines  | A0-A14              |
| Data Lines     | D0-D7               |
| Access Time    | ~150 ns             |
| Supply Voltage | 5 V                 |
| Package        | DIP-28 / PLCC       |

### Typical Memory Map Usage

| Address Range | Usage                   |
| ------------- | ----------------------- |
| `$8000-$FFFF` | EEPROM (code + vectors) |
| `$FFFA-$FFFF` | Interrupt vectors       |

---

## 3. 6502 Memory Map Example

```
$0000-$00FF  Zero Page (RAM)
$0100-$01FF  Stack
$0200-$7FFF  RAM / I/O
$8000-$FFFF  AT28C256 EEPROM
```

---

## 4. Reset and Interrupt Vectors

The 6502 reads vectors from the **top of memory**:

| Vector  | Address       | Description            |
| ------- | ------------- | ---------------------- |
| NMI     | `$FFFA-$FFFB` | Non-maskable interrupt |
| RESET   | `$FFFC-$FFFD` | Reset entry point      |
| IRQ/BRK | `$FFFE-$FFFF` | Maskable interrupt     |

### Vector Definition Example

```asm
        .org $FFFA
        .word nmi_handler
        .word reset
        .word irq_handler
```

---

## 5. Assembly Program Structure

### Typical Layout

```asm
        .org $8000

reset:
        sei             ; Disable IRQs
        cld             ; Clear decimal mode
        ldx #$FF
        txs             ; Initialize stack

main:
        jmp main
```

---

## 6. Essential 6502 Instructions

### Registers

| Register | Purpose          |
| -------- | ---------------- |
| A        | Accumulator      |
| X, Y     | Index registers  |
| SP       | Stack pointer    |
| PC       | Program counter  |
| P        | Processor status |

### Common Instructions

| Instruction | Function               |
| ----------- | ---------------------- |
| LDA/STA     | Load/store accumulator |
| LDX/LDY     | Load index registers   |
| JMP/JSR     | Jump / subroutine      |
| RTS         | Return from subroutine |
| BEQ/BNE     | Conditional branch     |
| SEI/CLI     | Disable/enable IRQ     |

---

## 7. Addressing Modes (Common)

| Mode      | Example       | Notes        |
| --------- | ------------- | ------------ |
| Immediate | `LDA #$01`    | Constant     |
| Zero Page | `LDA $00`     | Fast         |
| Absolute  | `LDA $8000`   | Full address |
| Indexed   | `LDA $2000,X` | Tables       |
| Indirect  | `JMP ($FFFC)` | Vectors      |

---

## 8. Writing Code for EEPROM Execution

### Key Considerations

* Code is **read-only at runtime**
* Self-modifying code not recommended
* Place jump tables and constants in EEPROM
* Use RAM for variables and stack

### Zero Page Variable Example

```asm
counter = $00

        lda #$00
        sta counter
```

---

## 9. Timing and Performance

* EEPROM access time must meet CPU clock requirements
* AT28C256 supports ~1 MHz comfortably
* Faster clocks may require wait states or ROM shadowing

---

## 10. Example: Simple LED Toggle (Memory-Mapped I/O)

```asm
PORTB = $6000
DDRB  = $6002

        .org $8000
reset:
        sei
        ldx #$FF
        txs

        lda #$FF
        sta DDRB

loop:
        lda #$FF
        sta PORTB
        jsr delay
        lda #$00
        sta PORTB
        jsr delay
        jmp loop
```

---

## 11. Assembling and Programming Workflow

1. Write source (`.asm`)
2. Assemble to binary
3. Pad or relocate to `$8000`
4. Program AT28C256 via T48 / minipro
5. Insert EEPROM and reset CPU

---

## 12. Assembler Directives (Common)

| Directive  | Purpose                     |
| ---------- | --------------------------- |
| `.org`     | Set program origin          |
| `.byte`    | Define byte                 |
| `.word`    | Define word (little-endian) |
| `.include` | Include file                |
| `.equ`     | Constant definition         |

---

## 13. Common Mistakes

| Issue                      | Result             |
| -------------------------- | ------------------ |
| Missing vectors            | CPU hangs on reset |
| Wrong `.org`               | Code not executed  |
| Using RAM addresses in ROM | Crash              |
| Stack not initialized      | Undefined behavior |

---

## 14. Reference Links

* [https://www.masswerk.at/6502/6502_instruction_set.html](https://www.masswerk.at/6502/6502_instruction_set.html)
* [https://www.nesdev.org/wiki/6502](https://www.nesdev.org/wiki/6502)
* [https://www.westerndesigncenter.com/wdc/documentation](https://www.westerndesigncenter.com/wdc/documentation)
* [https://en.wikipedia.org/wiki/MOS_Technology_6502](https://en.wikipedia.org/wiki/MOS_Technology_6502)

---

**Document Scope:** 6502 assembly stored in AT28C256 EEPROM
**Audience:** Retrocomputing, SBC designers, embedded hobbyists
**Status:** Stable reference
