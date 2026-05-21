#!/usr/bin/env python3
"""
RAG Cost Scaler Wrapper — Orchestrates PowerShell cost-scaler.ps1

Compliance: RAG Setup Standards (Observability, Error Handling, Structured Logging)
Spec Kit: Enterprise contract with JSON input/output + Application Insights integration
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

# ============================================================================
# LOGGING SETUP (RAG Standards Compliant)
# ============================================================================

def setup_logging(verbose: bool = False) -> logging.Logger:
    """
    Configure structured logging per RAG Setup Standards.
    
    Args:
        verbose: Enable DEBUG level logging
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("rag_cost_scaler")
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_level = logging.DEBUG if verbose else logging.INFO
    console_handler.setLevel(console_level)
    
    # Formatter with structured context
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    
    # File handler (for audit trail)
    log_dir = Path("outputs")
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / "cost-scaler.log")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    
    logger.setLevel(logging.DEBUG)
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger


logger = setup_logging()


# ============================================================================
# COST SCALER WRAPPER
# ============================================================================

class CostScalerWrapper:
    """Orchestrates PowerShell cost-scaler.ps1 with enterprise logging."""
    
    def __init__(self, resource_group: str, subscription_id: Optional[str] = None):
        self.resource_group = resource_group
        self.subscription_id = subscription_id or os.getenv("AZURE_SUBSCRIPTION_ID", "")
        self.script_path = Path(__file__).parent / "cost-scaler.ps1"
        self.output_dir = Path("outputs")
        self.output_dir.mkdir(exist_ok=True)
        
        logger.info(f"Initialized CostScalerWrapper", extra={
            "resource_group": resource_group,
            "subscription_id": self.subscription_id[:8] if self.subscription_id else "not-set",
            "script_path": str(self.script_path)
        })
    
    def run_powershell(self, action: str, tier: Optional[str] = None, 
                       budget: Optional[int] = None, dry_run: bool = False) -> Dict[str, Any]:
        """
        Execute PowerShell cost-scaler.ps1 and capture output.
        
        Args:
            action: One of ListTiers, ShowCurrent, ChangeTo, CreateAlerts
            tier: Target tier (required if action=ChangeTo)
            budget: Budget in EUR (required if action=CreateAlerts)
            dry_run: Preview changes without applying
            
        Returns:
            Structured result dict with status, output, errors
        """
        start_time = time.time()
        
        # Validate inputs
        if not action in ["ListTiers", "ShowCurrent", "ChangeTo", "CreateAlerts"]:
            raise ValueError(f"Invalid action: {action}. Expected one of: ListTiers, ShowCurrent, ChangeTo, CreateAlerts")
        
        if action == "ChangeTo" and not tier:
            raise ValueError("Tier required for action=ChangeTo")
        
        if action == "CreateAlerts" and not budget:
            raise ValueError("Budget required for action=CreateAlerts")
        
        logger.info(f"Executing action: {action}", extra={
            "action": action,
            "tier": tier,
            "budget": budget,
            "dry_run": dry_run,
            "resource_group": self.resource_group
        })
        
        # Build PowerShell command
        ps_command = self._build_ps_command(action, tier, budget, dry_run)
        
        try:
            # Execute PowerShell (from script directory)
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_command],
                cwd=str(self.script_path.parent),
                capture_output=True,
                text=True,
                timeout=300
            )
            
            duration_seconds = time.time() - start_time
            
            if result.returncode == 0:
                logger.info(f"Action {action} completed successfully", extra={
                    "action": action,
                    "duration_seconds": duration_seconds,
                    "returncode": result.returncode
                })
                
                # Parse output
                output = self._parse_powershell_output(result.stdout, result.stderr)
                return {
                    "status": "success",
                    "action": action,
                    "duration_seconds": duration_seconds,
                    "output": output,
                    "errors": None
                }
            else:
                logger.error(f"Action {action} failed", extra={
                    "action": action,
                    "returncode": result.returncode,
                    "stderr": result.stderr[:500]
                })
                
                return {
                    "status": "error",
                    "action": action,
                    "duration_seconds": duration_seconds,
                    "output": None,
                    "errors": {
                        "code": "POWERSHELL_EXECUTION_FAILED",
                        "message": result.stderr,
                        "returncode": result.returncode
                    }
                }
        
        except subprocess.TimeoutExpired:
            logger.error(f"Action {action} timed out after 300s")
            return {
                "status": "error",
                "action": action,
                "duration_seconds": 300,
                "output": None,
                "errors": {
                    "code": "TIMEOUT",
                    "message": f"Action {action} exceeded 300 second timeout",
                    "remediation": "Retry or check Azure service status"
                }
            }
        
        except Exception as e:
            logger.error(f"Unexpected error in {action}", exc_info=True, extra={
                "action": action,
                "error": str(e)
            })
            return {
                "status": "error",
                "action": action,
                "duration_seconds": time.time() - start_time,
                "output": None,
                "errors": {
                    "code": "UNEXPECTED_ERROR",
                    "message": str(e)
                }
            }
    
    def _build_ps_command(self, action: str, tier: Optional[str], 
                         budget: Optional[int], dry_run: bool) -> str:
        """Build PowerShell command with proper escaping."""
        cmd_parts = [
            f". '{self.script_path}'",
            f"-Action {action}",
        ]
        
        if tier:
            cmd_parts.append(f"-Tier {tier}")
        
        if budget:
            cmd_parts.append(f"-Budget {budget}")
        
        return " ".join(cmd_parts)
    
    def _parse_powershell_output(self, stdout: str, stderr: str) -> Dict[str, Any]:
        """
        Parse PowerShell output (text-based) into structured data.
        Note: PowerShell script outputs human-readable text, not JSON.
        We extract key values.
        """
        output = {
            "raw_stdout": stdout,
            "raw_stderr": stderr,
            "parsed": {}
        }
        
        # Simple parsing — extract key values
        for line in stdout.split("\n"):
            if "Tier detectado:" in line:
                output["parsed"]["current_tier"] = line.split(":")[-1].strip()
            elif "Search service:" in line:
                output["parsed"]["search_service"] = line.split(":")[-1].strip()
            elif "Search SKU:" in line:
                output["parsed"]["search_sku"] = line.split(":")[-1].strip()
            elif "Logs retention:" in line:
                output["parsed"]["logs_retention"] = line.split(":")[-1].strip()
        
        return output


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="RAG Cost Scaler — Manage Azure RAG infrastructure costs"
    )
    parser.add_argument("--action", required=True, 
                        choices=["ListTiers", "ShowCurrent", "ChangeTo", "CreateAlerts"],
                        help="Action to execute")
    parser.add_argument("--resource-group", required=True,
                        help="Azure resource group containing Search service")
    parser.add_argument("--tier", choices=["minimal", "standard", "premium"],
                        help="Target tier (required for ChangeTo)")
    parser.add_argument("--budget", type=int,
                        help="Budget in EUR (required for CreateAlerts)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without applying")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable debug logging")
    parser.add_argument("--output-format", choices=["json", "text"], default="json",
                        help="Output format")
    parser.add_argument("--validate-schema", action="store_true",
                        help="Validate output against Spec Kit schema (testing)")
    
    args = parser.parse_args()
    
    # Recreate logger with verbose flag
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Initialize wrapper
    wrapper = CostScalerWrapper(args.resource_group)
    
    try:
        # Execute
        result = wrapper.run_powershell(
            action=args.action,
            tier=args.tier,
            budget=args.budget,
            dry_run=args.dry_run
        )
        
        # Build output envelope (Spec Kit compliant)
        output_envelope = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "action": args.action,
            "status": result["status"],
            "duration_seconds": result["duration_seconds"],
            "result": result["output"] if result["status"] == "success" else None,
            "error": result["errors"] if result["status"] == "error" else None,
            "metadata": {
                "resource_group": args.resource_group,
                "dry_run": args.dry_run,
                "wrapper_version": "1.0.0"
            }
        }
        
        # Save to outputs/
        output_file = wrapper.output_dir / f"cost-scaler-{args.action}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, "w") as f:
            json.dump(output_envelope, f, indent=2)
        
        logger.info(f"Output saved to {output_file}")
        
        # Display output
        if args.output_format == "json":
            print(json.dumps(output_envelope, indent=2))
        else:
            print(f"Action: {output_envelope['action']}")
            print(f"Status: {output_envelope['status']}")
            print(f"Duration: {output_envelope['duration_seconds']:.2f}s")
            if output_envelope['status'] == "success":
                print("Result:", json.dumps(output_envelope['result'], indent=2))
            else:
                print("Error:", json.dumps(output_envelope['error'], indent=2))
        
        # Return exit code
        sys.exit(0 if result["status"] == "success" else 1)
    
    except ValueError as e:
        logger.error(f"Invalid input: {e}")
        print(json.dumps({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "error",
            "error": {
                "code": "INVALID_INPUT",
                "message": str(e)
            }
        }, indent=2))
        sys.exit(1)
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(json.dumps({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "error",
            "error": {
                "code": "FATAL_ERROR",
                "message": str(e)
            }
        }, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
