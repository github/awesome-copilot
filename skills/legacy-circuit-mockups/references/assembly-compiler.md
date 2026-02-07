# 6502 SBC Assembly Compilation & ROM Build Specification

## Overview

This document defines a **complete specification for compiling 6502 assembly language** for a single-board computer consisting of:

* **MOS 6502 CPU**
* **MOS 6522 VIA**
* **AS6C62256 (32 KB SRAM)**
* **AT28C256 (32 KB EEPROM / ROM)**
* **DFRobot FIT0127 (HD44780-compatible 16x2 LCD)**

The focus is on **toolchain behavior, memory layout, ROM construction, and firmware conventions**, not electrical wiring.

---

## Target System Architecture

### Memory Map (Canonical)

```
$0000-$00FF  Zero Page (RAM)
$0100-$01FF  Stack (RAM)
$0200-$7FFF  General RAM (AS6C62256)
$8000-$8FFF  6522 VIA I/O space
$9000-$FFFF  ROM (AT28C256)
```

> Address decoding may mirror devices; assembler assumes this canonical layout.

---

## ROM Organization (AT28C256)

| Address     | Purpose              |
| ----------- | -------------------- |
| $9000-$FFEF | Program code + data  |
| $FFF0-$FFF9 | Optional system data |
| $FFFA-$FFFB | NMI vector           |
| $FFFC-$FFFD | RESET vector         |
| $FFFE-$FFFF | IRQ/BRK vector       |

ROM image size: **32,768 bytes**

---

## Reset & Startup Convention

On reset:

1. CPU fetches RESET vector at `$FFFC`
2. Code initializes stack pointer
3. Zero-page variables initialized
4. VIA configured
5. LCD initialized
6. Main program entered

---

## Assembler Requirements

Assembler **MUST** support:

* `.org` absolute addressing
* Symbolic labels
* Binary output (`.bin`)
* Little-endian word emission
* Zero-page optimization

Recommended assemblers:

* **ca65** (cc65 toolchain)
* **vasm6502**
* **64tass**

---

## Assembly Source Structure

```asm
;---------------------------
; Reset Vector Entry Point
;---------------------------
        .org $9000
RESET:
        sei
        cld
        ldx #$FF
        txs
        jsr init_via
        jsr init_lcd
MAIN:
        jsr lcd_print
        jmp MAIN
```

---

## Vector Table Definition

```asm
        .org $FFFA
        .word nmi_handler
        .word RESET
        .word irq_handler
```

---

## 6522 VIA Programming Model

### Register Map (Base = $8000)

| Offset | Register |
| ------ | -------- |
| $0     | ORB      |
| $1     | ORA      |
| $2     | DDRB     |
| $3     | DDRA     |
| $4     | T1CL     |
| $5     | T1CH     |
| $6     | T1LL     |
| $7     | T1LH     |
| $8     | T2CL     |
| $9     | T2CH     |
| $B     | ACR      |
| $C     | PCR      |
| $D     | IFR      |
| $E     | IER      |

---

## LCD Interface Convention

### LCD Wiring Assumption

| LCD   | VIA     |
| ----- | ------- |
| D4-D7 | PB4-PB7 |
| RS    | PA0     |
| E     | PA1     |
| R/W   | GND     |

4-bit mode assumed.

---

## LCD Initialization Sequence

```asm
lcd_init:
        lda #$33
        jsr lcd_cmd
        lda #$32
        jsr lcd_cmd
        lda #$28
        jsr lcd_cmd
        lda #$0C
        jsr lcd_cmd
        lda #$06
        jsr lcd_cmd
        lda #$01
        jsr lcd_cmd
        rts
```

---

## LCD Command/Data Interface

| Operation | RS | Data            |
| --------- | -- | --------------- |
| Command   | 0  | Instruction     |
| Data      | 1  | ASCII character |

---

## Zero Page Usage Convention

| Address | Purpose      |
| ------- | ------------ |
| $00-$0F | Scratch      |
| $10-$1F | LCD routines |
| $20-$2F | VIA state    |
| $30-$FF | User-defined |

---

## RAM Usage (AS6C62256)

* Stack uses page `$01`
* All RAM assumed volatile
* No ROM shadowing

---

## Build Pipeline

### Step 1: Assemble

```bash
ca65 main.asm -o main.o
```

### Step 2: Link

```bash
ld65 -C rom.cfg main.o -o rom.bin
```

### Step 3: Pad ROM

Ensure `rom.bin` is exactly **32768 bytes**.

---

## EEPROM Programming

* Target device: **AT28C256**
* Programmer: **MiniPro / T48**
* Verify after write

---

## Emulator Expectations

Emulator must:

* Load ROM at `$9000-$FFFF`
* Emulate VIA I/O side effects
* Render LCD output
* Honor RESET vector

---

## Testing Checklist

* Reset vector execution
* VIA register writes
* LCD displays correct text
* Stack operations valid
* ROM image maps correctly

---

## References

* [MOS 6502 Programming Manual](http://archive.6502.org/datasheets/synertek_programming_manual.pdf)
* [MOS 6522 VIA Datasheet](http://archive.6502.org/datasheets/mos_6522_preliminary_nov_1977.pdf)
* [AT28C256 Datasheet](https://ww1.microchip.com/downloads/aemDocuments/documents/MPD/ProductDocuments/DataSheets/AT28C256-Industrial-Grade-256-Kbit-Paged-Parallel-EEPROM-Data-Sheet-DS20006386.pdf)
* [HD44780 LCD Datasheet](https://www.futurlec.com/LED/LCD16X2BLa.shtml)
* [cc65 Toolchain Docs](https://cc65.github.io/doc/cc65.html)

---

## Notes

This specification is intentionally **end-to-end**: from assembly source to EEPROM image to running hardware or emulator. It defines a stable contract so ROMs, emulators, and real SBCs behave identically.
