"""
metrics_collector.py - Metrics collection and export utilities
"""

import json
from typing import Dict, List, Any
from pathlib import Path


def save_metrics(metrics: Dict[str, Any], output_path: str):
    """Save metrics to JSON file"""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"✓ Metrics saved to {output_path}")


def load_metrics(input_path: str) -> Dict[str, Any]:
    """Load metrics from JSON file"""
    with open(input_path, 'r') as f:
        return json.load(f)


def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile value"""
    sorted_values = sorted(values)
    index = int(len(sorted_values) * (percentile / 100))
    return sorted_values[min(index, len(sorted_values) - 1)]
