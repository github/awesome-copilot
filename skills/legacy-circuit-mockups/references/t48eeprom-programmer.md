# T48 Universal EEPROM / Flash Programmer Specification

## 1. Overview

The **T48 Universal Programmer** (also sold as **TL866-3G / TL866II Plus successor**) is a USB-connected device used to **read, program, and verify** a wide range of **EEPROM, Flash, EPROM, GAL, and microcontroller devices**. It is commonly used in **retrocomputing**, **firmware development**, and **electronics repair** workflows.

The T48 is a modern replacement for the TL866 series, offering expanded device support and improved software compatibility.

---

## 2. General Characteristics

| Feature             | Description                        |
| ------------------- | ---------------------------------- |
| Programmer type     | Universal device programmer        |
| Interface           | USB 2.0                            |
| Socket              | ZIF-48                             |
| Supported devices   | EEPROM, Flash, EPROM, GAL, MCU     |
| Programming voltage | Generated internally               |
| Host OS             | Windows, Linux (open-source tools) |
| Verification        | Read-after-write, checksum         |

---

## 3. Physical Description

### 3.1 ZIF Socket

* **48-pin Zero Insertion Force (ZIF)** socket
* Supports DIP packages directly
* PLCC, SOP, TSOP supported via adapters

### 3.2 Indicators and Controls

| Item          | Description                 |
| ------------- | --------------------------- |
| Status LED    | Power / activity indication |
| ZIF lever     | Locks IC into socket        |
| USB connector | Host connection and power   |

---

## 4. Supported Device Categories

### 4.1 Memory Devices

* 27xxx EPROM
* 28xxx EEPROM (e.g., AT28C256)
* 29xxx Flash memory
* Serial EEPROMs (with adapters)

### 4.2 Programmable Logic

* GAL16V8, GAL22V10 (read/write/verify)

### 4.3 Microcontrollers (Limited)

* Some PIC, AVR, and 8051-family devices
* Programming support depends on voltage and pinout

---

## 5. Electrical Capabilities

| Parameter      | Description                              |
| -------------- | ---------------------------------------- |
| VCC range      | 1.8 V - 6.5 V (device dependent)         |
| VPP            | Internally generated, device-specific    |
| I/O protection | Over-current and short-circuit protected |

---

## 6. Programming Operations

### 6.1 Common Operations

* Device identification
* Blank check
* Read
* Program (write)
* Verify
* Erase (Flash/EPROM)

### 6.2 Verification Modes

* Byte-by-byte comparison
* Checksum / CRC validation

---

## 7. Software Support

### 7.1 Official Software

* Windows-based GUI
* Device database with pin mappings
* Automatic voltage and timing control

### 7.2 Open-Source Tools

| Tool      | Notes                            |
| --------- | -------------------------------- |
| `minipro` | Linux / macOS / Windows CLI tool |
| libusb    | USB communication backend        |

Example:

```bash
minipro -p AT28C256 -w rom.bin
```

---

## 8. Device Insertion and Pin Mapping

* Device orientation indicated by **pin 1 marker**
* Many devices use **lower-left alignment** in ZIF socket
* Software displays correct insertion diagram

---

## 9. Typical Workflow (EEPROM Example)

1. Select device type (e.g., AT28C256)
2. Insert chip into ZIF socket
3. Perform blank check
4. Load binary image
5. Program device
6. Verify written contents

---

## 10. Power and Safety Notes

* Programmer powered entirely via USB
* Do not insert or remove ICs while programming
* Use adapters for non-DIP packages

---

## 11. Limitations

* Not all microcontrollers are supported
* High-voltage EPROMs may require specific adapters
* Not intended for in-circuit programming (ISP)

---

## 12. Common Use Cases

* Programming EEPROMs for 6502 SBCs
* Flashing ROM images for retro systems
* Reading and backing up legacy EPROMs
* GAL logic development

---

## 13. Comparison with TL866II Plus

| Feature           | TL866II Plus | T48             |
| ----------------- | ------------ | --------------- |
| Device support    | Good         | Expanded        |
| OS support        | Windows      | Windows / Linux |
| Open-source tools | Limited      | Excellent       |

---

## 14. References

* <https://www.bulcomp-eng.com/datasheet/XGecu%20T48%20-%20Introduction.pdf>
* <https://gitlab.com/DavidGriffith/minipro>
* <https://opensource.com/article/23/1/learn-machine-language-retro-computer>

---
