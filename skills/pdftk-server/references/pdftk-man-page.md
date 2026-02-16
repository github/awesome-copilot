# PDFtk Server Manual Reference

## Overview

PDFtk is a command-line utility for manipulating PDF documents. It enables operations including merging, splitting, rotating, encrypting, decrypting, watermarking, form-filling, and metadata extraction of PDF files.

## Synopsis

```
pdftk [input PDF files | - | PROMPT]
      [input_pw <passwords>]
      [<operation>] [<operation arguments>]
      [output <filename | - | PROMPT>]
      [encrypt_40bit | encrypt_128bit]
      [allow <permissions>]
      [owner_pw <password>] [user_pw <password>]
      [compress | uncompress]
      [flatten] [need_appearances]
      [verbose] [dont_ask | do_ask]
```

## Input Options

**Input PDF Files**: Specify one or more PDFs. Use `-` for stdin or `PROMPT` for interactive input. Files may be assigned handles (single uppercase letters) for reference in operations:

```
pdftk A=file1.pdf B=file2.pdf cat A B output merged.pdf
```

**Input Passwords** (`input_pw`): For encrypted PDFs, provide owner or user passwords associated with file handles or by input order:

```
pdftk A=secured.pdf input_pw A=foopass cat output unsecured.pdf
```

## Core Operations

### cat - Concatenate and Compose

Merge, split, or reorder pages with optional rotation. Supports page ranges, reverse ordering (prefix `r`), page qualifiers (`even`/`odd`), and rotation (compass directions `north`, `south`, `east`, `west`, `left`, `right`, `down`).

Page range syntax: `[handle][begin[-end[qualifier]]][rotation]`

```
pdftk A=in1.pdf B=in2.pdf cat A1-7 B1-5 A8 output combined.pdf
```

### shuffle - Collate Pages

Takes one page from each input range in turn, producing an interleaved result. Useful for collating separately scanned odd and even pages.

```
pdftk A=even.pdf B=odd.pdf shuffle A B output collated.pdf
```

### burst - Split into Individual Pages

Splits a single PDF into one file per page. Output files are named using `printf`-style formatting (default: `pg_%04d.pdf`).

```
pdftk input.pdf burst output page_%02d.pdf
```

### rotate - Rotate Pages

Rotates specified pages while maintaining document order. Uses the same page range syntax as `cat`.

```
pdftk in.pdf cat 1-endeast output rotated.pdf
```

### generate_fdf - Extract Form Data

Creates an FDF file from a PDF form, capturing current field values.

```
pdftk form.pdf generate_fdf output form_data.fdf
```

### fill_form - Populate Form Fields

Fills PDF form fields from an FDF or XFDF data file.

```
pdftk form.pdf fill_form data.fdf output filled.pdf flatten
```

### background - Apply Watermark Behind Content

Applies a single-page PDF as a background (watermark) behind every page of the input. The input PDF should have a transparent background for best results.

```
pdftk input.pdf background watermark.pdf output watermarked.pdf
```

### multibackground - Apply Multi-Page Watermark

Like `background`, but applies corresponding pages from the background PDF to matching pages in the input.

```
pdftk input.pdf multibackground watermarks.pdf output watermarked.pdf
```

### stamp - Overlay on Top of Content

Stamps a single-page PDF on top of every page of the input. Use this instead of `background` when the overlay PDF is opaque or has no transparency.

```
pdftk input.pdf stamp overlay.pdf output stamped.pdf
```

### multistamp - Multi-Page Overlay

Like `stamp`, but applies corresponding pages from the stamp PDF to matching pages in the input.

```
pdftk input.pdf multistamp overlays.pdf output stamped.pdf
```

### dump_data - Export Metadata

Outputs PDF metadata, bookmarks, and page metrics to a text file.

```
pdftk input.pdf dump_data output metadata.txt
```

### dump_data_utf8 - Export Metadata (UTF-8)

Same as `dump_data`, but outputs UTF-8 encoded text.

```
pdftk input.pdf dump_data_utf8 output metadata_utf8.txt
```

### dump_data_fields - Extract Form Field Info

Reports form field information including type, name, and values.

```
pdftk form.pdf dump_data_fields output fields.txt
```

### dump_data_fields_utf8 - Extract Form Field Info (UTF-8)

Same as `dump_data_fields`, but outputs UTF-8 encoded text.

### dump_data_annots - Extract Annotations

Reports PDF annotation information.

```
pdftk input.pdf dump_data_annots output annots.txt
```

### update_info - Modify Metadata

Updates PDF metadata and bookmarks from a text file (same format as `dump_data` output).

```
pdftk input.pdf update_info metadata.txt output updated.pdf
```

### update_info_utf8 - Modify Metadata (UTF-8)

Same as `update_info`, but expects UTF-8 encoded input.

### attach_files - Embed Files

Attaches files to a PDF, optionally at a specific page.

```
pdftk input.pdf attach_files table.html graph.png to_page 6 output output.pdf
```

### unpack_files - Extract Attachments

Extracts file attachments from a PDF.

```
pdftk input.pdf unpack_files output /path/to/output/
```

## Output Options

| Option | Description |
|--------|-------------|
| `output <filename>` | Specify output file. Use `-` for stdout or `PROMPT` for interactive. |
| `encrypt_40bit` | Apply 40-bit RC4 encryption |
| `encrypt_128bit` | Apply 128-bit RC4 encryption (default when password set) |
| `owner_pw <password>` | Set the owner password |
| `user_pw <password>` | Set the user password |
| `allow <permissions>` | Grant specific permissions (see below) |
| `compress` | Compress page streams |
| `uncompress` | Decompress page streams (useful for debugging) |
| `flatten` | Flatten form fields into page content |
| `need_appearances` | Signal viewer to regenerate field appearances |
| `keep_first_id` | Preserve document ID from first input |
| `keep_final_id` | Preserve document ID from last input |
| `drop_xfa` | Remove XFA form data |
| `verbose` | Enable detailed operation output |
| `dont_ask` | Suppress interactive prompts |
| `do_ask` | Enable interactive prompts |

## Permissions

Use with the `allow` keyword when encrypting. Available permissions:

| Permission | Description |
|------------|-------------|
| `Printing` | Allow high-quality printing |
| `DegradedPrinting` | Allow low-quality printing |
| `ModifyContents` | Allow content modification |
| `Assembly` | Allow document assembly |
| `CopyContents` | Allow content copying |
| `ScreenReaders` | Allow screen reader access |
| `ModifyAnnotations` | Allow annotation modification |
| `FillIn` | Allow form fill-in |
| `AllFeatures` | Grant all permissions |

## Key Notes

- Page numbers are one-based; use the `end` keyword for the final page
- Handles are optional when working with a single PDF
- Filter mode (no operation specified) applies output options without restructuring
- Reverse page references use the `r` prefix (e.g., `r1` = last page, `r2` = second-to-last)
- The `background` operation requires a transparent input; use `stamp` for opaque overlay PDFs
- Output filename cannot match any input filename
