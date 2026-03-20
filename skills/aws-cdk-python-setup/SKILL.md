---
name: aws-cdk-python-setup
description: Setup and initialization guide for developing AWS CDK (Cloud Development Kit) applications in Python. This skill enables users to configure environment prerequisites, create new CDK projects, manage dependencies, and deploy to AWS.
---
# AWS CDK Python Setup Instructions

This skill provides setup guidance for working with **AWS CDK (Cloud Development Kit)** projects using **Python**.

---

## Prerequisites

Before starting, ensure the following tools are installed:

- **Node.js** ≥ 14.15.0 — Required for the AWS CDK CLI
- **Python** ≥ 3.7 — Used for writing CDK code
- **AWS CLI** — Manages credentials and resources
- **Git** — Version control and project management

---

## Installation Steps

### 1. Install AWS CDK CLI
```bash
npm install -g aws-cdk
cdk --version
```

### 2. Configure AWS Credentials
```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure credentials
aws configure
```
Enter your AWS Access Key, Secret Access Key, default region, and output format when prompted.

### 3. Create a New CDK Project
```bash
mkdir my-cdk-project
cd my-cdk-project
cdk init app --language python
```

Your project will include:
- `app.py` — Main application entry point
- `my_cdk_project/` — CDK stack definitions
- `requirements.txt` — Python dependencies
- `cdk.json` — Configuration file

### 4. Set Up Python Virtual Environment
```bash
# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 5. Install Python Dependencies
```bash
pip install -r requirements.txt
```
Primary dependencies:
- `aws-cdk-lib` — Core CDK constructs
- `constructs` — Base construct library

---

## Development Workflow

### Synthesize CloudFormation Templates
```bash
cdk synth
```
Generates `cdk.out/` containing CloudFormation templates.

### Deploy Stacks to AWS
```bash
cdk deploy
```
Reviews and confirms deployment to the configured AWS account.

### Bootstrap (First Deployment Only)
```bash
cdk bootstrap
```
Prepares environment resources like S3 buckets for asset storage.

---

## Best Practices

- Always activate the virtual environment before working.
- Run `cdk diff` before deployment to preview changes.
- Use development accounts for testing.
- Follow Pythonic naming and directory conventions.
- Keep `requirements.txt` pinned for consistent builds.

---

## Troubleshooting Tips

If issues occur, check:

- AWS credentials are correctly configured.
- Default region is set properly.
- Node.js and Python versions meet minimum requirements.
- Run `cdk doctor` to diagnose environment issues.
