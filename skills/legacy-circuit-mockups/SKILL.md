---
name: legacy-circuit-mockups
description: 'Generate breadboard circuit mockups and visual diagrams using HTML5 Canvas drawing techniques. Use when asked to create circuit layouts, visualize electronic component placements, draw breadboard diagrams, mockup 6502 builds, generate retro computer schematics, or design vintage electronics projects. Supports 555 timers, W65C02S microprocessors, 28C256 EEPROMs, W65C22 VIA chips, 7400-series logic gates, LEDs, resistors, capacitors, switches, buttons, crystals, and wires.'
---

# Legacy Circuit Mockups

A skill for creating breadboard circuit mockups and visual diagrams for retro computing and electronics projects. This skill leverages HTML5 Canvas drawing mechanisms to render interactive circuit layouts featuring vintage components like the 6502 microprocessor, 555 timer ICs, EEPROMs, and 7400-series logic gates.

## When to Use This Skill

- User asks to "create a breadboard layout" or "mockup a circuit"
- User wants to visualize component placement on a breadboard
- User needs a visual reference for building a 6502 computer
- User asks to "draw a circuit" or "diagram electronics"
- User wants to create educational electronics visuals
- User mentions Ben Eater tutorials or retro computing projects
- User asks to mockup 555 timer circuits or LED projects
- User needs to visualize wire connections between components

## Prerequisites

- Understanding of component pinouts from bundled reference files
- Knowledge of breadboard layout conventions (rows, columns, power rails)

## Supported Components

### Microprocessors & Memory

| Component | Pins | Description |
|-----------|------|-------------|
| W65C02S | 40-pin DIP | 8-bit microprocessor with 16-bit address bus |
| 28C256 | 28-pin DIP | 32KB parallel EEPROM |
| W65C22 | 40-pin DIP | Versatile Interface Adapter (VIA) |
| 62256 | 28-pin DIP | 32KB static RAM |

### Logic & Timer ICs

| Component | Pins | Description |
|-----------|------|-------------|
| NE555 | 8-pin DIP | Timer IC for timing and oscillation |
| 7400 | 14-pin DIP | Quad 2-input NAND gate |
| 7402 | 14-pin DIP | Quad 2-input NOR gate |
| 7404 | 14-pin DIP | Hex inverter (NOT gate) |
| 7408 | 14-pin DIP | Quad 2-input AND gate |
| 7432 | 14-pin DIP | Quad 2-input OR gate |

### Passive & Active Components

| Component | Description |
|-----------|-------------|
| LED | Light emitting diode (various colors) |
| Resistor | Current limiting (configurable values) |
| Capacitor | Filtering and timing (ceramic/electrolytic) |
| Crystal | Clock oscillator |
| Switch | Toggle switch (latching) |
| Button | Momentary push button |
| Potentiometer | Variable resistor |
| Photoresistor | Light-dependent resistor |

### Grid System

```javascript
// Standard breadboard grid: 20px spacing
const gridSize = 20;
const cellX = Math.floor(x / gridSize) * gridSize;
const cellY = Math.floor(y / gridSize) * gridSize;
```

### Component Rendering Pattern

```javascript
// All components follow this structure:
{
  type: 'component-type',
  x: gridX,
  y: gridY,
  width: componentWidth,
  height: componentHeight,
  rotation: 0,  // 0, 90, 180, 270
  properties: { /* component-specific data */ }
}
```

### Wire Connections

```javascript
// Wire connection format:
{
  start: { x: startX, y: startY },
  end: { x: endX, y: endY },
  color: '#ff0000'  // Wire color coding
}
```

## Step-by-Step Workflows

### Creating a Basic LED Circuit Mockup

1. Define breadboard dimensions and grid
2. Place power rail connections (+5V and GND)
3. Add LED component with anode/cathode orientation
4. Place current-limiting resistor
5. Draw wire connections between components
6. Add labels and annotations

### Creating a 555 Timer Circuit

1. Place NE555 IC on breadboard (pins 1-4 left, 5-8 right)
2. Connect pin 1 (GND) to ground rail
3. Connect pin 8 (Vcc) to power rail
4. Add timing resistors and capacitors
5. Wire trigger and threshold connections
6. Connect output to LED or other load

### Creating a 6502 Microprocessor Layout

1. Place W65C02S centered on breadboard
2. Add 28C256 EEPROM for program storage
3. Place W65C22 VIA for I/O
4. Add 7400-series logic for address decoding
5. Wire address bus (A0-A15)
6. Wire data bus (D0-D7)
7. Connect control signals (R/W, PHI2, RESB)
8. Add reset button and clock crystal

## Component Pinout Quick Reference

### 555 Timer (8-pin DIP)

| Pin | Name | Function |
|:---:|:-----|:---------|
| 1 | GND | Ground (0V) |
| 2 | TRIG | Trigger (< 1/3 Vcc starts timing) |
| 3 | OUT | Output (source/sink 200mA) |
| 4 | RESET | Active-low reset |
| 5 | CTRL | Control voltage (bypass with 10nF) |
| 6 | THR | Threshold (> 2/3 Vcc resets) |
| 7 | DIS | Discharge (open collector) |
| 8 | Vcc | Supply (+4.5V to +16V) |

### W65C02S (40-pin DIP) - Key Pins

| Pin | Name | Function |
|:---:|:-----|:---------|
| 8 | VDD | Power supply |
| 21 | VSS | Ground |
| 37 | PHI2 | System clock input |
| 40 | RESB | Active-low reset |
| 34 | RWB | Read/Write signal |
| 9-25 | A0-A15 | Address bus |
| 26-33 | D0-D7 | Data bus |

### 28C256 EEPROM (28-pin DIP) - Key Pins

| Pin | Name | Function |
|:---:|:-----|:---------|
| 14 | GND | Ground |
| 28 | VCC | Power supply |
| 20 | CE | Chip enable (active-low) |
| 22 | OE | Output enable (active-low) |
| 27 | WE | Write enable (active-low) |
| 1-10, 21-26 | A0-A14 | Address inputs |
| 11-19 | I/O0-I/O7 | Data bus |

## Formulas Reference

### Resistor Calculations

- **Ohm's Law:** V = I × R
- **LED Current:** R = (Vcc - Vled) / Iled
- **Power:** P = V × I = I² × R

### 555 Timer Formulas

**Astable Mode:**

- Frequency: f = 1.44 / ((R1 + 2×R2) × C)
- High time: t₁ = 0.693 × (R1 + R2) × C
- Low time: t₂ = 0.693 × R2 × C
- Duty cycle: D = (R1 + R2) / (R1 + 2×R2) × 100%

**Monostable Mode:**

- Pulse width: T = 1.1 × R × C

### Capacitor Calculations

- Capacitive reactance: Xc = 1 / (2πfC)
- Energy stored: E = ½ × C × V²

## Color Coding Conventions

### Wire Colors

| Color | Purpose |
|-------|---------|
| Red | +5V / Power |
| Black | Ground |
| Yellow | Clock / Timing |
| Blue | Address bus |
| Green | Data bus |
| Orange | Control signals |
| White | General purpose |

### LED Colors

| Color | Forward Voltage |
|-------|-----------------|
| Red | 1.8V - 2.2V |
| Green | 2.0V - 2.2V |
| Yellow | 2.0V - 2.2V |
| Blue | 3.0V - 3.5V |
| White | 3.0V - 3.5V |

## Build Examples

### Build 1 — Single LED

**Components:** Red LED, 220Ω resistor, jumper wires, power source

**Steps:**

1. Insert black jumper wire from power GND to row A5
2. Insert red jumper wire from power +5V to row J5
3. Place LED with cathode (short leg) in row aligned with GND
4. Place 220Ω resistor between power and LED anode

### Build 2 — 555 Astable Blinker

**Components:** NE555, LED, resistors (10kΩ, 100kΩ), capacitor (10µF)

**Steps:**

1. Place 555 IC straddling center channel
2. Connect pin 1 to GND, pin 8 to +5V
3. Connect pin 4 to pin 8 (disable reset)
4. Wire 10kΩ between pin 7 and +5V
5. Wire 100kΩ between pins 6 and 7
6. Wire 10µF between pin 6 and GND
7. Connect pin 3 (output) to LED circuit

## Troubleshooting

| Issue | Solution |
|-------|----------|
| LED doesn't light | Check polarity (anode to +, cathode to -) |
| Circuit doesn't power | Verify power rail connections |
| IC not working | Check VCC and GND pin connections |
| 555 not oscillating | Verify threshold/trigger capacitor wiring |
| Microprocessor stuck | Check RESB is HIGH after reset pulse |

## References

Detailed component specifications are available in the bundled reference files:

- [555.md](references/555.md) - Complete 555 timer IC specification
- [6502.md](references/6502.md) - MOS 6502 microprocessor details
- [6522.md](references/6522.md) - W65C22 VIA interface adapter
- [28256-eeprom.md](references/28256-eeprom.md) - AT28C256 EEPROM specification
- [6C62256.md](references/6C62256.md) - 62256 SRAM details
- [7400-series.md](references/7400-series.md) - TTL logic gate pinouts
- [assembly-compiler.md](references/assembly-compiler.md) - Assembly compiler specification
- [assembly-language.md](references/assembly-language.md) - Assembly language specification
- [basic-electronic-components.md](references/basic-electronic-components.md) - Resistors, capacitors, switches
- [breadboard.md](references/breadboard.md) - Breadboard specifications
- [common-breadboard-components.md](references/common-breadboard-components.md) - Comprehensive component reference
- [connecting-electronic-components.md](references/connecting-electronic-components.md) - Step-by-step build guides
- [emulator-28256-eeprom.md](references/emulator-28256-eeprom.md) - Emulating 28256-eeprom specification
- [emulator-6502.md](references/emulator-6502.md) - Emulating 6502 specification
- [emulator-6522.md](references/emulator-6522.md) - Emulating 6522 specification
- [emulator-6C62256.md](references/emulator-6C62256.md) - Emulating 6C62256 specification
- [emulator-lcd.md](references/emulator-lcd.md) - Emulating a LCD specification
- [lcd.md](references/lcd.md) - LCD display interfacing
- [minipro.md](references/minipro.md) - EEPROM programmer usage
- [t48eeprom-programmer.md](references/t48eeprom-programmer.md) - T48 programmer reference
