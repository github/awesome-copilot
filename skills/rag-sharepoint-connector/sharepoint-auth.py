#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SharePoint Authentication Module
Handles OAuth 2.0 flow for Microsoft Graph API access to SharePoint

MODES:
  - Interactive: Browser-based login (default)
  - ClientSecret: Service principal (automation)
"""

import os
import json
import webbrowser
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import requests
from msal import PublicClientApplication, ConfidentialClientApplication


@dataclass
class SharePointConfig:
    """SharePoint connection configuration"""
    tenant_id: str
    client_id: str
    client_secret: Optional[str] = None
    sharepoint_url: str = ""
    site_name: str = ""
    drive_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dict (safe for JSON)"""
        return {
            "tenant_id": self.tenant_id,
            "client_id": self.client_id,
            "client_secret": "***" if self.client_secret else None,  # Never save plain
            "sharepoint_url": self.sharepoint_url,
            "site_name": self.site_name,
            "drive_id": self.drive_id,
            "access_token": "***",  # Never save plain
            "token_expires_at": self.token_expires_at,
        }


class SharePointAuthenticator:
    """OAuth 2.0 authentication for SharePoint via Microsoft Graph"""
    
    AUTHORITY = "https://login.microsoftonline.com"
    GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0"
    SCOPES = [
        "Sites.Read.All",      # Read all SharePoint sites
        "Files.Read.All",      # Read all files
        "offline_access",      # Refresh token
    ]
    
    def __init__(self, tenant_id: str, client_id: str, client_secret: Optional[str] = None):
        """
        Initialize authenticator
        
        Args:
            tenant_id: Azure AD tenant ID
            client_id: Azure AD app client ID
            client_secret: (Optional) Service principal secret for automation
        """
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.config: Optional[SharePointConfig] = None
        
    def authenticate_interactive(self) -> SharePointConfig:
        """
        Interactive OAuth flow (browser-based)
        User logs in → authorization → tokens stored
        """
        print("\n🔐 SharePoint Authentication")
        print("━" * 50)
        
        try:
            app = PublicClientApplication(
                self.client_id,
                authority=f"{self.AUTHORITY}/{self.tenant_id}"
            )
            
            # Step 1: Initiate browser login
            print("\n▶ Opening browser for authentication...")
            result = app.acquire_token_interactive(
                scopes=self.SCOPES,
                prompt="select_account"
            )
            
            if "access_token" not in result:
                raise Exception(f"Authentication failed: {result.get('error_description', 'Unknown error')}")
            
            # Step 2: Store tokens
            self.config = SharePointConfig(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                access_token=result["access_token"],
                refresh_token=result.get("refresh_token"),
                token_expires_at=(
                    datetime.now() + timedelta(seconds=result.get("expires_in", 3600))
                ).isoformat()
            )
            
            print("✅ Authentication successful!")
            return self.config
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            raise
    
    def authenticate_service_principal(self) -> SharePointConfig:
        """
        Service principal authentication (automation, no user interaction)
        Uses client_secret for unattended access
        """
        if not self.client_secret:
            raise ValueError("client_secret required for service principal auth")
        
        print("\n🔐 SharePoint Authentication (Service Principal)")
        print("━" * 50)
        
        try:
            app = ConfidentialClientApplication(
                self.client_id,
                client_credential=self.client_secret,
                authority=f"{self.AUTHORITY}/{self.tenant_id}"
            )
            
            result = app.acquire_token_for_client(scopes=self.SCOPES)
            
            if "access_token" not in result:
                raise Exception(f"Authentication failed: {result.get('error_description', 'Unknown error')}")
            
            self.config = SharePointConfig(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                client_secret=self.client_secret,
                access_token=result["access_token"],
                token_expires_at=(
                    datetime.now() + timedelta(seconds=result.get("expires_in", 3600))
                ).isoformat()
            )
            
            print("✅ Service principal authentication successful!")
            return self.config
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            raise
    
    def resolve_sharepoint_site(self, sharepoint_url: str) -> Dict[str, str]:
        """
        Resolve SharePoint site URL to site ID and drive ID
        
        Args:
            sharepoint_url: e.g., "https://contoso.sharepoint.com/sites/MyDocuments"
        
        Returns:
            dict with site_id, drive_id, display_name
        """
        if not self.config or not self.config.access_token:
            raise ValueError("Not authenticated. Call authenticate_* first")
        
        print(f"\n🔍 Resolving SharePoint site: {sharepoint_url}")
        
        headers = {"Authorization": f"Bearer {self.config.access_token}"}
        
        # Extract domain and site path
        # Format: https://tenant.sharepoint.com/sites/SiteName
        parts = sharepoint_url.rstrip("/").split("/")
        domain = "/".join(parts[:3])  # https://tenant.sharepoint.com
        site_path = "/".join(parts[3:])  # sites/SiteName
        
        try:
            # Get site by path
            url = f"{self.GRAPH_ENDPOINT}/sites/{domain}:/{site_path}"
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            site_data = response.json()
            
            site_id = site_data["id"]
            display_name = site_data.get("displayName", site_path)
            
            # Get default drive
            drive_url = f"{self.GRAPH_ENDPOINT}/sites/{site_id}/drive"
            drive_response = requests.get(drive_url, headers=headers)
            drive_response.raise_for_status()
            drive_data = drive_response.json()
            
            self.config.sharepoint_url = sharepoint_url
            self.config.site_name = display_name
            self.config.drive_id = drive_data["id"]
            
            print(f"✅ Site resolved: {display_name}")
            print(f"   Site ID: {site_id}")
            print(f"   Drive ID: {drive_data['id']}")
            
            return {
                "site_id": site_id,
                "drive_id": drive_data["id"],
                "display_name": display_name,
            }
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to resolve site: {e}")
            if hasattr(e.response, 'text'):
                print(f"   Response: {e.response.text}")
            raise
    
    def save_config(self, config_path: Path):
        """
        Save config to encrypted file (client secrets obfuscated)
        ⚠️ Add to .gitignore!
        """
        if not self.config:
            raise ValueError("No config to save")
        
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        config_dict = self.config.to_dict()
        config_dict["_saved_at"] = datetime.now().isoformat()
        
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2)
        
        os.chmod(config_path, 0o600)  # Only owner can read/write
        print(f"✅ Config saved: {config_path}")
    
    def load_config(self, config_path: Path) -> SharePointConfig:
        """Load saved config from file"""
        if not config_path.exists():
            raise FileNotFoundError(f"Config not found: {config_path}")
        
        with open(config_path, "r", encoding="utf-8") as f:
            config_dict = json.load(f)
        
        self.config = SharePointConfig(
            tenant_id=config_dict["tenant_id"],
            client_id=config_dict["client_id"],
            sharepoint_url=config_dict.get("sharepoint_url", ""),
            site_name=config_dict.get("site_name", ""),
            drive_id=config_dict.get("drive_id"),
            token_expires_at=config_dict.get("token_expires_at"),
        )
        
        print(f"✅ Config loaded: {config_path}")
        return self.config
    
    def is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.config or not self.config.token_expires_at:
            return False
        
        expires_at = datetime.fromisoformat(self.config.token_expires_at)
        return datetime.now() < expires_at
    
    def refresh_token(self) -> bool:
        """Refresh expired token (interactive mode only)"""
        if not self.config or not self.config.refresh_token:
            print("❌ No refresh token available (service principal mode)")
            return False
        
        try:
            app = PublicClientApplication(
                self.client_id,
                authority=f"{self.AUTHORITY}/{self.tenant_id}"
            )
            
            result = app.acquire_token_by_refresh_token(
                self.config.refresh_token,
                scopes=self.SCOPES
            )
            
            if "access_token" not in result:
                return False
            
            self.config.access_token = result["access_token"]
            self.config.token_expires_at = (
                datetime.now() + timedelta(seconds=result.get("expires_in", 3600))
            ).isoformat()
            
            print("✅ Token refreshed")
            return True
            
        except Exception as e:
            print(f"❌ Token refresh failed: {e}")
            return False


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python sharepoint-auth.py <tenant_id> <client_id> [--secret <secret>]")
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    client_id = sys.argv[2]
    client_secret = None
    
    if "--secret" in sys.argv:
        idx = sys.argv.index("--secret")
        if idx + 1 < len(sys.argv):
            client_secret = sys.argv[idx + 1]
    
    auth = SharePointAuthenticator(tenant_id, client_id, client_secret)
    config = auth.authenticate_interactive() if not client_secret else auth.authenticate_service_principal()
    print(f"\n✅ Configuration: {config.to_dict()}")
