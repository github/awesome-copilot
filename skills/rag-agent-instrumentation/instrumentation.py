"""
instrumentation.py - Core metrics collection module

Provides utilities for capturing tokens, latency, cost, and errors
from OpenAI API calls and agent executions.
"""

import time
import json
import logging
from functools import wraps
from datetime import datetime
from typing import Dict, Any, Callable, Optional
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace, metrics

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collect and report metrics from agent executions"""

    # Pricing in USD per 1K tokens. Source: Azure OpenAI pricing (verify at
    # https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
    # gpt-4o is the minimum quality model for RAG; gpt-4o-mini is not used.
    PRICING = {
        "gpt-4o":                  {"input": 0.0025,  "output": 0.010},
        "o3-mini":                 {"input": 0.0011,  "output": 0.0044},
        "text-embedding-3-small":  {"input": 0.00002, "output": 0.0},
        "text-embedding-3-large":  {"input": 0.00013, "output": 0.0},
    }

    def __init__(self, app_insights_key: Optional[str] = None):
        self.app_insights_key = app_insights_key
        self.metrics = []

        # Initialize Application Insights if configured
        if app_insights_key:
            configure_azure_monitor(connection_string=f"InstrumentationKey={app_insights_key}")
            self.tracer = trace.get_tracer(__name__)
            self.meter = metrics.get_meter(__name__)
        else:
            self.tracer = None
            self.meter = None

    def record(self, metric_data: Dict[str, Any]):
        """Record a single metric"""
        metric_data["timestamp"] = datetime.now().isoformat()
        self.metrics.append(metric_data)

        # Log to Application Insights if available
        if self.tracer:
            with self.tracer.start_as_current_span("agent_execution") as span:
                for key, value in metric_data.items():
                    span.set_attribute(f"metric.{key}", str(value))

        logger.info(f"Metric recorded: {metric_data}")

    def calculate_cost(self, tokens_in: int, tokens_out: int, model: str) -> float:
        """Calculate API cost for tokens and model (USD)."""
        if model not in self.PRICING:
            logger.warning(f"Unknown model {model}, using gpt-4o pricing")
            model = "gpt-4o"

        pricing = self.PRICING[model]
        cost = (tokens_in / 1000 * pricing["input"]) + (tokens_out / 1000 * pricing["output"])
        return cost

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics across all recorded metrics"""
        if not self.metrics:
            return {}

        latencies = [m.get("latency_ms", 0) for m in self.metrics]
        costs = [m.get("cost_usd", 0) for m in self.metrics]

        return {
            "total_executions": len(self.metrics),
            "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
            "total_cost_usd": sum(costs),
            "metrics": self.metrics
        }


def instrument_call(collector: MetricsCollector, agent_name: str) -> Callable:
    """Decorator to automatically instrument function calls with metrics"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()

            try:
                result = func(*args, **kwargs)
                latency = (time.time() - start) * 1000

                # Extract tokens and cost from result if available
                tokens_in = getattr(result, "usage.prompt_tokens", 0) if hasattr(result, "usage") else 0
                tokens_out = getattr(result, "usage.completion_tokens", 0) if hasattr(result, "usage") else 0

                model = kwargs.get("model", "unknown")
                cost = collector.calculate_cost(tokens_in, tokens_out, model)

                collector.record({
                    "agent": agent_name,
                    "function": func.__name__,
                    "tokens_in": tokens_in,
                    "tokens_out": tokens_out,
                    "latency_ms": latency,
                    "cost_usd": cost,
                    "error": False
                })

                return result

            except Exception as e:
                latency = (time.time() - start) * 1000

                collector.record({
                    "agent": agent_name,
                    "function": func.__name__,
                    "latency_ms": latency,
                    "error": True,
                    "error_message": str(e)
                })

                raise

        return wrapper
    return decorator
