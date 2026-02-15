# Runnable Recipe Examples

This folder contains standalone, executable Python examples for each cookbook recipe. Each file can be run directly as a Python script.

## Prerequisites

- Python 3.8 or later
- Install dependencies (this installs the SDK from PyPI):

```bash
pip install -r requirements.txt
```

## Running Examples

Each `.py` file is a complete, runnable program with executable permissions:

```bash
python <filename>.py
# or on Unix-like systems:
./<filename>.py
```

### Available Recipes

| Recipe               | Command                          | Description                                |
| -------------------- | -------------------------------- | ------------------------------------------ |
| Error Handling       | `python error_handling.py`       | Demonstrates error handling patterns       |
| Multiple Sessions    | `python multiple_sessions.py`    | Manages multiple independent conversations |
| Managing Local Files | `python managing_local_files.py` | Organizes files using AI grouping          |
| PR Visualization     | `python pr_visualization.py`     | Generates PR age charts                    |
| Persisting Sessions  | `python persisting_sessions.py`  | Save and resume sessions across restarts   |

### Examples with Arguments

**PR Visualization with specific repo:**

```bash
python pr_visualization.py --repo github/copilot-sdk
```

**Managing Local Files (edit the file to change target folder):**

```bash
# Edit the target_folder variable in managing_local_files.py first
python managing_local_files.py
```

## Local SDK Development

The `requirements.txt` installs the Copilot SDK package from PyPI. This means:

- You get the latest stable release of the SDK
- No need to build from source
- Perfect for using the SDK in your projects

If you want to use a local development version, edit requirements.txt to use `-e ../..` for editable mode development.

## Python Best Practices

These examples follow Python conventions:

- PEP 8 naming (snake_case for functions and variables)
- Shebang line for direct execution
- Proper exception handling
- Type hints where appropriate
- Standard library usage

## Virtual Environment (Recommended)

For isolated development:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Learning Resources

- [Python Documentation](https://docs.python.org/3/)
- [PEP 8 Style Guide](https://pep8.org/)
- [GitHub Copilot SDK for Python](https://github.com/github/copilot-sdk/blob/main/python/README.md)
- [Parent Cookbook](../README.md)
