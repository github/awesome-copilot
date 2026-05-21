#!/usr/bin/env python3
"""
RAG Cost Scaler - Automates Azure RAG configuration scaling and cost management
Usage: python cost-scaler.py --tier {minimal|standard|premium} [--apply] [--create-alerts]
"""

import json
import argparse
import subprocess
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# ANSI colors
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def print_colored(text: str, color: str = Colors.WHITE):
    """Print colored text"""
    print(f"{color}{text}{Colors.RESET}")

def load_config() -> Dict:
    """Load cost-tiers.json configuration"""
    config_path = Path(__file__).parent / "cost-tiers.json"
    if not config_path.exists():
        print_colored(f"❌ Config file not found: {config_path}", Colors.RED)
        sys.exit(1)
    
    with open(config_path, 'r') as f:
        return json.load(f)

def run_azure_cli(command: List[str]) -> Tuple[int, str]:
    """Execute Azure CLI command"""
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60,
            shell=False
        )
        return result.returncode, result.stdout.strip()
    except subprocess.TimeoutExpired:
        return -1, "Command timeout"
    except Exception as e:
        return -1, str(e)

def set_subscription(sub_id: str) -> bool:
    """Set active Azure subscription"""
    code, _ = run_azure_cli(["az", "account", "set", "--subscription", sub_id])
    return code == 0

def get_current_search_config(rg: str, name: str = None, debug: bool = False) -> Tuple[Dict, str]:
    """Get current Azure Search configuration - auto-detects the search service name"""
    
    # If name not provided, try to find it automatically
    if name is None:
        cmd = ["az", "resource", "list", "-g", rg, 
               "--resource-type", "Microsoft.Search/searchServices",
               "--query", "[0].name", "-o", "tsv"]
        code, output = run_azure_cli(cmd)
        if debug:
            print_colored(f"  [DEBUG] Search resource query: code={code}, output='{output}'", Colors.YELLOW)
        if code == 0 and output.strip():
            name = output.strip()
        else:
            return {"sku": "unknown", "status": "not_found"}, "unknown"
    
    cmd = [
        "az", "search", "service", "show",
        "-g", rg, "-n", name,
        "--query", "{sku:sku.name, status:properties.status}",
        "-o", "json"
    ]
    code, output = run_azure_cli(cmd)
    if debug:
        print_colored(f"  [DEBUG] Search show: code={code}, output='{output}'", Colors.YELLOW)
    
    if code == 0 and output:
        try:
            config = json.loads(output)
            return config, name
        except Exception as e:
            if debug:
                print_colored(f"  [DEBUG] JSON parse error: {e}", Colors.YELLOW)
            return {"sku": "unknown", "status": "not_found"}, name
    return {"sku": "unknown", "status": "not_found"}, name

def get_current_logs_config(rg: str, name: str = "rag-defensa-logs") -> Dict:
    """Get current Log Analytics configuration"""
    cmd = [
        "az", "monitor", "log-analytics", "workspace", "show",
        "-g", rg, "-n", name,
        "--query", "{retention:properties.retentionInDays}",
        "-o", "json"
    ]
    code, output = run_azure_cli(cmd)
    
    if code == 0 and output:
        return json.loads(output)
    return {"retention": None}

def print_tier_table(config: Dict, current_tier: Optional[str] = None):
    """Print table of available tiers"""
    print_colored("\n📊 TIERS DISPONIBLES:", Colors.CYAN)
    print_colored("┌─────────────────┬──────────────────┬────────────────────────────────┐", Colors.WHITE)
    print_colored("│ Tier            │ Costo/mes        │ Configuración                  │", Colors.WHITE)
    print_colored("├─────────────────┼──────────────────┼────────────────────────────────┤", Colors.WHITE)
    
    for tier_name, tier_config in config["tiers"].items():
        budget = tier_config["monthlyBudget"]
        search_sku = tier_config["services"]["search"]["sku"]
        logs_days = tier_config["services"]["logAnalytics"]["retentionDays"]
        
        marker = " [*]" if tier_name == current_tier else ""
        line = f"│ {tier_name:<14}{marker} │ €{budget:<16} │ Search: {search_sku:<6} Logs: {logs_days}d     │"
        print_colored(line, Colors.WHITE)
    
    print_colored("└─────────────────┴──────────────────┴────────────────────────────────┘", Colors.WHITE)

def get_current_tier(config: Dict, rg: str) -> str:
    """Detect current tier based on Azure configuration"""
    search_config, search_name = get_current_search_config(rg)
    logs_config = get_current_logs_config(rg)
    
    search_sku = search_config.get("sku", "unknown")
    
    # Determine tier based on current configuration
    if search_sku == "basic":
        return "minimal"
    elif search_sku == "standard":
        return "standard"
    else:
        return "unknown"

def calculate_cost_change(config: Dict, current_tier: str, target_tier: str) -> Dict:
    """Calculate cost difference between tiers"""
    if current_tier not in config["tiers"] or target_tier not in config["tiers"]:
        return {"error": "Tier not found"}
    
    current = config["tiers"][current_tier]
    target = config["tiers"][target_tier]
    
    current_budget = current["monthlyBudget"]
    target_budget = target["monthlyBudget"]
    
    changes = []
    total_cost_change = 0
    
    # Compare each service
    for service_name in current["services"]:
        if service_name in target["services"]:
            current_service = current["services"][service_name]
            target_service = target["services"][service_name]
            
            if current_service != target_service:
                current_cost = current_service.get("monthlyEstimate", 0)
                target_cost = target_service.get("monthlyEstimate", 0)
                change = target_cost - current_cost
                
                if change != 0:
                    changes.append({
                        "service": service_name,
                        "displayName": target_service.get("displayName", service_name),
                        "change": change,
                        "current": current_service,
                        "target": target_service
                    })
                    total_cost_change += change
    
    return {
        "changes": changes,
        "current_budget": current_budget,
        "target_budget": target_budget,
        "cost_change": total_cost_change
    }

def print_changes(analysis: Dict):
    """Print cost change analysis"""
    print_colored("\n📝 CAMBIOS QUE SE APLICARÍAN:", Colors.CYAN)
    
    if "error" in analysis:
        print_colored(f"❌ Error: {analysis['error']}", Colors.RED)
        return
    
    for change in analysis["changes"]:
        service = change["service"]
        display = change["displayName"]
        cost_change = change["change"]
        
        symbol = "📈" if cost_change > 0 else "📉"
        color = Colors.RED if cost_change > 0 else Colors.GREEN
        
        print_colored(f"  {symbol} {display}: €{abs(cost_change):.2f}/mes {'(subida)' if cost_change > 0 else '(rebaja)'}", color)
    
    print_colored("\n💰 RESUMEN DE COSTOS:", Colors.YELLOW)
    current = analysis["current_budget"]
    target = analysis["target_budget"]
    change = analysis["cost_change"]
    
    print_colored(f"  Costo actual:    €{current:.2f}/mes", Colors.WHITE)
    print_colored(f"  Costo nuevo:     €{target:.2f}/mes", Colors.WHITE)
    
    if change > 0:
        print_colored(f"  Diferencia:      +€{change:.2f}/mes ↑", Colors.RED)
    elif change < 0:
        print_colored(f"  Diferencia:      -€{abs(change):.2f}/mes ↓", Colors.GREEN)
    else:
        print_colored(f"  Diferencia:      €0/mes (sin cambios)", Colors.YELLOW)

def apply_search_tier_change(rg: str, target_sku: str, search_name: str = None) -> Tuple[bool, str]:
    """Apply Azure Search tier change - auto-detects search service name"""
    
    # Auto-detect search name if not provided
    if search_name is None:
        cmd = ["az", "resource", "list", "-g", rg, 
               "--resource-type", "Microsoft.Search/searchServices",
               "--query", "[0].name", "-o", "tsv"]
        code, output = run_azure_cli(cmd)
        if code == 0 and output.strip():
            search_name = output.strip()
        else:
            return False, "Cannot find Azure Search service"
    
    print_colored(f"\n⏳ Cambiando Azure Search '{search_name}' a {target_sku}...", Colors.YELLOW)
    
    if target_sku == "basic":
        # Delete current and recreate as Basic
        print_colored(f"  Eliminando instancia {search_name}...", Colors.CYAN)
        run_azure_cli(["az", "search", "service", "delete", "-g", rg, "-n", search_name, "--yes"])
        
        print_colored("  Esperando 15 segundos...", Colors.YELLOW)
        import time
        time.sleep(15)
        
        print_colored(f"  Creando Azure Search Basic...", Colors.CYAN)
        code, output = run_azure_cli([
            "az", "search", "service", "create",
            "-g", rg,
            "-n", search_name,
            "-l", "eastus",
            "--sku", "basic"
        ])
        
        if code == 0:
            print_colored(f"  ✓ Azure Search Basic creado", Colors.GREEN)
            return True, search_name
        else:
            print_colored(f"  ❌ Error: {output}", Colors.RED)
            return False, search_name
    
    return False, search_name

def apply_logs_retention(rg: str, days: int, workspace_name: str = "rag-defensa-logs") -> bool:
    """Apply Log Analytics retention change"""
    print_colored(f"\n⏳ Cambiando Log Analytics retención a {days} días...", Colors.YELLOW)
    
    code, output = run_azure_cli([
        "az", "monitor", "log-analytics", "workspace", "update",
        "-g", rg,
        "-n", workspace_name,
        "--retention-time", str(days)
    ])
    
    if code == 0:
        print_colored(f"  ✓ Log Analytics: {days} días", Colors.GREEN)
        return True
    else:
        print_colored(f"  ⚠️  Warning: {output}", Colors.YELLOW)
        return True  # Not critical

def create_budget_alert(subscription: str, rg: str, budget_eur: float) -> bool:
    """Create Azure Budget alert"""
    print_colored(f"\n⏳ Creando alerta de presupuesto €{budget_eur}/mes...", Colors.YELLOW)
    
    start_date = datetime.now().strftime("%Y-%m-01T00:00:00Z")
    end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%dT00:00:00Z")
    
    budget_body = {
        "eTag": "",
        "properties": {
            "category": "Cost",
            "amount": budget_eur,
            "timeGrain": "Monthly",
            "timePeriod": {
                "startDate": start_date,
                "endDate": end_date
            },
            "filters": {
                "resourceGroups": {
                    "values": [f"/subscriptions/{subscription}/resourcegroups/{rg}"]
                }
            },
            "notifications": {
                "Actual_75": {
                    "enabled": True,
                    "operator": "GreaterThan",
                    "threshold": 75,
                    "contactRoles": ["Owner", "Contributor"],
                    "thresholdType": "Forecasted"
                },
                "Actual_100": {
                    "enabled": True,
                    "operator": "GreaterThanOrEqualTo",
                    "threshold": 100,
                    "contactRoles": ["Owner", "Contributor"],
                    "thresholdType": "Actual"
                }
            }
        }
    }
    
    budget_name = f"rag-defensa-{budget_eur:.0f}eur-monthly"
    uri = f"https://management.azure.com/subscriptions/{subscription}/providers/Microsoft.CostManagement/budgets/{budget_name}?api-version=2021-10-01"
    
    # Save to temp file and execute
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(budget_body, f)
        temp_file = f.name
    
    try:
        code, output = run_azure_cli([
            "az", "rest",
            "--method", "PUT",
            "--uri", uri,
            "--body", f"@{temp_file}"
        ])
        
        if code == 0:
            print_colored(f"  ✓ Alerta creada: €{budget_eur}/mes", Colors.GREEN)
            print_colored(f"    Notificaciones: 75% (pronóstico) + 100% (real)", Colors.GREEN)
            return True
        else:
            print_colored(f"  ⚠️  {output}", Colors.YELLOW)
            return True  # Not critical
    finally:
        os.unlink(temp_file)

def main():
    parser = argparse.ArgumentParser(
        description="RAG Cost Scaler - Automates Azure RAG configuration scaling",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --list-options
  %(prog)s --tier minimal --dry-run
  %(prog)s --tier standard --apply
  %(prog)s --budget 50 --create-alerts
        """
    )
    
    parser.add_argument('--tier', choices=['minimal', 'standard', 'premium'],
                        help='Target tier to change to')
    parser.add_argument('--budget', type=float,
                        help='Monthly budget in EUR')
    parser.add_argument('--apply', action='store_true',
                        help='Apply changes (without this, only simulates)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Simulate changes without applying')
    parser.add_argument('--create-alerts', action='store_true',
                        help='Create/update budget alerts')
    parser.add_argument('--update-alerts-only', action='store_true',
                        help='Only update alerts, do not change configuration')
    parser.add_argument('--list-options', action='store_true',
                        help='Show available tiers')
    parser.add_argument('--current', action='store_true',
                        help='Show current configuration')
    parser.add_argument('--rg', default='rag-defensa-rg',
                        help='Resource group name (default: rag-defensa-rg)')
    parser.add_argument('--subscription', default='8e6ace56-e0f2-4071-825a-a20363df34f8',
                        help='Subscription ID')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config()
    
    print_colored(f"\n{'='*60}", Colors.CYAN)
    print_colored("RAG COST SCALER v1.0", Colors.BOLD + Colors.CYAN)
    print_colored(f"{'='*60}\n", Colors.CYAN)
    
    # Handle --list-options (doesn't require authentication)
    if args.list_options:
        print_tier_table(config, current_tier=None)
        print_colored("\n(Run 'python cost-scaler.py --current' to see your actual configuration)", Colors.CYAN)
        return
    
    # Set subscription for operations that need it
    if not set_subscription(args.subscription):
        print_colored("⚠️  Warning: Cannot set subscription (you may need 'az login')", Colors.YELLOW)
    
    # Handle --current
    if args.current:
        current_tier = get_current_tier(config, args.rg)
        search_config, search_name = get_current_search_config(args.rg)
        logs_config = get_current_logs_config(args.rg)
        
        print_colored("📊 CONFIGURACIÓN ACTUAL:", Colors.CYAN)
        print_colored(f"  Tier detectado: {current_tier}", Colors.WHITE)
        print_colored(f"  Search service: {search_name}", Colors.WHITE)
        print_colored(f"  Search SKU: {search_config.get('sku', 'unknown')}", Colors.WHITE)
        print_colored(f"  Logs retention: {logs_config.get('retention', 'unknown')} days", Colors.WHITE)
        return
    
    # Handle --update-alerts-only
    if args.update_alerts_only:
        budget = args.budget or config["tiers"]["minimal"]["monthlyBudget"]
        create_budget_alert(args.subscription, args.rg, budget)
        return
    
    # Handle tier change
    if args.tier:
        current_tier = get_current_tier(config, args.rg)
        
        if current_tier == args.tier:
            print_colored(f"✓ Already on {args.tier} tier", Colors.GREEN)
            return
        
        # Get current search config to get the actual name
        search_config, search_name = get_current_search_config(args.rg)
        logs_config = get_current_logs_config(args.rg)
        
        # Analyze changes
        analysis = calculate_cost_change(config, current_tier, args.tier)
        print_tier_table(config, current_tier)
        print_changes(analysis)
        
        if args.dry_run:
            print_colored("\n[DRY-RUN] No changes applied", Colors.YELLOW)
            return
        
        if not args.apply:
            print_colored("\nℹ️  Use --apply to apply changes or --dry-run to simulate", Colors.CYAN)
            return
        
        # Apply changes
        print_colored("\n⏳ APLICANDO CAMBIOS...", Colors.YELLOW)
        
        target_config = config["tiers"][args.tier]
        target_search_sku = target_config["services"]["search"]["sku"]
        target_logs_days = target_config["services"]["logAnalytics"]["retentionDays"]
        
        # Apply Search tier change
        if target_search_sku != search_config.get("sku"):
            success, actual_search_name = apply_search_tier_change(args.rg, target_search_sku, search_name)
            if not success:
                print_colored("❌ Failed to change Search tier", Colors.RED)
                return
            search_name = actual_search_name
        
        # Apply Log Analytics retention change
        if target_logs_days != logs_config.get("retention"):
            if not apply_logs_retention(args.rg, target_logs_days):
                return
        
        print_colored("\n✅ CAMBIOS COMPLETADOS", Colors.GREEN)
        print_colored(f"Nuevo tier: {args.tier}", Colors.GREEN)
        print_colored(f"Costo estimado: €{target_config['monthlyBudget']:.2f}/mes", Colors.GREEN)
        
        # Create/update alerts
        if args.create_alerts or args.budget:
            budget = args.budget or target_config["monthlyBudget"]
            create_budget_alert(args.subscription, args.rg, budget)
    
    # Handle budget/alert changes
    elif args.budget or args.create_alerts:
        budget = args.budget or config["tiers"]["minimal"]["monthlyBudget"]
        create_budget_alert(args.subscription, args.rg, budget)
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
