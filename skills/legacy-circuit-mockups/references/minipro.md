# minipro Chip Programming Utility Specification

## 1. Overview

**minipro** is an open-source, command-line utility used to **program, read, erase, and verify** a wide range of **EEPROM, Flash, EPROM, SRAM, GAL, and logic devices** using supported universal programmers such as the **T48**, **TL866II Plus**, and compatible models.

It is widely used in **Linux**, **macOS**, and **Windows** environments, especially for **retrocomputing**, **firmware development**, and **electronics prototyping**.

---

## 2. Supported Programmers

| Programmer   | Notes                      |
| ------------ | -------------------------- |
| T48          | Full support (recommended) |
| TL866II Plus | Full support               |
| TL866A / CS  | Limited / legacy support   |

---

## 3. Supported Device Types

### 3.1 Memory Devices

* Parallel EEPROM (e.g., AT28C256)
* Flash memory (29xxx series)
* EPROM (27xxx series)
* SRAM (read/verify only)

### 3.2 Logic and PLDs

* GAL16V8 / GAL22V10
* PAL devices (limited)

### 3.3 Other Devices

* Some microcontrollers (device-dependent)
* Logic IC testing (selected models)

---

## 4. Installation

### 4.1 Linux

```bash
sudo apt install minipro
```

or from source:

```bash
git clone https://github.com/vdudouyt/minipro.git
make
sudo make install
```

### 4.2 Windows

* Install via MSYS2 or prebuilt binaries
* Requires libusb driver (WinUSB)

---

## 5. Basic Command Syntax

```bash
minipro [options]
```

Common options:

| Option        | Description            |
| ------------- | ---------------------- |
| `-p <device>` | Select target device   |
| `-r <file>`   | Read device to file    |
| `-w <file>`   | Write file to device   |
| `-e`          | Erase device           |
| `-v`          | Verify contents        |
| `-I`          | Device information     |
| `-l`          | List supported devices |

---

## 6. Common Programming Operations

### 6.1 List Supported Devices

```bash
minipro -l
```

### 6.2 Identify Device

```bash
minipro -p AT28C256 -I
```

### 6.3 Read a Chip

```bash
minipro -p AT28C256 -r rom_dump.bin
```

### 6.4 Write a Chip

```bash
minipro -p AT28C256 -w rom.bin
```

### 6.5 Verify Only

```bash
minipro -p AT28C256 -v rom.bin
```

---

## 7. Programming EEPROMs (AT28C256 Example)

```bash
minipro -p AT28C256 -w monitor.bin
```

* Software Data Protection is handled automatically
* Write cycle delays are internally managed
* Verification performed after programming

---

## 8. Programming Flash Memory

```bash
minipro -p SST39SF040 -e -w firmware.bin
```

* Erase step required for Flash devices
* Sector erase handled automatically

---

## 9. EPROM Operations

```bash
minipro -p 27C256 -r eprom.bin
```

* UV erase required before reprogramming
* minipro verifies blank state before write

---

## 10. GAL Programming

```bash
minipro -p GAL22V10 -w logic.jed
```

* Uses JEDEC files
* Supports read, write, and verify
* Fuse maps viewable via `-I`

---

## 11. Error Handling and Messages

| Message                | Meaning                    |
| ---------------------- | -------------------------- |
| `Device not found`     | Incorrect device selection |
| `Verification failed`  | Data mismatch              |
| `Chip protected`       | Write protection enabled   |
| `Overcurrent detected` | Insertion or wiring error  |

---

## 12. Safety and Best Practices

* Always confirm device orientation in ZIF socket
* Use correct device identifier (`-p`)
* Do not hot-insert chips during operation
* Use adapters for PLCC, SOP, TSOP packages

---

## 13. Typical Retrocomputing Workflow

1. Assemble ROM image
2. Program EEPROM using minipro + T48
3. Verify contents
4. Install chip in SBC
5. Test system boot

---

## 14. Limitations

* Not all devices are supported
* Some microcontrollers require proprietary tools
* In-circuit programming (ISP) not supported

---

## 15. References

* <https://gitlab.com/DavidGriffith/minipro>
* <https://www.hadex.cz/spec/m545b.pdf>
* <https://github.com/mikeroyal/Firmware-Guide>
* <https://mike42.me/blog/2021-08-a-first-look-at-programmable-logic>
* <https://retrocomputingforum.com/>

---
