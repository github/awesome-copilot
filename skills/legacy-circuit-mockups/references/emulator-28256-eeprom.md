# AT28C256 EEPROM Emulation Specification

## Overview

This document specifies how to **emulate the AT28C256 (32 KB Parallel EEPROM)** in a 6502-based system emulator. The goal is *behavioral accuracy* suitable for SBCs, monitors, and real ROM images, not just generic file-backed storage.

The AT28C256 is commonly used as **ROM** in 6502 systems, but it is *electrically writable* and has timing behaviors that differ from SRAM.

---

## Chip Summary

| Parameter      | Value                  |
| -------------- | ---------------------- |
| Capacity       | 32 KB (256 Kbit)       |
| Organization   | 32,768 x 8             |
| Address Lines  | A0-A14                 |
| Data Lines     | D0-D7                  |
| Supply Voltage | 5V                     |
| Typical Use    | ROM / Firmware storage |

---

## Pin Definitions

| Pin    | Name          | Function               |
| ------ | ------------- | ---------------------- |
| A0-A14 | Address       | Byte address           |
| D0-D7  | Data          | Data bus               |
| /CE    | Chip Enable   | Activates chip         |
| /OE    | Output Enable | Enables output drivers |
| /WE    | Write Enable  | Triggers write cycle   |
| VCC    | +5V           | Power                  |
| GND    | Ground        | Reference              |

---

## Read Cycle Behavior

A read occurs when:

```
/CE = 0
/OE = 0
/WE = 1
```

### Read Rules

* Address must be stable before `/OE` is asserted
* Data appears on D0-D7 after access time (ignored in most emulators)
* Output is **high-impedance** when `/OE = 1` or `/CE = 1`

### Emulator Behavior

```text
if CE == 0 and OE == 0 and WE == 1:
    data_bus = memory[address]
else:
    data_bus = Z
```

---

## Write Cycle Behavior

A write occurs when:

```
/CE = 0
/WE = 0
```

(`/OE` is typically HIGH during writes)

### Important EEPROM Characteristics

* Writes are **not instantaneous**
* Each write triggers an **internal programming cycle**
* During programming, reads may return undefined data

---

## Write Timing Model (Simplified)

### Real Hardware

| Parameter       | Typical  |
| --------------- | -------- |
| Byte Write Time | ~200 µs  |
| Page Size       | 64 bytes |
| Page Write Time | ~10 ms   |

### Emulator Simplification Options

#### Option A - Instant Writes (Common)

* Write immediately updates memory
* No busy state
* Recommended for early emulators

#### Option B - Cycle-Based Busy State (Advanced)

* Track a "write in progress" timer
* Reads during write return last value or `0xFF`
* Writes ignored until cycle completes

---

## Page Write Emulation (Optional)

* Page size: **64 bytes**
* Writes within same page before timeout commit together
* Crossing page boundary wraps within page (hardware quirk)

Simplified rule:

```text
page_base = address & 0xFFC0
page_offset = address & 0x003F
```

---

## Write Protection Behavior

Some systems treat EEPROM as **ROM-only** after programming.

Emulator may support:

* Read-only mode (writes ignored)
* Programmable mode (writes allowed)
* Runtime toggle (simulates programming jumper)

---

## Power-Up State

* EEPROM retains contents
* No undefined data on power-up

Emulator should:

* Load contents from image file
* Preserve data across resets

---

## Bus Contention Rules

| Condition           | Behavior          |
| ------------------- | ----------------- |
| /CE = 1             | Data bus = Z      |
| /OE = 1             | Data bus = Z      |
| /WE = 0 and /OE = 0 | Undefined (avoid) |

Emulator may:

* Prioritize write
* Or flag invalid state

---

## Memory Mapping in 6502 Systems

Common layout:

```
$0000-$7FFF  RAM
$8000-$FFFF  AT28C256 EEPROM
```

### Reset Vector Usage

| Vector | Address     |
| ------ | ----------- |
| RESET  | $FFFC-$FFFD |
| NMI    | $FFFA-$FFFB |
| IRQ    | $FFFE-$FFFF |

---

## Emulator API Model

```c
typedef struct {
    uint8_t memory[32768];
    bool write_enabled;
    bool busy;
    uint32_t busy_cycles;
} AT28C256;
```

### Read

```c
uint8_t eeprom_read(addr);
```

### Write

```c
void eeprom_write(addr, value);
```

---

## Recommended Emulator Defaults

| Feature       | Setting     |
| ------------- | ----------- |
| Write Delay   | Disabled    |
| Page Mode     | Disabled    |
| Write Protect | Enabled     |
| Persistence   | File-backed |

---

## Testing Checklist

* Reset vector fetch
* ROM reads under normal execution
* Writes ignored in read-only mode
* Correct address masking (15 bits)
* No bus drive when disabled

---

## References

* [AT28C256 Datasheet (Microchip)](https://ww1.microchip.com/downloads/aemDocuments/documents/MPD/ProductDocuments/DataSheets/AT28C256-Industrial-Grade-256-Kbit-Paged-Parallel-EEPROM-Data-Sheet-DS20006386.pdf)
* [Ben Eater 6502 Computer Series](https://eater.net/6502)
  * <https://www.youtube.com/watch?v=oO8_2JJV0B4>
* [6502.org Memory Mapping Notes](https://6502.co.uk/lesson/memory-map)

---

## Notes

This specification intentionally mirrors **real hardware quirks** while allowing emulator authors to choose between simplicity and accuracy. It is suitable for:

* Educational emulators
* SBC simulation
* ROM development workflows
* Integration with 6502 + 6522 + SRAM emulation
