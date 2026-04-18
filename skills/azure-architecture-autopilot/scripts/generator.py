#!/usr/bin/env python3
"""
Azure Interactive Architecture Diagram Generator v3
Generates interactive HTML diagrams with Azure official icons (Base64 inline).
"""

import json
from datetime import datetime

from icons import get_icon_data_uri

_HAS_OFFICIAL_ICONS = True
# Azure service icons: SVG, colors + official icon key mapping
# icon: 48x48 viewBox SVG path (fallback)
# azure_icon_key: key in icons.py (official Azure icon)
SERVICE_ICONS = {
    "openai": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><text x="24" y="30" text-anchor="middle" font-size="18" fill="white" font-weight="700">AI</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "azure_openai"
    },
    "ai_foundry": {
        "icon_svg": '<rect x="6" y="10" width="36" height="28" rx="4" fill="#0078D4"/><rect x="12" y="16" width="10" height="8" rx="2" fill="white" opacity="0.9"/><rect x="26" y="16" width="10" height="8" rx="2" fill="white" opacity="0.9"/><rect x="12" y="27" width="24" height="5" rx="2" fill="white" opacity="0.6"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "ai_foundry"
    },
    "ai_hub": {
        "icon_svg": '<rect x="6" y="10" width="36" height="28" rx="4" fill="#0078D4"/><circle cx="24" cy="24" r="8" fill="white" opacity="0.9"/><circle cx="24" cy="24" r="4" fill="#0078D4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "machine_learning"
    },
    "search": {
        "icon_svg": '<circle cx="20" cy="20" r="12" fill="none" stroke="#0078D4" stroke-width="3.5"/><line x1="29" y1="29" x2="40" y2="40" stroke="#0078D4" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="20" r="5" fill="#0078D4" opacity="0.3"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "cognitive_search"
    },
    "ai_search": {
        "icon_svg": '<circle cx="20" cy="20" r="12" fill="none" stroke="#0078D4" stroke-width="3.5"/><line x1="29" y1="29" x2="40" y2="40" stroke="#0078D4" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="20" r="5" fill="#0078D4" opacity="0.3"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "cognitive_search"
    },
    "aml": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M14 32 L20 18 L26 26 L32 14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "machine_learning"
    },
    "storage": {
        "icon_svg": '<rect x="8" y="8" width="32" height="8" rx="3" fill="#0078D4"/><rect x="8" y="20" width="32" height="8" rx="3" fill="#0078D4" opacity="0.7"/><rect x="8" y="32" width="32" height="8" rx="3" fill="#0078D4" opacity="0.4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "storage_accounts"
    },
    "adls": {
        "icon_svg": '<rect x="8" y="8" width="32" height="8" rx="3" fill="#0078D4"/><rect x="8" y="20" width="32" height="8" rx="3" fill="#0078D4" opacity="0.7"/><rect x="8" y="32" width="32" height="8" rx="3" fill="#0078D4" opacity="0.4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "data_lake_storage_gen1"
    },
    "fabric": {
        "icon_svg": '<polygon points="24,6 42,18 42,34 24,46 6,34 6,18" fill="#E8740C" opacity="0.9"/><text x="24" y="30" text-anchor="middle" font-size="14" fill="white" font-weight="700">F</text>',
        "color": "#E8740C", "bg": "#FEF3E8", "category": "Data",
        "azure_icon_key": "microsoft_fabric"
    },
    "synapse": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><path d="M15 24 L24 15 L33 24 L24 33 Z" fill="white" opacity="0.9"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_synapse_analytics"
    },
    "adf": {
        "icon_svg": '<rect x="6" y="12" width="36" height="24" rx="4" fill="#0078D4"/><path d="M16 24 L28 24 M24 18 L30 24 L24 30" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "data_factory"
    },
    "data_factory": {
        "icon_svg": '<rect x="6" y="12" width="36" height="24" rx="4" fill="#0078D4"/><path d="M16 24 L28 24 M24 18 L30 24 L24 30" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "data_factory"
    },
    "keyvault": {
        "icon_svg": '<rect x="10" y="6" width="28" height="36" rx="4" fill="#E8A000"/><circle cx="24" cy="22" r="6" fill="white"/><rect x="22" y="26" width="4" height="10" rx="1" fill="white"/>',
        "color": "#E8A000", "bg": "#FEF7E0", "category": "Security",
        "azure_icon_key": "key_vaults"
    },
    "kv": {
        "icon_svg": '<rect x="10" y="6" width="28" height="36" rx="4" fill="#E8A000"/><circle cx="24" cy="22" r="6" fill="white"/><rect x="22" y="26" width="4" height="10" rx="1" fill="white"/>',
        "color": "#E8A000", "bg": "#FEF7E0", "category": "Security",
        "azure_icon_key": "key_vaults"
    },
    "vnet": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="none" stroke="#5C2D91" stroke-width="2.5"/><circle cx="16" cy="18" r="4" fill="#5C2D91"/><circle cx="32" cy="18" r="4" fill="#5C2D91"/><circle cx="24" cy="32" r="4" fill="#5C2D91"/><line x1="16" y1="18" x2="32" y2="18" stroke="#5C2D91" stroke-width="1.5"/><line x1="16" y1="18" x2="24" y2="32" stroke="#5C2D91" stroke-width="1.5"/><line x1="32" y1="18" x2="24" y2="32" stroke="#5C2D91" stroke-width="1.5"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "virtual_networks"
    },
    "pe": {
        "icon_svg": '<circle cx="24" cy="24" r="14" fill="none" stroke="#5C2D91" stroke-width="2"/><circle cx="24" cy="24" r="6" fill="#5C2D91"/><line x1="24" y1="10" x2="24" y2="4" stroke="#5C2D91" stroke-width="2"/><line x1="24" y1="38" x2="24" y2="44" stroke="#5C2D91" stroke-width="2"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "private_endpoints"
    },
    "nsg": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="4" fill="#5C2D91"/><path d="M18 20 L24 14 L30 20 M18 28 L24 34 L30 28" stroke="white" stroke-width="2" fill="none"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "network_security_groups"
    },
    "acr": {
        "icon_svg": '<rect x="8" y="10" width="32" height="28" rx="4" fill="#0078D4"/><rect x="14" y="16" width="20" height="16" rx="2" fill="white" opacity="0.3"/><text x="24" y="30" text-anchor="middle" font-size="12" fill="white" font-weight="600">ACR</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute"
    },
    "aks": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#326CE5"/><text x="24" y="30" text-anchor="middle" font-size="16" fill="white" font-weight="700">K</text>',
        "color": "#326CE5", "bg": "#EBF0FC", "category": "Compute",
        "azure_icon_key": "kubernetes_services"
    },
    "appservice": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="6" fill="#0078D4"/><polygon points="24,14 34,34 14,34" fill="white" opacity="0.9"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "app_services"
    },
    "appinsights": {
        "icon_svg": '<circle cx="24" cy="24" r="16" fill="#773ADC"/><path d="M16 28 L20 20 L24 24 L28 16 L32 22" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>',
        "color": "#773ADC", "bg": "#F0EAFA", "category": "Monitor",
        "azure_icon_key": "application_insights"
    },
    "monitor": {
        "icon_svg": '<rect x="6" y="10" width="36" height="24" rx="4" fill="#773ADC"/><path d="M14 28 L20 20 L26 24 L34 16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="14" y="36" width="20" height="3" rx="1" fill="#773ADC" opacity="0.5"/>',
        "color": "#773ADC", "bg": "#F0EAFA", "category": "Monitor",
        "azure_icon_key": "monitor"
    },
    "vm": {
        "icon_svg": '<rect x="6" y="8" width="36" height="26" rx="3" fill="#0078D4"/><rect x="10" y="12" width="28" height="18" rx="1" fill="white" opacity="0.2"/><rect x="16" y="36" width="16" height="4" rx="1" fill="#0078D4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "virtual_machine"
    },
    "bastion": {
        "icon_svg": '<rect x="8" y="6" width="32" height="36" rx="4" fill="#5C2D91"/><rect x="14" y="12" width="20" height="14" rx="2" fill="white" opacity="0.3"/><circle cx="24" cy="34" r="4" fill="white" opacity="0.7"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "bastions"
    },
    "jumpbox": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="4" fill="#5C2D91"/><text x="24" y="30" text-anchor="middle" font-size="14" fill="white" font-weight="600">JB</text>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "virtual_machine"
    },
    "vpn": {
        "icon_svg": '<rect x="6" y="12" width="36" height="24" rx="4" fill="#5C2D91"/><path d="M16 24 L24 16 L32 24 L24 32 Z" fill="white" opacity="0.8"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "virtual_network_gateways"
    },
    "user": {
        "icon_svg": '<circle cx="24" cy="16" r="8" fill="#0078D4"/><path d="M10 42 Q10 30 24 30 Q38 30 38 42" fill="#0078D4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "External"
    },
    "app": {
        "icon_svg": '<rect x="8" y="6" width="32" height="36" rx="6" fill="#666"/><rect x="14" y="12" width="20" height="20" rx="2" fill="white" opacity="0.3"/><circle cx="24" cy="40" r="2" fill="white" opacity="0.7"/>',
        "color": "#666666", "bg": "#F5F5F5", "category": "External"
    },
    "default": {
        "icon_svg": '<circle cx="24" cy="24" r="16" fill="#0078D4"/><text x="24" y="30" text-anchor="middle" font-size="14" fill="white" font-weight="600">?</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Azure"
    },
    "cdn": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">CDN</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Network",
        "azure_icon_key": "cdn_profiles"
    },
    "event_hub": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="8" fill="white" font-weight="700">Event</text><text x="24" y="33" text-anchor="middle" font-size="8" fill="white">Hub</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "event_hubs"
    },
    "redis": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#D83B01"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">Redis</text>',
        "color": "#D83B01", "bg": "#FEF0E8", "category": "Data",
        "azure_icon_key": "cache_redis"
    },
    "devops": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="8" fill="white" font-weight="700">Dev</text><text x="24" y="33" text-anchor="middle" font-size="8" fill="white">Ops</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "DevOps",
        "azure_icon_key": "azure_devops"
    },
    "acr": {
        "icon_svg": '<rect x="8" y="10" width="32" height="28" rx="4" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">ACR</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "container_registries"
    },
    "container_registry": {
        "icon_svg": '<rect x="8" y="10" width="32" height="28" rx="4" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">ACR</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "container_registries"
    },
    "app_gateway": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="8" fill="white" font-weight="700">App</text><text x="24" y="33" text-anchor="middle" font-size="8" fill="white">GW</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Network",
        "azure_icon_key": "application_gateways"
    },
    "iot_hub": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="8" fill="white" font-weight="700">IoT</text><text x="24" y="33" text-anchor="middle" font-size="8" fill="white">Hub</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "IoT",
        "azure_icon_key": "iot_hub"
    },
    "stream_analytics": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="7" fill="white" font-weight="700">Stream</text><text x="24" y="33" text-anchor="middle" font-size="7" fill="white">Analytics</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "stream_analytics_jobs"
    },
    "vpn_gateway": {
        "icon_svg": '<rect x="6" y="12" width="36" height="24" rx="4" fill="#5C2D91"/><path d="M16 24 L24 16 L32 24 L24 32 Z" fill="white" opacity="0.8"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "virtual_network_gateways"
    },
    "front_door": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="7" fill="white" font-weight="700">Front</text><text x="24" y="33" text-anchor="middle" font-size="7" fill="white">Door</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Network",
        "azure_icon_key": "front_door_and_cdn_profiles"
    },
    "ai_hub": {
        "icon_svg": '<rect x="6" y="10" width="36" height="28" rx="4" fill="#0078D4"/><circle cx="24" cy="24" r="8" fill="white" opacity="0.9"/><circle cx="24" cy="24" r="4" fill="#0078D4"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "ai_studio"
    },
    "firewall": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#E8A000"/><text x="24" y="22" text-anchor="middle" font-size="7" fill="white" font-weight="700">Fire</text><text x="24" y="33" text-anchor="middle" font-size="7" fill="white">wall</text>',
        "color": "#E8A000", "bg": "#FFF8E1", "category": "Network",
        "azure_icon_key": "firewalls"
    },
    "document_intelligence": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="9" fill="white" font-weight="700">Doc</text><text x="24" y="33" text-anchor="middle" font-size="9" fill="white">Intel</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "form_recognizer"
    },
    "form_recognizer": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="9" fill="white" font-weight="700">Doc</text><text x="24" y="33" text-anchor="middle" font-size="9" fill="white">Intel</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "AI",
        "azure_icon_key": "form_recognizer"
    },
    "databricks": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="6" fill="#FF3621"/><text x="24" y="30" text-anchor="middle" font-size="16" fill="white" font-weight="700">DB</text>',
        "color": "#FF3621", "bg": "#FFF0EE", "category": "Data",
        "azure_icon_key": "azure_databricks"
    },
    "sql_server": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="11" fill="white" font-weight="700">SQL</text><rect x="12" y="28" width="24" height="8" rx="2" fill="white" opacity="0.3"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "sql_server"
    },
    "sql_database": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="11" fill="white" font-weight="700">SQL</text><rect x="12" y="28" width="24" height="8" rx="2" fill="white" opacity="0.3"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "sql_database"
    },
    "cosmos_db": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="9" fill="white" font-weight="700">Cosmos</text><text x="24" y="33" text-anchor="middle" font-size="9" fill="white">DB</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_cosmos_db"
    },
    "app_service": {
        "icon_svg": '<rect x="6" y="10" width="36" height="28" rx="6" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="11" fill="white" font-weight="700">App</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "app_services"
    },
    "aks": {
        "icon_svg": '<polygon points="24,4 44,20 38,44 10,44 4,20" fill="#326CE5" stroke="#fff" stroke-width="1"/><text x="24" y="30" text-anchor="middle" font-size="11" fill="white" font-weight="700">K8s</text>',
        "color": "#326CE5", "bg": "#EBF0FA", "category": "Compute",
        "azure_icon_key": "kubernetes_services"
    },
    "function_app": {
        "icon_svg": '<polygon points="24,6 42,42 6,42" fill="#F0AD4E"/><text x="24" y="36" text-anchor="middle" font-size="14" fill="white" font-weight="700">ƒ</text>',
        "color": "#F0AD4E", "bg": "#FFF8ED", "category": "Compute",
        "azure_icon_key": "function_apps"
    },
    "synapse": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><text x="24" y="22" text-anchor="middle" font-size="8" fill="white" font-weight="700">Syn</text><text x="24" y="32" text-anchor="middle" font-size="8" fill="white">apse</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_synapse_analytics"
    },
    "log_analytics": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#5C2D91"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">Log</text>',
        "color": "#5C2D91", "bg": "#F3EDF7", "category": "Monitoring",
        "azure_icon_key": "log_analytics_workspaces"
    },
    "app_insights": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#5C2D91"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">AI</text>',
        "color": "#5C2D91", "bg": "#F3EDF7", "category": "Monitoring",
        "azure_icon_key": "application_insights"
    },
    "nsg": {
        "icon_svg": '<rect x="6" y="6" width="36" height="36" rx="4" fill="#E8A000"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">NSG</text>',
        "color": "#E8A000", "bg": "#FFF8E1", "category": "Network",
        "azure_icon_key": "network_security_groups"
    },
    "apim": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M16 20 L32 20 M16 28 L32 28 M24 14 L24 34" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "api_management_services"
    },
    "api_management": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M16 20 L32 20 M16 28 L32 28 M24 14 L24 34" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "api_management_services"
    },
    "service_bus": {
        "icon_svg": '<rect x="6" y="10" width="36" height="28" rx="4" fill="#0078D4"/><path d="M14 24 L22 24 M26 24 L34 24" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="white"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "azure_service_bus"
    },
    "logic_apps": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M14 18 L24 28 L34 18" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "logic_apps"
    },
    "logic_app": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M14 18 L24 28 L34 18" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "logic_apps"
    },
    "event_grid": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><circle cx="16" cy="18" r="3" fill="white"/><circle cx="32" cy="18" r="3" fill="white"/><circle cx="16" cy="30" r="3" fill="white"/><circle cx="32" cy="30" r="3" fill="white"/><line x1="16" y1="18" x2="32" y2="30" stroke="white" stroke-width="1.5"/><line x1="32" y1="18" x2="16" y2="30" stroke="white" stroke-width="1.5"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "event_grid_topics"
    },
    "container_apps": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><rect x="12" y="14" width="10" height="10" rx="2" fill="white" opacity="0.9"/><rect x="26" y="14" width="10" height="10" rx="2" fill="white" opacity="0.9"/><rect x="12" y="28" width="24" height="6" rx="2" fill="white" opacity="0.6"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "container_apps_environments"
    },
    "container_app": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><rect x="12" y="14" width="10" height="10" rx="2" fill="white" opacity="0.9"/><rect x="26" y="14" width="10" height="10" rx="2" fill="white" opacity="0.9"/><rect x="12" y="28" width="24" height="6" rx="2" fill="white" opacity="0.6"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "container_apps_environments"
    },
    "postgresql": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="4" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">PG</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_database_postgresql_server"
    },
    "mysql": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="4" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">My</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_database_mysql_server"
    },
    "load_balancer": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#5C2D91"/><path d="M16 18 L32 18 M16 24 L32 24 M16 30 L32 30" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "load_balancers"
    },
    "nat_gateway": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#5C2D91"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">NAT</text>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "nat"
    },
    "expressroute": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#5C2D91"/><path d="M14 24 L34 24" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="14" cy="24" r="4" fill="white"/><circle cx="34" cy="24" r="4" fill="white"/>',
        "color": "#5C2D91", "bg": "#F3EEF9", "category": "Network",
        "azure_icon_key": "expressroute_circuits"
    },
    "sentinel": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><path d="M24 12 L24 24 L32 28" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="3" fill="white"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Security",
        "azure_icon_key": "azure_sentinel"
    },
    "data_explorer": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M14 30 L20 18 L26 26 L34 14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_data_explorer_clusters"
    },
    "kusto": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M14 30 L20 18 L26 26 L34 14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Data",
        "azure_icon_key": "azure_data_explorer_clusters"
    },
    "signalr": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#0078D4"/><path d="M16 20 Q24 12 32 20 M16 28 Q24 36 32 28" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "signalr"
    },
    "notification_hub": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><path d="M18 16 L24 12 L30 16 L30 28 L18 28 Z" stroke="white" stroke-width="2" fill="white" opacity="0.9"/><circle cx="24" cy="32" r="3" fill="white"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Integration",
        "azure_icon_key": "notification_hubs"
    },
    "spring_apps": {
        "icon_svg": '<circle cx="24" cy="24" r="18" fill="#6DB33F"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">🌱</text>',
        "color": "#6DB33F", "bg": "#EFF8E8", "category": "Compute",
        "azure_icon_key": "azure_spring_apps"
    },
    "static_web_app": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><text x="24" y="28" text-anchor="middle" font-size="10" fill="white" font-weight="700">SWA</text>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Compute",
        "azure_icon_key": "static_apps"
    },
    "digital_twins": {
        "icon_svg": '<rect x="6" y="8" width="36" height="32" rx="4" fill="#0078D4"/><circle cx="18" cy="20" r="5" fill="white" opacity="0.9"/><circle cx="30" cy="20" r="5" fill="white" opacity="0.9"/><line x1="18" y1="25" x2="18" y2="34" stroke="white" stroke-width="2"/><line x1="30" y1="25" x2="30" y2="34" stroke="white" stroke-width="2"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "IoT",
        "azure_icon_key": "digital_twins"
    },
    "backup": {
        "icon_svg": '<rect x="8" y="8" width="32" height="32" rx="4" fill="#0078D4"/><path d="M16 28 L24 16 L32 28 Z" stroke="white" stroke-width="2" fill="white" opacity="0.8"/>',
        "color": "#0078D4", "bg": "#E8F4FD", "category": "Management",
        "azure_icon_key": "backup_vault"
    },
}

CONNECTION_STYLES = {
    "api":      {"color": "#0078D4", "dash": "0"},
    "data":     {"color": "#0F9D58", "dash": "0"},
    "security": {"color": "#E8A000", "dash": "5,5"},
    "private":  {"color": "#5C2D91", "dash": "3,3"},
    "network":  {"color": "#5C2D91", "dash": "5,5"},
    "default":  {"color": "#999999", "dash": "0"},
}


_TYPE_ALIASES = {
    # Azure ARM resource names → canonical diagram type
    # Network
    "private_endpoints": "pe", "private_endpoint": "pe",
    "virtual_networks": "vnet", "virtual_network": "vnet",
    "network_security_groups": "nsg", "network_security_group": "nsg",
    "bastion_hosts": "bastion", "bastion_host": "bastion",
    "application_gateways": "app_gateway", "application_gateway": "app_gateway",
    "front_doors": "front_door", "front_door_and_cdn_profiles": "front_door",
    "virtual_network_gateways": "vpn", "vpn_gateways": "vpn",
    "load_balancers": "load_balancer",
    "nat_gateways": "nat_gateway",
    "expressroute_circuits": "expressroute",
    "firewalls": "firewall",
    "cdn_profiles": "cdn",
    # Data
    "data_factories": "adf", "data_factory": "adf",
    "storage_accounts": "storage", "storage_account": "storage",
    "data_lake": "adls", "adls_gen2": "adls", "data_lake_storage": "adls",
    "fabric_capacities": "fabric", "fabric_capacity": "fabric", "microsoft_fabric": "fabric",
    "synapse_workspaces": "synapse", "synapse_workspace": "synapse", "synapse_analytics": "synapse",
    "cosmos": "cosmos_db", "cosmosdb": "cosmos_db", "documentdb": "cosmos_db",
    "sql_databases": "sql_database", "sql_db": "sql_database",
    "sql_servers": "sql_server",
    "redis_caches": "redis", "redis_cache": "redis", "cache_redis": "redis",
    "stream_analytics_jobs": "stream_analytics",
    "databricks_workspaces": "databricks",
    "data_explorer_clusters": "data_explorer", "azure_data_explorer": "data_explorer",
    "postgresql_server": "postgresql", "postgresql_servers": "postgresql",
    "mysql_server": "mysql", "mysql_servers": "mysql",
    # AI
    "cognitive_services": "ai_foundry", "ai_services": "ai_foundry", "foundry": "ai_foundry",
    "azure_openai": "openai",
    "cognitive_search": "search", "search_services": "search", "search_service": "search",
    "machine_learning": "aml", "ml": "aml", "machine_learning_workspaces": "aml",
    "form_recognizers": "document_intelligence",
    "ai_studio": "ai_hub", "foundry_project": "ai_hub",
    # Security
    "key_vault": "keyvault", "key_vaults": "keyvault",
    "sentinel": "sentinel", "azure_sentinel": "sentinel",
    # Compute
    "virtual_machines": "vm", "virtual_machine": "vm",
    "app_services": "appservice", "web_apps": "appservice", "web_app": "appservice",
    "function_apps": "function_app", "functions": "function_app",
    "kubernetes_services": "aks", "managed_clusters": "aks", "kubernetes": "aks",
    "container_registries": "acr",
    "container_apps_environments": "container_apps",
    "spring_apps": "spring_apps", "azure_spring_apps": "spring_apps",
    "static_apps": "static_web_app", "static_web_apps": "static_web_app",
    # Integration
    "event_hubs": "event_hub",
    "event_grid_topics": "event_grid", "event_grid_domains": "event_grid",
    "api_management_services": "apim",
    "service_bus_namespaces": "service_bus",
    "logic_app": "logic_apps",
    "notification_hubs": "notification_hub",
    # Monitoring
    "log_analytics_workspaces": "log_analytics",
    "application_insights": "appinsights", "app_insight": "appinsights",
    # IoT
    "iot_hubs": "iot_hub",
    # Management
    "backup_vaults": "backup", "backup_vault": "backup",
}

def get_service_info(svc_type: str) -> dict:
    t = svc_type.lower().replace("-", "_").replace(" ", "_")
    t = _TYPE_ALIASES.get(t, t)
    info = SERVICE_ICONS.get(t, SERVICE_ICONS["default"]).copy()
    # Add official Azure icon data URI if available
    azure_key = info.get("azure_icon_key", t)
    icon_uri = get_icon_data_uri(azure_key)
    info["icon_data_uri"] = icon_uri
    return info


def generate_html(services: list, connections: list, title: str, vnet_info: str = "", hierarchy: list = None) -> str:
    def _norm(t):
        t = t.lower().replace("-", "_").replace(" ", "_")
        return _TYPE_ALIASES.get(t, t)

    nodes_js = json.dumps([{
        "id": svc["id"],
        "name": svc["name"],
        "type": _norm(svc.get("type", "default")),
        "sku": svc.get("sku", ""),
        "private": svc.get("private", False),
        "details": svc.get("details", []),
        "subscription": svc.get("subscription", ""),
        "resourceGroup": svc.get("resourceGroup", ""),
        "icon_svg": get_service_info(svc.get("type", "default"))["icon_svg"],
        "icon_data_uri": get_service_info(svc.get("type", "default")).get("icon_data_uri", ""),
        "color": get_service_info(svc.get("type", "default"))["color"],
        "bg": get_service_info(svc.get("type", "default"))["bg"],
        "category": get_service_info(svc.get("type", "default"))["category"],
    } for svc in services], ensure_ascii=False)

    hierarchy_js = json.dumps(hierarchy or [], ensure_ascii=False)

    edges_js = json.dumps([{
        "from": conn["from"],
        "to": conn["to"],
        "label": conn.get("label", ""),
        "type": conn.get("type", "default"),
        "color": CONNECTION_STYLES.get(conn.get("type", "default"), CONNECTION_STYLES["default"])["color"],
        "dash": CONNECTION_STYLES.get(conn.get("type", "default"), CONNECTION_STYLES["default"])["dash"],
    } for conn in connections], ensure_ascii=False)

    pe_count = sum(1 for s in services if _norm(s.get("type", "default")) == "pe")
    svc_count = len(services) - pe_count
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    vnet_info_js = json.dumps(vnet_info, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif; background: #f3f2f1; color: #323130; }}

  .header {{
    background: white; border-bottom: 1px solid #edebe9;
    padding: 12px 24px; display: flex; align-items: center; gap: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }}
  .header-icon {{
    width: 32px; height: 32px; border-radius: 4px;
    background: linear-gradient(135deg, #0078D4, #00BCF2);
    display: flex; align-items: center; justify-content: center;
  }}
  .header-icon svg {{ width: 20px; height: 20px; }}
  .header h1 {{ font-size: 15px; font-weight: 600; color: #201f1e; }}
  .header .meta {{ font-size: 11px; color: #a19f9d; }}
  .header-right {{ margin-left: auto; display: flex; gap: 16px; align-items: center; }}
  .stat {{ font-size: 11px; color: #605e5c; }}
  .stat b {{ color: #323130; }}

  .container {{ display: flex; height: calc(100vh - 56px); }}

  .canvas-area {{
    flex: 1; position: relative; overflow: hidden;
    background: white;
    background-image:
      linear-gradient(#faf9f8 1px, transparent 1px),
      linear-gradient(90deg, #faf9f8 1px, transparent 1px);
    background-size: 24px 24px;
  }}
  #canvas {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%; }}

  .toolbar {{
    position: absolute; top: 10px; left: 10px;
    display: flex; gap: 1px; z-index: 10;
    background: white; border: 1px solid #edebe9; border-radius: 6px;
    padding: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }}
  .tool-btn {{
    background: transparent; border: none; border-radius: 4px;
    padding: 5px 10px; font-size: 11px; cursor: pointer; color: #605e5c;
    font-family: inherit; transition: all 0.1s;
  }}
  .tool-btn:hover {{ background: #f3f2f1; color: #323130; }}
  .tool-sep {{ width: 1px; background: #edebe9; margin: 3px 1px; }}

  .zoom-indicator {{
    position: absolute; top: 10px; right: 286px;
    background: white; border: 1px solid #edebe9; border-radius: 4px;
    padding: 3px 8px; font-size: 10px; color: #a19f9d; z-index: 10;
  }}

  /* ── Sidebar ── */
  .sidebar {{
    width: 272px; background: #faf9f8; border-left: 1px solid #edebe9;
    overflow-y: auto; display: flex; flex-direction: column;
  }}
  .sidebar::-webkit-scrollbar {{ width: 3px; }}
  .sidebar::-webkit-scrollbar-thumb {{ background: #c8c6c4; border-radius: 3px; }}

  .sidebar-header {{
    padding: 12px 14px; border-bottom: 1px solid #edebe9;
    font-weight: 600; font-size: 12px; color: #605e5c;
    position: sticky; top: 0; background: #faf9f8; z-index: 1;
  }}
  .cat-label {{
    padding: 10px 14px 4px; font-size: 10px; color: #a19f9d;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  }}
  .service-card {{
    margin: 2px 6px; border: 1px solid #edebe9; border-radius: 6px;
    overflow: hidden; cursor: pointer; transition: all 0.1s;
    background: white;
  }}
  .service-card:hover {{ border-color: #c8c6c4; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }}
  .service-card.selected {{ border-color: #0078D4; box-shadow: 0 0 0 1px #0078D4; }}
  .service-card-header {{
    padding: 7px 10px; display: flex; align-items: center; gap: 8px;
  }}
  .sc-icon {{ width: 28px; height: 28px; flex-shrink: 0; }}
  .sc-icon svg {{ width: 28px; height: 28px; }}
  .service-name {{ font-size: 12px; font-weight: 600; color: #323130; }}
  .service-sku {{ font-size: 10px; color: #a19f9d; }}
  .service-card-body {{ padding: 2px 10px 6px; }}
  .service-detail {{ font-size: 10px; color: #605e5c; padding: 1px 0; }}
  .service-detail::before {{ content: "› "; color: #a19f9d; }}
  .private-badge {{
    font-size: 9px; background: #f3eef9; color: #5C2D91;
    border-radius: 3px; padding: 1px 5px; margin-left: auto;
    border: 1px solid #e0d4f5;
  }}

  .legend {{
    padding: 10px 14px; border-top: 1px solid #edebe9; margin-top: auto;
  }}
  .legend-title {{ font-size: 10px; font-weight: 600; color: #a19f9d; margin-bottom: 5px; }}
  .legend-item {{ display: flex; align-items: center; gap: 6px; font-size: 10px; color: #605e5c; margin-bottom: 2px; }}
  .legend-line {{ width: 18px; height: 2px; border-radius: 1px; }}
  .legend-line-dash {{ width: 18px; height: 0; border-top: 2px dashed; }}

  /* ── SVG styles ── */
  .node {{ cursor: grab; pointer-events: all; }}
  .node:active {{ cursor: grabbing; }}
  .node .node-bg {{ pointer-events: all; }}
  .node.selected .node-bg {{ stroke: #0078D4; stroke-width: 2.5; }}
  .node.selected {{ filter: drop-shadow(0 0 6px rgba(0,120,212,0.4)); }}

  /* ── Edge highlight on node select ── */
  .edge-path {{ transition: opacity 0.2s, stroke-width 0.2s; }}
  .edge-label {{ transition: opacity 0.2s; }}
  .edge-path.highlight {{ opacity: 1 !important; stroke-width: 2.5 !important; filter: drop-shadow(0 0 4px rgba(0,120,212,0.5)); }}
  .edge-path.dimmed {{ opacity: 0.1 !important; }}
  .edge-label.highlight {{ opacity: 1 !important; font-weight: 700; }}
  .edge-label.dimmed {{ opacity: 0.15 !important; }}
  .edge-label-bg.highlight {{ stroke: #0078D4 !important; stroke-width: 1.5 !important; }}
  .edge-label-bg.dimmed {{ opacity: 0.15 !important; }}
  .node.dimmed {{ opacity: 0.25; transition: opacity 0.2s; }}

  .subnet-rect {{
    rx: 6; ry: 6;
  }}
  .subnet-label {{
    font-size: 11px; font-weight: 600; font-family: 'Segoe UI', sans-serif;
  }}

  .status-bar {{
    position: absolute; bottom: 10px; left: 10px;
    background: white; border: 1px solid #edebe9; border-radius: 4px;
    padding: 4px 10px; font-size: 10px; color: #a19f9d;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }}

  .tooltip {{
    position: absolute; background: white; color: #323130;
    border: 1px solid #edebe9; padding: 8px 12px;
    border-radius: 6px; font-size: 11px; pointer-events: none;
    white-space: nowrap; z-index: 100; display: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }}
  .tooltip strong {{ color: #201f1e; }}
  .tooltip-detail {{ color: #605e5c; margin-top: 1px; font-size: 10px; }}
</style>
</head>
<body>

<div class="header">
  <div class="header-icon">
    <svg viewBox="0 0 24 24"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="white" opacity="0.9"/></svg>
  </div>
  <div>
    <h1>{title}</h1>
    <div class="meta">Azure Architecture &middot; {generated_at}</div>
  </div>
  <div class="header-right">
    <div class="stat"><b>{svc_count}</b> Services</div>
    <div class="stat"><b>{pe_count}</b> Private Endpoints</div>
    <div class="stat"><b>{len(connections)}</b> Connections</div>
  </div>
</div>

<div class="container">
  <div class="canvas-area">
    <div class="toolbar">
      <button class="tool-btn" onclick="fitToScreen()">Fit</button>
      <div class="tool-sep"></div>
      <button class="tool-btn" onclick="zoomIn()">+</button>
      <button class="tool-btn" onclick="zoomOut()">&minus;</button>
      <div class="tool-sep"></div>
      <button class="tool-btn" onclick="resetZoom()">Reset</button>
      <div class="tool-sep"></div>
      <button class="tool-btn" onclick="downloadPNG()" title="Download PNG">&#128247; PNG</button>
    </div>
    <div class="zoom-indicator" id="zoom-level">100%</div>
    <svg id="canvas">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0078D4" opacity="0.5"/>
        </marker>
        <marker id="arr-data" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0F9D58" opacity="0.5"/>
        </marker>
        <marker id="arr-sec" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#E8A000" opacity="0.5"/>
        </marker>
        <marker id="arr-pe" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#5C2D91" opacity="0.5"/>
        </marker>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/>
        </filter>
      </defs>
      <g id="diagram-root"></g>
    </svg>
    <div id="tooltip" class="tooltip"></div>
    <div class="status-bar">Drag nodes &middot; Scroll to zoom &middot; Drag empty space to pan</div>
  </div>

  <div class="sidebar">
    <div class="sidebar-header">Resources</div>
    <div id="service-list"></div>
    <div class="legend">
      <div class="legend-title">Connection Types</div>
      <div class="legend-item"><div class="legend-line" style="background:#0078D4;"></div> API</div>
      <div class="legend-item"><div class="legend-line" style="background:#0F9D58;"></div> Data</div>
      <div class="legend-item"><div class="legend-line-dash" style="border-color:#E8A000;"></div> Security</div>
      <div class="legend-item"><div class="legend-line-dash" style="border-color:#5C2D91;"></div> Private Endpoint</div>
    </div>
  </div>
</div>

<script>
const NODES = {nodes_js};
const EDGES = {edges_js};
const VNET_INFO = {vnet_info_js};
const HIERARCHY = {hierarchy_js};

// ── Node sizing ──
const SVC_W = 150, SVC_H = 100;  // service node (icon above, name below)
const PE_W = 100, PE_H = 70;     // pe node (smaller)
const GAP = 40;

// ── Layout: Category Group Box style ──
// Each category gets a labeled box, services arranged in a grid inside.
// Groups arranged in 2D: main service groups on top, bottom groups below.
// PE nodes in a separate PE subnet group.

const positions = {{}};
const useRgLayout = HIERARCHY.length > 0 && NODES.some(n => n.resourceGroup);
const peNodes = useRgLayout ? [] : NODES.filter(n => n.type === 'pe');  // RG mode: PE included in mainNodes
const mainNodes = useRgLayout ? NODES : NODES.filter(n => n.type !== 'pe');

// Group box layout parameters
const GROUP_PAD = 24;
const GROUP_TITLE_H = 28;
const GROUP_GAP = 50;
const COLS_PER_GROUP = 3;
const CELL_W = SVC_W + 70;
const CELL_H = SVC_H + 70;

function groupDimensions(nodeCount) {{
  const cols = Math.min(nodeCount, COLS_PER_GROUP);
  const rows = Math.ceil(nodeCount / COLS_PER_GROUP);
  const w = cols * CELL_W + GROUP_PAD * 2;
  const h = rows * CELL_H + GROUP_PAD + GROUP_TITLE_H;
  return {{ w, h, cols, rows }};
}}

const groupBoxes = [];

// ── Layout strategy: RG-based (if HIERARCHY) or Category-based (default) ──

if (useRgLayout) {{
  // ── RG-based layout: group by Subscription > ResourceGroup ──
  let gx = 60, gy = 140;
  let subStartX = 60;
  const SUB_GAP = 80;
  const RG_GAP = 60;

  HIERARCHY.forEach((sub, subIdx) => {{
    let rgX = gx;
    let rgMaxH = 0;

    const subRGs = sub.resourceGroups || [];
    subRGs.forEach((rgName, rgIdx) => {{
      const rgNodes = mainNodes.filter(n => n.subscription === sub.subscription && n.resourceGroup === rgName);
      if (rgNodes.length === 0) return;

      const dim = groupDimensions(rgNodes.length);

      rgNodes.forEach((n, i) => {{
        const col = i % dim.cols;
        const row = Math.floor(i / dim.cols);
        positions[n.id] = {{
          x: rgX + GROUP_PAD + col * CELL_W + (CELL_W - SVC_W) / 2,
          y: gy + GROUP_TITLE_H + row * CELL_H + (CELL_H - SVC_H) / 2
        }};
      }});

      groupBoxes.push({{
        cat: rgName, x: rgX, y: gy, w: dim.w, h: dim.h,
        color: rgNodes[0]?.color || '#0078D4',
        isRG: true, subscription: sub.subscription
      }});

      rgX += dim.w + RG_GAP;
      rgMaxH = Math.max(rgMaxH, dim.h);
    }});

    // Next subscription row
    if (subIdx < HIERARCHY.length - 1) {{
      gy += rgMaxH + SUB_GAP;
      gx = subStartX;
    }}
  }});

  // Place unassigned main nodes (no subscription/RG) in a generic group
  const unassigned = mainNodes.filter(n => !positions[n.id]);
  if (unassigned.length > 0) {{
    const allY = Object.values(positions).map(p => p.y);
    const bottomY = allY.length > 0 ? Math.max(...allY) + SVC_H + GROUP_GAP : 140;
    const dim = groupDimensions(unassigned.length);
    unassigned.forEach((n, i) => {{
      const col = i % dim.cols;
      const row = Math.floor(i / dim.cols);
      positions[n.id] = {{
        x: 60 + GROUP_PAD + col * CELL_W + (CELL_W - SVC_W) / 2,
        y: bottomY + GROUP_TITLE_H + row * CELL_H + (CELL_H - SVC_H) / 2
      }};
    }});
    groupBoxes.push({{
      cat: 'Other', x: 60, y: bottomY, w: dim.w, h: dim.h,
      color: '#666'
    }});
  }}

}} else {{
  // ── Category-based layout (original) ──
  const bottomCategories = ['Network', 'External', 'Monitor', 'Monitoring'];
  const catOrder = ['AI', 'Data', 'Security', 'Compute', 'Integration', 'DevOps', 'IoT', 'Azure'];

  const catGroups = {{}};
  mainNodes.forEach(n => {{
    const cat = n.category || 'Azure';
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push(n);
  }});

// Dynamically include any categories not in catOrder or bottomCategories
const extraCats = Object.keys(catGroups).filter(cat => !catOrder.includes(cat) && !bottomCategories.includes(cat));
const fullCatOrder = [...catOrder, ...extraCats];

// ── Place main service groups in a flowing grid ──
const serviceGroups = fullCatOrder.filter(cat => catGroups[cat] && catGroups[cat].length > 0
  && !bottomCategories.includes(cat));

let gx = 60, gy = 140;  // starting position for service groups
let rowMaxH = 0;
let rowStartX = 60;
const MAX_ROW_W = Math.max(1600, serviceGroups.length * 400);  // wider to keep Security alongside AI/Data

serviceGroups.forEach(cat => {{
  const nodes = catGroups[cat];
  const dim = groupDimensions(nodes.length);

  // Wrap to next row if too wide
  if (gx + dim.w > rowStartX + MAX_ROW_W && gx > rowStartX) {{
    gx = rowStartX;
    gy += rowMaxH + GROUP_GAP;
    rowMaxH = 0;
  }}

  // Place nodes inside group grid
  nodes.forEach((n, i) => {{
    const col = i % dim.cols;
    const row = Math.floor(i / dim.cols);
    positions[n.id] = {{
      x: gx + GROUP_PAD + col * CELL_W + (CELL_W - SVC_W) / 2,
      y: gy + GROUP_TITLE_H + row * CELL_H + (CELL_H - SVC_H) / 2
    }};
  }});

  groupBoxes.push({{
    cat, x: gx, y: gy, w: dim.w, h: dim.h,
    color: nodes[0]?.color || '#0078D4'
  }});

  gx += dim.w + GROUP_GAP;
  rowMaxH = Math.max(rowMaxH, dim.h);
}});

// ── Place bottom groups (Network, External, Monitor) ──
const bottomGroupY = gy + rowMaxH + GROUP_GAP + 20;
let bgx = 60;
bottomCategories.forEach(cat => {{
  const nodes = catGroups[cat];
  if (!nodes || nodes.length === 0) return;
  const dim = groupDimensions(nodes.length);

  nodes.forEach((n, i) => {{
    const col = i % dim.cols;
    const row = Math.floor(i / dim.cols);
    positions[n.id] = {{
      x: bgx + GROUP_PAD + col * CELL_W + (CELL_W - SVC_W) / 2,
      y: bottomGroupY + GROUP_TITLE_H + row * CELL_H + (CELL_H - SVC_H) / 2
    }};
  }});

  groupBoxes.push({{
    cat, x: bgx, y: bottomGroupY, w: dim.w, h: dim.h,
    color: nodes[0]?.color || '#666',
    isBottom: true
  }});

  bgx += dim.w + GROUP_GAP;
}});

}} // end of else (category-based layout)

// ── PE nodes placement ──
if (useRgLayout) {{
  // RG mode: PE nodes go inside their respective RG boxes
  // PE positions are already set by the RG layout if they have subscription/resourceGroup
  // For PEs without RG assignment, place them in a separate group
  const unplacedPEs = peNodes.filter(pe => !positions[pe.id]);
  if (unplacedPEs.length > 0) {{
    // Find the rightmost RG box position
    const allGbRight = groupBoxes.length > 0 ? Math.max(...groupBoxes.map(gb => gb.x + gb.w)) : 0;
    const peStartX = allGbRight + GROUP_GAP;
    const peStartY = 140;
    const peCols = Math.min(unplacedPEs.length, 4);
    const peCellW = PE_W + 50;
    const peCellH = PE_H + 30;
    const peBoxW = peCols * peCellW + GROUP_PAD * 2;
    const peRows = Math.ceil(unplacedPEs.length / peCols);
    const peBoxH = peRows * peCellH + GROUP_PAD + GROUP_TITLE_H;
    
    unplacedPEs.forEach((pe, i) => {{
      const col = i % peCols;
      const row = Math.floor(i / peCols);
      positions[pe.id] = {{
        x: peStartX + GROUP_PAD + col * peCellW + (peCellW - PE_W) / 2,
        y: peStartY + GROUP_TITLE_H + row * peCellH + (peCellH - PE_H) / 2
      }};
    }});
    groupBoxes.push({{
      cat: 'Private Endpoints', x: peStartX, y: peStartY, w: peBoxW, h: peBoxH,
      color: '#5C2D91', isPE: true
    }});
  }}
}} else {{
  // Category mode: PE nodes in separate group above service groups
  const PE_Y = 40;
  if (peNodes.length > 0) {{
    const peCols = Math.min(peNodes.length, 6);
    const peRows = Math.ceil(peNodes.length / peCols);
    const peCellW = PE_W + 50;
    const peCellH = PE_H + 30;
    const peBoxW = peCols * peCellW + GROUP_PAD * 2;
    const peBoxH = peRows * peCellH + GROUP_PAD + GROUP_TITLE_H;

    peNodes.forEach((pe, i) => {{
      const col = i % peCols;
      const row = Math.floor(i / peCols);
      positions[pe.id] = {{
        x: 60 + GROUP_PAD + col * peCellW + (peCellW - PE_W) / 2,
        y: PE_Y + GROUP_TITLE_H + row * peCellH + (peCellH - PE_H) / 2
      }};
    }});

    groupBoxes.push({{
      cat: 'Private Endpoints', x: 60, y: PE_Y, w: peBoxW, h: peBoxH,
      color: '#5C2D91', isPE: true
    }});

    const peBottom = PE_Y + peBoxH + GROUP_GAP;
    if (peBottom > 140) {{
      const shift = peBottom - 140;
      NODES.forEach(n => {{
        if (n.type !== 'pe' && positions[n.id]) {{
          positions[n.id].y += shift;
        }}
      }});
      groupBoxes.forEach(gb => {{
        if (!gb.isPE) gb.y += shift;
      }});
    }}
  }}
}}

// ── Node → Group mapping (for edge routing) ──
const nodeGroupMap = {{}};
groupBoxes.forEach((gb, idx) => {{
  NODES.forEach(n => {{
    const pos = positions[n.id];
    if (!pos) return;
    const nw = n.type === 'pe' ? PE_W : SVC_W;
    const nh = n.type === 'pe' ? PE_H : SVC_H;
    const ncx = pos.x + nw / 2;
    const ncy = pos.y + nh / 2;
    if (ncx >= gb.x && ncx <= gb.x + gb.w && ncy >= gb.y && ncy <= gb.y + gb.h) {{
      nodeGroupMap[n.id] = idx;
    }}
  }});
}});
// Routing corridor margins (outside all group boxes)
const _rightMarginBase = groupBoxes.length > 0 ? Math.max(...groupBoxes.map(g => g.x + g.w)) + 40 : 800;
const _leftMarginBase = groupBoxes.length > 0 ? Math.min(...groupBoxes.map(g => g.x)) - 40 : -40;

// ── State ──
let dragging = null, dragOffX = 0, dragOffY = 0;
let draggingGroup = null, groupDragNodes = [];  // for RG/group box dragging
let viewTransform = {{ x: 0, y: 0, scale: 1 }};
let isPanning = false, panSX = 0, panSY = 0, panSTx = 0, panSTy = 0;
let _routeCounter = 0;

// ── Bidirectional highlight ──
let _selectedNodeId = null;

function selectNode(nodeId) {{
  const wasSelected = _selectedNodeId === nodeId;

  // Clear all selections
  clearSelection();

  // Toggle off if clicking same node
  if (wasSelected) {{ _selectedNodeId = null; return; }}

  _selectedNodeId = nodeId;

  // Highlight diagram node
  const svgNode = document.querySelector(`.node[data-id="${{nodeId}}"]`);
  if (svgNode) svgNode.classList.add('selected');
  // Highlight sidebar card
  const card = document.getElementById('card-' + nodeId);
  if (card) {{ card.classList.add('selected'); card.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }}); }}

  // Find connected edges (where this node is from or to)
  const connectedNodeIds = new Set([nodeId]);
  document.querySelectorAll('.edge-path').forEach(p => {{
    const f = p.getAttribute('data-from'), t = p.getAttribute('data-to');
    if (f === nodeId || t === nodeId) {{
      p.classList.add('highlight');
      connectedNodeIds.add(f);
      connectedNodeIds.add(t);
    }} else {{
      p.classList.add('dimmed');
    }}
  }});
  document.querySelectorAll('.edge-label').forEach(g => {{
    const f = g.getAttribute('data-from'), t = g.getAttribute('data-to');
    if (f === nodeId || t === nodeId) {{
      g.classList.add('highlight');
      g.querySelector('.edge-label-bg')?.classList.add('highlight');
    }} else {{
      g.classList.add('dimmed');
      g.querySelector('.edge-label-bg')?.classList.add('dimmed');
    }}
  }});
  // Dim unconnected nodes
  document.querySelectorAll('.node').forEach(n => {{
    const nid = n.getAttribute('data-id');
    if (!connectedNodeIds.has(nid)) n.classList.add('dimmed');
  }});
}}

function clearSelection() {{
  _selectedNodeId = null;
  document.querySelectorAll('.node').forEach(n => {{ n.classList.remove('selected', 'dimmed'); }});
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.edge-path').forEach(p => {{ p.classList.remove('highlight', 'dimmed'); }});
  document.querySelectorAll('.edge-label').forEach(g => {{ g.classList.remove('highlight', 'dimmed'); }});
  document.querySelectorAll('.edge-label-bg').forEach(r => {{ r.classList.remove('highlight', 'dimmed'); }});
}}

function markerFor(type) {{
  if (type === 'data') return 'arr-data';
  if (type === 'security') return 'arr-sec';
  if (type === 'private') return 'arr-pe';
  return 'arr';
}}

function renderDiagram() {{
  const root = document.getElementById('diagram-root');
  root.innerHTML = '';
  _routeCounter = 0;  // reset stagger counter each render

  // ── Draw VNet boundary (only in category-based layout, not RG layout) ──
  if (!useRgLayout) {{
  const privateGroups = groupBoxes.filter(gb => !gb.isBottom);
  const hasPrivateNodes = NODES.some(n => n.private && n.type !== 'pe');
  const hasVNetInfo = VNET_INFO && VNET_INFO.length > 0;
  const hasPeNodes = NODES.some(n => n.type === 'pe');
  const showVNet = hasPrivateNodes || hasVNetInfo || hasPeNodes;

  if (privateGroups.length > 0 && showVNet) {{
      const vx = Math.min(...privateGroups.map(g => g.x)) - 16;
      const vy = Math.min(...privateGroups.map(g => g.y)) - 36;
      const vRight = Math.max(...privateGroups.map(g => g.x + g.w)) + 16;
      const vBottom = Math.max(...privateGroups.map(g => g.y + g.h)) + 16;

      const vr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      vr.setAttribute('x', vx); vr.setAttribute('y', vy);
      vr.setAttribute('width', vRight - vx); vr.setAttribute('height', vBottom - vy);
      vr.setAttribute('fill', '#f8f7ff'); vr.setAttribute('stroke', '#5C2D91');
      vr.setAttribute('stroke-width', '2'); vr.setAttribute('stroke-dasharray', '8,4');
      vr.setAttribute('rx', '12');
      root.appendChild(vr);

      const vnetLabel = VNET_INFO ? `Virtual Network (${{VNET_INFO}})` : 'Virtual Network';
      const vl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      vl.setAttribute('class', 'vnet-boundary-label');
      vl.setAttribute('style', 'cursor: pointer;');
      vl.innerHTML = `<svg x="${{vx + 10}}" y="${{vy + 6}}" width="20" height="20" viewBox="0 0 48 48">
        <rect x="6" y="6" width="36" height="36" rx="4" fill="none" stroke="#5C2D91" stroke-width="3"/>
        <circle cx="16" cy="18" r="3" fill="#5C2D91"/><circle cx="32" cy="18" r="3" fill="#5C2D91"/><circle cx="24" cy="32" r="3" fill="#5C2D91"/>
      </svg>
      <text x="${{vx + 34}}" y="${{vy + 20}}" font-size="12" font-weight="600" fill="#5C2D91" font-family="Segoe UI, sans-serif">${{vnetLabel}}</text>`;
      root.appendChild(vl);

      // Store VNet rect reference for highlight
      vr.setAttribute('id', 'vnet-rect');
      vl.addEventListener('click', () => {{ toggleVNetHighlight(); }});
      root.appendChild(vl);
  }}
  }} // end if(!useRgLayout) for VNet boundary

  // ── Draw group boxes (category or RG — depends on layout mode) ──
  groupBoxes.forEach(gb => {{
    if (gb.isPE) {{
      // PE group — always draw with dashed style
      const gr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      gr.setAttribute('x', gb.x); gr.setAttribute('y', gb.y);
      gr.setAttribute('width', gb.w); gr.setAttribute('height', gb.h);
      gr.setAttribute('rx', '8'); gr.setAttribute('fill', '#f3eef9');
      gr.setAttribute('stroke', '#d4b8ff'); gr.setAttribute('stroke-width', '1');
      gr.setAttribute('stroke-dasharray', '4,4');
      root.appendChild(gr);
    }} else {{
      // Service group (category or RG)
      const gr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      gr.setAttribute('x', gb.x); gr.setAttribute('y', gb.y);
      gr.setAttribute('width', gb.w); gr.setAttribute('height', gb.h);
      gr.setAttribute('rx', '8');
      gr.setAttribute('fill', gb.isRG ? '#fafafa' : 'white');
      gr.setAttribute('stroke', gb.isRG ? gb.color : '#e1dfdd');
      gr.setAttribute('stroke-width', gb.isRG ? '1.5' : '1');
      if (gb.isRG) gr.setAttribute('stroke-dasharray', '6,3');
      root.appendChild(gr);
    }}

    // Title bar
    const titleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    titleBar.setAttribute('x', gb.x); titleBar.setAttribute('y', gb.y);
    titleBar.setAttribute('width', gb.w); titleBar.setAttribute('height', GROUP_TITLE_H);
    titleBar.setAttribute('rx', '8');
    titleBar.setAttribute('fill', gb.color);
    titleBar.setAttribute('opacity', '0.1');
    root.appendChild(titleBar);
    const titleFill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    titleFill.setAttribute('x', gb.x); titleFill.setAttribute('y', gb.y + GROUP_TITLE_H - 8);
    titleFill.setAttribute('width', gb.w); titleFill.setAttribute('height', '8');
    titleFill.setAttribute('fill', gb.color); titleFill.setAttribute('opacity', '0.1');
    root.appendChild(titleFill);

    // Color accent line
    const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    accent.setAttribute('x', gb.x); accent.setAttribute('y', gb.y);
    accent.setAttribute('width', gb.w); accent.setAttribute('height', '3');
    accent.setAttribute('rx', '8'); accent.setAttribute('fill', gb.color);
    root.appendChild(accent);

    // Group label — RG uses 📁, PE uses "Private Endpoints", category uses category name
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', gb.x + 12); label.setAttribute('y', gb.y + 18);
    label.setAttribute('font-size', '11'); label.setAttribute('font-weight', '600');
    label.setAttribute('fill', gb.color); label.setAttribute('font-family', 'Segoe UI, sans-serif');
    label.textContent = gb.isRG ? `📁 ${{gb.cat}}` : gb.cat;
    root.appendChild(label);

    // Make title bar draggable — drags all nodes inside
    titleBar.style.cursor = 'grab';
    const gbIdx = groupBoxes.indexOf(gb);
    titleBar.addEventListener('mousedown', e => {{
      if (e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      draggingGroup = gbIdx;
      const svgPt = getSVGPoint(e);
      dragOffX = svgPt.x; dragOffY = svgPt.y;
      // Find all nodes inside this group box
      groupDragNodes = NODES.filter(n => {{
        const pos = positions[n.id];
        if (!pos) return false;
        const nw = n.type === 'pe' ? PE_W : SVC_W;
        const nh = n.type === 'pe' ? PE_H : SVC_H;
        const cx = pos.x + nw/2, cy = pos.y + nh/2;
        return cx >= gb.x && cx <= gb.x + gb.w && cy >= gb.y && cy <= gb.y + gb.h;
      }}).map(n => n.id);
    }});
  }});

  // ── Draw Subscription boundaries (only if multiple subscriptions, rendered AFTER group boxes) ──
  if (HIERARCHY.length > 1 && useRgLayout) {{
    HIERARCHY.forEach((sub, subIdx) => {{
      // Find all RG boxes belonging to this subscription
      const subRgBoxes = groupBoxes.filter(gb => gb.isRG && gb.subscription === sub.subscription);
      if (subRgBoxes.length === 0) return;
      
      const sx = Math.min(...subRgBoxes.map(gb => gb.x)) - 20;
      const sy = Math.min(...subRgBoxes.map(gb => gb.y)) - 40;
      const sRight = Math.max(...subRgBoxes.map(gb => gb.x + gb.w)) + 20;
      const sBottom = Math.max(...subRgBoxes.map(gb => gb.y + gb.h)) + 20;
      
      const sr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      sr.setAttribute('x', sx); sr.setAttribute('y', sy);
      sr.setAttribute('width', sRight - sx); sr.setAttribute('height', sBottom - sy);
      sr.setAttribute('fill', 'none'); sr.setAttribute('stroke', '#0078D4');
      sr.setAttribute('stroke-width', '2.5'); sr.setAttribute('stroke-dasharray', '12,4');
      sr.setAttribute('rx', '16'); sr.setAttribute('opacity', '0.7');
      root.appendChild(sr);
      
      const sl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sl.setAttribute('x', sx + 12); sl.setAttribute('y', sy + 16);
      sl.setAttribute('font-size', '12'); sl.setAttribute('font-weight', '700');
      sl.setAttribute('fill', '#0078D4'); sl.setAttribute('font-family', 'Segoe UI, sans-serif');
      sl.textContent = `📦 ${{sub.subscription}}`;
      root.appendChild(sl);
    }});
  }}

  // ── Edge routing (obstacle-free) ──
  // Compute global bounds: the absolute bottom of ALL nodes
  function getGlobalBounds() {{
    let minY = Infinity, maxY = -Infinity;
    NODES.forEach(n => {{
      const pos = positions[n.id];
      if (!pos) return;
      const h = n.type === 'pe' ? PE_H : SVC_H;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + h > maxY) maxY = pos.y + h;
    }});
    return {{ minY, maxY }};
  }}

  function getNodeBox(node) {{
    const pos = positions[node.id];
    if (!pos) return null;
    const w = node.type === 'pe' ? PE_W : SVC_W;
    const h = node.type === 'pe' ? PE_H : SVC_H;
    return {{ x: pos.x, y: pos.y, w, h, cx: pos.x + w/2, cy: pos.y + h/2 }};
  }}

  // Check if direct line between two nodes crosses ANY other node
  function hasObstacle(fromId, toId, x1, y1, x2, y2) {{
    for (const n of NODES) {{
      if (n.id === fromId || n.id === toId) continue;
      const pos = positions[n.id];
      if (!pos) continue;
      const w = n.type === 'pe' ? PE_W : SVC_W;
      const h = n.type === 'pe' ? PE_H : SVC_H;
      const pad = 6;
      const left = pos.x - pad, right = pos.x + w + pad;
      const top = pos.y - pad, bottom = pos.y + h + pad;
      // Liang-Barsky line clipping
      const dx = x2 - x1, dy = y2 - y1;
      let tmin = 0, tmax = 1;
      const edges = [[-dx, x1 - left], [dx, right - x1], [-dy, y1 - top], [dy, bottom - y1]];
      let hit = true;
      for (const [p, q] of edges) {{
        if (Math.abs(p) < 0.001) {{ if (q < 0) {{ hit = false; break; }} }}
        else {{
          const t = q / p;
          if (p < 0) {{ if (t > tmin) tmin = t; }}
          else {{ if (t < tmax) tmax = t; }}
          if (tmin > tmax) {{ hit = false; break; }}
        }}
      }}
      if (hit && tmin < tmax) return true;
    }}
    return false;
  }}

  // Border point: exit/enter at edge of rectangle
  function borderExit(box, side) {{
    // side: 'top', 'bottom', 'left', 'right'
    if (side === 'top') return {{ x: box.cx, y: box.y }};
    if (side === 'bottom') return {{ x: box.cx, y: box.y + box.h }};
    if (side === 'left') return {{ x: box.x, y: box.cy }};
    if (side === 'right') return {{ x: box.x + box.w, y: box.cy }};
  }}

  // Check if a line segment hits any group box (for edge routing)
  function hitsGroupBox(x1, y1, x2, y2, skipGroupIndices) {{
    for (let gi = 0; gi < groupBoxes.length; gi++) {{
      if (skipGroupIndices.includes(gi)) continue;
      const gb = groupBoxes[gi];
      const pad = 4;
      const left = gb.x - pad, right = gb.x + gb.w + pad;
      const top = gb.y - pad, bottom = gb.y + gb.h + pad;
      const dx = x2 - x1, dy = y2 - y1;
      let tmin = 0, tmax = 1;
      const edges = [[-dx, x1 - left], [dx, right - x1], [-dy, y1 - top], [dy, bottom - y1]];
      let hit = true;
      for (const [p, q] of edges) {{
        if (Math.abs(p) < 0.001) {{ if (q < 0) {{ hit = false; break; }} }}
        else {{
          const t = q / p;
          if (p < 0) {{ if (t > tmin) tmin = t; }}
          else {{ if (t < tmax) tmax = t; }}
          if (tmin > tmax) {{ hit = false; break; }}
        }}
      }}
      if (hit && tmin < tmax) return true;
    }}
    return false;
  }}

  // Find gap between adjacent groups (same row)
  function findGapBetween(gi1, gi2) {{
    if (gi1 < 0 || gi2 < 0) return null;
    const g1 = groupBoxes[gi1], g2 = groupBoxes[gi2];
    // Same row: Y ranges overlap
    const yOverlap = g1.y < g2.y + g2.h && g2.y < g1.y + g1.h;
    if (!yOverlap) return null;
    // Gap between them
    if (g1.x + g1.w < g2.x) return {{ x: (g1.x + g1.w + g2.x) / 2 }};
    if (g2.x + g2.w < g1.x) return {{ x: (g2.x + g2.w + g1.x) / 2 }};
    return null;
  }}

  // Build orthogonal path with rounded corners
  function buildOrthoPath(pts) {{
    let d = `M ${{pts[0].x}} ${{pts[0].y}}`;
    const radius = 6;
    for (let i = 1; i < pts.length - 1; i++) {{
      const prev = pts[i-1], curr = pts[i], next = pts[i+1];
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
      const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
      if (len1 < 1 || len2 < 1) {{ d += ` L ${{curr.x}} ${{curr.y}}`; continue; }}
      const r = Math.min(radius, len1/2, len2/2);
      const bx = curr.x - (dx1/len1)*r, by = curr.y - (dy1/len1)*r;
      const ax = curr.x + (dx2/len2)*r, ay = curr.y + (dy2/len2)*r;
      d += ` L ${{bx}} ${{by}} Q ${{curr.x}} ${{curr.y}} ${{ax}} ${{ay}}`;
    }}
    d += ` L ${{pts[pts.length-1].x}} ${{pts[pts.length-1].y}}`;
    return d;
  }}

  // ── Obstacle avoidance: route edges around nodes ──
  function segHitsNode(x1, y1, x2, y2, pos, nw, nh, margin) {{
    const nx1 = pos.x - margin, ny1 = pos.y - margin;
    const nx2 = pos.x + nw + margin, ny2 = pos.y + nh + margin;
    if (Math.abs(x1 - x2) < 1) {{
      // Vertical segment
      const x = x1;
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      return x > nx1 && x < nx2 && maxY > ny1 && minY < ny2;
    }} else {{
      // Horizontal segment
      const y = y1;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      return y > ny1 && y < ny2 && maxX > nx1 && minX < nx2;
    }}
  }}

  function avoidNodes(pts, fromId, toId) {{
    const MARGIN = 25;
    let points = pts.map(p => ({{...p}}));
    // Save original anchors — these must NEVER move (they attach to nodes)
    const startAnchor = {{...points[0]}};
    const endAnchor = {{...points[points.length - 1]}};

    for (let iter = 0; iter < 8; iter++) {{
      let found = false;

      for (let i = 0; i < points.length - 1 && !found; i++) {{
        const p1 = points[i], p2 = points[i+1];

        for (const node of NODES) {{
          if (node.id === fromId || node.id === toId) continue;
          const pos = positions[node.id];
          if (!pos) continue;
          const nw = node.type === 'pe' ? PE_W : SVC_W;
          const nh = node.type === 'pe' ? PE_H : SVC_H;

          if (!segHitsNode(p1.x, p1.y, p2.x, p2.y, pos, nw, nh, MARGIN)) continue;

          found = true;
          const isVert = Math.abs(p1.x - p2.x) < 1;
          const isFirst = (i === 0);
          const isLast = (i + 1 === points.length - 1);

          if (points.length <= 2) {{
            // Straight line hitting a node: convert to 4-point detour (anchors preserved)
            if (isVert) {{
              const leftX = pos.x - MARGIN;
              const rightX = pos.x + nw + MARGIN;
              const detourX = Math.abs(p1.x - leftX) <= Math.abs(p1.x - rightX) ? leftX : rightX;
              points = [points[0], {{x: detourX, y: p1.y}}, {{x: detourX, y: p2.y}}, points[points.length-1]];
            }} else {{
              const topY = pos.y - MARGIN;
              const bottomY = pos.y + nh + MARGIN;
              const detourY = Math.abs(p1.y - topY) <= Math.abs(p1.y - bottomY) ? topY : bottomY;
              points = [points[0], {{x: p1.x, y: detourY}}, {{x: p2.x, y: detourY}}, points[points.length-1]];
            }}
          }} else if (isFirst) {{
            // First segment collides — keep points[0] (anchor), insert detour after it
            if (isVert) {{
              const leftX = pos.x - MARGIN;
              const rightX = pos.x + nw + MARGIN;
              const detourX = Math.abs(p1.x - leftX) <= Math.abs(p1.x - rightX) ? leftX : rightX;
              points.splice(1, 0, {{x: p1.x, y: p1.y}}, {{x: detourX, y: p1.y}});
              points[3] = {{x: detourX, y: p2.y}};
            }} else {{
              const topY = pos.y - MARGIN;
              const bottomY = pos.y + nh + MARGIN;
              const detourY = Math.abs(p1.y - topY) <= Math.abs(p1.y - bottomY) ? topY : bottomY;
              points.splice(1, 0, {{x: p1.x, y: detourY}});
              points[2] = {{x: p2.x, y: detourY}};
            }}
          }} else if (isLast) {{
            // Last segment collides — keep last point (anchor), insert detour before it
            if (isVert) {{
              const leftX = pos.x - MARGIN;
              const rightX = pos.x + nw + MARGIN;
              const detourX = Math.abs(p1.x - leftX) <= Math.abs(p1.x - rightX) ? leftX : rightX;
              points[i] = {{x: detourX, y: p1.y}};
              points.splice(i + 1, 0, {{x: detourX, y: p2.y}}, {{x: p2.x, y: p2.y}});
            }} else {{
              const topY = pos.y - MARGIN;
              const bottomY = pos.y + nh + MARGIN;
              const detourY = Math.abs(p1.y - topY) <= Math.abs(p1.y - bottomY) ? topY : bottomY;
              points[i] = {{x: p1.x, y: detourY}};
              points.splice(i + 1, 0, {{x: p2.x, y: detourY}});
            }}
          }} else {{
            // Middle segment: safe to push both endpoints
            if (isVert) {{
              const leftX = pos.x - MARGIN;
              const rightX = pos.x + nw + MARGIN;
              const newX = Math.abs(p1.x - leftX) <= Math.abs(p1.x - rightX) ? leftX : rightX;
              points[i] = {{ x: newX, y: p1.y }};
              points[i+1] = {{ x: newX, y: p2.y }};
            }} else {{
              const topY = pos.y - MARGIN;
              const bottomY = pos.y + nh + MARGIN;
              const newY = Math.abs(p1.y - topY) <= Math.abs(p1.y - bottomY) ? topY : bottomY;
              points[i] = {{ x: p1.x, y: newY }};
              points[i+1] = {{ x: p2.x, y: newY }};
            }}
          }}
          break;
        }}
      }}

      if (!found) break;
    }}

    // Restore anchors — guarantee lines always touch source/target nodes
    points[0] = startAnchor;
    points[points.length - 1] = endAnchor;

    return points;
  }}

  // ── Edges (rendered FIRST — nodes render on top, covering crossings) ──
  // Edge labels are collected and rendered AFTER nodes so they stay visible.
  // Orthogonal routing only: horizontal/vertical segments with right-angle turns.
  const _edgeLabels = [];
  EDGES.forEach(edge => {{
    const fn = NODES.find(n => n.id === edge.from);
    const tn = NODES.find(n => n.id === edge.to);
    if (!fn || !tn) return;
    const fromBox = getNodeBox(fn);
    const toBox = getNodeBox(tn);
    if (!fromBox || !toBox) return;

    const isPeEdge = edge.type === 'private';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let pts;

    if (isPeEdge) {{
      // PE → orthogonal routing (also avoids nodes)
      const sx = fromBox.cx, sy = fromBox.y + fromBox.h;
      const ex = toBox.cx, ey = toBox.y;
      if (Math.abs(sx - ex) < 8) {{
        pts = [{{x: sx, y: sy}}, {{x: ex, y: ey}}];
      }} else {{
        const midY = (sy + ey) / 2;
        pts = [{{x: sx, y: sy}}, {{x: sx, y: midY}}, {{x: ex, y: midY}}, {{x: ex, y: ey}}];
      }}
      pts = avoidNodes(pts, edge.from, edge.to);
    }} else {{
      // Orthogonal routing: determine exit/entry sides
      const dx = toBox.cx - fromBox.cx;
      const dy = toBox.cy - fromBox.cy;
      let exitSide, entrySide;

      if (Math.abs(dx) >= Math.abs(dy)) {{
        exitSide = dx >= 0 ? 'right' : 'left';
        entrySide = dx >= 0 ? 'left' : 'right';
      }} else {{
        exitSide = dy >= 0 ? 'bottom' : 'top';
        entrySide = dy >= 0 ? 'top' : 'bottom';
      }}

      const sp = borderExit(fromBox, exitSide);
      const ep = borderExit(toBox, entrySide);
      const stagger = (_routeCounter % 5 - 2) * 6;
      _routeCounter++;

      if (exitSide === 'right' || exitSide === 'left') {{
        if (Math.abs(sp.y - ep.y) < 8) {{
          pts = [sp, ep]; // straight horizontal
        }} else {{
          const midX = (sp.x + ep.x) / 2 + stagger;
          pts = [sp, {{x: midX, y: sp.y}}, {{x: midX, y: ep.y}}, ep];
        }}
      }} else {{
        if (Math.abs(sp.x - ep.x) < 8) {{
          pts = [sp, ep]; // straight vertical
        }} else {{
          const midY = (sp.y + ep.y) / 2 + stagger;
          pts = [sp, {{x: sp.x, y: midY}}, {{x: ep.x, y: midY}}, ep];
        }}
      }}

      // Avoid intermediate nodes
      pts = avoidNodes(pts, edge.from, edge.to);
    }}

    // Render path
    path.setAttribute('d', pts.length <= 2
      ? `M ${{pts[0].x}} ${{pts[0].y}} L ${{pts[pts.length-1].x}} ${{pts[pts.length-1].y}}`
      : buildOrthoPath(pts));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', isPeEdge ? '#5C2D91' : '#8a8886');
    path.setAttribute('stroke-width', isPeEdge ? '1' : '1.2');
    path.setAttribute('stroke-dasharray', edge.dash || '0');
    path.setAttribute('marker-end', `url(#${{markerFor(edge.type)}})`);
    path.setAttribute('opacity', isPeEdge ? '0.5' : '0.65');
    path.classList.add('edge-path');
    path.setAttribute('data-from', edge.from);
    path.setAttribute('data-to', edge.to);
    root.appendChild(path);

    // Store label position for deferred rendering (after nodes)
    // Collision-aware: try each segment's midpoint, pick the first that doesn't overlap a node.
    if (edge.label) {{
      const bw = edge.label.length * 5.5 + 10;
      const bh = 14;

      function labelHitsNode(lx, ly) {{
        return NODES.some(n => {{
          const p = positions[n.id];
          if (!p) return false;
          const nw = n.type === 'pe' ? PE_W : SVC_W;
          const nh = n.type === 'pe' ? PE_H : SVC_H;
          return lx + bw/2 > p.x && lx - bw/2 < p.x + nw
              && ly + bh/2 > p.y && ly - bh/2 < p.y + nh;
        }});
      }}

      // Collect candidate positions: midpoint of each segment
      const candidates = [];
      for (let s = 0; s < pts.length - 1; s++) {{
        const cx = (pts[s].x + pts[s+1].x) / 2;
        const cy = (pts[s].y + pts[s+1].y) / 2;
        // Prefer middle segments first, then outer ones
        const priority = Math.abs(s - (pts.length-2)/2);
        candidates.push({{ x: cx, y: cy, priority }});
      }}
      candidates.sort((a, b) => a.priority - b.priority);

      // Pick first candidate that doesn't hit a node
      let chosen = candidates[0];
      for (const c of candidates) {{
        if (!labelHitsNode(c.x, c.y)) {{ chosen = c; break; }}
      }}

      // If all candidates hit, offset the best one perpendicular to segment
      if (labelHitsNode(chosen.x, chosen.y)) {{
        // Try shifting up/down/left/right by 20px
        const offsets = [{{x:0,y:-20}},{{x:0,y:20}},{{x:-20,y:0}},{{x:20,y:0}}];
        for (const off of offsets) {{
          if (!labelHitsNode(chosen.x+off.x, chosen.y+off.y)) {{
            chosen = {{ x: chosen.x+off.x, y: chosen.y+off.y }};
            break;
          }}
        }}
      }}

      _edgeLabels.push({{ label: edge.label, x: chosen.x, y: chosen.y, from: edge.from, to: edge.to }});
    }}
  }});

  // ── Nodes (rendered LAST — on top of edges, covering crossing points) ──
  NODES.forEach(node => {{
    const pos = positions[node.id];
    if (!pos) return;
    const isPe = node.type === 'pe';
    const nw = isPe ? PE_W : SVC_W;
    const nh = isPe ? PE_H : SVC_H;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${{pos.x}},${{pos.y}})`);

    // Card background — full clickable area
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'node-bg');
    rect.setAttribute('width', nw); rect.setAttribute('height', nh);
    rect.setAttribute('rx', '8'); rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#edebe9'); rect.setAttribute('stroke-width', '1');
    rect.setAttribute('filter', 'url(#shadow)');
    g.appendChild(rect);

    // Color accent bar at top
    const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    accent.setAttribute('width', nw); accent.setAttribute('height', '3');
    accent.setAttribute('rx', '8'); accent.setAttribute('fill', node.color);
    accent.setAttribute('opacity', '0.7');
    g.appendChild(accent);

    // Icon — official Azure icon (data URI) preferred, fallback to SVG
    const iconSize = isPe ? 28 : 36;
    const iconX = (nw - iconSize) / 2;
    const iconY = isPe ? 10 : 12;
    if (node.icon_data_uri) {{
      // Official Azure icon (Base64 image)
      const iconImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      iconImg.setAttribute('x', iconX); iconImg.setAttribute('y', iconY);
      iconImg.setAttribute('width', iconSize); iconImg.setAttribute('height', iconSize);
      iconImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', node.icon_data_uri);
      g.appendChild(iconImg);
    }} else {{
      // Fallback: built-in SVG text icon
      const iconG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      iconG.setAttribute('x', iconX); iconG.setAttribute('y', iconY);
      iconG.setAttribute('width', iconSize); iconG.setAttribute('height', iconSize);
      iconG.setAttribute('viewBox', '0 0 48 48');
      iconG.innerHTML = node.icon_svg;
      g.appendChild(iconG);
    }}

    // Name
    const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    name.setAttribute('x', nw/2); name.setAttribute('y', isPe ? 52 : 60);
    name.setAttribute('text-anchor', 'middle');
    name.setAttribute('font-size', isPe ? '9' : '10');
    name.setAttribute('font-weight', '600'); name.setAttribute('fill', '#323130');
    name.setAttribute('font-family', 'Segoe UI, sans-serif');
    const maxC = isPe ? 14 : 20;
    name.textContent = node.name.length > maxC ? node.name.substring(0, maxC-1) + '..' : node.name;
    g.appendChild(name);

    // SKU label
    if (!isPe && node.sku) {{
      const sku = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sku.setAttribute('x', nw/2); sku.setAttribute('y', 72);
      sku.setAttribute('text-anchor', 'middle');
      sku.setAttribute('font-size', '9'); sku.setAttribute('fill', '#a19f9d');
      sku.setAttribute('font-family', 'Segoe UI, sans-serif');
      sku.textContent = node.sku;
      g.appendChild(sku);
    }}

    if (isPe && node.details.length > 0) {{
      const det = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      det.setAttribute('x', nw/2); det.setAttribute('y', 63);
      det.setAttribute('text-anchor', 'middle');
      det.setAttribute('font-size', '8'); det.setAttribute('fill', '#a19f9d');
      det.setAttribute('font-family', 'Segoe UI, sans-serif');
      det.textContent = node.details[0];
      g.appendChild(det);
    }}

    // Service type label below (not category — show actual service type name)
    if (!isPe) {{
      const TYPE_LABELS = {{
        'ai_foundry': 'AI Foundry', 'openai': 'Azure OpenAI', 'search': 'AI Search', 'ai_search': 'AI Search',
        'storage': 'Storage', 'adls': 'ADLS Gen2', 'keyvault': 'Key Vault', 'kv': 'Key Vault',
        'fabric': 'Fabric', 'databricks': 'Databricks', 'adf': 'Data Factory', 'data_factory': 'Data Factory',
        'sql_server': 'SQL Server', 'sql_database': 'SQL Database', 'cosmos_db': 'Cosmos DB',
        'vm': 'Virtual Machine', 'aks': 'AKS', 'app_service': 'App Service',
        'function_app': 'Function App', 'synapse': 'Synapse', 'vnet': 'VNet',
        'nsg': 'NSG', 'bastion': 'Bastion', 'pe': 'Private Endpoint',
        'log_analytics': 'Log Analytics', 'app_insights': 'App Insights',
        'monitor': 'Monitor', 'acr': 'Container Registry', 'container_registry': 'Container Registry',
        'document_intelligence': 'Doc Intelligence', 'form_recognizer': 'Doc Intelligence',
        'cdn': 'CDN', 'event_hub': 'Event Hub', 'redis': 'Redis Cache',
        'devops': 'Azure DevOps', 'app_gateway': 'App Gateway',
        'iot_hub': 'IoT Hub', 'stream_analytics': 'Stream Analytics',
        'vpn_gateway': 'VPN Gateway', 'front_door': 'Front Door',
        'ai_hub': 'AI Hub', 'firewall': 'Firewall',
      }};
      const typeLabel = TYPE_LABELS[node.type] || node.type;
      const cat = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      cat.setAttribute('x', nw/2); cat.setAttribute('y', nh + 14);
      cat.setAttribute('text-anchor', 'middle');
      cat.setAttribute('font-size', '9'); cat.setAttribute('fill', node.color);
      cat.setAttribute('font-weight', '600');
      cat.setAttribute('font-family', 'Segoe UI, sans-serif');
      cat.textContent = typeLabel;
      g.appendChild(cat);
    }}

    // Private badge on card
    if (node.private && !isPe) {{
      const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const br = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      br.setAttribute('x', nw - 8); br.setAttribute('y', '4');
      br.setAttribute('width', '6'); br.setAttribute('height', '6');
      br.setAttribute('rx', '3'); br.setAttribute('fill', '#5C2D91');
      br.setAttribute('opacity', '0.6');
      badge.appendChild(br);
      g.appendChild(badge);
    }}

    // ── Events: drag vs click separation ──
    let _dragStartX = 0, _dragStartY = 0, _didDrag = false;
    g.addEventListener('mousedown', e => {{
      if (e.button !== 0) return;
      dragging = node.id;
      _didDrag = false;
      _dragStartX = e.clientX; _dragStartY = e.clientY;
      const svgPt = getSVGPoint(e);
      dragOffX = svgPt.x - pos.x; dragOffY = svgPt.y - pos.y;
      e.stopPropagation(); e.preventDefault();
    }});
    g.addEventListener('mousemove', e => {{
      if (dragging === node.id) {{
        const dx = Math.abs(e.clientX - _dragStartX);
        const dy = Math.abs(e.clientY - _dragStartY);
        if (dx > 3 || dy > 3) _didDrag = true;
      }}
    }});
    g.addEventListener('mouseup', e => {{
      if (!_didDrag && dragging === node.id) {{
        selectNode(node.id);
      }}
    }});
    g.addEventListener('mouseenter', e => {{
      const tt = document.getElementById('tooltip');
      const dets = node.details.map(d => `<div class="tooltip-detail">› ${{d}}</div>`).join('');
      tt.style.display = 'block';
      tt.innerHTML = `<strong>${{node.name}}</strong>${{node.sku ? `<div class="tooltip-detail">SKU: ${{node.sku}}</div>` : ''}}${{dets}}`;
    }});
    g.addEventListener('mousemove', e => {{
      const tt = document.getElementById('tooltip');
      tt.style.left = (e.clientX+12)+'px'; tt.style.top = (e.clientY-8)+'px';
    }});
    g.addEventListener('mouseleave', () => {{ document.getElementById('tooltip').style.display = 'none'; }});

    root.appendChild(g);
  }});

  // ── Edge labels (rendered AFTER nodes — always visible on top) ──
  _edgeLabels.forEach(el => {{
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('edge-label');
    g.setAttribute('data-from', el.from);
    g.setAttribute('data-to', el.to);
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.classList.add('edge-label-bg');
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const bw = el.label.length * 5.5 + 10;
    r.setAttribute('x', el.x-bw/2); r.setAttribute('y', el.y-7);
    r.setAttribute('width', bw); r.setAttribute('height', 14);
    r.setAttribute('rx', '3'); r.setAttribute('fill', 'white');
    r.setAttribute('stroke', '#d2d0ce'); r.setAttribute('stroke-width', '0.5');
    r.setAttribute('opacity', '0.95');
    t.setAttribute('x', el.x); t.setAttribute('y', el.y+3);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '8');
    t.setAttribute('fill', '#605e5c'); t.setAttribute('font-family', 'Segoe UI, sans-serif');
    t.textContent = el.label;
    g.appendChild(r); g.appendChild(t);
    root.appendChild(g);
  }});

}}

function getSVGPoint(e) {{
  const svg = document.getElementById('canvas');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(document.getElementById('diagram-root').getScreenCTM().inverse());
}}

document.getElementById('canvas').addEventListener('mousemove', e => {{
  if (dragging) {{
    const p = getSVGPoint(e);
    positions[dragging].x = p.x - dragOffX;
    positions[dragging].y = p.y - dragOffY;
    renderDiagram();
  }} else if (draggingGroup !== null) {{
    const p = getSVGPoint(e);
    const dx = p.x - dragOffX;
    const dy = p.y - dragOffY;
    dragOffX = p.x; dragOffY = p.y;
    // Move all nodes in the group
    groupDragNodes.forEach(nid => {{
      if (positions[nid]) {{
        positions[nid].x += dx;
        positions[nid].y += dy;
      }}
    }});
    // Also move the group box itself
    const gb = groupBoxes[draggingGroup];
    if (gb) {{ gb.x += dx; gb.y += dy; }}
    renderDiagram();
  }}
}});
document.addEventListener('mouseup', () => {{ dragging = null; draggingGroup = null; groupDragNodes = []; }});

// ── Pan & Zoom ──
function applyTransform() {{
  document.getElementById('diagram-root').setAttribute('transform',
    `translate(${{viewTransform.x}},${{viewTransform.y}}) scale(${{viewTransform.scale}})`);
  document.getElementById('zoom-level').textContent = Math.round(viewTransform.scale * 100) + '%';
}}
function fitToScreen() {{
  const svg = document.getElementById('canvas');
  const root = document.getElementById('diagram-root');
  root.setAttribute('transform', '');
  const bbox = root.getBBox();
  if (!bbox.width || !bbox.height) return;
  const w = svg.clientWidth, h = svg.clientHeight;
  const s = Math.min((w-60)/bbox.width, (h-60)/bbox.height, 1.5);
  if (s <= 0) return;
  viewTransform.scale = s;
  viewTransform.x = (w - bbox.width*s)/2 - bbox.x*s;
  viewTransform.y = (h - bbox.height*s)/2 - bbox.y*s;
  applyTransform();
}}
function zoomIn() {{ viewTransform.scale *= 1.25; applyTransform(); }}
function zoomOut() {{ viewTransform.scale *= 0.8; applyTransform(); }}
function resetZoom() {{ viewTransform = {{x:0,y:0,scale:1}}; applyTransform(); }}

function downloadPNG() {{
  const svg = document.getElementById('canvas');
  const bbox = svg.getBBox();
  const pad = 40;
  const w = Math.ceil(bbox.width + bbox.x + pad * 2);
  const h = Math.ceil(bbox.height + bbox.y + pad * 2);

  const clone = svg.cloneNode(true);
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  clone.setAttribute('viewBox', `${{-pad}} ${{-pad}} ${{w}} ${{h}}`);
  clone.querySelector('#viewport')?.removeAttribute('transform');

  // Inline all computed styles
  const allEls = clone.querySelectorAll('*');
  const origEls = svg.querySelectorAll('*');
  allEls.forEach((el, i) => {{
    if (origEls[i]) {{
      const cs = window.getComputedStyle(origEls[i]);
      ['fill','stroke','stroke-width','font-size','font-family','font-weight',
       'text-anchor','opacity','fill-opacity','stroke-opacity','stroke-dasharray'].forEach(p => {{
        const v = cs.getPropertyValue(p);
        if (v) el.style.setProperty(p, v);
      }});
    }}
  }});

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgStr], {{type: 'image/svg+xml;charset=utf-8'}});
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {{
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (document.title || 'azure-architecture') + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }}, 'image/png');
  }};
  img.src = url;
}}

document.getElementById('canvas').addEventListener('wheel', e => {{
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.1 : 0.9;
  const rect = document.getElementById('canvas').getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const os = viewTransform.scale, ns = os * f;
  viewTransform.x = mx - (mx - viewTransform.x) * (ns/os);
  viewTransform.y = my - (my - viewTransform.y) * (ns/os);
  viewTransform.scale = ns;
  applyTransform();
}}, {{ passive: false }});

document.getElementById('canvas').addEventListener('mousedown', e => {{
  if (e.target.closest('.node')) return;
  // Clear selection when clicking on empty canvas area
  if (_selectedNodeId && !e.target.closest('.node')) clearSelection();
  isPanning = true;
  panSX = e.clientX; panSY = e.clientY;
  panSTx = viewTransform.x; panSTy = viewTransform.y;
  document.getElementById('canvas').style.cursor = 'grabbing';
  e.preventDefault();
}});
document.addEventListener('mousemove', e => {{
  if (isPanning) {{
    viewTransform.x = panSTx + (e.clientX - panSX);
    viewTransform.y = panSTy + (e.clientY - panSY);
    applyTransform();
  }}
}});
document.addEventListener('mouseup', () => {{
  if (isPanning) {{ isPanning = false; document.getElementById('canvas').style.cursor = ''; }}
}});

// ── Sidebar ──
function buildSidebar() {{
  const list = document.getElementById('service-list');
  const byCat = {{}};
  NODES.forEach(n => {{ if (!byCat[n.category]) byCat[n.category] = []; byCat[n.category].push(n); }});
  Object.entries(byCat).forEach(([cat, nodes]) => {{
    const cd = document.createElement('div');
    cd.className = 'cat-label'; cd.textContent = cat;
    list.appendChild(cd);
    nodes.forEach(node => {{
      const card = document.createElement('div');
      card.className = 'service-card'; card.id = 'card-' + node.id;
      card.innerHTML = `
        <div class="service-card-header">
          <div class="sc-icon">${{node.icon_data_uri ? `<img src="${{node.icon_data_uri}}" width="28" height="28" style="object-fit:contain;">` : `<svg viewBox="0 0 48 48">${{node.icon_svg}}</svg>`}}</div>
          <div>
            <div class="service-name">${{node.name}}</div>
            <div class="service-sku">${{node.sku || node.type}}</div>
          </div>
          ${{node.private ? '<span class="private-badge">Private</span>' : ''}}
        </div>
        ${{node.details.length > 0 ? `<div class="service-card-body">${{node.details.map(d => `<div class="service-detail">${{d}}</div>`).join('')}}</div>` : ''}}
      `;
      card.addEventListener('click', () => {{
        selectNode(node.id);
      }});
      list.appendChild(card);
    }});
  }});
}}

// ── VNet highlight toggle ──
let _vnetHighlighted = false;
function toggleVNetHighlight() {{
  _vnetHighlighted = !_vnetHighlighted;
  const vr = document.getElementById('vnet-rect');
  if (!vr) return;
  if (_vnetHighlighted) {{
    vr.setAttribute('stroke-width', '4');
    vr.setAttribute('stroke', '#5C2D91');
    vr.setAttribute('fill', '#f0eaf8');
  }} else {{
    vr.setAttribute('stroke-width', '2');
    vr.setAttribute('stroke', '#5C2D91');
    vr.setAttribute('fill', '#f8f7ff');
  }}
  // Also toggle sidebar card
  const card = document.getElementById('card-vnet-boundary');
  if (card) card.classList.toggle('selected', _vnetHighlighted);
}}

renderDiagram();
buildSidebar();

// ── VNet sidebar card (added dynamically if VNet boundary exists) ──
if (VNET_INFO || NODES.some(n => n.private && n.type !== 'pe') || NODES.some(n => n.type === 'pe')) {{
  const list = document.getElementById('service-list');
  // Insert at the top
  const catLabel = document.createElement('div');
  catLabel.className = 'cat-label'; catLabel.textContent = 'NETWORK';
  const card = document.createElement('div');
  card.className = 'service-card'; card.id = 'card-vnet-boundary';
  const vnetIcon = '<rect x="6" y="6" width="36" height="36" rx="4" fill="none" stroke="#5C2D91" stroke-width="3"/><circle cx="16" cy="18" r="3" fill="#5C2D91"/><circle cx="32" cy="18" r="3" fill="#5C2D91"/><circle cx="24" cy="32" r="3" fill="#5C2D91"/>';
  const vnetDetails = VNET_INFO ? VNET_INFO.split('|').map(s => s.trim()) : [];
  card.innerHTML = `
    <div class="service-card-header">
      <div class="sc-icon"><svg viewBox="0 0 48 48">${{vnetIcon}}</svg></div>
      <div>
        <div class="service-name">Virtual Network</div>
        <div class="service-sku">vnet</div>
      </div>
      <span class="private-badge">Private</span>
    </div>
    ${{vnetDetails.length > 0 ? `<div class="service-card-body">${{vnetDetails.map(d => `<div class="service-detail">${{d}}</div>`).join('')}}</div>` : ''}}
  `;
  card.addEventListener('click', () => {{ toggleVNetHighlight(); }});
  list.insertBefore(card, list.firstChild);
  list.insertBefore(catLabel, list.firstChild);
}}
setTimeout(fitToScreen, 100);
</script>
</body>
</html>"""
    return html

def generate_diagram(services, connections, title="Azure Architecture", vnet_info="", hierarchy=None):
    """Generate an interactive Azure architecture diagram as an HTML string.

    Args:
        services: list of dicts with keys id, name, type, sku, private, details, etc.
        connections: list of dicts with keys from, to, label, type.
        title: diagram title string.
        vnet_info: VNet CIDR info string.
        hierarchy: optional subscription/RG hierarchy list.

    Returns:
        HTML string containing the interactive diagram.
    """
    return generate_html(services, connections, title, vnet_info=vnet_info, hierarchy=hierarchy)
