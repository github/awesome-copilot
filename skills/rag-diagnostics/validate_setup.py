#!/usr/bin/env python3
"""
validate_setup.py - Pre-flight checks for RAG base environment

Usage:
  python scripts/validate_setup.py --verbose
  python scripts/validate_setup.py --check azure  # Check only Azure config
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

class ValidationReport:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.checks: List[Dict] = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def check(self, name: str, result: bool, message: str = "", severity: str = "error"):
        """Record a check result"""
        if result:
            self.passed += 1
            status = "âœ… PASS"
        else:
            if severity == "error":
                self.failed += 1
            else:
                self.warnings += 1
            status = f"âš ï¸ {severity.upper()}" if severity == "warning" else "âŒ FAIL"

        self.checks.append({
            "name": name,
            "status": status,
            "message": message
        })

        if self.verbose or not result:
            print(f"{status}: {name}")
            if message:
                print(f"       {message}")

    def summary(self) -> bool:
        """Print summary and return overall pass/fail"""
        print("\n" + "=" * 60)
        print(f"VALIDATION SUMMARY")
        print("=" * 60)
        print(f"âœ… Passed:  {self.passed}")
        print(f"âš ï¸  Warnings: {self.warnings}")
        print(f"âŒ Failed:   {self.failed}")

        if self.failed == 0:
            print("\nâœ… Setup is ready! You can proceed with:")
            print("   1. Populate .env with Azure credentials")
            print("   2. Run: copilot-cli run .github/agents/rag-onboarding.agent.md")
            return True
        else:
            print(f"\nâŒ {self.failed} critical issue(s) found. Fix before proceeding.")
            return False

def validate_environment(report: ValidationReport):
    """Check environment setup"""
    print("\nðŸ“‹ ENVIRONMENT CHECKS")
    print("-" * 60)

    # Check Python version
    py_version = sys.version_info
    is_valid = py_version.major == 3 and py_version.minor >= 10
    report.check(
        "Python version",
        is_valid,
        f"Found {py_version.major}.{py_version.minor}, need >= 3.10"
    )

def validate_folder_structure(report: ValidationReport):
    """Check folder structure"""
    print("\nðŸ“ FOLDER STRUCTURE")
    print("-" * 60)

    base_path = Path(__file__).parent.parent
    required_folders = [
        "agents",
        "docs",
        "skills",
        "instructions",
        "scripts",
        "infra",
        "outputs"
    ]

    for folder in required_folders:
        path = base_path / folder
        exists = path.exists() and path.is_dir()
        report.check(
            f"Folder: {folder}/",
            exists,
            f"Expected at {path}"
        )

    # Check required files
    required_files = [
        "README.md",
        ".env.example",
        "requirements.txt"
    ]

    for file in required_files:
        path = base_path / file
        exists = path.exists() and path.is_file()
        report.check(
            f"File: {file}",
            exists,
            f"Expected at {path}"
        )

def validate_agents(report: ValidationReport):
    """Check agent files"""
    print("\nðŸ¤– AGENT FILES")
    print("-" * 60)

    agents_path = Path(__file__).parent.parent / "agents"
    required_agents = [
        "rag-onboarding.agent.md",
        "rag-azure-setup.agent.md",
        "rag-validate-deployment.agent.md",
        "rag-indexer-specialist.agent.md",
        "rag-indexer-specialist.agent.md",
        "rag-chat.agent.md"
    ]

    for agent in required_agents:
        path = agents_path / agent
        exists = path.exists() and path.is_file()
        report.check(
            f"Agent: {agent}",
            exists,
            f"Expected at {path}"
        )

def validate_documentation(report: ValidationReport):
    """Check documentation files"""
    print("\nðŸ“š DOCUMENTATION")
    print("-" * 60)

    docs_path = Path(__file__).parent.parent / "docs"
    required_docs = [
        "ARQUITECTURA.md",
        "GUIA_OPERACIONES.md",
        "00-INDICE.md"
    ]

    for doc in required_docs:
        path = docs_path / doc
        exists = path.exists() and path.is_file()
        size = path.stat().st_size if exists else 0
        report.check(
            f"Doc: {doc}",
            exists and size > 1000,
            f"Expected at {path} (size: {size} bytes)"
        )

def validate_skills(report: ValidationReport):
    """Check skill files"""
    print("\nðŸŽ¯ SKILLS")
    print("-" * 60)

    skills_path = Path(__file__).parent.parent / "skills"
    required_skills = [
        "rag-rag-rag-agent-instrumentation",
        "rag-deployment-templates",
        "rag-qa-engine"
    ]

    for skill in required_skills:
        path = skills_path / skill
        exists = path.exists() and path.is_dir()
        skill_md = path / "SKILL.md"
        has_skill_md = skill_md.exists()

        report.check(
            f"Skill folder: {skill}/",
            exists,
            f"Expected at {path}"
        )

        report.check(
            f"  -> {skill}/SKILL.md",
            has_skill_md,
            f"Expected at {skill_md}"
        )

def validate_instructions(report: ValidationReport):
    """Check instruction files"""
    print("\nðŸ“ INSTRUCTIONS")
    print("-" * 60)

    instr_path = Path(__file__).parent.parent / "instructions"
    required_instr = [
        "rag-setup-standards.instructions.md"
    ]

    for instr in required_instr:
        path = instr_path / instr
        exists = path.exists() and path.is_file()
        report.check(
            f"Instruction: {instr}",
            exists,
            f"Expected at {path}"
        )

def validate_dependencies(report: ValidationReport):
    """Check dependencies can be imported"""
    print("\nðŸ“¦ DEPENDENCIES")
    print("-" * 60)

    required_packages = [
        "azure.openai",
        "azure.search.documents",
        "azure.identity",
        "azure.monitor.opentelemetry"
    ]

    for package in required_packages:
        try:
            __import__(package)
            report.check(f"Package: {package}", True)
        except ImportError:
            report.check(
                f"Package: {package}",
                False,
                "Run: pip install -r requirements.txt",
                severity="warning"
            )

def validate_env_config(report: ValidationReport):
    """Check .env configuration"""
    print("\nâš™ï¸  ENVIRONMENT CONFIGURATION")
    print("-" * 60)

    base_path = Path(__file__).parent.parent
    env_path = base_path / ".env"
    env_example = base_path / ".env.example"

    example_exists = env_example.exists()
    report.check(
        ".env.example exists",
        example_exists,
        f"Template at {env_example}"
    )

    env_exists = env_path.exists()
    if env_exists:
        # Read .env and check required keys
        try:
            env_vars = {}
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        if '=' in line:
                            key, val = line.split('=', 1)
                            env_vars[key.strip()] = val.strip()

            required_keys = [
                "AZURE_OPENAI_ENDPOINT",
                "AZURE_OPENAI_KEY",
                "AZURE_SEARCH_ENDPOINT",
                "AZURE_SEARCH_KEY"
            ]

            for key in required_keys:
                has_key = key in env_vars
                is_populated = has_key and env_vars[key] and env_vars[key] != "<your-value>"
                report.check(
                    f".env: {key}",
                    is_populated,
                    f"Not populated. Edit .env to add your value."
                )

        except Exception as e:
            report.check(
                ".env parsing",
                False,
                f"Error reading .env: {e}"
            )
    else:
        report.check(
            ".env exists",
            False,
            f"Copy .env.example to .env and populate with Azure credentials",
            severity="warning"
        )

def validate_azure_connectivity(report: ValidationReport):
    """Test Azure connectivity (requires .env)"""
    print("\nðŸ”— AZURE CONNECTIVITY")
    print("-" * 60)

    base_path = Path(__file__).parent.parent
    env_path = base_path / ".env"

    if not env_path.exists():
        report.check(
            "Azure OpenAI endpoint",
            False,
            ".env not found. Skipping connectivity test.",
            severity="warning"
        )
        return

    try:
        from azure.openai import AzureOpenAI
        from azure.search.documents import SearchClient

        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        key = os.getenv("AZURE_OPENAI_KEY")

        if endpoint and key:
            # Just check if we can instantiate client (don't make a call)
            try:
                client = AzureOpenAI(api_key=key, api_version="2024-08-01-preview", azure_endpoint=endpoint)
                report.check(
                    "Azure OpenAI client",
                    True,
                    "Successfully initialized"
                )
            except Exception as e:
                report.check(
                    "Azure OpenAI client",
                    False,
                    f"Failed to initialize: {e}"
                )
        else:
            report.check(
                "Azure credentials in .env",
                False,
                "AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_KEY not set"
            )

    except ImportError:
        report.check(
            "Azure SDK import",
            False,
            "Run: pip install -r requirements.txt",
            severity="warning"
        )

def main():
    parser = argparse.ArgumentParser(description="Validate RAG base setup")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--check", type=str, help="Check specific category: env, folders, agents, docs, skills, deps, azure, all")

    args = parser.parse_args()

    report = ValidationReport(verbose=args.verbose)

    print("\n" + "=" * 60)
    print("ðŸš€ RAG BASE - SETUP VALIDATION")
    print("=" * 60)

    checks = {
        "env": validate_environment,
        "folders": validate_folder_structure,
        "agents": validate_agents,
        "docs": validate_documentation,
        "skills": validate_skills,
        "instructions": validate_instructions,
        "deps": validate_dependencies,
        "config": validate_env_config,
        "azure": validate_azure_connectivity
    }

    if args.check and args.check != "all":
        if args.check in checks:
            checks[args.check](report)
        else:
            print(f"Unknown check: {args.check}")
            print(f"Available: {', '.join(checks.keys())}")
            sys.exit(1)
    else:
        for check_fn in checks.values():
            check_fn(report)

    success = report.summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

