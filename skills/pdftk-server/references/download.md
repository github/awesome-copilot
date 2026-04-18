# Download

PDFtk provides an installer for Windows. Many Linux distributions provide a PDFtk package you can download and install using their package manager.

## Microsoft Windows

Download the PDFtk Server installer for Windows 10 and 11 using the following command:

```bash
winget install --id PDFLabs.PDFtk.Server
```

Then run the installer:

```bash
.\pdftk_server-2.02-win-setup.exe
```

After installation, open a command prompt, type `pdftk` and press Enter. PDFtk will respond by displaying brief usage information.

## Linux

On Debian/Ubuntu-based distributions:

```bash
sudo apt-get install pdftk
```

On Red Hat/Fedora-based distributions:

```bash
sudo dnf install pdftk
```

## PDFtk Server GPL License

PDFtk Server (pdftk) is not public domain software. It can be installed and used at no charge under its [GNU General Public License (GPL) Version 2](https://www.pdflabs.com/docs/pdftk-license/gnu_general_public_license_2.txt). PDFtk uses third-party libraries. The [licenses and source code for these libraries are described here](https://www.pdflabs.com/docs/pdftk-license/) under Third-Party Materials.

## PDFtk Server Redistribution License

If you plan to distribute PDFtk Server as part of your own software, you will need a PDFtk Server Redistribution License. The exception to this rule is if your software is licensed to the public under the GPL or another compatible license.

The commercial redistribution license allows you, subject to the terms of the license, to distribute an unlimited number of PDFtk Server binaries as part of one distinct commercial product. Please read the full license:

[PDFtk Server Redistribution License (PDF)](https://pdflabs.onfastspring.com/pdftk-server)

Now available for $995:

[PDFtk Server Redistribution License](https://www.pdflabs.com/docs/pdftk-license/)

## Build PDFtk Server from Source

PDFtk Server can be compiled from its source code. PDFtk Server is known to compile and run on [Debian](https://packages.debian.org/search?keywords=pdftk), [Ubuntu Linux](https://packages.ubuntu.com/search?keywords=pdftk), [FreeBSD](https://www.freshports.org/print/pdftk/), Slackware Linux, SuSE, Solaris and [HP-UX](http://hpux.connect.org.uk/hppd/hpux/Text/pdftk-1.45/).

Download and unpack the source:

```bash
curl -LO https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/pdftk-2.02-src.zip
unzip pdftk-2.02-src.zip
```

Review the [pdftk license information](https://www.pdflabs.com/docs/pdftk-license/) in: `license_gpl_pdftk/readme.txt`.

Review the Makefile provided for your platform and confirm that `TOOLPATH` and `VERSUFF` suit your installation of gcc/gcj/libgcj. If you run `apropos gcc` and it returns something like `gcc-4.5`, then set `VERSUFF` to `-4.5`. The `TOOLPATH` probably does not need to be set.

Change into the `pdftk` sub-directory and run:

```bash
cd pdftk
make -f Makefile.Debian
```

Substitute your platform's Makefile filename as needed.

PDFtk has been built using gcc/gcj/libgcj versions 3.4.5, 4.4.1, 4.5.0, and 4.6.3. PDFtk 1.4x fails to build on gcc 3.3.5 due to missing libgcj features. If you are using gcc 3.3 or older, try building [pdftk 1.12](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/pdftk-1.12.tar.gz) instead.
