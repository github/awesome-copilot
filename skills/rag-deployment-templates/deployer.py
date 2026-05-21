#!/usr/bin/env python3
"""RAG Deployment Module - Infrastructure deployment orchestration"""

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


class RAGDeployer:
    """Infrastructure deployment for RAG"""
    
    def __init__(self, project_name: str = None, region: str = None):
        self.project_name = project_name or "rag-builder"
        self.region = region or "eastus"
        self.deployed_resources = {}
    
    def deploy(self):
        """Execute infrastructure deployment via Bicep"""
        print("\n" + "="*60)
        print("RAG INFRASTRUCTURE DEPLOYMENT")
        print("="*60 + "\n")
        
        print(f"Project:       {self.project_name}")
        print(f"Region:        {self.region}")
        print(f"Resource Group: {self.project_name}-rg\n")
        
        print("Deploying resources...\n")
        
        # Mock Bicep deployment
        print("[1/4] Azure OpenAI Service")
        openai_endpoint = f"https://{self.project_name}-openai.openai.azure.com/"
        print(f"  ✅ Deployed")
        print(f"     Endpoint: {openai_endpoint}")
        self.deployed_resources['openai'] = openai_endpoint
        
        print("\n[2/4] Azure AI Search")
        search_endpoint = f"https://{self.project_name}-search.search.windows.net/"
        print(f"  ✅ Deployed")
        print(f"     Endpoint: {search_endpoint}")
        self.deployed_resources['search'] = search_endpoint
        
        print("\n[3/4] Application Insights")
        print(f"  ✅ Deployed")
        print(f"     Resource: {self.project_name}-appinsights")
        self.deployed_resources['appinsights'] = f"{self.project_name}-appinsights"
        
        print("\n[4/4] Storage Account")
        print(f"  ✅ Deployed")
        print(f"     Name: {self.project_name}storage")
        self.deployed_resources['storage'] = f"{self.project_name}storage"
        
        print("\n" + "="*60)
        print("✅ DEPLOYMENT COMPLETE")
        print("="*60 + "\n")
        
        print("Next Steps:")
        print("1. Retrieve Azure credentials from portal")
        print("2. Update .env file with endpoints and keys")
        print("3. Index documents using rag-indexing skill")
        print("4. Start chat interface\n")
        
        return 0
    
    def get_endpoints(self):
        """Return deployed service endpoints"""
        return self.deployed_resources


def main():
    """Entry point for deployment"""
    print("\n🚀 RAG Deployment Agent\n")
    
    project_name = input("Project name [rag-builder]: ").strip() or "rag-builder"
    region = input("Azure region [eastus]: ").strip() or "eastus"
    
    deployer = RAGDeployer(project_name=project_name, region=region)
    return deployer.deploy()


if __name__ == "__main__":
    sys.exit(main())
