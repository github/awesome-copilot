---
name: pptx-denote
description: A skill that allows you to remove all the slide notes in a PowerPoint presentation using the `python-pptx` library.
---

# Remove slide notes from a PowerPoint presentation

A skill that allows you to remove all the slide notes in a PowerPoint presentation using the `python-pptx` library.

## How it works

A user provides a PowerPoint file (with the `.pptx` extension) as input, and the skill processes the file to remove all slide notes. The output is a new PowerPoint file with the same slides but without any notes. If the user does not specify an output file name, the skill will generate a default output file name by appending `-denoted` to the original file name.

Before running the skill, ensure that the `python-pptx` library is installed in your Python environment. You can install it using pip if you haven't done so already:

```bash
pip install python-pptx
```

Then, you can run the skill using the following command:

```bash
python scripts/remove_notes.py "input.pptx" [output.pptx]
```
