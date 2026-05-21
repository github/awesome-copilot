#!/usr/bin/env python3
"""RAG Validation Module - Pre-deployment validation and checks"""

import sys
import os
from pathlib import Path

# Force UTF-8
os.environ['PYTHONIOENCODING'] = 'utf-8'
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except:
    pass

# Add current dir to path to import cost_analyzer
sys.path.insert(0, str(Path(__file__).parent))

from cost_analyzer import validate_deployment


class RAGValidator:
    """Pre-deployment validation for RAG infrastructure"""
    
    def __init__(self):
        self.validation_results = {}
    
    def validate_all(self, doc_size: str = "small", budget: float = 2000, region: str = "eastus"):
        """Run complete validation suite"""
        print("\n" + "="*60)
        print("RAG PRE-DEPLOYMENT VALIDATION")
        print("="*60 + "\n")
        
        print("Checking configuration...\n")
        
        # Validate cost
        print("[1/3] Cost Analysis")
        cost_result = validate_deployment(
            doc_size_str=doc_size,
            budget_usd=budget,
            ha_required_str="standard",
            estimated_docs_gb=5.0,
            estimated_queries_monthly=1000,
        )
        
        self.validation_results['cost'] = cost_result
        
        if cost_result['valid']:
            print(f"  ✅ Configuration valid")
            print(f"     Estimated cost: ${cost_result['cost_estimate']['total_monthly_cost']:.2f}/month")
            print(f"     Budget: ${budget}/month")
        else:
            print(f"  ❌ Configuration invalid")
            print(f"     Cost exceeds budget")
        
        # Azure Quotas
        print("\n[2/3] Azure Quotas Check")
        quotas = cost_result.get('quotas', {})
        all_ok = all(quotas.values())
        
        if all_ok:
            print(f"  ✅ Quotas OK in {region}")
        else:
            print(f"  ⚠️  Quota issues detected:")
            for quota_name, status in quotas.items():
                symbol = "✅" if status else "❌"
                print(f"     {symbol} {quota_name}")
        
        # Warnings and Recommendations
        print("\n[3/3] Warnings & Recommendations")
        
        if cost_result.get('warnings'):
            print("  ⚠️  Warnings:")
            for warning in cost_result['warnings']:
                print(f"     • {warning}")
        else:
            print("  ✅ No warnings")
        
        if cost_result.get('recommendations'):
            print("\n  💡 Recommendations:")
            for rec in cost_result['recommendations']:
                print(f"     • {rec}")
        
        print("\n" + "="*60)
        
        if cost_result['valid']:
            print("✅ VALIDATION PASSED - Ready to deploy")
            print("="*60 + "\n")
            return 0
        else:
            print("❌ VALIDATION FAILED - Please review issues")
            print("="*60 + "\n")
            return 1


def main():
    """Entry point for validation"""
    validator = RAGValidator()
    
    print("\n🔍 RAG Validation Agent\n")
    print("Enter validation parameters (or press Enter for defaults):\n")
    
    doc_size = input("Document size (small/medium/large/enterprise) [small]: ").strip() or "small"
    budget_str = input("Monthly budget USD [2000]: ").strip() or "2000"
    region = input("Azure region [eastus]: ").strip() or "eastus"
    
    try:
        budget = float(budget_str)
    except ValueError:
        budget = 2000
    
    return validator.validate_all(doc_size=doc_size, budget=budget, region=region)


if __name__ == "__main__":
    sys.exit(main())
