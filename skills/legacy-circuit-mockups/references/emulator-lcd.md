# DFRobot FIT0127 LCD Character Display Emulation Specification

## Overview

This document specifies how to **emulate the DFRobot FIT0127 LCD Character Display module**. FIT0127 is a **16x2 character LCD** compatible with the **HD44780 controller**, commonly used in 6502 and microcontroller breadboard systems.

The goal is **functional correctness** for SBC emulators, firmware testing, and UI visualization rather than electrical signal simulation.

---

## Module Summary

| Feature          | Value                   |
| ---------------- | ----------------------- |
| Display Type     | Character LCD           |
| Resolution       | 16 columns x 2 rows     |
| Controller       | HD44780-compatible      |
| Interface        | 8-bit or 4-bit parallel |
| Character Matrix | 5x8 dots                |
| Supply Voltage   | 5V                      |

---

## Pin Definitions

| Pin  | Name  | Function         |
| ---- | ----- | ---------------- |
| 1    | GND   | Ground           |
| 2    | VCC   | +5V              |
| 3    | VO    | Contrast control |
| 4    | RS    | Register Select  |
| 5    | R/W   | Read / Write     |
| 6    | E     | Enable           |
| 7-14 | D0-D7 | Data bus         |
| 15   | A     | Backlight +      |
| 16   | K     | Backlight -      |

---

## Logical Registers

| RS | Register             |
| -- | -------------------- |
| 0  | Instruction Register |
| 1  | Data Register        |

---

## Instruction Set (Subset)

| Command         | Code        | Description               |
| --------------- | ----------- | ------------------------- |
| Clear Display   | `0x01`      | Clears DDRAM, cursor home |
| Return Home     | `0x02`      | Cursor to home position   |
| Entry Mode Set  | `0x04-0x07` | Cursor direction          |
| Display Control | `0x08-0x0F` | Display, cursor, blink    |
| Cursor/Shift    | `0x10-0x1F` | Shift cursor/display      |
| Function Set    | `0x20-0x3F` | Data length, lines        |
| Set CGRAM Addr  | `0x40-0x7F` | Custom chars              |
| Set DDRAM Addr  | `0x80-0xFF` | Cursor position           |

---

## Internal Memory Model

### DDRAM (Display Data RAM)

* Size: 80 bytes
* Line 1 base: `0x00`
* Line 2 base: `0x40`

Emulator mapping:

```text
Row 0: DDRAM[0x00-0x0F]
Row 1: DDRAM[0x40-0x4F]
```

### CGRAM (Character Generator RAM)

* Stores up to 8 custom characters
* 8 bytes per character

---

## Data Write Cycle

A write occurs when:

```
RS = 1
R/W = 0
E: HIGH  LOW
```

### Emulator Behavior

* On falling edge of `E`, latch data
* Write data to DDRAM or CGRAM depending on address mode
* Auto-increment or decrement address based on entry mode

---

## Instruction Write Cycle

A command write occurs when:

```
RS = 0
R/W = 0
E: HIGH  LOW
```

---

## Read Cycle (Optional)

Reads are uncommon in hobby systems.

```
RS = 0/1
R/W = 1
E: HIGH
```

Emulator may simplify:

* Ignore reads entirely
* Or return busy flag + address counter

---

## Busy Flag Emulation

### Real Hardware

* Busy flag = D7
* Commands take 37-1520 µs

### Emulator Options

| Mode       | Behavior          |
| ---------- | ----------------- |
| Simplified | Always ready      |
| Timed      | Busy for N cycles |

Recommended default: **Always ready**

---

## Power-Up State

On reset:

* Display OFF
* Cursor OFF
* DDRAM cleared or undefined
* Address counter = 0

Emulator should:

* Clear DDRAM
* Set cursor to (0,0)
* Display enabled

---

## Cursor and Display Model

State variables:

```text
cursor_row
cursor_col
display_on
cursor_on
blink_on
```

Cursor moves automatically after writes based on entry mode.

---

## 4-bit vs 8-bit Interface

### 8-bit Mode

* Full byte transferred on D0-D7

### 4-bit Mode

* High nibble sent first
* Two enable pulses per byte

Emulator simplification:

* Accept full byte writes
* Ignore nibble timing

---

## Rendering Model (Emulator UI)

Recommended approach:

* Maintain 16x2 character buffer
* Render ASCII subset
* Substitute unsupported glyphs
* Optionally render custom CGRAM chars

---

## Emulator API Model

```c
typedef struct {
    uint8_t ddram[80];
    uint8_t cgram[64];
    uint8_t addr;
    bool display_on;
    bool cursor_on;
    bool blink_on;
    uint8_t entry_mode;
} FIT0127_LCD;
```

---

## Common Wiring in 6502 Systems

```
VIA Port  LCD D4-D7 (4-bit mode)
RS  VIA bit
E   VIA bit
R/W  GND
```

---

## Testing Checklist

* Clear display command
* Cursor positioning via DDRAM addresses
* Sequential character writes
* Line wrap behavior
* Custom character display

---

## References

* [HD44780U Datasheet (Hitachi)](https://academy.cba.mit.edu/classes/output_devices/44780.pdf)
* [Ben Eater LCD Interface Notes](https://hackaday.io/project/174128-db6502/log/181838-adventures-with-hd44780-lcd-controller)
* [Ben Eater's 6502 Computer](https://github.com/tedkotz/be6502)
* [Build a 6502 Computer](https://eater.net/6502)

---

## Notes

This spec intentionally prioritizes **firmware-visible behavior** over electrical accuracy, making it ideal for:

* SBC emulators
* ROM and monitor development
* Automated testing of LCD output
* Educational CPU projects
