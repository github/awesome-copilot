---
description: 'Setup instructions for AWS CDK Python projects'
applyTo: '**/*.py'
---

# AWS CDK Python Setup Instructions

This instructions file provides guidance for setting up and working with AWS CDK (Cloud Development Kit) projects using Python. These instructions apply to Python files in CDK projects.

## Prerequisites

Before starting with AWS CDK Python development, ensure you have the following installed:

- **Node.js** (version 14.15.0 or later) - Required for the AWS CDK CLI
- **Python** (version 3.7 or later)
- **AWS CLI** - For configuring AWS credentials and managing AWS resources
- **Git** - For version control

## Installation Steps

### 1. Install AWS CDK CLI

The AWS CDK CLI is a Node.js package that provides the `cdk` command.

```bash
npm install -g aws-cdk
```

Verify the installation:

```bash
cdk --version
```

### 2. Configure AWS Credentials

Install and configure the AWS CLI:

```bash
# Install AWS CLI (if not already installed)
# On macOS, you can use Homebrew:
brew install awscli

# Configure AWS credentials
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, default region, and output format when prompted.

### 3. Create a New CDK Project

Create a new directory for your CDK project and initialize it:

```bash
mkdir my-cdk-project
cd my-cdk-project
cdk init app --language python
```

This creates a basic CDK app structure with:
- `app.py` - Main application entry point
- `my_cdk_project/` - Python package containing your CDK stacks
- `requirements.txt` - Python dependencies
- `cdk.json` - CDK configuration

### 4. Set Up Python Virtual Environment

CDK Python projects include a virtual environment. Activate it:

```bash
# On macOS/Linux
source .venv/bin/activate

# On Windows
.venv\Scripts\activate
```

### 5. Install Python Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

The main dependencies include:
- `aws-cdk-lib` - Core CDK constructs
- `constructs` - Base construct library

## Development Workflow

### Synthesize CloudFormation Templates

Generate CloudFormation templates from your CDK code:

```bash
cdk synth
```

This creates `cdk.out/` directory with synthesized templates.

### Deploy to AWS

Deploy your CDK stacks to AWS:

```bash
cdk deploy
```

Review the changes and confirm deployment when prompted.

### Bootstrap (First Time Only)

If deploying to a new AWS account/region, bootstrap the environment:

```bash
cdk bootstrap
```

This sets up necessary resources like S3 buckets for storing assets.

## Best Practices

- Always activate the virtual environment before working
- Use `cdk diff` to preview changes before deployment
- Test deployments in development accounts first
- Use AWS CDK constructs for infrastructure as code
- Follow Python naming conventions and structure

## Troubleshooting

- Ensure AWS credentials are properly configured
- Check that the correct AWS region is set
- Verify Node.js and Python versions meet requirements
- Use `cdk doctor` to diagnose common issues

For detailed documentation, refer to the official AWS CDK documentation and the attached `awscdk.pdf` file.
