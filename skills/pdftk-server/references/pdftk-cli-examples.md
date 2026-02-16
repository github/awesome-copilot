# PDFtk CLI Examples

PDFtk is a command-line program. Use your computer terminal or command prompt when running these examples.

## Collate Scanned Pages

Interleave even and odd scanned pages into a single document:

```bash
pdftk A=even.pdf B=odd.pdf shuffle A B output collated.pdf
```

If the odd pages are in reverse order:

```bash
pdftk A=even.pdf B=odd.pdf shuffle A Bend-1 output collated.pdf
```

## Decrypt a PDF

Remove encryption from a PDF using its password:

```bash
pdftk secured.pdf input_pw foopass output unsecured.pdf
```

## Encrypt a PDF Using 128-Bit Strength

Apply owner password encryption:

```bash
pdftk 1.pdf output 1.128.pdf owner_pw foopass
```

Require a password to open the PDF as well:

```bash
pdftk 1.pdf output 1.128.pdf owner_pw foo user_pw baz
```

Encrypt while still allowing printing:

```bash
pdftk 1.pdf output 1.128.pdf owner_pw foo user_pw baz allow printing
```

## Join PDFs

Merge multiple PDFs into one:

```bash
pdftk in1.pdf in2.pdf cat output out1.pdf
```

Using handles for explicit control:

```bash
pdftk A=in1.pdf B=in2.pdf cat A B output out1.pdf
```

Using wildcards to merge all PDFs in a directory:

```bash
pdftk *.pdf cat output combined.pdf
```

## Remove Specific Pages

Exclude page 13 from a document:

```bash
pdftk in.pdf cat 1-12 14-end output out1.pdf
```

Using a handle:

```bash
pdftk A=in1.pdf cat A1-12 A14-end output out1.pdf
```

## Apply 40-Bit Encryption

Merge and encrypt with 40-bit strength:

```bash
pdftk 1.pdf 2.pdf cat output 3.pdf encrypt_40bit owner_pw foopass
```

## Join Files When One Is Password-Protected

Supply the password for the encrypted input:

```bash
pdftk A=secured.pdf 2.pdf input_pw A=foopass cat output 3.pdf
```

## Uncompress PDF Page Streams

Decompress internal streams for inspection or debugging:

```bash
pdftk doc.pdf output doc.unc.pdf uncompress
```

## Repair Corrupted PDFs

Pass a broken PDF through pdftk to attempt repair:

```bash
pdftk broken.pdf output fixed.pdf
```

## Burst a PDF into Individual Pages

Split each page into its own file:

```bash
pdftk in.pdf burst
```

Burst with encryption and limited printing:

```bash
pdftk in.pdf burst owner_pw foopass allow DegradedPrinting
```

## Generate a PDF Metadata Report

Export bookmarks, metadata, and page metrics:

```bash
pdftk in.pdf dump_data output report.txt
```

## Rotate Pages

Rotate the first page 90 degrees clockwise:

```bash
pdftk in.pdf cat 1east 2-end output out.pdf
```

Rotate all pages 180 degrees:

```bash
pdftk in.pdf cat 1-endsouth output out.pdf
```

## Fill a PDF Form from Data

Populate form fields from an FDF file:

```bash
pdftk form.pdf fill_form data.fdf output filled_form.pdf
```

Flatten the form after filling (prevents further editing):

```bash
pdftk form.pdf fill_form data.fdf output filled_form.pdf flatten
```

## Apply a Background Watermark

Stamp a watermark behind every page:

```bash
pdftk input.pdf background watermark.pdf output watermarked.pdf
```

## Stamp an Overlay on Top

Apply an overlay PDF on top of every page:

```bash
pdftk input.pdf stamp overlay.pdf output stamped.pdf
```

## Attach Files to a PDF

Embed files as attachments:

```bash
pdftk input.pdf attach_files table.html graph.png output output.pdf
```

## Extract Attachments from a PDF

Unpack all embedded files:

```bash
pdftk input.pdf unpack_files output /path/to/output/
```
