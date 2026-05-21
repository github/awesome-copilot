#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SharePoint Connector for RAG
Hybrid-Pro architecture: Professional (Azure Search direct) + Local (download) modes

MODES:
  1. Professional (default): Azure Search indexer syncs from SharePoint (real-time, no duplication)
  2. Local: Download all SharePoint docs to rag-{project}/knowledge/sharepoint-{date}/
"""

import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import requests
from tqdm import tqdm

from sharepoint_auth import SharePointAuthenticator, SharePointConfig


@dataclass
class DocumentMetadata:
    """Document with metadata for tracking origin"""
    name: str
    path: str
    size: int
    modified_at: str
    mime_type: str
    source_url: str
    source: str = "sharepoint"
    
    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__


class SharePointConnector:
    """
    Manages SharePoint connection and indexing
    Supports both Professional (Azure Search) and Local (download) modes
    """
    
    def __init__(self, config: SharePointConfig, mode: str = "professional"):
        """
        Initialize connector
        
        Args:
            config: SharePointConfig with auth tokens
            mode: "professional" or "local"
        """
        if mode not in ("professional", "local"):
            raise ValueError("mode must be 'professional' or 'local'")
        
        self.config = config
        self.mode = mode
        self.headers = {"Authorization": f"Bearer {config.access_token}"}
        self.graph_url = "https://graph.microsoft.com/v1.0"
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def list_all_items_recursive(self, item_id: str = None, path_prefix: str = "") -> List[Dict[str, Any]]:
        """
        Recursively list all items in SharePoint drive
        
        Returns list of items with metadata
        """
        items = []
        
        if item_id is None:
            # Start from drive root
            url = f"{self.graph_url}/drives/{self.config.drive_id}/root/children"
        else:
            url = f"{self.graph_url}/drives/{self.config.drive_id}/items/{item_id}/children"
        
        try:
            print(f"\n📂 Scanning: {path_prefix if path_prefix else 'Root'}")
            
            while url:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                
                for item in data.get("value", []):
                    item_path = f"{path_prefix}/{item['name']}" if path_prefix else item['name']
                    
                    if item.get("folder"):
                        # Recursive: folder
                        print(f"  📁 {item['name']}")
                        items.extend(
                            self.list_all_items_recursive(item["id"], item_path)
                        )
                    else:
                        # File
                        print(f"  📄 {item['name']} ({item.get('size', 0) / 1024 / 1024:.1f} MB)")
                        items.append({
                            "id": item["id"],
                            "name": item["name"],
                            "path": item_path,
                            "size": item.get("size", 0),
                            "modified_at": item.get("lastModifiedDateTime"),
                            "mime_type": item.get("file", {}).get("mimeType", ""),
                            "download_url": item.get("@microsoft.graph.downloadUrl"),
                            "web_url": item.get("webUrl"),
                        })
                
                # Pagination
                url = data.get("@odata.nextLink")
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error scanning SharePoint: {e}")
            raise
        
        return items
    
    def download_item(self, item: Dict[str, Any], target_dir: Path, overwrite: bool = False) -> Optional[Path]:
        """
        Download single file from SharePoint
        
        Preserves folder structure
        """
        # Create folder structure
        item_path = item["path"]
        folder_path = target_dir / Path(item_path).parent
        folder_path.mkdir(parents=True, exist_ok=True)
        
        file_path = target_dir / Path(item_path)
        
        if file_path.exists() and not overwrite:
            print(f"  ⏭️  {item['path']} (already exists)")
            return file_path
        
        try:
            response = self.session.get(
                item["download_url"],
                stream=True,
                timeout=30
            )
            response.raise_for_status()
            
            # Download with progress
            total_size = int(response.headers.get("content-length", 0))
            with open(file_path, "wb") as f:
                if total_size > 0:
                    with tqdm(total=total_size, unit="B", unit_scale=True, desc=item['name']) as pbar:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                                pbar.update(len(chunk))
                else:
                    f.write(response.content)
            
            print(f"  ✅ {item['path']}")
            return file_path
        
        except Exception as e:
            print(f"  ❌ Failed to download {item['name']}: {e}")
            return None
    
    def setup_professional_mode(self) -> Dict[str, Any]:
        """
        Setup Azure Search indexer for professional mode
        Requires Azure SDK and valid search credentials
        
        Returns: Indexer configuration
        """
        print("\n🔧 Setting up Professional Mode (Azure Search Indexer)")
        print("━" * 50)
        
        # This would integrate with azure-search-documents SDK
        # For now, return configuration template
        
        config = {
            "mode": "professional",
            "data_source": {
                "name": f"sharepoint-{self.config.site_name.lower().replace(' ', '-')}",
                "type": "sharepoint",
                "credentials": {
                    "connection_string": f"https://{self.config.site_name}.sharepoint.com"
                },
                "container": {
                    "name": self.config.drive_id,
                }
            },
            "indexer": {
                "name": f"indexer-sharepoint-{self.config.site_name.lower().replace(' ', '-')}",
                "target_index": "rag-documents",
                "schedule": {"interval": "PT1H"},  # Sync every hour
            },
            "field_mappings": [
                {"source_field_name": "metadata_storage_path", "target_field_name": "id"},
                {"source_field_name": "metadata_storage_name", "target_field_name": "file_name"},
                {"source_field_name": "created_on", "target_field_name": "created_at"},
            ]
        }
        
        print("✅ Professional mode configuration ready")
        print(f"\n📋 Configuration:")
        print(json.dumps(config, indent=2))
        
        # TODO: Implement actual Azure Search setup via azure-search-documents SDK
        # This would require:
        # - SearchIndexerClient connection
        # - Create data source if not exists
        # - Create indexer if not exists
        # - Run indexer
        
        return config
    
    def setup_local_mode(self, knowledge_dir: Path) -> Path:
        """
        Setup local mode: download all SharePoint docs
        
        Returns: Path to downloaded files
        """
        print("\n💾 Setting up Local Mode (Download to Knowledge)")
        print("━" * 50)
        
        # Create timestamped download folder
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        download_dir = knowledge_dir / f"sharepoint-{timestamp}"
        download_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n📥 Download destination: {download_dir}")
        
        try:
            # List all items
            print("\n🔍 Scanning SharePoint...")
            items = self.list_all_items_recursive()
            
            total_size = sum(item["size"] for item in items)
            print(f"\n📊 Total: {len(items)} files, {total_size / 1024 / 1024:.1f} MB")
            
            # Download all
            print("\n⬇️  Downloading files...")
            downloaded = []
            failed = []
            
            for item in items:
                try:
                    file_path = self.download_item(item, download_dir)
                    if file_path:
                        downloaded.append({
                            "path": str(file_path),
                            "metadata": DocumentMetadata(
                                name=item["name"],
                                path=item["path"],
                                size=item["size"],
                                modified_at=item["modified_at"],
                                mime_type=item["mime_type"],
                                source_url=item["web_url"],
                            ).to_dict()
                        })
                except Exception as e:
                    failed.append({"name": item["name"], "error": str(e)})
            
            # Save manifest
            manifest = {
                "downloaded_at": datetime.now().isoformat(),
                "sharepoint_site": self.config.site_name,
                "sharepoint_url": self.config.sharepoint_url,
                "total_files": len(downloaded),
                "failed_files": len(failed),
                "destination": str(download_dir),
                "files": downloaded,
                "errors": failed,
            }
            
            manifest_path = download_dir / "manifest.json"
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Download complete!")
            print(f"   Files downloaded: {len(downloaded)}")
            print(f"   Failed: {len(failed)}")
            print(f"   Manifest: {manifest_path}")
            
            return download_dir
        
        except Exception as e:
            print(f"❌ Local setup failed: {e}")
            raise
    
    def get_setup_summary(self) -> Dict[str, Any]:
        """Get summary of setup configuration"""
        return {
            "mode": self.mode,
            "site_name": self.config.site_name,
            "sharepoint_url": self.config.sharepoint_url,
            "timestamp": datetime.now().isoformat(),
            "next_steps": self._get_next_steps(),
        }
    
    def _get_next_steps(self) -> List[str]:
        """Get recommended next steps based on mode"""
        if self.mode == "professional":
            return [
                "1. Review professional mode configuration",
                "2. Configure Azure Search indexer (see instructions)",
                "3. Verify data source connection to SharePoint",
                "4. Run initial indexer to sync all documents",
                "5. Monitor indexer status in Azure Portal",
                "6. Update knowledge index in Azure Search",
            ]
        else:  # local
            return [
                "1. Review downloaded files in knowledge/sharepoint-*/",
                "2. Run: python .github/skills/rag-indexer/indexar.py",
                "3. Verify files indexed in Azure Search",
                "4. Query documents: python .github/skills/rag-query-cli/consultar.py 'your question'",
                "5. (Optional) Setup sync scheduler for periodic updates",
            ]


def setup_sharepoint_connector(
    project_root: Path,
    tenant_id: str,
    client_id: str,
    sharepoint_url: str,
    mode: str = "professional",
    client_secret: Optional[str] = None,
    auth_config_path: Optional[Path] = None,
) -> SharePointConnector:
    """
    Convenience function to set up connector
    
    Returns: Configured SharePointConnector instance
    """
    print("🔐 Initializing SharePoint Connector")
    print("━" * 50)
    
    # Authenticate
    auth = SharePointAuthenticator(tenant_id, client_id, client_secret)
    
    if client_secret:
        config = auth.authenticate_service_principal()
    else:
        config = auth.authenticate_interactive()
    
    # Resolve site
    auth.resolve_sharepoint_site(sharepoint_url)
    
    # Save config if path provided
    if auth_config_path:
        auth.save_config(auth_config_path)
    
    # Create connector
    connector = SharePointConnector(config, mode=mode)
    
    return connector


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SharePoint Connector for RAG")
    parser.add_argument("--mode", choices=["professional", "local"], default="professional",
                       help="Setup mode")
    parser.add_argument("--tenant-id", required=True, help="Azure AD tenant ID")
    parser.add_argument("--client-id", required=True, help="Azure AD client ID")
    parser.add_argument("--client-secret", help="(Optional) Client secret for service principal")
    parser.add_argument("--sharepoint-url", required=True, help="SharePoint site URL")
    parser.add_argument("--project-root", type=Path, default=Path("."),
                       help="Project root directory")
    
    args = parser.parse_args()
    
    try:
        connector = setup_sharepoint_connector(
            project_root=args.project_root,
            tenant_id=args.tenant_id,
            client_id=args.client_id,
            sharepoint_url=args.sharepoint_url,
            mode=args.mode,
            client_secret=args.client_secret,
        )
        
        knowledge_dir = args.project_root / "knowledge"
        
        if args.mode == "professional":
            connector.setup_professional_mode()
        else:
            connector.setup_local_mode(knowledge_dir)
        
        summary = connector.get_setup_summary()
        print(f"\n✅ Setup Summary:")
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        exit(1)
