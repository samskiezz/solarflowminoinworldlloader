#!/usr/bin/env python3
"""
Export real neural cluster status to JSON files 
for GitHub Pages to display actual data
"""

import json
import requests
import time
from pathlib import Path

def export_neural_status():
    """Get real neural status and export to docs folder"""
    try:
        # Get real status from our API
        response = requests.get('http://localhost:8000/neural/status', timeout=5)
        status_data = response.json()
        
        # Get repository list
        repos_response = requests.get('http://localhost:8000/neural/repositories', timeout=5)
        repos_data = repos_response.json()
        
        # Create summary for GitHub Pages
        real_status = {
            "neural_cluster_active": status_data.get("neural_cluster_active", False),
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "server_info": {
                "environment": "OpenClaw VPS",
                "hostname": status_data.get("server_info", {}).get("hostname", "unknown"),
                "python_version": status_data.get("server_info", {}).get("python_version", "3.11"),
                "cpu_cores": status_data.get("server_info", {}).get("cpu_cores", 2)
            },
            "repositories": {
                "total_installed": status_data.get("repositories", {}).get("installed", 0),
                "total_size_gb": status_data.get("repositories", {}).get("total_size_gb", 0),
                "sample_repos": [repo["name"] for repo in status_data.get("repositories", {}).get("list", [])][:10]
            },
            "ml_libraries": {
                "installed": [lib for lib in status_data.get("ml_libraries", []) if lib.get("status") == "installed"],
                "total_count": len([lib for lib in status_data.get("ml_libraries", []) if lib.get("status") == "installed"])
            },
            "installation_summary": status_data.get("installation_summary", {}),
            "is_real": True,
            "data_source": "Live OpenClaw VPS API"
        }
        
        # Write to docs folder for GitHub Pages
        docs_dir = Path("docs")
        
        # Main status file
        with open(docs_dir / "live_neural_status.json", "w") as f:
            json.dump(real_status, f, indent=2)
        
        # Repository details file
        repo_summary = {
            "total_repositories": repos_data.get("total", 0),
            "total_python_files": repos_data.get("summary", {}).get("total_python_files", 0),
            "total_size_gb": repos_data.get("summary", {}).get("total_size_gb", 0),
            "sample_repositories": repos_data.get("repositories", [])[:20],  # First 20 for display
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC")
        }
        
        with open(docs_dir / "live_repository_list.json", "w") as f:
            json.dump(repo_summary, f, indent=2)
        
        print("✅ Neural status exported successfully")
        print(f"📊 Status: {real_status['neural_cluster_active']}")
        print(f"📦 Repositories: {real_status['repositories']['total_installed']}")
        print(f"💾 Size: {real_status['repositories']['total_size_gb']}GB")
        print(f"🐍 ML Libraries: {real_status['ml_libraries']['total_count']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        
        # Create error status file
        error_status = {
            "neural_cluster_active": False,
            "error": str(e),
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "is_real": True,
            "data_source": "Export Error"
        }
        
        try:
            with open(docs_dir / "live_neural_status.json", "w") as f:
                json.dump(error_status, f, indent=2)
        except:
            pass
            
        return False

if __name__ == "__main__":
    print("🔄 Exporting real neural cluster status...")
    success = export_neural_status()
    exit(0 if success else 1)