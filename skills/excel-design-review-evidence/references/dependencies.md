# Dependency and Licensing Notes

The contribution is covered by the repository MIT license. Third-party dependencies retain their own licenses and are installed separately; no third-party source, wheel, PDFium binary, Excel installation, or font is bundled here.

- `openpyxl`: MIT; see https://pypi.org/project/openpyxl/ and the license shipped with its distribution.
- `pypdfium2`: Apache-2.0 or BSD-3-Clause for the library. Its documentation/examples are CC-BY-4.0. See https://pypdfium2.readthedocs.io/en/stable/readme.html#licensing . PDFium and included components have separate notices shipped with wheels. If redistributing binaries, preserve those notices and check the exact build. This skill uses the library API and does not copy its examples or ship binaries.
- Pillow: MIT-CMU; see https://pillow.readthedocs.io/en/stable/about.html#license . Binary distributions may include additional dependency licenses.
- `pywin32`: the project advertises PSF licensing and contains mixed-license components. Its distributed license files and individual notices are authoritative; see https://pypi.org/project/pywin32/ . No components are copied into this skill.
- Microsoft Excel: proprietary, separately licensed desktop application. Installing this skill does not install Excel or grant an Excel license.

Structural inspection uses only `openpyxl`; PDF rendering uses `pypdfium2` and Pillow. PyMuPDF is not required. On systems without desktop Excel, stop after structural inspection rather than claiming that a non-Excel renderer faithfully reproduced the workbook.

Python 3.10 or later is required by the scripts. The tested Windows environment used Python 3.14.5, openpyxl 3.1.5, pypdfium2 5.14.0, Pillow 12.3.0, and pywin32 312. These are observed test versions, not proof that every permitted dependency version has been tested. The Japanese synthetic fixture requests Noto Sans JP; install that font through an approved source if exact fixture typography is required. No font files are distributed.
