# Common Breadboard Electronic Components

A practical reference for **breadboard-based electronics**, covering common components, formulas, tables, pinouts, and learning references. Suitable for beginners through intermediate hardware builders.

---

## 1. Resistors

### Description

Resistors limit current, divide voltage, and set bias points.

### Common Types

| Type          | Notes       | Typical Use        |
| ------------- | ----------- | ------------------ |
| Carbon Film   | Cheap, ±5%  | General purpose    |
| Metal Film    | Stable, ±1% | Precision circuits |
| Wirewound     | High power  | Power dissipation  |
| Potentiometer | Adjustable  | Volume, tuning     |

### Standard Values (E12 Series)

`10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 x 10^n`

### Color Code

| Band | Meaning      |
| ---- | ------------ |
| 1    | First digit  |
| 2    | Second digit |
| 3    | Multiplier   |
| 4    | Tolerance    |

### Power Ratings

| Rating | Typical Size        |
| ------ | ------------------- |
| 1/8 W  | Small               |
| 1/4 W  | Breadboard standard |
| 1/2 W  | Large               |

### Formulas

* **Ohm's Law:** `V = I x R`
* **Power:** `P = V × I = I² × R = V² / R`

### Reference

* [https://en.wikipedia.org/wiki/Resistor](https://en.wikipedia.org/wiki/Resistor)

---

## 2. Capacitors

### Description

Capacitors store electrical energy and block DC while passing AC.

### Common Types

| Type         | Polarized | Typical Use        |
| ------------ | --------- | ------------------ |
| Ceramic      | No        | Decoupling, bypass |
| Electrolytic | Yes       | Bulk filtering     |
| Tantalum     | Yes       | Compact filtering  |
| Film         | No        | Signal coupling    |

### Common Values

| Range | Example          |
| ----- | ---------------- |
| pF    | 10pF, 100pF      |
| nF    | 100nF (0.1µF)    |
| µF    | 1µF, 10µF, 100µF |

### Voltage Rating Rule

> Capacitor voltage rating ≥ **2x circuit voltage**

### Formulas

* **Capacitive Reactance:** `Xc = 1 / (2πfC)`
* **Energy Stored:** `E = ½ C V²`

### Reference

* [https://en.wikipedia.org/wiki/Capacitor](https://en.wikipedia.org/wiki/Capacitor)

---

## 3. Inductors

### Description

Inductors store energy in a magnetic field and resist changes in current.

### Common Types

| Type         | Use               |
| ------------ | ----------------- |
| Air-core     | RF circuits       |
| Ferrite-core | Power filtering   |
| Choke        | Noise suppression |

### Formula

* **Inductive Reactance:** `XL = 2πfL`

### Reference

* [https://en.wikipedia.org/wiki/Inductor](https://en.wikipedia.org/wiki/Inductor)

---

## 4. Diodes

### Description

Diodes allow current flow in one direction only.

### Common Types

| Type      | Typical Part | Use                   |
| --------- | ------------ | --------------------- |
| Rectifier | 1N4007       | Power                 |
| Signal    | 1N4148       | Logic, fast switching |
| Zener     | 1N4733A      | Voltage regulation    |
| Schottky  | 1N5819       | Low drop              |

### Key Parameters

| Parameter       | Typical                    |
| --------------- | -------------------------- |
| Forward Voltage | 0.7V (Si), 0.3V (Schottky) |
| Reverse Voltage | Device-specific            |

### Reference

* [https://en.wikipedia.org/wiki/Diode](https://en.wikipedia.org/wiki/Diode)

---

## 5. LEDs (Light Emitting Diodes)

### Description

LEDs emit light when forward biased.

### Typical Forward Voltage

| Color | Vf       |
| ----- | -------- |
| Red   | 1.8-2.2V |
| Green | 2.0-3.0V |
| Blue  | 3.0-3.3V |

### Current Limiting Resistor

`R = (V_supply - V_LED) / I_LED`

### Reference

* [https://en.wikipedia.org/wiki/Light-emitting_diode](https://en.wikipedia.org/wiki/Light-emitting_diode)

---

## 6. Transistors

### BJT (Bipolar Junction Transistor)

| Type | Example | Use                      |
| ---- | ------- | ------------------------ |
| NPN  | 2N3904  | Switching, amplification |
| PNP  | 2N3906  | High-side switching      |

**Key Formula:**

* `Ic ≈ β × Ib`

### MOSFET

| Type      | Example | Use                   |
| --------- | ------- | --------------------- |
| N-channel | IRLZ44N | Logic-level switching |
| P-channel | IRF9540 | High-side control     |

### Reference

* [https://en.wikipedia.org/wiki/Transistor](https://en.wikipedia.org/wiki/Transistor)

---

## 7. Integrated Circuits (DIP)

### Common Logic Families

| Family      | Voltage | Notes               |
| ----------- | ------- | ------------------- |
| TTL (74LS)  | 5V      | Legacy              |
| CMOS (74HC) | 2-6V    | Breadboard-friendly |

### Decoupling Rule

> Place **0.1µF ceramic capacitor** across Vcc and GND per IC

### Reference

* [https://en.wikipedia.org/wiki/Integrated_circuit](https://en.wikipedia.org/wiki/Integrated_circuit)

---

## 8. Switches & Buttons

| Type    | Use             |
| ------- | --------------- |
| Tactile | Momentary input |
| Slide   | Mode select     |
| Toggle  | Power           |

### Debounce (RC Approximation)

* Typical: `10kΩ + 100nF`

---

## 9. Breadboards

### Description

Solderless prototyping boards with internal bus connections.

### Internal Wiring

* Rows: connected horizontally (5 holes)
* Rails: connected vertically (power)

### Limitations

* Not suitable for high-frequency or high-current circuits

### Reference

* [https://en.wikipedia.org/wiki/Breadboard](https://en.wikipedia.org/wiki/Breadboard)

---

## 10. Common Accessories

| Item             | Purpose           |
| ---------------- | ----------------- |
| Jumper wires     | Connections       |
| USB power module | 5V / 3.3V supply  |
| Multimeter       | Measurement       |
| Logic probe      | Digital debugging |

---

## 11. Quick Reference Formulas

| Formula         | Description          |
| --------------- | -------------------- |
| `V = IR`        | Ohm's Law            |
| `P = VI`        | Power                |
| `Xc = 1/(2πfC)` | Capacitive reactance |
| `XL = 2πfL`     | Inductive reactance  |
| `E = ½CV²`      | Capacitor energy     |

---

## 12. Learning Resources

* [https://learn.sparkfun.com](https://learn.sparkfun.com)
* [https://www.allaboutcircuits.com](https://www.allaboutcircuits.com)
* [https://www.electronics-tutorials.ws](https://www.electronics-tutorials.ws)
* [https://en.wikipedia.org/wiki/Electronics](https://en.wikipedia.org/wiki/Electronics)

---

**Document Purpose:** Practical breadboard electronics reference
**Scope:** Hobbyist, education, prototyping
